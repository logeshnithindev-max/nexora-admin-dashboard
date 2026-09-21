from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class SubscriptionPlanMetricPayload(BaseModel):
    metric_id: int
    metric_type: str
    channel_id: Optional[int] = None
    metric_value: dict[str, Any] = {}


class SubscriptionPlanCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    currency: str = "USD"
    base_price: float
    billing_interval: str
    interval_days: Optional[int] = None
    is_custom: bool = False
    status: str = "active"
    limits: list[SubscriptionPlanMetricPayload] = []


class SubscriptionPlanUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    base_price: Optional[float] = None
    billing_interval: Optional[str] = None
    interval_days: Optional[int] = None
    is_custom: Optional[bool] = None
    status: Optional[str] = None
    limits: Optional[list[SubscriptionPlanMetricPayload]] = None


class SubscriptionPlanResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    currency: str
    base_price: float
    billing_interval: str
    interval_days: Optional[int] = None
    is_custom: bool
    status: str
    created_at: datetime
    updated_at: datetime
    limits: list[dict] = []