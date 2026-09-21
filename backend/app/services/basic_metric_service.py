from sqlalchemy.orm import Session

from app.repositories import basic_metric_repository


def create_metric(db: Session, data):
    return basic_metric_repository.create_metric(db, data)

# basic_metric_service.py
def update_metric(db: Session, metric_id: int, data):
    existing = basic_metric_repository.get_metric_by_id(db, metric_id)

    if not existing:
        return None, None

    if existing["is_mandatory"] in (True, "yes", 1, "1"):
        return None, existing  # blocked, caller checks existing to raise 403

    basic_metric_repository.update_metric(db, metric_id, data)
    return True, existing


def delete_metric(db: Session, metric_id: int):
    existing = basic_metric_repository.get_metric_by_id(db, metric_id)

    if not existing:
        return None, None

    if existing["is_mandatory"] in (True, "yes", 1, "1"):
        return None, existing

    basic_metric_repository.delete_metric(db, metric_id)
    return True, existing