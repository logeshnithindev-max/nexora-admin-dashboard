import json

from sqlalchemy import text


# ==========================================
# GET ALL
# ==========================================

def get_all_plan_metrics(db):
    query = text(
        """
        SELECT
            spm.id,
            spm.plan_id,
            spm.metric_id,
            spm.metric_value,
            spm.metric_type,
            spm.channel_id,

            CASE
                WHEN spm.metric_type = 'basic'
                    THEN bmc.metric_name
                WHEN spm.metric_type = 'channel'
                    THEN cmc.metric_name
            END AS metric_name,

            CASE
                WHEN spm.metric_type = 'basic'
                    THEN bmc.metric_key
                WHEN spm.metric_type = 'channel'
                    THEN cmc.metric_key
            END AS metric_key,

            ch.name AS channel_name,

            spm.created_at,
            spm.updated_at

        FROM subscription_plan_metrics spm

        LEFT JOIN basic_metric_config bmc
            ON spm.metric_type = 'basic'
            AND spm.metric_id = bmc.id

        LEFT JOIN channel_metric_config cmc
            ON spm.metric_type = 'channel'
            AND spm.metric_id = cmc.id

        LEFT JOIN channels ch
            ON spm.channel_id = ch.id

        ORDER BY spm.id
        """
    )

    return db.execute(query).mappings().all()


# ==========================================
# GET BY ID
# ==========================================

def get_plan_metric(db, metric_config_id: int):
    query = text(
        """
        SELECT
            spm.id,
            spm.plan_id,
            spm.metric_id,
            spm.metric_value,
            spm.metric_type,
            spm.channel_id,

            CASE
                WHEN spm.metric_type = 'basic'
                    THEN bmc.metric_name
                WHEN spm.metric_type = 'channel'
                    THEN cmc.metric_name
            END AS metric_name,

            CASE
                WHEN spm.metric_type = 'basic'
                    THEN bmc.metric_key
                WHEN spm.metric_type = 'channel'
                    THEN cmc.metric_key
            END AS metric_key,

            ch.name AS channel_name,

            spm.created_at,
            spm.updated_at

        FROM subscription_plan_metrics spm

        LEFT JOIN basic_metric_config bmc
            ON spm.metric_type = 'basic'
            AND spm.metric_id = bmc.id

        LEFT JOIN channel_metric_config cmc
            ON spm.metric_type = 'channel'
            AND spm.metric_id = cmc.id

        LEFT JOIN channels ch
            ON spm.channel_id = ch.id

        WHERE spm.id = :metric_config_id
        """
    )

    return db.execute(
        query,
        {
            "metric_config_id": metric_config_id
        }
    ).mappings().first()


# ==========================================
# CREATE
# ==========================================

def create_plan_metric(db, data: dict):
    query = text(
        """
        INSERT INTO subscription_plan_metrics (
            plan_id,
            metric_id,
            metric_value,
            metric_type,
            channel_id
        )
        VALUES (
            :plan_id,
            :metric_id,
            :metric_value,
            :metric_type,
            :channel_id
        )
        """
    )

    params = {
        "plan_id": data["plan_id"],
        "metric_id": data["metric_id"],
        "metric_value": json.dumps(data["metric_value"]),
        "metric_type": data["metric_type"],
        "channel_id": data.get("channel_id"),
    }

    result = db.execute(query, params)
    db.commit()

    return get_plan_metric(db, result.lastrowid)


# ==========================================
# UPDATE
# ==========================================

def update_plan_metric(
    db,
    metric_config_id: int,
    data: dict
):
    existing = get_plan_metric(db, metric_config_id)

    if not existing:
        return None

    update_fields = []
    params = {
        "metric_config_id": metric_config_id
    }

    allowed_fields = [
        "plan_id",
        "metric_id",
        "metric_value",
        "metric_type",
        "channel_id",
    ]

    for field in allowed_fields:
        if field in data:
            update_fields.append(f"{field} = :{field}")

            value = data[field]

            if field == "metric_value":
                value = json.dumps(value)

            params[field] = value

    if not update_fields:
        return get_plan_metric(db, metric_config_id)

    query = text(
        f"""
        UPDATE subscription_plan_metrics
        SET
            {", ".join(update_fields)},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :metric_config_id
        """
    )

    db.execute(query, params)
    db.commit()

    return get_plan_metric(db, metric_config_id)


# ==========================================
# DELETE
# ==========================================

def delete_plan_metric(db, metric_config_id: int):
    existing = get_plan_metric(db, metric_config_id)

    if not existing:
        return None

    query = text(
        """
        DELETE FROM subscription_plan_metrics
        WHERE id = :metric_config_id
        """
    )

    db.execute(
        query,
        {
            "metric_config_id": metric_config_id
        }
    )

    db.commit()

    return existing