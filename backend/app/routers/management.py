from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.invoice_metrics_service import list_invoice_metrics
from app.controllers import management_controller
from app.database.database import get_admin_db, get_nexora_db
from app.schemas.management_schema import (
    ClientUpdate,
    ProjectUpdate,
)
from app.utils.security import require_service_key


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["commercial-management"],
    dependencies=[Depends(require_service_key)],
)


# ============================================================
# Dashboard
# ============================================================

@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_nexora_db),
):
    return management_controller.dashboard(db)


# ============================================================
# Clients
# ============================================================

@router.get("/clients")
def clients(
    db: Session = Depends(get_nexora_db),
):
    return management_controller.list_clients(db)


@router.get("/clients/{client_id}/projects")
def client_projects(
    client_id: str,
    db: Session = Depends(get_nexora_db),
):
    return management_controller.client_projects(
        client_id,
        db,
    )


@router.put("/clients/{client_id}")
def update_client(
    client_id: str,
    payload: ClientUpdate,
    db: Session = Depends(get_nexora_db),
):
    return management_controller.update_client(
        client_id,
        payload,
        db,
    )


@router.delete("/clients/{client_id}")
def deactivate_client(
    client_id: str,
    db: Session = Depends(get_nexora_db),
):
    return management_controller.deactivate_client(
        client_id,
        db,
    )


# ============================================================
# Projects
# ============================================================

@router.put("/clients/{client_id}/projects/{project_id}")
def update_project(
    client_id: str,
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_nexora_db),
):
    return management_controller.update_project(
        client_id,
        project_id,
        payload,
        db,
    )


@router.delete("/clients/{client_id}/projects/{project_id}")
def deactivate_project(
    client_id: str,
    project_id: str,
    db: Session = Depends(get_nexora_db),
):
    return management_controller.deactivate_project(
        client_id,
        project_id,
        db,
    )


# ============================================================
# Usage
# ============================================================

@router.get("/usage")
def usage(
    db: Session = Depends(get_nexora_db),
):
    return management_controller.usage(db)


@router.get("/invoice-metrics")
def get_invoice_metrics(
    db: Session = Depends(get_nexora_db),
):
    return list_invoice_metrics(db)
