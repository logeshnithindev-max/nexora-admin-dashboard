from datetime import date
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class ClientInput(BaseModel):
    client_id: str | None = Field(None, pattern=r"^[A-Za-z0-9_-]{3,50}$")
    name: str = Field(min_length=2, max_length=255)
    status: Literal["active", "inactive"] = "active"


class ProjectInput(BaseModel):
    project_id: str | None = Field(None, pattern=r"^[A-Za-z0-9_-]{3,50}$")
    name: str = Field(min_length=2, max_length=250)
    mode: Literal["test", "live"] = "test"
    origins: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    crm_platform: str = Field(default="custom", max_length=100)
    category: Literal["growth", "business"] = "growth"
    custom_schema: dict | None = None
    logo_url: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_provider(self):
        if self.crm_platform not in {"salla", "shopify", "zid", "custom"}:
            raise ValueError("provider must be salla, shopify, zid, or custom")
        if self.crm_platform == "custom" and self.custom_schema is not None:
            events = self.custom_schema.get("events")
            if not isinstance(events, list) or not events:
                raise ValueError("custom_schema.events must contain at least one event")
        return self

    @field_validator("origins")
    @classmethod
    def validate_origins(cls, values: list[str]) -> list[str]:
        for value in values:
            if not value.startswith(("http://", "https://")):
                raise ValueError("origins must start with http:// or https://")
        return values


class SubscriptionInput(BaseModel):
    plan_id: int = Field(gt=0)
    status: Literal["active", "paused", "cancelled", "trial"] = "active"
    start_date: date
    end_date: date | None = None
    trial_end: date | None = None
    channel_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        if self.status == "trial" and not self.trial_end:
            raise ValueError("trial_end is required for trial subscriptions")
        return self


class TenantUserInput(BaseModel):
    name: str = Field(min_length=2, max_length=250)
    email: str = Field(min_length=5, max_length=250)
    password: str | None = Field(None, min_length=8, max_length=128)
    mobile: str | None = Field(None, max_length=15)
    timezone: str | None = Field(None, max_length=225)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("a valid email address is required")
        return value


class WorkspaceRequest(BaseModel):
    client: ClientInput
    project: ProjectInput
    subscription: SubscriptionInput | None = None
    user: TenantUserInput | None = None
    send_mail: bool = False
    dry_run: bool = False

    @model_validator(mode="after")
    def validate_mail_recipient(self):
        if self.send_mail and self.user is None:
            raise ValueError("user details are required when send_mail is true")
        return self


class WorkspaceResponse(BaseModel):
    onboarding_job_id: str | None = None
    client_id: str
    project_id: str
    project_key: str
    mysql_database: str
    clickhouse_database: str
    status: Literal["planned", "ready", "failed"]
    reused: bool = False
    email_sent: bool | None = None
    email_error: str | None = None
    message: str
