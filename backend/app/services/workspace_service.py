import hashlib
import json
import uuid

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.workspace_schema import WorkspaceRequest, WorkspaceResponse
from app.services import provisioning_service
from app.services.email_service import send_workspace_email
from app.utils.config import settings
from app.utils.errors import ProvisioningPhaseError, log_phase_failure, log_step, safe_error
from app.utils.naming import Names, names_for, slug
from app.utils.security import generate_strong_password


def _json_value(value):
    return json.loads(value) if isinstance(value, str) else value


def _existing(nexora_db: Session, client_id: str, project_id: str):
    return nexora_db.execute(text(
        "SELECT p.project_key, c.name, p.name FROM master_projects p "
        "JOIN master_clients c ON c.client_id=p.client_id "
        "WHERE p.client_id=:client_id AND p.project_id=:project_id LIMIT 1"
    ), {"client_id": client_id, "project_id": project_id}).first()


def _begin_job(admin_db: Session, payload: WorkspaceRequest, n: Names, key: str | None):
    canonical = payload.model_dump_json(exclude={"dry_run"})
    request_hash = hashlib.sha256(canonical.encode()).hexdigest()
    audit_payload = payload.model_dump(mode="json", exclude={"dry_run"})
    if audit_payload.get("user"):
        audit_payload["user"]["password"] = "[redacted]"
    audit_json = json.dumps(audit_payload, separators=(",", ":"))
    idempotency_key = key or f"generated:{uuid.uuid4()}"
    existing = admin_db.execute(text(
        "SELECT id,request_hash,status,result_json,client_id,project_id FROM onboarding_jobs "
        "WHERE idempotency_key=:key LIMIT 1"
    ), {"key": idempotency_key}).mappings().first()
    if existing:
        if existing["request_hash"] != request_hash:
            raise HTTPException(409, "Idempotency-Key was already used with a different request")
        if existing["status"] == "completed":
            return existing["id"], WorkspaceResponse.model_validate(_json_value(existing["result_json"])), n
        if existing["status"] in ("pending", "running"):
            raise HTTPException(409, "An onboarding job with this Idempotency-Key is already running")
        admin_db.execute(text(
            "UPDATE onboarding_jobs SET status='pending',current_step=NULL,error_code=NULL,error_message=NULL,"
            "attempts=attempts+1,started_at=NULL,completed_at=NULL WHERE id=:id"
        ), {"id": existing["id"]})
        admin_db.commit()
        retry_names = Names(
            existing["client_id"], existing["project_id"], n.project_key,
            f"nexora_{slug(existing['client_id'])}_{slug(existing['project_id'])}"[:60],
            f"nexora_{slug(existing['client_id'])}_{slug(existing['project_id'])}"[:60],
        )
        return existing["id"], None, retry_names
    job_id = str(uuid.uuid4())
    admin_db.execute(text(
        "INSERT INTO onboarding_jobs "
        "(id,idempotency_key,request_hash,client_id,project_id,status,request_json) "
        "VALUES (:id,:key,:hash,:client,:project,'pending',:request)"
    ), {"id": job_id, "key": idempotency_key, "hash": request_hash,
        "client": n.client_id, "project": n.project_id, "request": audit_json})
    admin_db.commit()
    return job_id, None, n


def _job_step(admin_db: Session, job_id: str, step: str, status: str, error: str | None = None):
    admin_db.execute(text(
        "INSERT INTO onboarding_job_steps (job_id,step_name,status,error_message,started_at,completed_at) "
        "VALUES (:job,:step,:status,:error,IF(:status='running',NOW(),NULL),"
        "IF(:status IN ('completed','failed','skipped'),NOW(),NULL)) "
        "ON DUPLICATE KEY UPDATE status=VALUES(status),error_message=VALUES(error_message),"
        "started_at=IF(VALUES(status)='running',NOW(),started_at),"
        "completed_at=IF(VALUES(status) IN ('completed','failed','skipped'),NOW(),NULL)"
    ), {"job": job_id, "step": step, "status": status, "error": error})
    admin_db.execute(text(
        "UPDATE onboarding_jobs SET status=IF(:status='failed','failed','running'),current_step=:step,"
        "started_at=COALESCE(started_at,NOW()) WHERE id=:job"
    ), {"job": job_id, "step": step, "status": status})
    admin_db.commit()


