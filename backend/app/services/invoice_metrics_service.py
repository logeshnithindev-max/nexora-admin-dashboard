from sqlalchemy import text
from sqlalchemy.orm import Session


def list_invoice_metrics(db: Session):
    global_rows = db.execute(
        text("""
            SELECT
                id,
                metric_key AS metric_code,
                metric_name,
                'global' AS channel
            FROM basic_metric_config
            WHERE is_active = 1
            ORDER BY id
        """)
    ).mappings().all()

    channel_rows = db.execute(
        text("""
            SELECT
                id,
                metric_key AS metric_code,
                metric_name,
                CASE
                    WHEN channel_id = 1 THEN 'whatsapp'
                    WHEN channel_id = 2 THEN 'email'
                    ELSE CONCAT('channel_', channel_id)
                END AS channel
            FROM channel_metric_config
            WHERE is_active = 1
            ORDER BY id
        """)
    ).mappings().all()

    return {
        "global": [dict(row) for row in global_rows],
        "channel": [dict(row) for row in channel_rows],
    }