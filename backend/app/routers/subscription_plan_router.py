from fastapi import APIRouter

from app.controllers.subscription_plan_controller import (
    get_all_subscription_plans,
    get_subscription_plan,
    create_subscription_plan,
    update_subscription_plan,
    delete_subscription_plan,
)

from app.schemas.subscription_plan_schema import (
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    SubscriptionPlanResponse,
)

router = APIRouter(
    prefix="/api/v1/admin/subscription-plans",
    tags=["Subscription Plans"],
)


router.add_api_route(
    "",
    get_all_subscription_plans,
    methods=["GET"],
    response_model=list[SubscriptionPlanResponse],
)


router.add_api_route(
    "/{plan_id}",
    get_subscription_plan,
    methods=["GET"],
    response_model=SubscriptionPlanResponse,
)


router.add_api_route(
    "",
    create_subscription_plan,
    methods=["POST"],
    response_model=SubscriptionPlanResponse,
    status_code=201,
)


router.add_api_route(
    "/{plan_id}",
    update_subscription_plan,
    methods=["PUT"],
    response_model=SubscriptionPlanResponse,
)


router.add_api_route(
    "/{plan_id}",
    delete_subscription_plan,
    methods=["DELETE"],
)