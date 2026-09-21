import json

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.management_schema import (
    ClientUpdate,
    ProjectUpdate,
)


def _rows(db: Session, query: str, params: dict | None = None):
    return [
        dict(row)
        for row in db.execute(text(query), params or {}).mappings().all()
    ]


def dashboard(db: Session):
    summary = db.execute(
        text(
            "SELECT "
            "(SELECT COUNT(*) FROM master_clients) clients,"
            "(SELECT COUNT(*) FROM master_projects) projects,"
            "(SELECT COUNT(*) FROM client_subscriptions "
            "WHERE status IN ('trial','active')) active_subscriptions,"
            "(SELECT COALESCE(SUM(total),0) FROM invoices "
            "WHERE status='paid') collected,"
            "(SELECT COALESCE(SUM(total),0) FROM invoices "
            "WHERE status IN ('approval_pending','approved','sent','overdue')) pending"
        )
    ).mappings().one()

    plan_counts = _rows(
        db,
        "SELECT p.name,COUNT(s.id) count "
        "FROM subscription_plans p "
        "LEFT JOIN client_subscriptions s "
        "ON s.plan_id=p.id AND s.status IN ('trial','active') "
        "GROUP BY p.id,p.name "
        "ORDER BY count DESC",
    )

    recent = _rows(
        db,
        "SELECT c.client_id,c.name client_name,p.project_id,p.name project_name,"
        "p.category,p.crm_platform,p.created_at "
        "FROM master_clients c "
        "JOIN master_projects p ON p.client_id=c.client_id "
        "ORDER BY p.created_at DESC LIMIT 6",
    )

    client_history = _rows(
        db,
        "SELECT DATE_FORMAT(created_at,'%Y-%m') month,COUNT(*) value "
        "FROM master_clients "
        "WHERE created_at>=DATE_FORMAT("
        "DATE_SUB(CURRENT_DATE,INTERVAL 5 MONTH),'%Y-%m-01') "
        "GROUP BY DATE_FORMAT(created_at,'%Y-%m') "
        "ORDER BY month",
    )

    usage_history = _rows(
        db,
        "SELECT DATE_FORMAT(period_start,'%Y-%m') month,"
        "COALESCE(SUM(quantity),0) value "
        "FROM resource_usage_snapshots "
        "WHERE period_start>=DATE_FORMAT("
        "DATE_SUB(CURRENT_DATE,INTERVAL 5 MONTH),'%Y-%m-01') "
        "GROUP BY DATE_FORMAT(period_start,'%Y-%m') "
        "ORDER BY month",
    )

    revenue_history = _rows(
        db,
        "SELECT DATE_FORMAT(COALESCE(paid_at,updated_at),'%Y-%m') month,"
        "COALESCE(SUM(total),0) value "
        "FROM invoices "
        "WHERE status='paid' "
        "AND COALESCE(paid_at,updated_at)>=DATE_FORMAT("
        "DATE_SUB(CURRENT_DATE,INTERVAL 5 MONTH),'%Y-%m-01') "
        "GROUP BY DATE_FORMAT(COALESCE(paid_at,updated_at),'%Y-%m') "
        "ORDER BY month",
    )

    return {
        **dict(summary),
        "plan_counts": plan_counts,
        "recent_projects": recent,
        "history": {
            "clients": client_history,
            "usage": usage_history,
            "revenue": revenue_history,
        },
    }


def list_clients(db: Session):
    return _rows(
        db,
        "SELECT c.client_id,c.name,c.status,c.created_at,"
        "COUNT(p.project_id) project_count,"
        "GROUP_CONCAT(p.name ORDER BY p.created_at SEPARATOR ', ') projects "
        "FROM master_clients c "
        "LEFT JOIN master_projects p ON p.client_id=c.client_id "
        "GROUP BY c.client_id,c.name,c.status,c.created_at "
        "ORDER BY c.created_at DESC",
    )


