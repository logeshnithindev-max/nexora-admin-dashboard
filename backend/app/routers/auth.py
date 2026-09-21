from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import auth_controller
from app.database.database import get_admin_db
from app.schemas.auth_schema import LoginRequest
from app.services.auth_service import current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_admin_db)):
    return auth_controller.login(payload, db)


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return auth_controller.me(user)
