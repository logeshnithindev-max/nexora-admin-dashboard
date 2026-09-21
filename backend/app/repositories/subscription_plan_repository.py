
import json

from sqlalchemy import text


# ========================================
# GET ALL
# ========================================

def get_all_plans(db):

    query = text("""
        SELECT
            id,
            code,
            name,
            description,
            currency,
            base_price,
            billing_interval,
            interval_days,
            is_custom,
            status,
            created_at,
            updated_at
        FROM subscription_plans
        ORDER BY id
    """)

    return db.execute(query).fetchall()


# ==========================================
# GET BY ID
# ==========================================

def get_plan_by_id(db, plan_id):

    query = text("""
        SELECT
            id,
            code,
            name,
            description,
            currency,
            base_price,
            billing_interval,
            interval_days,
            is_custom,
            status,
            created_at,
            updated_at
        FROM subscription_plans
        WHERE id = :plan_id
    """)

    return db.execute(
        query,
        {"plan_id": plan_id}
    ).first()


# ==========================================
# GET PLAN METRICS
# ==========================================

def get_plan_metrics(db, plan_id):

    query = text("""
        SELECT
            id,
            plan_id,
            metric_id,
            metric_type,
            channel_id,
            metric_value,
            created_at,
            updated_at
        FROM subscription_plan_metrics
        WHERE plan_id = :plan_id
        ORDER BY id
    """)

    return db.execute(
        query,
        {"plan_id": plan_id}
    ).mappings().all()


# ==========================================
# METRIC VALUE SERIALIZER
# ==========================================

def serialize_metric_value(value):

    if value is None:
        return None

    if isinstance(value, str):
        return value

    return json.dumps(value)


# ==========================================
# SAVE PLAN METRICS
# ==========================================

def save_plan_metrics(db, plan_id, limits):

    db.execute(
        text("""
            DELETE FROM subscription_plan_metrics
            WHERE plan_id = :plan_id
        """),
        {"plan_id": plan_id}
    )

    metric_query = text("""
        INSERT INTO subscription_plan_metrics (
            plan_id,
            metric_id,
            metric_type,
            channel_id,
            metric_value
        )
        VALUES (
            :plan_id,
            :metric_id,
            :metric_type,
            :channel_id,
            :metric_value
        )
    """)

    for limit in limits:

        db.execute(
            metric_query,
            {
                "plan_id": plan_id,
                "metric_id": limit.metric_id,
                "metric_type": limit.metric_type,
                "channel_id": limit.channel_id,
                "metric_value": serialize_metric_value(
                    limit.metric_value
                ),
            }
        )


# ==========================================
# CREATE
# ==========================================

def create_plan(db, data):

    query = text("""
        INSERT INTO subscription_plans (
            code,
            name,
            description,
            currency,
            base_price,
            billing_interval,
            interval_days,
            is_custom,
            status
        )
        VALUES (
            :code,
            :name,
            :description,
            :currency,
            :base_price,
            :billing_interval,
            :interval_days,
            :is_custom,
            :status
        )
    """)

    result = db.execute(
        query,
        {
            "code": data.code,
            "name": data.name,
            "description": data.description,
            "currency": data.currency,
            "base_price": data.base_price,
            "billing_interval": data.billing_interval,
            "interval_days": data.interval_days,
            "is_custom": data.is_custom,
            "status": data.status,
        }
    )

    plan_id = result.lastrowid

    save_plan_metrics(
        db,
        plan_id,
        data.limits
    )

    db.commit()

    return get_plan_by_id(
        db,
        plan_id
    )


# ==========================================
# UPDATE
# ==========================================

def update_plan(db, plan_id, data):

    existing = get_plan_by_id(
        db,
        plan_id
    )

    if not existing:
        return None

    update_data = data.model_dump(
        exclude_unset=True,
        exclude={"limits"}
    )

    if update_data:

        fields = []
        params = {
            "plan_id": plan_id
        }

        allowed_fields = {
            "code",
            "name",
            "description",
            "currency",
            "base_price",
            "billing_interval",
            "interval_days",
            "is_custom",
            "status",
        }

        for field, value in update_data.items():

            if field not in allowed_fields:
                continue

            fields.append(
                f"{field} = :{field}"
            )

            params[field] = value

        if fields:

            fields.append(
                "updated_at = CURRENT_TIMESTAMP"
            )

            query = text(f"""
                UPDATE subscription_plans
                SET
                    {", ".join(fields)}
                WHERE id = :plan_id
            """)

            db.execute(
                query,
                params
            )

    # Save metrics only when limits is included
    if data.limits is not None:

        save_plan_metrics(
            db,
            plan_id,
            data.limits
        )

    db.commit()

    return get_plan_by_id(
        db,
        plan_id
    )


# ==========================================
# ARCHIVE
# ==========================================

def archive_plan(db, plan_id):

    existing = get_plan_by_id(
        db,
        plan_id
    )

    if not existing:
        return None

    query = text("""
        UPDATE subscription_plans
        SET
            status = 'archived',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :plan_id
    """)

    db.execute(
        query,
        {"plan_id": plan_id}
    )

    db.commit()

    return get_plan_by_id(
        db,
        plan_id
    )