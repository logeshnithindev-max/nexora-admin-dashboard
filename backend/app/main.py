from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    basic_metrics,
    management,
    onboarding,
    tenant_events,
    channel_metrics,
    subscription_plan_metric,
)

from app.utils.config import settings
from app.routers.subscription_plan_router import (
    router as subscription_plan_router,
)
from app.routers.subscription_plan_metric import (
    router as subscription_plan_metric_router,
)
from app.routers import invoice
from app.routers import plan_metrics

app = FastAPI(title="Nexora Admin API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "X-Service-Key",
        "Idempotency-Key",
    ],
)

app.include_router(auth.router)

app.include_router(management.router)

app.include_router(tenant_events.router)

app.include_router(onboarding.router)

app.include_router(basic_metrics.router)

app.include_router(channel_metrics.router)

app.include_router(subscription_plan_router)

app.include_router(subscription_plan_metric_router)

app.include_router(invoice.router)

# PLAN METRICS API
app.include_router(plan_metrics.router)


@app.get("/health")
def health():

    return {"status": "ok"}