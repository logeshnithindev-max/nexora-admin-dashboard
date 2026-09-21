import json

from sqlalchemy.orm import Session

from app.repositories import subscription_plan_metric_repository


# ==========================================
# GET ALL
# ==========================================

def get_all_plan_metrics(db: Session):
    metrics = (
        subscription_plan_metric_repository
        .get_all_plan_metrics(db)
    )

    return [
        _build_metric_response(metric)
        for metric in metrics
    ]


# ==========================================
# GET BY ID
# ==========================================

def get_plan_metric_by_id(
    db: Session,
    metric_config_id: int
):
    metric = (
        subscription_plan_metric_repository
        .get_plan_metric(db, metric_config_id)
    )

    if not metric:
        return None

    return _build_metric_response(metric)


# ==========================================
# CREATE
# ==========================================

def create_plan_metric(
    db: Session,
    data
):
    payload = data.model_dump(
        exclude_unset=True
    )

    metric = (
        subscription_plan_metric_repository
        .create_plan_metric(db, payload)
    )

    return _build_metric_response(metric)


# ==========================================
# UPDATE
# ==========================================

def update_plan_metric(
    db: Session,
    metric_config_id: int,
    data
):
    payload = data.model_dump(
        exclude_unset=True
    )

    metric = (
        subscription_plan_metric_repository
        .update_plan_metric(
            db,
            metric_config_id,
            payload
        )
    )

    if not metric:
        return None

    return _build_metric_response(metric)


# ==========================================
# DELETE
# ==========================================

def delete_plan_metric(
    db: Session,
    metric_config_id: int
):
    metric = (
        subscription_plan_metric_repository
        .delete_plan_metric(
            db,
            metric_config_id
        )
    )

    if not metric:
        return None

    return {
        "message": "Subscription plan metric deleted successfully",
        "id": metric["id"]
    }


# ==========================================
# RESPONSE BUILDER
# ==========================================

def _build_metric_response(metric):
    metric_value = metric["metric_value"]

    if isinstance(metric_value, str):
        try:
            metric_value = json.loads(metric_value)
        except json.JSONDecodeError:
            metric_value = {}

    return {
        "id": metric["id"],
        "plan_id": metric["plan_id"],
        "metric_id": metric["metric_id"],
        "metric_value": metric_value or {},
        "metric_type": metric["metric_type"],
        "channel_id": metric["channel_id"],

        "metric_name": metric.get("metric_name"),
        "metric_key": metric.get("metric_key"),
        "channel_name": metric.get("channel_name"),

        "created_at": metric["created_at"],
        "updated_at": metric["updated_at"],
    }