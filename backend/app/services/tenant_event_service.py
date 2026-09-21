import json
import re

import pymysql
from contextlib import contextmanager

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.tenant_event_schema import EventPayload


def _project_ids(value):
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else [value]
        except json.JSONDecodeError:
            return [value]
    return []


def _snake_name(label: str, field: str) -> str:
    """Build stable event/property identifiers from their human-readable labels."""
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", label.strip())
    value = re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_").lower()
    value = re.sub(r"_+", "_", value)
    if not value:
        raise HTTPException(422, f"{field} label must contain letters or numbers")
    return value


@contextmanager
def tenant_connection(db: Session, client_id: str, project_id: str):
    credentials = db.execute(text(
        "SELECT host,port,user,password,database_name,project_id FROM master_database_credentials "
        "WHERE client_id=:client AND driver='mysql'"
    ), {"client": client_id}).mappings().all()
    credential = next((row for row in credentials if project_id in _project_ids(row["project_id"])), None)
    if not credential:
        raise HTTPException(404, "MySQL workspace credentials were not found")
    database = credential["database_name"]
    if not re.fullmatch(r"[A-Za-z0-9_]+", database or ""):
        raise HTTPException(500, "Stored tenant database name is invalid")
    try:
        connection = pymysql.connect(
            host=credential["host"], port=int(credential["port"]),
            user=credential["user"], password=credential["password"],
            database=database, charset="utf8mb4", autocommit=False,
            cursorclass=pymysql.cursors.DictCursor,
        )
    except Exception as exc:
        raise HTTPException(502, f"Cannot connect to tenant workspace: {type(exc).__name__}") from exc
    try:
        yield connection
    finally:
        connection.close()


def _event_detail(cursor, event_id: int):
    cursor.execute("SELECT * FROM master_events WHERE id=%s", (event_id,))
    event = cursor.fetchone()
    if not event:
        return None
    cursor.execute(
        "SELECT p.*,r.id rule_id,r.raw_json_path,r.data_type rule_data_type,r.is_loop,r.parent_id,"
        "r.inner_data_type rule_inner_data_type FROM master_event_properties p "
        "LEFT JOIN master_event_property_mapping_rules r ON r.event_prop_id=p.id WHERE p.event_id=%s ORDER BY p.id",
        (event_id,),
    )
    properties = cursor.fetchall()
    for prop in properties:
        if isinstance(prop.get("sub_properties"), str):
            try:
                prop["sub_properties"] = json.loads(prop["sub_properties"])
            except json.JSONDecodeError:
                prop["sub_properties"] = []
        elif prop.get("sub_properties") is None:
            prop["sub_properties"] = []
    event["properties"] = properties
    return event


def list_events(db: Session, client_id: str, project_id: str):
    with tenant_connection(db, client_id, project_id) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT e.id,e.name,e.label,e.type,e.status,e.nature,e.is_conversion_event,e.is_live_activity,"
                "COUNT(p.id) property_count FROM master_events e LEFT JOIN master_event_properties p ON p.event_id=e.id "
                "WHERE e.client_id=%s AND e.project_id=%s GROUP BY e.id ORDER BY e.type,e.name",
                (client_id, project_id),
            )
            return cursor.fetchall()


def get_event(db: Session, client_id: str, project_id: str, event_id: int):
    with tenant_connection(db, client_id, project_id) as connection:
        with connection.cursor() as cursor:
            event = _event_detail(cursor, event_id)
            if not event or event["client_id"] != client_id or event["project_id"] != project_id:
                raise HTTPException(404, "Event not found")
            return event


def _save_event(connection, payload: EventPayload, client_id: str, project_id: str, event_id: int | None):
    event_name = _snake_name(payload.label, "Event")
    try:
        with connection.cursor() as cursor:
            values = (
                event_name, payload.label, payload.type, payload.status, payload.nature,
                client_id, project_id, "admin-dashboard", "admin-dashboard",
                "yes" if payload.is_conversion_event else "no",
                "yes" if payload.is_live_activity else "no",
            )
            if event_id is None:
                cursor.execute(
                    "INSERT INTO master_events (name,label,type,status,nature,client_id,project_id,created_by,updated_by,is_conversion_event,is_live_activity) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", values)
                event_id = cursor.lastrowid
            else:
                cursor.execute("SELECT 1 FROM master_events WHERE id=%s AND client_id=%s AND project_id=%s", (event_id, client_id, project_id))
                if not cursor.fetchone():
                    raise HTTPException(404, "Event not found")
                cursor.execute(
                    "UPDATE master_events SET name=%s,label=%s,type=%s,status=%s,nature=%s,updated_by=%s,"
                    "is_conversion_event=%s,is_live_activity=%s WHERE id=%s",
                    (event_name, payload.label, payload.type, payload.status, payload.nature,
                     "admin-dashboard", values[-2], values[-1], event_id),
                )
                cursor.execute("DELETE FROM master_event_property_mapping_rules WHERE event_id=%s", (event_id,))
                cursor.execute("DELETE FROM master_event_properties WHERE event_id=%s", (event_id,))
            for prop in payload.properties:
                property_name = _snake_name(prop.label, "Property")
                cursor.execute(
                    "INSERT INTO master_event_properties (event_id,name,label,type,nature,status,data_type,data_type_fallback,description,sub_properties,"
                    "is_required,client_id,project_id,is_conversion_event_property,is_live_activity,inner_data_type,created_by,updated_by) "
                    "VALUES (%s,%s,%s,%s,%s,'active',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'admin-dashboard','admin-dashboard')",
                    (event_id, property_name, prop.label, payload.type, prop.nature, prop.data_type, prop.data_type_fallback,
                     prop.description, json.dumps([item.model_dump() for item in prop.sub_properties]) if prop.sub_properties else None,
                     "yes" if prop.is_required else "no", client_id, project_id,
                     "yes" if prop.is_conversion_event_property else "no", "yes" if prop.is_live_activity else "no",
                     prop.inner_data_type),
                )
                property_id = cursor.lastrowid
                rule = prop.rule
                cursor.execute(
                    "INSERT INTO master_event_property_mapping_rules (event_id,event_prop_id,event_prop_name,client_id,project_id,"
                    "raw_json_path,data_type,is_loop,parent_id,event_name,inner_data_type) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (event_id, property_id, property_name, client_id, project_id, rule.raw_json_path,
                     rule.data_type, int(rule.is_loop), rule.parent_id, event_name, rule.inner_data_type),
                )
        connection.commit()
        return {"id": event_id, "message": "Event schema saved"}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(400, f"Unable to save event schema: {exc}") from exc


def create_event(db: Session, client_id: str, project_id: str, payload: EventPayload):
    with tenant_connection(db, client_id, project_id) as connection:
        return _save_event(connection, payload, client_id, project_id, None)


def update_event(db: Session, client_id: str, project_id: str, event_id: int, payload: EventPayload):
    with tenant_connection(db, client_id, project_id) as connection:
        return _save_event(connection, payload, client_id, project_id, event_id)


def discard_event(db: Session, client_id: str, project_id: str, event_id: int):
    with tenant_connection(db, client_id, project_id) as connection:
        with connection.cursor() as cursor:
            changed = cursor.execute(
                "UPDATE master_events SET status='discard',updated_by='admin-dashboard' "
                "WHERE id=%s AND client_id=%s AND project_id=%s", (event_id, client_id, project_id))
        if not changed:
            raise HTTPException(404, "Event not found")
        connection.commit()
        return {"message": "Event discarded"}
