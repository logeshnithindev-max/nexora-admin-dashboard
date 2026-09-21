from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import invoice_controller
from app.database.database import get_admin_db, get_nexora_db
from app.schemas.invoice_schema import InvoicePayload
from app.utils.security import require_service_key
# from app.utils.security import require_service_key


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["invoices"],
    # dependencies=[Depends(require_service_key)],
)


# ============================================================
# Invoices
# ============================================================

@router.get("/invoices")
def list_invoices(
    db: Session = Depends(get_nexora_db),
):
    return invoice_controller.list_invoices(db)


@router.post("/invoices", status_code=201)
def create_invoice(
    payload: InvoicePayload,
    db: Session = Depends(get_nexora_db),
):
    return invoice_controller.create_invoice(
        payload,
        db,
    )


@router.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_nexora_db),
):
    return invoice_controller.get_invoice(
        invoice_id,
        db,
    )


@router.put("/invoices/{invoice_id}")
def update_invoice(
    invoice_id: int,
    payload: InvoicePayload,
    db: Session = Depends(get_nexora_db),
):
    return invoice_controller.update_invoice(
        invoice_id,
        payload,
        db,
    )


@router.delete("/invoices/{invoice_id}")
def void_invoice(
    invoice_id: int,
    db: Session = Depends(get_nexora_db),
):
    return invoice_controller.void_invoice(
        invoice_id,
        db,
    )


@router.post("/invoices/{invoice_id}/approve")
def approve_invoice(
    invoice_id: int,
    db: Session = Depends(get_nexora_db),
):
    return invoice_controller.approve_invoice(
        invoice_id,
        db,
    )


@router.post("/invoices/{invoice_id}/reject")
def reject_invoice(
    invoice_id: int,
    db: Session = Depends(get_nexora_db),
):
    return invoice_controller.reject_invoice(
        invoice_id,
        db,
    )

@router.get("/invoice-metrics")
def invoice_metrics(
    db: Session = Depends(get_admin_db),
):
    return invoice_controller.get_invoice_metricsget_invoice_metrics(db)