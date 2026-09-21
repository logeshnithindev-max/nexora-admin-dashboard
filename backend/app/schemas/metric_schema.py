from typing import Any, Literal
from pydantic import BaseModel


class ConfigField(BaseModel):
    label: str
    input_type: Literal["number", "text", "select", "checkbox", "boolean", "string"]
    options: list[str] = []


class MetricCreate(BaseModel):
    metric_name: str
    metric_key: str
    config_json: list[ConfigField]
    is_active: bool = True


class MetricUpdate(BaseModel):
    metric_name: str | None = None
    metric_key: str | None = None
    config_json: list[ConfigField] | None = None
    is_active: bool | None = None


class ChannelMetricCreate(BaseModel):
    metric_name: str
    metric_key: str
    channel_id: int
    config_json: list[ConfigField]
    is_active: bool = True
    created_by: str | None = None


class ChannelMetricUpdate(BaseModel):
    metric_name: str | None = None
    metric_key: str | None = None
    channel_id: int | None = None
    config_json: list[ConfigField] | None = None
    is_active: bool | None = None