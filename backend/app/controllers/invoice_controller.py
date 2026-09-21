from sqlalchemy.orm import Session

from app.schemas.invoice_schema import InvoicePayload
from app.services import invoice_service


def list_invoices(db: Session):
    return invoice_service.list_invoices(db)


def create_invoice(
    payload: InvoicePayload,
    db: Session,
):
    return invoice_service.save_invoice(
        db,
        payload,
    )


def get_invoice(
    invoice_id: int,
    db: Session,
):
    return invoice_service.get_invoice(
        db,
        invoice_id,
    )


def update_invoice(
    invoice_id: int,
    payload: InvoicePayload,
    db: Session,
):
    return invoice_service.save_invoice(
        db,
        payload,
        invoice_id,
    )


def void_invoice(
    invoice_id: int,
    db: Session,
):
    return invoice_service.void_invoice(
        db,
        invoice_id,
    )


def approve_invoice(
    invoice_id: int,
    db: Session,
):
    return invoice_service.approve_invoice(
        db,
        invoice_id,
    )


def reject_invoice(
    invoice_id: int,
    db: Session,
):
    return invoice_service.reject_invoice(
        db,
        invoice_id,
    )

def get_invoice_metrics(db: Session):
    return invoice_service.list_invoice_metrics(db)