from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import tenant_events_controller
from app.database.database import get_nexora_db
from app.schemas.tenant_event_schema import EventPayload
from app.utils.security import require_service_key

router = APIRouter(
    prefix="/api/v1/admin", tags=["tenant-events"],
    dependencies=[Depends(require_service_key)],
)


@router.get("/clients/{client_id}/projects/{project_id}/events")
def list_events(client_id: str, project_id: str, db: Session = Depends(get_nexora_db)):
    return tenant_events_controller.list_events(client_id, project_id, db)


@router.get("/clients/{client_id}/projects/{project_id}/events/{event_id}")
def get_event(client_id: str, project_id: str, event_id: int, db: Session = Depends(get_nexora_db)):
    return tenant_events_controller.get_event(client_id, project_id, event_id, db)


@router.post("/clients/{client_id}/projects/{project_id}/events", status_code=201)
def create_event(client_id: str, project_id: str, payload: EventPayload, db: Session = Depends(get_nexora_db)):
    return tenant_events_controller.create_event(client_id, project_id, payload, db)


@router.put("/clients/{client_id}/projects/{project_id}/events/{event_id}")
def update_event(client_id: str, project_id: str, event_id: int, payload: EventPayload, db: Session = Depends(get_nexora_db)):
    return tenant_events_controller.update_event(client_id, project_id, event_id, payload, db)


@router.delete("/clients/{client_id}/projects/{project_id}/events/{event_id}")
def discard_event(client_id: str, project_id: str, event_id: int, db: Session = Depends(get_nexora_db)):
    return tenant_events_controller.discard_event(client_id, project_id, event_id, db)