def save_metadata(nexora_db: Session, admin_db: Session, payload: WorkspaceRequest, n: Names) -> None:
    phase = "metadata.client"
    try:
        log_step(phase, "started", client_id=n.client_id)
        if not nexora_db.execute(text(
            "SELECT 1 FROM master_clients WHERE client_id=:id LIMIT 1"
        ), {"id": n.client_id}).first():
            nexora_db.execute(text(
                "INSERT INTO master_clients (client_id,name,status,created_by) "
                "VALUES (:id,:name,:status,'admin-dashboard')"
            ), {"id": n.client_id, "name": payload.client.name, "status": payload.client.status})
        log_step(phase, "completed", client_id=n.client_id)
        phase = "metadata.project"
        log_step(phase, "started", project_id=n.project_id)
        nexora_db.execute(text(
            "INSERT INTO master_projects "
            "(client_id,project_id,project_key,origins,mode,status,name,category,categories,crm_platform,logo_url,created_by) "
            "VALUES (:client,:project,:key,:origins,:mode,'active',:name,:category,:categories,:crm,:logo,'admin-dashboard')"
        ), {
            "client": n.client_id, "project": n.project_id, "key": n.project_key,
            "origins": json.dumps(payload.project.origins), "mode": payload.project.mode,
            "name": payload.project.name, "category": payload.project.category,
            "categories": json.dumps(payload.project.categories),
            "crm": payload.project.crm_platform, "logo": payload.project.logo_url,
        })
        nexora_db.execute(text(
            "INSERT INTO project_provider_configs "
            "(client_id,project_id,provider_code,custom_schema,status) "
            "VALUES (:client,:project,:provider,:schema,'configured')"
        ), {
            "client": n.client_id, "project": n.project_id,
            "provider": payload.project.crm_platform,
            "schema": json.dumps(payload.project.custom_schema) if payload.project.custom_schema else None,
        })
        log_step(phase, "completed", project_id=n.project_id)
        rows = (
            (settings.MYSQL_APP_HOST, settings.MYSQL_PORT, settings.MYSQL_APP_USER, settings.MYSQL_APP_PASSWORD, n.mysql, "mysql"),
            (settings.CLICKHOUSE_APP_HOST, settings.CLICKHOUSE_PORT, settings.CLICKHOUSE_APP_USER, settings.CLICKHOUSE_APP_PASSWORD, n.clickhouse, "clickhouse"),
        )
        for host, port, user, password, database, driver in rows:
            phase = "metadata.database_credential"
            log_step(phase, "started", driver=driver, database=database)
            nexora_db.execute(text(
                "INSERT INTO master_database_credentials "
                "(client_id,project_id,host,port,user,password,database_name,driver) "
                "VALUES (:client,:project,:host,:port,:user,:password,:database,:driver)"
            ), {"client": n.client_id, "project": json.dumps([n.project_id]), "host": host,
                "port": port, "user": user, "password": password, "database": database, "driver": driver})
            log_step(phase, "completed", driver=driver, database=database)
        if payload.subscription:
            s = payload.subscription
            phase = "metadata.subscription"
            log_step(phase, "started", plan_id=s.plan_id)
            nexora_db.execute(text(
                "INSERT INTO client_subscriptions "
                "(plan_id,client_id,project_id,status,starts_on,ends_on,trial_ends_on) "
                "VALUES (:plan,:client,:project,:status,:start,:end,:trial)"
            ), {"plan": s.plan_id, "client": n.client_id, "project": n.project_id,
                "status": s.status, "start": s.start_date, "end": s.end_date, "trial": s.trial_end})
            log_step(phase, "completed", plan_id=s.plan_id)
            if s.channel_ids:
                phase = "metadata.channels"
                log_step(phase, "started", channel_count=len(s.channel_ids))
                nexora_db.execute(text(
                    "INSERT INTO client_specific_channels (client_id,project_id,channel_ids,created_by) "
                    "VALUES (:client,:project,:channels,'admin-dashboard')"
                ), {"client": n.client_id, "project": n.project_id, "channels": json.dumps(s.channel_ids)})
                log_step(phase, "completed", channel_count=len(s.channel_ids))
        # Commit admin metadata first. If the shared commit fails, the API reports
        # the error and the retry-safe stable IDs prevent a second workspace.
        phase = "metadata.commit"
        log_step(phase, "started", client_id=n.client_id, project_id=n.project_id)
        admin_db.commit()
        nexora_db.commit()
        log_step(phase, "completed", client_id=n.client_id, project_id=n.project_id)
    except Exception as exc:
        log_phase_failure(phase, exc, client_id=n.client_id, project_id=n.project_id)
        admin_db.rollback()
        nexora_db.rollback()
        if isinstance(exc, ProvisioningPhaseError):
            raise
        raise ProvisioningPhaseError(phase, exc) from exc


