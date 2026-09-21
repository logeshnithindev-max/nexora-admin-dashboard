from sqlalchemy.orm import Session

from app.schemas.auth_schema import LoginRequest
from app.services import auth_service


def login(payload: LoginRequest, db: Session):
    return auth_service.login(db, payload.email, payload.password)


def me(user: dict):
    return user
