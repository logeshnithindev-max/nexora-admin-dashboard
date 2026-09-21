import logging

from app.utils.config import settings

logger = logging.getLogger("nexora.provisioning")
logger.setLevel(logging.INFO)


class ProvisioningPhaseError(RuntimeError):
    def __init__(self, phase: str, error: Exception):
        self.phase = phase
        self.original_type = type(error).__name__
        super().__init__(f"{phase} failed: {error}")


def log_step(phase: str, status: str, **context) -> None:
    details = " ".join(f"{key}={value}" for key, value in context.items() if value is not None)
    print(phase)
    print(status)
    logger.info("[workspace] phase=%s status=%s%s", phase, status, f" {details}" if details else "")


def log_phase_failure(phase: str, exc: Exception, **context) -> None:
    """Shared error-logging call used by each provisioning phase's except block."""
    details = " ".join(f"{key}={value}" for key, value in context.items() if value is not None)
    logger.error(
        "[workspace] phase=%s status=failed%s error_type=%s error=%s",
        phase, f" {details}" if details else "", type(exc).__name__, safe_error(exc),
    )


def safe_error(exc: Exception) -> str:
    message = str(exc)
    for secret in (
        settings.MYSQL_ADMIN_PASSWORD, settings.MYSQL_APP_PASSWORD,
        settings.CLICKHOUSE_ADMIN_PASSWORD, settings.CLICKHOUSE_APP_PASSWORD,
        settings.SENDGRID_API_KEY,
    ):
        if secret:
            message = message.replace(secret, "[redacted]")
    return message[:500]