def create_workspace(
    nexora_db: Session, admin_db: Session, payload: WorkspaceRequest,
    idempotency_key: str | None = None,
) -> WorkspaceResponse:
    n = names_for(payload)
    if payload.client.client_id and payload.project.project_id:
        existing = _existing(nexora_db, n.client_id, n.project_id)
        if existing:
            return WorkspaceResponse(
                client_id=n.client_id, project_id=n.project_id, project_key=existing[0],
                mysql_database=n.mysql, clickhouse_database=n.clickhouse, status="ready",
                reused=True, message="Workspace already exists",
            )
    if payload.dry_run:
        return WorkspaceResponse(
            client_id=n.client_id, project_id=n.project_id, project_key=n.project_key,
            mysql_database=n.mysql, clickhouse_database=n.clickhouse, status="planned",
            message="Validation passed; no changes were made",
        )
    job_id, completed, n = _begin_job(admin_db, payload, n, idempotency_key)
    if completed:
        return completed
    runtime_payload = payload
    if payload.user and not payload.user.password:
        generated_user = payload.user.model_copy(
            update={"password": generate_strong_password()}
        )
        runtime_payload = payload.model_copy(update={"user": generated_user})
        log_step("user.generate_temporary_password", "completed", email=generated_user.email)
    current_step = "mysql"
    email_sent = None
    email_error = None
    try:
        _job_step(admin_db, job_id, current_step, "running")
        provisioning_service.provision_mysql(n.mysql, n.client_id, n.project_id, runtime_payload.user)
        _job_step(admin_db, job_id, current_step, "completed")
        current_step = "clickhouse"
        _job_step(admin_db, job_id, current_step, "running")
        provisioning_service.provision_clickhouse(n.clickhouse)
        _job_step(admin_db, job_id, current_step, "completed")
        current_step = "metadata"
        _job_step(admin_db, job_id, current_step, "running")
        save_metadata(nexora_db, admin_db, runtime_payload, n)
        _job_step(admin_db, job_id, current_step, "completed")
        if runtime_payload.send_mail and runtime_payload.user:
            current_step = "email"
            _job_step(admin_db, job_id, current_step, "running")
            log_step("email.send_workspace_credentials", "started", email=runtime_payload.user.email)
            try:
                send_workspace_email(
                    runtime_payload.user, runtime_payload.client.name, runtime_payload.project.name,
                    n.client_id, n.project_id, n.project_key,
                )
                email_sent = True
                log_step("email.send_workspace_credentials", "completed", email=runtime_payload.user.email)
                _job_step(admin_db, job_id, current_step, "completed")
            except Exception as mail_exc:
                email_sent = False
                email_error = safe_error(mail_exc)
                log_phase_failure("email.send_workspace_credentials", mail_exc, email=runtime_payload.user.email)
                _job_step(admin_db, job_id, current_step, "failed", email_error)
    except Exception as exc:
        nexora_db.rollback()
        admin_db.rollback()
        error_message = safe_error(exc)
        failure_phase = getattr(exc, "phase", current_step)
        exception_type = getattr(exc, "original_type", type(exc).__name__)
        error_code = f"{current_step.upper()}_PROVISIONING_FAILED"
        _job_step(admin_db, job_id, current_step, "failed", error_message)
        admin_db.execute(text(
            "UPDATE onboarding_jobs SET status='failed',error_code=:code,"
            "error_message=:error,completed_at=NOW() WHERE id=:job"
        ), {"job": job_id, "code": error_code, "error": error_message})
        admin_db.commit()
        raise HTTPException(500, detail={
            "status": "failed",
            "error_code": error_code,
            "stage": current_step,
            "phase": failure_phase,
            "exception_type": exception_type,
            "message": error_message,
            "onboarding_job_id": job_id,
            "client_id": n.client_id,
            "project_id": n.project_id,
            "mysql_database": n.mysql,
            "clickhouse_database": n.clickhouse,
            "job_status_url": f"/api/v1/onboarding/jobs/{job_id}",
        }) from exc
    result = WorkspaceResponse(
        onboarding_job_id=job_id,
        client_id=n.client_id, project_id=n.project_id, project_key=n.project_key,
        mysql_database=n.mysql, clickhouse_database=n.clickhouse, status="ready",
        email_sent=email_sent, email_error=email_error,
        message=(
            "Workspace created, but the welcome email could not be sent"
            if email_sent is False
            else "Client, project, databases, credentials and subscription created"
        ),
    )
    admin_db.execute(text(
        "UPDATE onboarding_jobs SET status='completed',current_step='completed',result_json=:result,"
        "error_code=NULL,error_message=NULL,completed_at=NOW() WHERE id=:job"
    ), {"job": job_id, "result": result.model_dump_json()})
    admin_db.commit()
    return result


