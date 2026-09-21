from datetime import date
from decimal import Decimal
from typing import Literal
from enum import Enum

from pydantic import BaseModel, Field, model_validator

class InvoiceType(str, Enum):
    MANUAL = "manual"
    AUTOMATED = "automated"


class InvoiceItem(BaseModel):
    description: str = Field(min_length=2, max_length=300)
    metric_code: str | None = Field(None, max_length=80)
    channel: str = Field(default="global", max_length=40)
    quantity: Decimal = Field(default=1, ge=0)
    unit_price: Decimal = Field(default=0, ge=0)


class InvoicePayload(BaseModel):
    client_id: str = Field(min_length=3, max_length=50)
    project_id: str | None = Field(None, max_length=50)
    status: Literal["draft", "approval_pending"] = "draft"
    invoice_type: InvoiceType = InvoiceType.AUTOMATED
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    period_start: date
    period_end: date
    discount_type: Literal["none", "fixed", "percentage"] = "none"
    discount_value: Decimal = Field(default=0, ge=0)
    tax_rate: Decimal = Field(default=0, ge=0, le=100)
    due_on: date | None = None
    notes: str | None = None
    items: list[InvoiceItem] = Field(min_length=1)

    @model_validator(mode="after")
    def dates(self):
        if self.period_end < self.period_start:
            raise ValueError("period_end cannot be before period_start")
        return self