from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import get_admin_db
from app.utils.security import admin_passwords, create_access_token, decode_access_token

bearer = HTTPBearer(auto_error=False)


def _get_admin_user_by_email(db: Session, email: str):
    return db.execute(text(
        "SELECT u.id,u.email,u.full_name,u.hashed_password,u.is_active,r.name AS role "
        "FROM admin_users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.email=:email LIMIT 1"
    ), {"email": email}).mappings().first()


def _get_admin_user_by_id(db: Session, user_id: int):
    return db.execute(text(
        "SELECT u.id,u.email,u.full_name,u.is_active,r.name AS role "
        "FROM admin_users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=:id LIMIT 1"
    ), {"id": user_id}).mappings().first()


def login(db: Session, email: str, password: str) -> dict:
    """Verify admin credentials and issue an access token. Raises HTTPException(401) on failure."""
    user = _get_admin_user_by_email(db, email.lower())
    if not user or not user["is_active"] or not admin_passwords.verify(password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(user["id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"email": user["email"], "full_name": user["full_name"], "role": user["role"]},
    }


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_admin_db),
) -> dict:
    if not credentials:
        raise HTTPException(401, "Authentication required")
    payload = decode_access_token(credentials.credentials)
    user = _get_admin_user_by_id(db, int(payload["sub"]))
    if not user or not user["is_active"]:
        raise HTTPException(401, "User is inactive or missing")
    return dict(user)
