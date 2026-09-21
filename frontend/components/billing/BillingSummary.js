import { Field } from "../ui/Primitives";
import { cash } from "../../lib/format";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : 0;
}

export default function BillingSummary({
  edit,
  totals,
  onUpdateInvoice,
  NumberField,
  Dropdown,
  sanitizeNumericString,
  clampNumber,
}) {
  return (
    <div className="billing-summary-layout">
      <div className="billing-adjustments">
        <div className="billing-section-title">
          Billing adjustments
        </div>

        <Field label="Tax percentage">
          <NumberField
            value={edit.tax_rate}
            max={100}
            ariaLabel="Tax percentage"
            onChange={(value) =>
              onUpdateInvoice(
                "tax_rate",
                value,
              )
            }
            sanitizeNumericString={
              sanitizeNumericString
            }
            clampNumber={clampNumber}
          />
        </Field>

        <Field label="Discount type">
          <Dropdown
            value={
              edit.discount_type || "none"
            }
            ariaLabel="Discount type"
            onChange={(value) =>
              onUpdateInvoice(
                "discount_type",
                value,
              )
            }
          >
            <option value="none">
              No discount
            </option>

            <option value="percentage">
              Percentage
            </option>

            <option value="fixed">
              Fixed amount
            </option>
          </Dropdown>
        </Field>

        <Field label="Discount value">
          <NumberField
            value={edit.discount_value}
            disabled={
              edit.discount_type === "none"
            }
            max={
              edit.discount_type ===
              "percentage"
                ? 100
                : undefined
            }
            ariaLabel="Discount value"
            onChange={(value) =>
              onUpdateInvoice(
                "discount_value",
                value,
              )
            }
            sanitizeNumericString={
              sanitizeNumericString
            }
            clampNumber={clampNumber}
          />
        </Field>
      </div>

      <div className="billing-calculation">
        <CalculationRow
          label="Subtotal"
          value={cash(
            totals.subtotal,
            edit.currency,
          )}
        />

        <CalculationRow
          label="Discount"
          value={`-${cash(
            totals.discountTotal,
            edit.currency,
          )}`}
        />

        <CalculationRow
          label="Taxable total"
          value={cash(
            totals.taxableTotal,
            edit.currency,
          )}
        />

        <CalculationRow
          label={`Tax (${toNumber(
            edit.tax_rate,
          )}%)`}
          value={cash(
            totals.taxTotal,
            edit.currency,
          )}
        />

        <div className="billing-divider" />

        <div className="billing-calculation-row billing-final-total">
          <span>Final total</span>

          <b>
            {cash(
              totals.total,
              edit.currency,
            )}
          </b>
        </div>
      </div>
    </div>
  );
}

function CalculationRow({
  label,
  value,
}) {
  return (
    <div className="billing-calculation-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}