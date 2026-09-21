from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    APP_ENV: str = "development"

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    SERVICE_API_KEY: str = "change-me"
    SECRET_KEY: str = "change-me-too"

    # MySQL
    MYSQL_HOST: str = "127.0.0.1"
    MYSQL_PORT: int = 3306

    MYSQL_ADMIN_USER : str = "root"
    MYSQL_ADMIN_PASSWORD : str = ""

    MYSQL_ROOT_USER: str = "root"
    MYSQL_ROOT_PASSWORD: str = ""

    MYSQL_APP_USER: str = "nexora_client_rw"
    MYSQL_APP_PASSWORD: str = ""

    MYSQL_APP_HOST : str = ""

    MYSQL_ADMIN_DATABASE: str = "nexora_admin"
    MYSQL_TEMPLATE_DATABASE: str = "nexora_dev"
    MYSQL_NEXORA_DATABASE: str = "nexora"

    # ClickHouse
    CLICKHOUSE_HOST: str = "127.0.0.1"
    CLICKHOUSE_PORT: int = 9000

    CLICKHOUSE_ADMIN_USER: str = "default"
    CLICKHOUSE_ADMIN_PASSWORD: str = ""

    CLICKHOUSE_APP_USER: str = "nexora"
    CLICKHOUSE_APP_PASSWORD: str = ""

    CLICKHOUSE_TEMPLATE_DATABASE: str = "nexora_dev"
    CLICKHOUSE_APP_HOST : str = ""

    # Workspace welcome email (SendGrid)
    SENDGRID_API_KEY: str = ""
    EMAIL_FROM_ADDRESS: str = "admin@usenexora.com"
    EMAIL_FROM_NAME: str = "Nexora"
    EMAIL_LOGO_URL: str = "https://usenexora.com/wp-content/uploads/2025/06/logo-ar-final.png"
    CLIENT_DASHBOARD_BASE_URL: str = "https://me.usenexora.com"

    @property
    def ADMIN_DATABASE_URL(self) -> URL:
        return URL.create(
            drivername="mysql+pymysql",
            username=self.MYSQL_ROOT_USER,
            password=self.MYSQL_ROOT_PASSWORD or None,
            host=self.MYSQL_HOST,
            port=self.MYSQL_PORT,
            database=self.MYSQL_ADMIN_DATABASE,
        )

    @property
    def NEXORA_DATABASE_URL(self) -> URL:
        return URL.create(
            drivername="mysql+pymysql",
            username=self.MYSQL_ROOT_USER,
            password=self.MYSQL_ROOT_PASSWORD or None,
            host=self.MYSQL_HOST,
            port=self.MYSQL_PORT,
            database=self.MYSQL_NEXORA_DATABASE,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
