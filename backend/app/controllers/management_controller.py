from sqlalchemy.orm import Session

from app.schemas.management_schema import ClientUpdate, ProjectUpdate

from app.services import management_service


def dashboard(db: Session):
    return management_service.dashboard(db)


def list_clients(db: Session):
    return management_service.list_clients(db)


def client_projects(client_id: str, db: Session):
    return management_service.client_projects(db, client_id)


def update_client(client_id: str, payload: ClientUpdate, db: Session):
    return management_service.update_client(db, client_id, payload)


def deactivate_client(client_id: str, db: Session):
    return management_service.deactivate_client(db, client_id)


def update_project(client_id: str, project_id: str, payload: ProjectUpdate, db: Session):
    return management_service.update_project(db, client_id, project_id, payload)


def deactivate_project(client_id: str, project_id: str, db: Session):
    return management_service.deactivate_project(db, client_id, project_id)



def usage(db: Session):
    return management_service.usage(db)