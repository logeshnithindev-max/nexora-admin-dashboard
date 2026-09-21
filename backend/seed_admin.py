"""Create or update a local Nexora admin login.

Run from backend/: python seed_admin.py
Override defaults with --email, --password and --name.
"""
import argparse

from passlib.context import CryptContext
from sqlalchemy import text

from app.database.database import AdminSession


passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", default="admin@nexora.local")
    parser.add_argument("--password", default="NexoraAdmin@2026")
    parser.add_argument("--name", default="Nexora Administrator")
    args = parser.parse_args()

    with AdminSession() as db:
        role_id = db.execute(text("SELECT id FROM roles WHERE name='super_admin' LIMIT 1")).scalar()
        if role_id is None:
            result = db.execute(text(
                "INSERT INTO roles (name,description,is_active) "
                "VALUES ('super_admin','Full Nexora administration access',1)"
            ))
            role_id = result.lastrowid

        password_hash = passwords.hash(args.password)
        db.execute(text(
            "INSERT INTO admin_users "
            "(email,full_name,hashed_password,role_id,is_active,is_email_verified,created_by) "
            "VALUES (:email,:name,:password,:role,1,1,'seed_admin.py') "
            "ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),"
            "hashed_password=VALUES(hashed_password),role_id=VALUES(role_id),"
            "is_active=1,is_email_verified=1,updated_by='seed_admin.py'"
        ), {"email": args.email.lower(), "name": args.name,
            "password": password_hash, "role": role_id})
        db.commit()

    print(f"Admin login ready: {args.email}")
    print("Change this sample password after first login.")


if __name__ == "__main__":
    main()
