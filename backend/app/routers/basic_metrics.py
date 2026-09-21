import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.database import get_nexora_db
from app.schemas.metric_schema import MetricCreate
from app.controllers.basic_metric_controller import create_metric

router = APIRouter(
    prefix="/api/v1/admin",
    # dependencies=[Depends(require_service_key)],
)


@router.get("/basic-metrics")
def get_basic_metrics(db: Session = Depends(get_nexora_db)):
    rows = db.execute(
        text("""
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
    ).mappings().all()

    return [
        {
            "id": row["id"],
            "metric_name": row["metric_name"],
            "metric_key": row["metric_key"],
            "config_json": row["config_json"],
            "is_active": row["is_active"],
        }
        for row in rows
    ]


@router.post("/basic-metrics")
def create_metric_route(
    data: MetricCreate,
    db: Session = Depends(get_nexora_db)
):
    return create_metric(data, db)


@router.put("/basic-metrics/{metric_id}")
def update_basic_metric(
    metric_id: int,
    data: MetricCreate,
    db: Session = Depends(get_nexora_db)
):
    # Edit is now allowed for every metric, including default/mandatory ones.
    existing = db.execute(
        text("SELECT id FROM basic_metric_config WHERE id = :id"),
        {"id": metric_id}
    ).mappings().first()

    if not existing:
        raise HTTPException(status_code=404, detail="Metric not found")

    try:
        db.execute(
            text("""
                UPDATE basic_metric_config
                SET metric_name = :metric_name,
                    metric_key = :metric_key,
                    config_json = :config_json,
                    is_active = :is_active
                WHERE id = :id
            """),
            {
                "id": metric_id,
                "metric_name": data.metric_name,
                "metric_key": data.metric_key,
                "config_json": json.dumps([field.model_dump() for field in data.config_json]),
                "is_active": int(data.is_active),
            }
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not update this metric — check that the field values are valid."
        ) from exc

    return {"success": True}


@router.delete("/basic-metrics/{metric_id}")
def delete_basic_metric(
    metric_id: int,
    db: Session = Depends(get_nexora_db)
):
    # Delete is now allowed for every metric, including default/mandatory ones.
    existing = db.execute(
        text("SELECT id FROM basic_metric_config WHERE id = :id"),
        {"id": metric_id}
    ).mappings().first()

    if not existing:
        raise HTTPException(status_code=404, detail="Metric not found")

    try:
        db.execute(
            text("DELETE FROM basic_metric_config WHERE id = :id"),
            {"id": metric_id}
        )
        db.commit()
    except IntegrityError as exc:
        # This metric is still referenced by another table (e.g. a
        # subscription plan that has this metric configured). Surface a
        # clean, actionable error instead of a bare 500.
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                "This metric is currently used by one or more subscription plans "
                "and can't be deleted. Remove it from those plans first, or "
                "deactivate it instead of deleting it."
            )
        ) from exc

    return {"success": True}