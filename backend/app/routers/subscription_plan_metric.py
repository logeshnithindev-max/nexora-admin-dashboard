from fastapi import APIRouter

from app.controllers.subscription_plan_metric_controller import (
    get_all_plan_metrics,
    get_plan_metric,
    create_plan_metric,
    update_plan_metric,
    delete_plan_metric,
)

from app.schemas.subscription_plan_metric_schema import (
    SubscriptionPlanMetricCreate,
    SubscriptionPlanMetricUpdate,
    SubscriptionPlanMetricResponse,
)


router = APIRouter(
    prefix="/subscription-plan-metrics",
    tags=["Subscription Plan Metrics"]
)


router.get(
    "",
    response_model=list[SubscriptionPlanMetricResponse]
)(
    get_all_plan_metrics
)


router.get(
    "/{metric_config_id}",
    response_model=SubscriptionPlanMetricResponse
)(
    get_plan_metric
)


router.post(
    "",
    response_model=SubscriptionPlanMetricResponse,
    status_code=201
)(
    create_plan_metric
)


router.put(
    "/{metric_config_id}",
    response_model=SubscriptionPlanMetricResponse
)(
    update_plan_metric
)


router.delete(
    "/{metric_config_id}"
)(
    delete_plan_metric
)