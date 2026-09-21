import json

from sqlalchemy import text
from sqlalchemy.orm import Session

def get_metric_by_id(db: Session, metric_id: int):
    query = text("""
        SELECT id, metric_name, metric_key, config_json, is_active, is_mandatory
        FROM basic_metric_config
        WHERE id = :id
    """)
    return db.execute(query, {"id": metric_id}).mappings().first()


def update_metric(db: Session, metric_id: int, data):
    query = text("""
        UPDATE basic_metric_config
        SET metric_name = :metric_name,
            metric_key = :metric_key,
            config_json = :config_json,
            is_active = :is_active
        WHERE id = :id
    """)

    db.execute(
        query,
        {
            "id": metric_id,
            "metric_name": data.metric_name,
            "metric_key": data.metric_key,
            "config_json": json.dumps([field.model_dump() for field in data.config_json]),
            "is_active": int(data.is_active),
        }
    )
    db.commit()


def delete_metric(db: Session, metric_id: int):
    db.execute(
        text("DELETE FROM basic_metric_config WHERE id = :id"),
        {"id": metric_id}
    )
    db.commit()
    
def create_metric(db: Session, data):
    query = text("""
        INSERT INTO basic_metric_config
        (metric_name, metric_key, config_json, is_active)
        VALUES (:metric_name, :metric_key, :config_json, :is_active)
    """)

    result = db.execute(
        query,
        {
            "metric_name": data.metric_name,
            "metric_key": data.metric_key,
            "config_json": json.dumps([field.model_dump() for field in data.config_json]),
            "is_active": int(data.is_active),
        }
        
    )



    db.commit()

    return result.lastrowid