from sqlalchemy.orm import Session

from app.schemas.metric_schema import MetricCreate, MetricUpdate
from app.services import basic_metric_service
from fastapi import HTTPException

def create_metric(
    data: MetricCreate,
    db: Session
):
    metric_id = basic_metric_service.create_metric(db, data)

    return {
        "message": "Metric created successfully",
        "id": metric_id
    }


# basic_metric_controller.py
def update_metric(metric_id: int, data: MetricUpdate, db: Session):
    success, existing = basic_metric_service.update_metric(db, metric_id, data)

    if existing is None:
        raise HTTPException(status_code=404, detail="Metric not found")

    if not success:
        raise HTTPException(status_code=403, detail="Default metrics cannot be edited")

    return {"message": "Metric updated successfully"}


def delete_metric(metric_id: int, db: Session):
    success, existing = basic_metric_service.delete_metric(db, metric_id)

    if existing is None:
        raise HTTPException(status_code=404, detail="Metric not found")

    if not success:
        raise HTTPException(status_code=403, detail="Default metrics cannot be deleted")

    return {"message": "Metric deleted successfully"}