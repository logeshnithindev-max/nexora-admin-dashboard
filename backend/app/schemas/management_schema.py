from typing import Literal

from pydantic import BaseModel, Field


class ClientUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    status: Literal["active", "inactive"] = "active"


class ProjectUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=250)
    category: Literal["growth", "business"] = "growth"
    mode: Literal["test", "live"] = "live"
    status: Literal["active", "inactive"] = "active"
    crm_platform: Literal["salla", "shopify", "zid", "custom"] = "custom"
    origins: list[str] = Field(default_factory=list)
