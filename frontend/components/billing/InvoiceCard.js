import { cash } from "../../lib/format";

export default function InvoiceCard({
  invoice,
  onOpen,
}) {
  function handleKeyDown(event) {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      onOpen(invoice);
    }
  }

  return (
    <article
      className="invoice-card"
      tabIndex={0}
      role="button"
      onClick={() => onOpen(invoice)}
      onKeyDown={handleKeyDown}
    >
      <div className="invoice-card-head">
        <b>{invoice.invoice_number}</b>

        <span
          className={`status ${invoice.status}`}
        >
          {String(
            invoice.status || "",
          ).replaceAll("_", " ")}
        </span>
      </div>

      <div className="invoice-card-client">
        {invoice.client_name ||
          invoice.client_id}
      </div>

      <div className="invoice-card-meta">
        <span>
          {invoice.project_name ||
            invoice.project_id ||
            "No project"}
        </span>

        <span>
          {invoice.period_start} →{" "}
          {invoice.period_end}
        </span>
      </div>

      <div className="invoice-card-footer">
        <b className="invoice-card-total">
          {cash(
            invoice.total,
            invoice.currency,
          )}
        </b>

        <span className="invoice-card-open">
          Open →
        </span>
      </div>
    </article>
  );
}