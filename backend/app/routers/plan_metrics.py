from fastapi import APIRouter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_nexora_db
from app.services.plan_metrics_service import get_plan_metrics


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Plan Metrics"],
)


@router.get("/plan-metrics")
def plan_metrics(
    db: Session = Depends(get_nexora_db),
):
    return get_plan_metrics(db)