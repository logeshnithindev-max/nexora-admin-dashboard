from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import get_nexora_db
from app.services.plan_metrics_service import get_plan_metrics


def get_plan_metrics_controller(
    db: Session = Depends(get_nexora_db),
):
    return get_plan_metrics(db)