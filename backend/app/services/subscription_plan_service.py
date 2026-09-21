
from sqlalchemy.orm import Session

from app.repositories import subscription_plan_repository


# ==========================================
# GET ALL
# ==========================================

def get_all_plans(db: Session):

    plans = subscription_plan_repository.get_all_plans(db)

    return [
        _build_plan_response(db, plan)
        for plan in plans
    ]


# ==========================================
# GET BY ID
# ==========================================

def get_plan_by_id(
    db: Session,
    plan_id: int
):

    plan = subscription_plan_repository.get_plan_by_id(
        db,
        plan_id
    )

    if not plan:
        return None

    return _build_plan_response(db, plan)


# ==========================================
# CREATE
# ==========================================

def create_plan(
    db: Session,
    data
):

    plan = subscription_plan_repository.create_plan(
        db,
        data
    )

    return _build_plan_response(db, plan)


# ==========================================
# UPDATE
# ==========================================

def update_plan(
    db: Session,
    plan_id: int,
    data
):

    plan = subscription_plan_repository.update_plan(
        db,
        plan_id,
        data
    )

    if not plan:
        return None

    return _build_plan_response(db, plan)


# ==========================================
# DELETE / ARCHIVE
# ==========================================

def archive_plan(
    db: Session,
    plan_id: int
):

    plan = subscription_plan_repository.archive_plan(
        db,
        plan_id
    )

    if not plan:
        return None

    return {
        "message": "Subscription plan archived successfully",
        "id": plan.id
    }


# ==========================================
# BUILD RESPONSE
# ==========================================

def _build_plan_response(db, plan):

    metrics = subscription_plan_repository.get_plan_metrics(
        db,
        plan.id
    )

    limits = []

    for metric in metrics:

        metric_value = metric["metric_value"]

        limits.append({
            "id": metric["id"],
            "plan_id": metric["plan_id"],
            "metric_id": metric["metric_id"],
            "metric_type": metric["metric_type"],
            "channel_id": metric["channel_id"],
            "metric_value": metric_value,
            "created_at": metric["created_at"],
            "updated_at": metric["updated_at"],
        })

    return {
        "id": plan.id,
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "currency": plan.currency,
        "base_price": plan.base_price,
        "billing_interval": plan.billing_interval,
        "interval_days": plan.interval_days,
        "is_custom": plan.is_custom,
        "status": plan.status,
        "created_at": plan.created_at,
        "updated_at": plan.updated_at,
        "limits": limits,
    }