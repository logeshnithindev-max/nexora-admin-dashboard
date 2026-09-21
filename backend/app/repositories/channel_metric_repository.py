import json

from sqlalchemy import text
from sqlalchemy.orm import Session

def get_channel_metric_by_id(db: Session, metric_id: int):
    query = text("""
        SELECT id, metric_name, metric_key, channel_id, config_json, is_active, is_mandatory
        FROM channel_metric_config
        WHERE id = :id
    """)
    return db.execute(query, {"id": metric_id}).mappings().first()


def update_channel_metric(db: Session, metric_id: int, data):
    query = text("""
        UPDATE channel_metric_config
        SET metric_name = :metric_name,
            metric_key = :metric_key,
            channel_id = :channel_id,
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
            "channel_id": data.channel_id,
            "config_json": json.dumps([field.model_dump() for field in data.config_json]),
            "is_active": int(data.is_active),
        }
    )
    db.commit()


def delete_channel_metric(db: Session, metric_id: int):
    db.execute(
        text("DELETE FROM channel_metric_config WHERE id = :id"),
        {"id": metric_id}
    )
    db.commit()

    
def create_channel_metric(db: Session, data):
    query = text("""
        INSERT INTO channel_metric_config
        (
            metric_name,
            metric_key,
            channel_id,
            config_json,
            is_active,
            created_by
        )
        VALUES
        (
            :metric_name,
            :metric_key,
            :channel_id,
            :config_json,
            :is_active,
            :created_by
        )
    """)

    result = db.execute(
        query,
        {
            "metric_name": data.metric_name,
            "metric_key": data.metric_key,
            "channel_id": data.channel_id,
            "config_json": json.dumps([field.model_dump() for field in data.config_json]),
            "is_active": int(data.is_active),
            "created_by": data.created_by,
        }
    )

    db.commit()

    return result.lastrowid