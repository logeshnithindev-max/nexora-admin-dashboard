from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    Numeric,
    SmallInteger,
    String,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class SubscriptionPlan(Base):

    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    code: Mapped[str] = mapped_column(
        String(60),
        unique=True,
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD"
    )

    base_price: Mapped[float] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=0.00
    )

    billing_interval: Mapped[str] = mapped_column(
        Enum(
            "weekly",
            "monthly",
            "quarterly",
            "yearly",
            "custom"
        ),
        nullable=False,
        default="monthly"
    )

    interval_days: Mapped[int | None] = mapped_column(
        SmallInteger,
        nullable=True
    )

    is_custom: Mapped[bool] = mapped_column(
        nullable=False,
        default=False
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "active",
            "archived"
        ),
        nullable=False,
        default="active"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

