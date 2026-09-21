import uuid
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.invoice_schema import InvoicePayload
from app.services.management_service import _rows

# ============================================================
# INVOICE MANAGEMENT
# ============================================================


def list_invoice_metrics(db: Session):
    global_rows = db.execute(
        text(
            """
            SELECT
                id,
                metric_key AS metric_code,
                metric_name,
                'global' AS channel
            FROM basic_metric_config
            WHERE is_active = 1
            ORDER BY id
            """
        )
    ).mappings().all()

    channel_rows = db.execute(
        text(
            """
            SELECT
                id,
                metric_key AS metric_code,
                metric_name,
                CASE
                    WHEN channel_id = 1 THEN 'whatsapp'
                    WHEN channel_id = 2 THEN 'email'
                    ELSE CONCAT('channel_', channel_id)
                END AS channel
            FROM channel_metric_config
            WHERE is_active = 1
            ORDER BY id
            """
        )
    ).mappings().all()

    return {
        "global": [dict(row) for row in global_rows],
        "channel": [dict(row) for row in channel_rows],
    }

def list_invoices(db: Session):
    return _rows(
        db,
        "SELECT i.*,c.name client_name,p.name project_name "
        "FROM invoices i "
        "JOIN master_clients c ON c.client_id=i.client_id "
        "LEFT JOIN master_projects p ON p.project_id=i.project_id "
        "ORDER BY i.created_at DESC LIMIT 250",
    )


def save_invoice(
    db: Session,
    payload: InvoicePayload,
    invoice_id: int | None = None,
):
    money = Decimal("0.01")

    subtotal = sum(
        (item.quantity * item.unit_price for item in payload.items),
        Decimal(0),
    ).quantize(money, ROUND_HALF_UP)

    discount = Decimal(0)

    if payload.discount_type == "fixed":
        discount = min(payload.discount_value, subtotal)

    elif payload.discount_type == "percentage":
        discount = (
            subtotal
            * min(payload.discount_value, Decimal(100))
            / 100
        ).quantize(money, ROUND_HALF_UP)

    taxable = subtotal - discount

    tax = (
        taxable * payload.tax_rate / 100
    ).quantize(money, ROUND_HALF_UP)

    total = taxable + tax

    number = f"NX-{date.today():%Y%m}-{uuid.uuid4().hex[:6].upper()}"

    data = payload.model_dump(exclude={"items"}) | {
        "invoice_number": number,
        "subtotal": subtotal,
        "discount_total": discount,
        "taxable_total": taxable,
        "tax_total": tax,
        "total": total,
    }

    if invoice_id is None:
        result = db.execute(
            text(
                "INSERT INTO invoices "
                "(invoice_number,client_id,project_id,status,invoice_type,"
                "currency,period_start,period_end,subtotal,discount_type,"
                "discount_value,discount_total,taxable_total,tax_rate,"
                "tax_total,total,due_on,notes) "
                "VALUES "
                "(:invoice_number,:client_id,:project_id,:status,"
                ":invoice_type,:currency,:period_start,:period_end,"
                ":subtotal,:discount_type,:discount_value,:discount_total,"
                ":taxable_total,:tax_rate,:tax_total,:total,:due_on,:notes)"
            ),
            data,
        )

        invoice_id = result.lastrowid

    else:
        current = db.execute(
            text(
                "SELECT status,invoice_number "
                "FROM invoices WHERE id=:id"
            ),
            {"id": invoice_id},
        ).mappings().first()

        if not current:
            raise HTTPException(404, "Invoice not found")

        if current["status"] not in ("draft", "approval_pending"):
            raise HTTPException(
                409,
                "Only draft or approval-pending invoices can be edited",
            )

        data.update(
            {
                "id": invoice_id,
                "invoice_number": current["invoice_number"],
            }
        )

        db.execute(
            text(
                "UPDATE invoices SET "
                "client_id=:client_id,"
                "project_id=:project_id,"
                "status=:status,"
                "invoice_type=:invoice_type,"
                "currency=:currency,"
                "period_start=:period_start,"
                "period_end=:period_end,"
                "subtotal=:subtotal,"
                "discount_type=:discount_type,"
                "discount_value=:discount_value,"
                "discount_total=:discount_total,"
                "taxable_total=:taxable_total,"
                "tax_rate=:tax_rate,"
                "tax_total=:tax_total,"
                "total=:total,"
                "due_on=:due_on,"
                "notes=:notes "
                "WHERE id=:id"
            ),
            data,
        )

        db.execute(
            text(
                "DELETE FROM invoice_items "
                "WHERE invoice_id=:id"
            ),
            {"id": invoice_id},
        )

    for item in payload.items:
        value = item.model_dump()
        value["invoice_id"] = invoice_id
        value["amount"] = (
            item.quantity * item.unit_price
        ).quantize(money, ROUND_HALF_UP)

        db.execute(
            text(
                "INSERT INTO invoice_items "
                "(invoice_id,description,metric_code,channel,quantity,"
                "unit_price,amount) "
                "VALUES "
                "(:invoice_id,:description,:metric_code,:channel,"
                ":quantity,:unit_price,:amount)"
            ),
            value,
        )

    db.commit()

    return {
        "id": invoice_id,
        "invoice_number": data["invoice_number"],
        "invoice_type": payload.invoice_type.value,
        "subtotal": subtotal,
        "discount_total": discount,
        "tax_total": tax,
        "total": total,
    }


def get_invoice(db: Session, invoice_id: int):
    invoice = db.execute(
        text("SELECT * FROM invoices WHERE id=:id"),
        {"id": invoice_id},
    ).mappings().first()

    if not invoice:
        raise HTTPException(404, "Invoice not found")

    return {
        **dict(invoice),
        "items": _rows(
            db,
            "SELECT * FROM invoice_items "
            "WHERE invoice_id=:id ORDER BY id",
            {"id": invoice_id},
        ),
    }


def void_invoice(db: Session, invoice_id: int):
    changed = db.execute(
        text(
            "UPDATE invoices SET status='void' "
            "WHERE id=:id AND status NOT IN ('paid','void')"
        ),
        {"id": invoice_id},
    ).rowcount

    if not changed:
        raise HTTPException(
            409,
            "Paid, void, or missing invoices cannot be voided",
        )

    db.commit()

    return {"message": "Invoice voided"}


def approve_invoice(db: Session, invoice_id: int):
    changed = db.execute(
        text(
            "UPDATE invoices SET status='approved',approved_at=NOW() "
            "WHERE id=:id AND status IN ('draft','approval_pending')"
        ),
        {"id": invoice_id},
    ).rowcount

    if not changed:
        raise HTTPException(
            409,
            "Only draft or approval-pending invoices can be approved",
        )

    db.commit()

    return {
        "message": "Invoice approved",
        "email_status": "pending_client_billing_email",
    }


def reject_invoice(db: Session, invoice_id: int):
    changed = db.execute(
        text(
            "UPDATE invoices SET status='draft',approved_at=NULL "
            "WHERE id=:id AND status='approval_pending'"
        ),
        {"id": invoice_id},
    ).rowcount

    if not changed:
        raise HTTPException(
            409,
            "Only approval-pending invoices can be rejected",
        )

    db.commit()

    return {"message": "Invoice returned to draft"}
