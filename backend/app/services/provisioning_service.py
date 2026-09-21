import json
import re

import pymysql
from clickhouse_driver import Client as ClickHouseClient

from app.schemas.workspace_schema import TenantUserInput
from app.utils.config import settings
from app.utils.errors import ProvisioningPhaseError, log_phase_failure, log_step
from app.utils.naming import trusted_identifier
from app.utils.security import tenant_password_hash

TENANT_TABLES = (
    "campaign_control_groups", "campaign_stages", "campaigns", "campaign_templates",
    "campaign_status", "chat_messages", "chat_threads", "csv_upload",
    "flowboard_control_groups", "flowboard_templates", "flowboard_status",
    "flowboard_nodes", "lead_activities", "lead_followups", "lead_note_attachments",
    "lead_notes", "lead_notifications", "lead_sources", "lead_stage_history", "leads",
    "master_event_property_mapping_rules", "otps", "pipeline_stages", "segmentation",
    "template_asset_folders", "template_asset_images", "template_asset_videos", "templates",
    "users",
)
DEFAULT_TENANT_ROLE_CODE = "free_trial"


def _mysql_connection(database: str | None = None):
    return pymysql.connect(
        host=settings.MYSQL_HOST,
        port=settings.MYSQL_PORT,
        user=settings.MYSQL_ADMIN_USER,
        password=settings.MYSQL_ADMIN_PASSWORD,
        database=database,
        charset="utf8mb4",
        autocommit=False,
    )


