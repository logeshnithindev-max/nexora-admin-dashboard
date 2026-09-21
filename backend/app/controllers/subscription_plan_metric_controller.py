from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_nexora_db

from app.schemas.subscription_plan_metric_schema import (
    SubscriptionPlanMetricCreate,
    SubscriptionPlanMetricUpdate,
)

from app.services import subscription_plan_metric_service


# ==========================================
# GET ALL
# ==========================================

def get_all_plan_metrics(
    db: Session = Depends(get_nexora_db)
):
    return (
        subscription_plan_metric_service
        .get_all_plan_metrics(db)
    )


# ==========================================
# GET BY ID
# ==========================================

def get_plan_metric(
    metric_config_id: int,
    db: Session = Depends(get_nexora_db)
):
    metric = (
        subscription_plan_metric_service
        .get_plan_metric_by_id(
            db,
            metric_config_id
        )
    )

    if not metric:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan metric not found"
        )

    return metric


# ==========================================
# CREATE
# ==========================================

def create_plan_metric(
    data: SubscriptionPlanMetricCreate,
    db: Session = Depends(get_nexora_db)
):
    try:
        return (
            subscription_plan_metric_service
            .create_plan_metric(
                db,
                data
            )
        )

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# UPDATE
# ==========================================

def update_plan_metric(
    metric_config_id: int,
    data: SubscriptionPlanMetricUpdate,
    db: Session = Depends(get_nexora_db)
):
    try:
        metric = (
            subscription_plan_metric_service
            .update_plan_metric(
                db,
                metric_config_id,
                data
            )
        )

        if not metric:
            raise HTTPException(
                status_code=404,
                detail="Subscription plan metric not found"
            )

        return metric

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# DELETE
# ==========================================

def delete_plan_metric(
    metric_config_id: int,
    db: Session = Depends(get_nexora_db)
):
    try:
        result = (
            subscription_plan_metric_service
            .delete_plan_metric(
                db,
                metric_config_id
            )
        )

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Subscription plan metric not found"
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )