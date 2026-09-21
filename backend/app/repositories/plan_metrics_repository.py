from sqlalchemy import text


def get_basic_metrics(db):
    query = text("""
        SELECT
            id,
            metric_name,
            metric_key,
            config_json,
            is_active
        FROM basic_metric_config
        WHERE is_active = 1
        ORDER BY id
    """)

    return db.execute(query).mappings().all()


def get_channels(db):
    query = text("""
        SELECT
            id,
            name,
            code
        FROM channels
        ORDER BY id
    """)

    return db.execute(query).mappings().all()


def get_channel_metrics(db):
    query = text("""
        SELECT
            id,
            metric_name,
            metric_key,
            channel_id,
            config_json,
            is_active
        FROM channel_metric_config
        WHERE is_active = 1
        ORDER BY id
    """)

    return db.execute(query).mappings().all()