def provision_mysql(
    target: str, client_id: str, project_id: str,
    user: TenantUserInput | None = None,
) -> None:
    source = trusted_identifier(settings.MYSQL_TEMPLATE_DATABASE, "MYSQL_TEMPLATE_DATABASE")
    app_user = trusted_identifier(settings.MYSQL_APP_USER, "MYSQL_APP_USER")
    phase = "mysql.connect"
    log_step(phase, "started", database=target)
    try:
        connection = _mysql_connection()
    except Exception as exc:
        log_phase_failure(phase, exc, database=target)
        raise ProvisioningPhaseError(phase, exc) from exc
    log_step(phase, "completed", database=target)
    try:
        with connection.cursor() as cursor:
            phase = "mysql.create_database"
            log_step(phase, "started", database=target)
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{target}` CHARACTER SET utf8mb4")
            log_step(phase, "completed", database=target)
            phase = "mysql.discover_template_tables"
            log_step(phase, "started", template=source)
            cursor.execute(
                "SELECT TABLE_NAME FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA=%s AND TABLE_TYPE='BASE TABLE'", (source,)
            )
            tables = [row[0] for row in cursor.fetchall()]
            if not tables:
                raise RuntimeError(f"MySQL template database '{source}' has no tables")
            log_step(phase, "completed", template=source, table_count=len(tables))
            cursor.execute("SET FOREIGN_KEY_CHECKS=0")
            for table in tables:
                phase = "mysql.clone_table"
                log_step(phase, "started", table=table, database=target)
                cursor.execute(f"CREATE TABLE IF NOT EXISTS `{target}`.`{table}` LIKE `{source}`.`{table}`")
                cursor.execute(f"SELECT COUNT(*) FROM `{target}`.`{table}`")
                if cursor.fetchone()[0] == 0:
                    cursor.execute(f"INSERT INTO `{target}`.`{table}` SELECT * FROM `{source}`.`{table}`")
                log_step(phase, "completed", table=table, database=target)
            for table in TENANT_TABLES:
                if table in tables:
                    phase = "mysql.clear_tenant_table"
                    log_step(phase, "started", table=table, database=target)
                    cursor.execute(f"TRUNCATE TABLE `{target}`.`{table}`")
                    log_step(phase, "completed", table=table, database=target)
            for table in ("master_event_properties", "master_event_types", "master_events"):
                if table in tables:
                    phase = "mysql.assign_master_tenant"
                    log_step(phase, "started", table=table)
                    cursor.execute(
                        f"UPDATE `{target}`.`{table}` SET client_id=%s, project_id=%s",
                        (client_id, project_id),
                    )
                    log_step(phase, "completed", table=table)
            if "master_roles" in tables:
                phase = "mysql.find_free_trial_role"
                log_step(phase, "started", role_code=DEFAULT_TENANT_ROLE_CODE)
                cursor.execute(
                    f"SELECT id FROM `{target}`.`master_roles` WHERE code=%s LIMIT 1",
                    (DEFAULT_TENANT_ROLE_CODE,),
                )
                role = cursor.fetchone()
                if role is None:
                    raise RuntimeError(
                        f"MySQL template is missing the '{DEFAULT_TENANT_ROLE_CODE}' role"
                    )
                free_trial_role_id = role[0]
                log_step(phase, "completed", role_id=free_trial_role_id)
                phase = "mysql.assign_roles_to_tenant"
                log_step(phase, "started")
                cursor.execute(
                    f"UPDATE `{target}`.`master_roles` SET client_id=%s, project_id=%s",
                    (client_id, json.dumps([project_id])),
                )
                log_step(phase, "completed")
                if "privilege_mappings" in tables:
                    phase = "mysql.filter_free_trial_privileges"
                    log_step(phase, "started", role_id=free_trial_role_id)
                    cursor.execute(
                        f"DELETE FROM `{target}`.`privilege_mappings` WHERE role_id <> %s",
                        (free_trial_role_id,),
                    )
                    cursor.execute(
                        f"UPDATE `{target}`.`privilege_mappings` "
                        "SET client_id=%s, project_id=%s WHERE role_id=%s",
                        (client_id, project_id, free_trial_role_id),
                    )
                    log_step(phase, "completed", role_id=free_trial_role_id)
                if user is not None:
                    if "users" not in tables:
                        raise RuntimeError("MySQL template is missing the users table")
                    if not user.password:
                        raise RuntimeError("tenant user password was not prepared")
                    phase = "mysql.create_tenant_user"
                    log_step(phase, "started", email=user.email)
                    cursor.execute(
                        f"INSERT INTO `{target}`.`users` "
                        "(name,email,mobile,role,role_id,is_system_user,client_id,project_id,password,timezone) "
                        "VALUES (%s,%s,%s,%s,%s,'no',%s,%s,%s,%s)",
                        (
                            user.name, user.email, user.mobile, DEFAULT_TENANT_ROLE_CODE,
                            free_trial_role_id, client_id, json.dumps([project_id]),
                            tenant_password_hash(user.password), user.timezone,
                        ),
                    )
                    log_step(phase, "completed", email=user.email)
            elif "privilege_mappings" in tables:
                raise RuntimeError(
                    "MySQL template contains privilege_mappings but no master_roles table"
                )
            phase = "mysql.grant_application_user"
            log_step(phase, "started", database=target, user=app_user)
            cursor.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON `{target}`.* TO '{app_user}'@'%'")
            log_step(phase, "completed", database=target, user=app_user)
            cursor.execute("SET FOREIGN_KEY_CHECKS=1")
        phase = "mysql.commit"
        log_step(phase, "started", database=target)
        connection.commit()
        log_step(phase, "completed", database=target)
    except Exception as exc:
        connection.rollback()
        log_phase_failure(phase, exc, database=target)
        if isinstance(exc, ProvisioningPhaseError):
            raise
        raise ProvisioningPhaseError(phase, exc) from exc
    finally:
        connection.close()


def provision_clickhouse(target: str) -> None:
    source = trusted_identifier(settings.CLICKHOUSE_TEMPLATE_DATABASE, "CLICKHOUSE_TEMPLATE_DATABASE")
    app_user = trusted_identifier(settings.CLICKHOUSE_APP_USER, "CLICKHOUSE_APP_USER")
    phase = "clickhouse.connect"
    log_step(phase, "started", database=target)
    try:
        client = ClickHouseClient(
            host=settings.CLICKHOUSE_HOST, port=settings.CLICKHOUSE_PORT,
            user=settings.CLICKHOUSE_ADMIN_USER, password=settings.CLICKHOUSE_ADMIN_PASSWORD,
        )
        client.execute("SELECT 1")
        log_step(phase, "completed", database=target)
        phase = "clickhouse.create_database"
        log_step(phase, "started", database=target)
        client.execute(f"CREATE DATABASE IF NOT EXISTS `{target}`")
        log_step(phase, "completed", database=target)
        phase = "clickhouse.discover_template_tables"
        log_step(phase, "started", template=source)
        ordinary = client.execute(
            "SELECT name FROM system.tables WHERE database=%(source)s "
            "AND engine NOT IN ('MaterializedView','View','LiveView','WindowView')",
            {"source": source},
        )
        if not ordinary:
            raise RuntimeError(f"ClickHouse template database '{source}' has no tables")
        log_step(phase, "completed", template=source, table_count=len(ordinary))
        for (table,) in ordinary:
            phase = "clickhouse.clone_table"
            log_step(phase, "started", table=table, database=target)
            client.execute(f"CREATE TABLE IF NOT EXISTS `{target}`.`{table}` AS `{source}`.`{table}`")
            log_step(phase, "completed", table=table, database=target)
        phase = "clickhouse.discover_materialized_views"
        log_step(phase, "started", template=source)
        views = client.execute(
            "SELECT name, create_table_query FROM system.tables "
            "WHERE database=%(source)s AND engine='MaterializedView'",
            {"source": source},
        )
        log_step(phase, "completed", view_count=len(views))
        for name, ddl in views:
            phase = "clickhouse.create_materialized_view"
            log_step(phase, "started", view=name, database=target)
            rewritten = ddl.replace(f"`{source}`.", f"`{target}`.").replace(f"{source}.", f"{target}.")
            rewritten = re.sub(r"CREATE MATERIALIZED VIEW", "CREATE MATERIALIZED VIEW IF NOT EXISTS", rewritten, count=1)
            client.execute(rewritten)
            log_step(phase, "completed", view=name, database=target)
        phase = "clickhouse.grant_application_user"
        log_step(phase, "started", database=target, user=app_user)
        client.execute(f"GRANT SELECT, INSERT, ALTER, DELETE ON `{target}`.* TO `{app_user}`")
        log_step(phase, "completed", database=target, user=app_user)
    except Exception as exc:
        log_phase_failure(phase, exc, database=target)
        if isinstance(exc, ProvisioningPhaseError):
            raise
        raise ProvisioningPhaseError(phase, exc) from exc
