from sqlalchemy.orm import Session

from app.repositories import basic_metric_repository, channel_metric_repository


def create_channel_metric(db: Session, data):
    return channel_metric_repository.create_channel_metric(db, data)

# channel_metric_service.py
def update_channel_metric(db: Session, metric_id: int, data):
    existing = channel_metric_repository.get_channel_metric_by_id(db, metric_id)

    if not existing:
        return None, None

    if existing["is_mandatory"] in (True, "yes", 1, "1"):
        return None, existing  # blocked, caller checks existing to raise 403

    channel_metric_repository.update_channel_metric(db, metric_id, data)
    return True, existing


def delete_metric(db: Session, metric_id: int):
    existing = channel_metric_repository.get_metric_by_id(db, metric_id)

    if not existing:
        return None, None

    if existing["is_mandatory"] in (True, "yes", 1, "1"):
        return None, existing

    channel_metric_repository.delete_channel_metric(db, metric_id)
    return True, existing