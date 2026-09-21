from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class SubscriptionPlanMetricCreate(BaseModel):
    plan_id: int
    metric_id: int
    metric_value: Dict[str, Any] = Field(default_factory=dict)
    metric_type: str
    channel_id: Optional[int] = None


class SubscriptionPlanMetricUpdate(BaseModel):
    plan_id: Optional[int] = None
    metric_id: Optional[int] = None
    metric_value: Optional[Dict[str, Any]] = None
    metric_type: Optional[str] = None
    channel_id: Optional[int] = None


class SubscriptionPlanMetricResponse(BaseModel):
    id: int
    plan_id: int
    metric_id: int
    metric_value: Dict[str, Any]
    metric_type: str
    channel_id: Optional[int] = None

    metric_name: Optional[str] = None
    metric_key: Optional[str] = None
    channel_name: Optional[str] = None

    created_at: datetime
    updated_at: datetime