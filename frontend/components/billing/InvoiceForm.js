import { Field } from "../ui/Primitives";
import BillingLineItems from "./BillingLineItems";
import BillingSummary from "./BillingSummary";

function NumberField({
  value,
  onChange,
  min = 0,
  max,
  placeholder,
  disabled,
  ariaLabel,
  sanitizeNumericString,
  clampNumber,
}) {
  return (
    <input
      className="num-input"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      value={value ?? ""}
      onChange={(event) =>
        onChange(
          sanitizeNumericString(
            event.target.value,
          ),
        )
      }
      onBlur={(event) =>
        onChange(
          String(
            clampNumber(
              event.target.value,
              min,
              max,
            ),
          ),
        )
      }
      onWheel={(event) =>
        event.currentTarget.blur()
      }
    />
  );
}

function Dropdown({
  value,
  onChange,
  disabled,
  children,
  ariaLabel,
}) {
  return (
    <span
      className={`select-shell${
        disabled ? " is-disabled" : ""
      }`}
    >
      <select
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {children}
      </select>

      <span
        className="chevron"
        aria-hidden="true"
      >
        ▾
      </span>
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="btn-spinner"
      aria-hidden="true"
    />
  );
}

export default function InvoiceForm({
  edit,
  setEdit,
  clients,
  projects,
  clientMetrics,
  loading,
  loadingMetrics,
  loadingProjects,
  loadingClientMetrics,
  error,
  fieldErrors,
  totals,
  canApproveReject,
  canVoid,
  canSave,
  currencies,
  channelOptions,
  onClientChange,
  onUpdateInvoice,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onGetMetricOptions,
  onSave,
  onAction,
  onVoid,
  sanitizeNumericString,
  clampNumber,
}) {
  return (
    <form
      className="modal-form wide-modal"
      onSubmit={onSave}
      noValidate
    >
      <div className="fields two">
        <Field label="Client">
          <Dropdown
            value={edit.client_id || ""}
            ariaLabel="Client"
            onChange={onClientChange}
          >
            <option value="">
              Select client
            </option>

            {clients.map((client) => (
              <option
                key={client.client_id}
                value={client.client_id}
              >
                {client.name} ·{" "}
                {client.client_id}
              </option>
            ))}
          </Dropdown>

          {fieldErrors.client_id && (
            <small className="field-error">
              {fieldErrors.client_id}
            </small>
          )}
        </Field>

        <Field label="Project">
          <Dropdown
            value={edit.project_id || ""}
            disabled={
              !edit.client_id ||
              loadingProjects
            }
            ariaLabel="Project"
            onChange={(value) =>
              onUpdateInvoice(
                "project_id",
                value || null,
              )
            }
          >
            <option value="">
              {loadingProjects
                ? "Loading projects..."
                : "Select project"}
            </option>

            {projects.map((project) => (
              <option
                key={project.project_id}
                value={project.project_id}
              >
                {project.name ||
                  project.project_id}
              </option>
            ))}
          </Dropdown>
        </Field>

        <Field label="Invoice type">
          <Dropdown
            value="manual"
            disabled
            onChange={() => {}}
            ariaLabel="Invoice type"
          >
            <option value="manual">
              Manual
            </option>
          </Dropdown>
        </Field>

        <Field label="Currency">
          <Dropdown
            value={edit.currency || "USD"}
            ariaLabel="Currency"
            onChange={(value) =>
              onUpdateInvoice(
                "currency",
                value,
              )
            }
          >
            {currencies.map((currency) => (
              <option
                key={currency}
                value={currency}
              >
                {currency}
              </option>
            ))}
          </Dropdown>
        </Field>

        <Field label="Period start">
          <input
            required
            type="date"
            value={edit.period_start || ""}
            onChange={(event) =>
              onUpdateInvoice(
                "period_start",
                event.target.value,
              )
            }
          />

          {fieldErrors.period_start && (
            <small className="field-error">
              {fieldErrors.period_start}
            </small>
          )}
        </Field>

        <Field label="Period end">
          <input
            required
            type="date"
            value={edit.period_end || ""}
            onChange={(event) =>
              onUpdateInvoice(
                "period_end",
                event.target.value,
              )
            }
          />

          {fieldErrors.period_end && (
            <small className="field-error">
              {fieldErrors.period_end}
            </small>
          )}
        </Field>

        <Field label="Due date">
          <input
            type="date"
            value={edit.due_on || ""}
            onChange={(event) =>
              onUpdateInvoice(
                "due_on",
                event.target.value || null,
              )
            }
          />

          {fieldErrors.due_on && (
            <small className="field-error">
              {fieldErrors.due_on}
            </small>
          )}
        </Field>
      </div>

      <BillingLineItems
        edit={edit}
        setEdit={setEdit}
        loadingMetrics={loadingMetrics}
        loadingClientMetrics={
          loadingClientMetrics
        }
        channelOptions={channelOptions}
        onUpdateItem={onUpdateItem}
        onAddItem={onAddItem}
        onRemoveItem={onRemoveItem}
        onGetMetricOptions={onGetMetricOptions}
        NumberField={NumberField}
        Dropdown={Dropdown}
        fieldErrors={fieldErrors}
        sanitizeNumericString={
          sanitizeNumericString
        }
        clampNumber={clampNumber}
      />

      <BillingSummary
        edit={edit}
        totals={totals}
        onUpdateInvoice={onUpdateInvoice}
        NumberField={NumberField}
        Dropdown={Dropdown}
        sanitizeNumericString={
          sanitizeNumericString
        }
        clampNumber={clampNumber}
      />

      <Field label="Notes">
        <textarea
          rows="3"
          value={edit.notes || ""}
          placeholder="Additional invoice notes"
          onChange={(event) =>
            onUpdateInvoice(
              "notes",
              event.target.value,
            )
          }
        />
      </Field>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="modal-actions">
        {canApproveReject && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                onAction("reject")
              }
            >
              {loading && <Spinner />}
              Reject
            </button>

            <button
              className="primary"
              type="button"
              disabled={loading}
              onClick={() =>
                onAction("approve")
              }
            >
              {loading && <Spinner />}
              Approve
            </button>
          </>
        )}

        {canVoid && (
          <button
            className="danger"
            type="button"
            disabled={loading}
            onClick={onVoid}
          >
            {loading && <Spinner />}
            Void
          </button>
        )}

        {canSave && (
          <button
            className="primary"
            type="submit"
            disabled={loading}
          >
            {loading && <Spinner />}
            {loading
              ? "Saving..."
              : "Save invoice"}
          </button>
        )}
      </div>
    </form>
  );
}