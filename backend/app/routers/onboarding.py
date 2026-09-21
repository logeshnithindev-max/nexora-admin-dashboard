from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.controllers import onboarding_controller
from app.database.database import get_admin_db, get_nexora_db
from app.schemas.workspace_schema import WorkspaceRequest, WorkspaceResponse
from app.utils.security import require_service_key

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])


@router.post(
    "/workspaces", response_model=WorkspaceResponse, status_code=201,
    dependencies=[Depends(require_service_key)],
)
def onboard_workspace(
    payload: WorkspaceRequest,
    idempotency_key: str | None = Header(None),
    nexora_db: Session = Depends(get_nexora_db),
    admin_db: Session = Depends(get_admin_db),
):
    return onboarding_controller.onboard_workspace(payload, idempotency_key, nexora_db, admin_db)


@router.get("/workspaces", dependencies=[Depends(require_service_key)])
def list_workspaces(nexora_db: Session = Depends(get_nexora_db)):
    return onboarding_controller.list_workspaces(nexora_db)


@router.get("/jobs", dependencies=[Depends(require_service_key)])
def list_onboarding_jobs(admin_db: Session = Depends(get_admin_db)):
    return onboarding_controller.list_onboarding_jobs(admin_db)


@router.get("/jobs/{job_id}", dependencies=[Depends(require_service_key)])
def get_onboarding_job(job_id: str, admin_db: Session = Depends(get_admin_db)):
    return onboarding_controller.get_onboarding_job(job_id, admin_db)
