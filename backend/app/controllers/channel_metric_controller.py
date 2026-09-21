from http.client import HTTPException

from sqlalchemy.orm import Session

from app.schemas.metric_schema import ChannelMetricCreate, ChannelMetricUpdate
from app.services import channel_metric_service


def create_channel_metric(
    data: ChannelMetricCreate,
    db: Session
):
    metric_id = channel_metric_service.create_channel_metric(db, data)

    return {
        "message": "Channel metric created successfully",
        "id": metric_id
    }

# channel_metric_controller.py
def update_channel_metric(metric_id: int, data: ChannelMetricUpdate, db: Session):
    success, existing = channel_metric_service.update_channel_metric(db, metric_id, data)

    if existing is None:
        raise HTTPException(status_code=404, detail="Channel metric not found")

    if not success:
        raise HTTPException(status_code=403, detail="Default metrics cannot be edited")

    return {"message": "Metric updated successfully"}


def delete_channel_metric(metric_id: int, db: Session):
    success, existing = channel_metric_service.delete_channel_metric(db, metric_id)

    if existing is None:
        raise HTTPException(status_code=404, detail="Channel metric not found")

    if not success:
        raise HTTPException(status_code=403, detail="Default metrics cannot be deleted")

    return {"message": "Channel metric deleted successfully"}