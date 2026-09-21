from sqlalchemy.orm import Session

from app.schemas.tenant_event_schema import EventPayload
from app.services import tenant_event_service


def list_events(client_id: str, project_id: str, db: Session):
    return tenant_event_service.list_events(db, client_id, project_id)


def get_event(client_id: str, project_id: str, event_id: int, db: Session):
    return tenant_event_service.get_event(db, client_id, project_id, event_id)


def create_event(client_id: str, project_id: str, payload: EventPayload, db: Session):
    return tenant_event_service.create_event(db, client_id, project_id, payload)


def update_event(client_id: str, project_id: str, event_id: int, payload: EventPayload, db: Session):
    return tenant_event_service.update_event(db, client_id, project_id, event_id, payload)


def discard_event(client_id: str, project_id: str, event_id: int, db: Session):
    return tenant_event_service.discard_event(db, client_id, project_id, event_id)
