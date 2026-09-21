from sqlalchemy.orm import Session

from app.schemas.workspace_schema import WorkspaceRequest
from app.services import workspace_service


def onboard_workspace(
    payload: WorkspaceRequest,
    idempotency_key: str | None,
    nexora_db: Session,
    admin_db: Session,
):
    return workspace_service.create_workspace(nexora_db, admin_db, payload, idempotency_key)


def list_workspaces(nexora_db: Session):
    return workspace_service.list_workspaces(nexora_db)


def list_onboarding_jobs(admin_db: Session):
    return workspace_service.list_onboarding_jobs(admin_db)


def get_onboarding_job(job_id: str, admin_db: Session):
    return workspace_service.get_onboarding_job(admin_db, job_id)
