from typing import Literal

from pydantic import BaseModel, Field

DATA_TYPES = Literal["string", "boolean", "json", "list", "mixin", "date", "number", "date_time", "time"]


class MappingRulePayload(BaseModel):
    raw_json_path: str = Field(min_length=1, max_length=255)
    data_type: DATA_TYPES
    is_loop: bool = False
    parent_id: int = 0
    inner_data_type: DATA_TYPES | None = None


class NestedFieldPayload(BaseModel):
    name: str = Field(min_length=1, max_length=250)
    data_type: DATA_TYPES
    raw_json_path: str = Field(min_length=1, max_length=255)
    is_required: bool = False
    is_loop: bool = False
    inner_data_type: DATA_TYPES | None = None
    children: list["NestedFieldPayload"] = Field(default_factory=list)


class EventPropertyPayload(BaseModel):
    name: str | None = Field(default=None, max_length=250)
    label: str = Field(min_length=1, max_length=250)
    data_type: DATA_TYPES
    nature: Literal["defined", "undefined"] = "defined"
    data_type_fallback: Literal["drop_event", "drop_event_property", "allow_property"] | None = None
    description: str | None = None
    is_required: bool = False
    is_conversion_event_property: bool = False
    is_live_activity: bool = False
    inner_data_type: DATA_TYPES | None = None
    sub_properties: list[NestedFieldPayload] = Field(default_factory=list)
    rule: MappingRulePayload


class EventPayload(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    label: str = Field(min_length=1, max_length=200)
    type: Literal["system", "custom"] = "custom"
    status: Literal["active", "inactive", "discard"] = "active"
    nature: Literal["defined", "undefined"] = "defined"
    is_conversion_event: bool = False
    is_live_activity: bool = False
    properties: list[EventPropertyPayload] = Field(default_factory=list)
