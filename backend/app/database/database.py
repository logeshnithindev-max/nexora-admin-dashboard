from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.utils.config import settings

Base = declarative_base()

admin_engine = create_engine(
    settings.ADMIN_DATABASE_URL,
    pool_pre_ping=True
)

nexora_engine = create_engine(
    settings.NEXORA_DATABASE_URL,
    pool_pre_ping=True
)

AdminSession = sessionmaker(
    bind=admin_engine,
    autoflush=False,
    expire_on_commit=False
)

NexoraSession = sessionmaker(
    bind=nexora_engine,
    autoflush=False,
    expire_on_commit=False
)

def get_admin_db():
    session = AdminSession()

    try:
        yield session
    finally:
        session.close()

def get_nexora_db():
    session = NexoraSession()

    try:
        yield session
    finally:
        session.close()