def client_projects(db: Session, client_id: str):
    has_category = db.execute(
        text(
            "SELECT 1 FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA=DATABASE() "
            "AND TABLE_NAME='master_projects' "
            "AND COLUMN_NAME='category'"
        )
    ).first()

    category = (
        "category"
        if has_category
        else "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(categories,'$[0]')),'growth') AS category"
    )

    return _rows(
        db,
        f"SELECT project_id,client_id,name,{category},mode,status,"
        "crm_platform,origins,created_at,updated_at "
        "FROM master_projects "
        "WHERE client_id=:client "
        "ORDER BY created_at DESC",
        {"client": client_id},
    )


def update_client(db: Session, client_id: str, payload: ClientUpdate):
    changed = db.execute(
        text(
            "UPDATE master_clients "
            "SET name=:name,status=:status,updated_by='admin-dashboard' "
            "WHERE client_id=:id"
        ),
        {"id": client_id, **payload.model_dump()},
    ).rowcount

    if not changed:
        raise HTTPException(404, "Client not found")

    db.commit()

    return {"message": "Client updated"}


def deactivate_client(db: Session, client_id: str):
    if not db.execute(
        text(
            "UPDATE master_clients "
            "SET status='inactive',updated_by='admin-dashboard' "
            "WHERE client_id=:id"
        ),
        {"id": client_id},
    ).rowcount:
        raise HTTPException(404, "Client not found")

    db.execute(
        text(
            "UPDATE master_projects "
            "SET status='inactive',updated_by='admin-dashboard' "
            "WHERE client_id=:id"
        ),
        {"id": client_id},
    )

    db.commit()

    return {"message": "Client and projects deactivated"}


def update_project(
    db: Session,
    client_id: str,
    project_id: str,
    payload: ProjectUpdate,
):
    values = payload.model_dump()
    values.update(
        {
            "client": client_id,
            "project": project_id,
            "origins": json.dumps(payload.origins),
        }
    )

    changed = db.execute(
        text(
            "UPDATE master_projects "
            "SET name=:name,category=:category,mode=:mode,status=:status,"
            "crm_platform=:crm_platform,origins=:origins,"
            "updated_by='admin-dashboard' "
            "WHERE client_id=:client AND project_id=:project"
        ),
        values,
    ).rowcount

    if not changed:
        raise HTTPException(404, "Project not found")

    db.execute(
        text(
            "UPDATE project_provider_configs "
            "SET provider_code=:provider,status='configured' "
            "WHERE client_id=:client AND project_id=:project"
        ),
        {
            "provider": payload.crm_platform,
            "client": client_id,
            "project": project_id,
        },
    )

    db.commit()

    return {"message": "Project updated"}


def deactivate_project(db: Session, client_id: str, project_id: str):
    if not db.execute(
        text(
            "UPDATE master_projects "
            "SET status='inactive',updated_by='admin-dashboard' "
            "WHERE client_id=:client AND project_id=:project"
        ),
        {"client": client_id, "project": project_id},
    ).rowcount:
        raise HTTPException(404, "Project not found")

    db.commit()

    return {"message": "Project deactivated; tenant data was preserved"}



# # ============================================================
# # USAGE
# # ============================================================


def usage(db: Session):
    return _rows(
        db,
        "SELECT u.client_id,c.name client_name,u.project_id,u.metric_code,"
        "u.channel,u.quantity,u.period_start,u.period_end,u.measured_at "
        "FROM resource_usage_snapshots u "
        "JOIN master_clients c ON c.client_id=u.client_id "
        "JOIN ("
        "SELECT client_id,project_id,metric_code,channel,"
        "MAX(measured_at) measured_at "
        "FROM resource_usage_snapshots "
        "GROUP BY client_id,project_id,metric_code,channel"
        ") latest "
        "ON latest.client_id=u.client_id "
        "AND latest.project_id<=>u.project_id "
        "AND latest.metric_code=u.metric_code "
        "AND latest.channel=u.channel "
        "AND latest.measured_at=u.measured_at "
        "ORDER BY c.name,u.metric_code"
    )