def list_workspaces(nexora_db: Session):
    rows = nexora_db.execute(text(
        "SELECT c.client_id,c.name AS client_name,c.status,p.project_id,p.name AS project_name,"
        "p.mode,p.crm_platform,p.created_at FROM master_clients c "
        "JOIN master_projects p ON p.client_id=c.client_id ORDER BY p.created_at DESC LIMIT 200"
    )).mappings().all()
    return [dict(row) for row in rows]


def list_onboarding_jobs(admin_db: Session):
    rows = admin_db.execute(text(
        "SELECT id,idempotency_key,client_id,project_id,status,current_step,error_code,"
        "error_message,attempts,started_at,completed_at,created_at,updated_at "
        "FROM onboarding_jobs ORDER BY created_at DESC LIMIT 200"
    )).mappings().all()
    return [dict(row) for row in rows]


def get_onboarding_job(admin_db: Session, job_id: str):
    job = admin_db.execute(text(
        "SELECT id,idempotency_key,client_id,project_id,status,current_step,error_code,"
        "error_message,attempts,result_json,started_at,completed_at,created_at,updated_at "
        "FROM onboarding_jobs WHERE id=:id LIMIT 1"
    ), {"id": job_id}).mappings().first()
    if not job:
        raise HTTPException(404, "Onboarding job not found")
    steps = admin_db.execute(text(
        "SELECT step_name,status,error_message,started_at,completed_at "
        "FROM onboarding_job_steps WHERE job_id=:id ORDER BY id"
    ), {"id": job_id}).mappings().all()
    return {**dict(job), "steps": [dict(step) for step in steps]}
