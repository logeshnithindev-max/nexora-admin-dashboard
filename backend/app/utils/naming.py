import re
import secrets
from dataclasses import dataclass

from app.schemas.workspace_schema import WorkspaceRequest


def slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return value[:32] or "tenant"


def trusted_identifier(value: str, label: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]+", value):
        raise RuntimeError(f"{label} may contain only letters, numbers and underscores")
    return value


def generated_id(name: str) -> str:
    prefix = slug(name).replace("_", "-")[:44]
    suffix = "".join(secrets.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(5))
    return f"{prefix}-{suffix}"


def generated_project_id(client_name: str, project_name: str) -> str:
    client = slug(client_name).replace("_", "-")
    project = slug(project_name).replace("_", "-")
    prefix = f"{client}-{project}"[:44].rstrip("-")
    suffix = "".join(secrets.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(5))
    return f"{prefix}-{suffix}"


def generated_project_key(client_id: str, project_id: str) -> str:
    suffix = secrets.token_urlsafe(24)
    return f"{client_id}-{project_id}-key-{suffix}"[:255]


@dataclass(frozen=True)
class Names:
    client_id: str
    project_id: str
    project_key: str
    mysql: str
    clickhouse: str


def names_for(payload: WorkspaceRequest) -> Names:
    client_id = payload.client.client_id or generated_id(payload.client.name)
    project_id = payload.project.project_id or generated_project_id(
        payload.client.name, payload.project.name
    )
    base = f"nexora_{slug(client_id)}_{slug(project_id)}"[:60]
    project_key = generated_project_key(client_id, project_id)
    return Names(client_id, project_id, project_key, base, base)
