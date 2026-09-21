from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_nexora_db
from app.schemas.subscription_plan_schema import (
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
)

from app.services import subscription_plan_service


# ==========================================
# GET ALL
# ==========================================

def get_all_subscription_plans(
    db: Session = Depends(get_nexora_db)
):

    return subscription_plan_service.get_all_plans(db)


# ==========================================
# GET BY ID
# ==========================================

def get_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_nexora_db)
):

    plan = subscription_plan_service.get_plan_by_id(
        db,
        plan_id
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found"
        )

    return plan


# ==========================================
# CREATE
# ==========================================

def create_subscription_plan(
    data: SubscriptionPlanCreate,
    db: Session = Depends(get_nexora_db)
):

    try:

        return subscription_plan_service.create_plan(
            db,
            data
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

def update_subscription_plan(
    plan_id: int,
    data: SubscriptionPlanUpdate,
    db: Session = Depends(get_nexora_db)
):

    try:

        plan = subscription_plan_service.update_plan(
            db,
            plan_id,
            data
        )

        if not plan:
            raise HTTPException(
                status_code=404,
                detail="Subscription plan not found"
            )

        return plan

    except HTTPException:
        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# DELETE / ARCHIVE
# ==========================================

def delete_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_nexora_db)
):

    try:

        result = subscription_plan_service.archive_plan(
            db,
            plan_id
        )

        if not result:

            raise HTTPException(
                status_code=404,
                detail="Subscription plan not found"
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