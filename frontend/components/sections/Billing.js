"use client";

import { useEffect, useMemo, useState } from "react";
import { Title, Modal } from "../ui/Primitives";
import { api } from "../../lib/api";
import { today } from "../../lib/constants";

import BillingToolbar from "../billing/BillingToolbar";
import InvoiceCard from "../billing/InvoiceCard";
import InvoiceForm from "../billing/InvoiceForm";

const CURRENCIES = ["USD", "SAR", "AED", "QAR"];

const CHANNEL_OPTIONS = [
  { value: "global", label: "Global Metric" },
  { value: "email", label: "Email Channel" },
  { value: "whatsapp", label: "WhatsApp Channel" },
];

const ACTIVE_STATUSES = ["draft", "approval_pending"];
const LOCKED_STATUSES = ["paid", "void"];

function createBlankItem() {
  return {
    metric_code: "",
    channel: "global",
    quantity: "1",
    unit_price: "0",
  };
}

function createBlankInvoice() {
  return {
    client_id: "",
    project_id: null,
    status: "approval_pending",
    invoice_type: "manual",
    currency: "USD",
    period_start: today,
    period_end: today,
    discount_type: "none",
    discount_value: "0",
    tax_rate: "0",
    due_on: null,
    notes: "",
    items: [createBlankItem()],
  };
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clampNumber(value, min, max) {
  let number = toNumber(value);

  if (typeof min === "number") {
    number = Math.max(number, min);
  }

  if (typeof max === "number") {
    number = Math.min(number, max);
  }

  return number;
}

function sanitizeNumericString(raw) {
  let value = String(raw ?? "").replace(/[^0-9.]/g, "");

  const firstDot = value.indexOf(".");

  if (firstDot !== -1) {
    value =
      value.slice(0, firstDot + 1) +
      value.slice(firstDot + 1).replace(/\./g, "");
  }

  return value.replace(/^0+(?=\d)/, "");
}

export default function Billing({
  items = [],
  clients = [],
  reload,
}) {
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingClientMetrics, setLoadingClientMetrics] = useState(false);

  const [projects, setProjects] = useState([]);
  const [clientMetrics, setClientMetrics] = useState([]);

  const clientOptions = clients.length > 0 ? clients : items;

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    setLoadingMetrics(true);
    setError("");

    try {
      const response = await api("/api/admin/invoice-metrics");

      const data =
        response?.data ||
        response?.result ||
        response ||
        {};

      const globalMetrics =
        data.global ||
        data.global_metrics ||
        data.basic ||
        data.basic_metrics ||
        [];

      const channelMetrics =
        data.channel ||
        data.channels ||
        data.channel_metrics ||
        [];

      return {
        global: Array.isArray(globalMetrics)
          ? globalMetrics
          : [],
        channel: Array.isArray(channelMetrics)
          ? channelMetrics
          : [],
      };
    } catch (requestError) {
      setError(requestError.message);
      return {
        global: [],
        channel: [],
      };
    } finally {
      setLoadingMetrics(false);
    }
  }

  async function loadClientMetrics(clientId) {
    if (!clientId) {
      setClientMetrics([]);
      return;
    }

    setLoadingClientMetrics(true);
    setError("");

    try {
      const response = await api(
        `/api/admin/clients/${encodeURIComponent(clientId)}/metrics`,
      );

      const data =
        response?.data ||
        response?.result ||
        response ||
        [];

      setClientMetrics(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setClientMetrics([]);
      setError(requestError.message);
    } finally {
      setLoadingClientMetrics(false);
    }
  }

  async function loadProjects(clientId) {
    if (!clientId) {
      setProjects([]);
      return;
    }

    setLoadingProjects(true);

    try {
      const response = await api(
        `/api/admin/clients/${encodeURIComponent(clientId)}/projects`,
      );

      setProjects(Array.isArray(response) ? response : []);
    } catch (requestError) {
      setProjects([]);
      setError(requestError.message);
    } finally {
      setLoadingProjects(false);
    }
  }

  async function open(invoice = null) {
    setError("");
    setFieldErrors({});
    setProjects([]);
    setClientMetrics([]);

    try {
      if (!invoice) {
        setEdit(createBlankInvoice());
        return;
      }

      const response = await api(
        `/api/admin/invoices/${invoice.id}`,
      );

      const invoiceItems =
        Array.isArray(response.items) &&
        response.items.length > 0
          ? response.items.map((item) => ({
              metric_code: item.metric_code || "",
              channel: item.channel || "global",
              quantity: String(item.quantity ?? 1),
              unit_price: String(item.unit_price ?? 0),
            }))
          : [createBlankItem()];

      const invoiceData = {
        ...response,
        invoice_type: "manual",
        discount_value: String(
          response.discount_value ?? 0,
        ),
        tax_rate: String(response.tax_rate ?? 0),
        items: invoiceItems,
      };

      setEdit(invoiceData);

      if (invoiceData.client_id) {
        await Promise.all([
          loadProjects(invoiceData.client_id),
          loadClientMetrics(invoiceData.client_id),
        ]);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function updateInvoice(field, value) {
    setEdit((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleClientChange(clientId) {
    setError("");
    setFieldErrors({});

    setEdit((current) => ({
      ...current,
      client_id: clientId,
      project_id: null,
      items: [createBlankItem()],
      invoice_type: "manual",
    }));

    setProjects([]);
    setClientMetrics([]);

    if (!clientId) return;

    await Promise.all([
      loadProjects(clientId),
      loadClientMetrics(clientId),
    ]);
  }

  function updateItem(index, field, value) {
    setEdit((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === "channel") {
          return {
            ...item,
            channel: value,
            metric_code: "",
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    }));
  }

  function addItem() {
    setEdit((current) => ({
      ...current,
      items: [
        ...current.items,
        createBlankItem(),
      ],
    }));
  }

  function removeItem(index) {
    setEdit((current) => {
      if (current.items.length === 1) {
        return {
          ...current,
          items: [createBlankItem()],
        };
      }

      return {
        ...current,
        items: current.items.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      };
    });
  }

  function getMetricOptions(channel) {
    const selectedChannel = String(
      channel || "global",
    ).toLowerCase();

    return clientMetrics.filter(
      (metric) =>
        String(metric.channel || "global").toLowerCase() ===
        selectedChannel,
    );
  }

  function validate(draft) {
    const problems = {};

    if (!draft.client_id) {
      problems.client_id = "Select a client.";
    }

    if (!draft.period_start) {
      problems.period_start = "Required.";
    }

    if (!draft.period_end) {
      problems.period_end = "Required.";
    }

    if (
      draft.period_start &&
      draft.period_end &&
      draft.period_end < draft.period_start
    ) {
      problems.period_end =
        "Can't be before the period start.";
    }

    if (
      draft.due_on &&
      draft.period_end &&
      draft.due_on < draft.period_end
    ) {
      problems.due_on =
        "Due date is before the period ends.";
    }

    const itemProblems = draft.items.map((item) => {
      if (!item.metric_code) {
        return "Choose a metric.";
      }

      if (toNumber(item.quantity) <= 0) {
        return "Quantity must be greater than 0.";
      }

      if (toNumber(item.unit_price) < 0) {
        return "Unit price can't be negative.";
      }

      return null;
    });

    if (itemProblems.some(Boolean)) {
      problems.items = itemProblems;
    }

    return problems;
  }

  async function save(event) {
    event.preventDefault();

    if (!edit) return;

    const problems = validate(edit);

    setFieldErrors(problems);

    if (Object.keys(problems).length > 0) {
      setError("Fix the highlighted fields before saving.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...edit,
        client_id: edit.client_id,
        project_id: edit.project_id || null,
        invoice_type: "manual",
        currency: edit.currency || "USD",

        discount_value: clampNumber(
          edit.discount_value,
          0,
          edit.discount_type === "percentage"
            ? 100
            : undefined,
        ),

        tax_rate: clampNumber(
          edit.tax_rate,
          0,
          100,
        ),

        items: edit.items.map((item) => ({
          description:
            item.description?.trim() ||
            "Invoice item",
          metric_code: item.metric_code || null,
          channel: item.channel || "global",
          quantity: round2(
            toNumber(item.quantity),
          ),
          unit_price: round2(
            toNumber(item.unit_price),
          ),
        })),
      };

      await api(
        edit.id
          ? `/api/admin/invoices/${edit.id}`
          : "/api/admin/invoices",
        {
          method: edit.id ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );

      closeEditor();

      if (reload) await reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function invoiceAction(actionName) {
    if (!edit?.id) return;

    setLoading(true);
    setError("");

    try {
      await api(
        `/api/admin/invoices/${edit.id}/${actionName}`,
        { method: "POST" },
      );

      closeEditor();

      if (reload) await reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function voidInvoice() {
    if (!edit?.id) return;

    if (
      !window.confirm(
        "Void this invoice? This can't be undone.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api(
        `/api/admin/invoices/${edit.id}`,
        { method: "DELETE" },
      );

      closeEditor();

      if (reload) await reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function closeEditor() {
    setEdit(null);
    setProjects([]);
    setClientMetrics([]);
    setError("");
    setFieldErrors({});
  }

  const totals = useMemo(() => {
    if (!edit) {
      return {
        subtotal: 0,
        discountTotal: 0,
        taxableTotal: 0,
        taxTotal: 0,
        total: 0,
      };
    }

    const subtotal = round2(
      edit.items.reduce(
        (sum, item) =>
          sum +
          toNumber(item.quantity) *
            toNumber(item.unit_price),
        0,
      ),
    );

    const discountType =
      edit.discount_type || "none";

    const discountValue = toNumber(
      edit.discount_value,
    );

    let discountTotal = 0;

    if (discountType === "fixed") {
      discountTotal = discountValue;
    }

    if (discountType === "percentage") {
      discountTotal =
        subtotal * (discountValue / 100);
    }

    discountTotal = round2(
      Math.min(
        Math.max(discountTotal, 0),
        subtotal,
      ),
    );

    const taxableTotal = round2(
      Math.max(
        subtotal - discountTotal,
        0,
      ),
    );

    const taxTotal = round2(
      taxableTotal *
        (toNumber(edit.tax_rate) / 100),
    );

    const total = round2(
      taxableTotal + taxTotal,
    );

    return {
      subtotal,
      discountTotal,
      taxableTotal,
      taxTotal,
      total,
    };
  }, [edit]);

  const canApproveReject =
    Boolean(edit?.id) &&
    edit.status === "approval_pending";

  const canVoid =
    Boolean(edit?.id) &&
    !LOCKED_STATUSES.includes(edit.status);

  const canSave =
    !edit?.id ||
    ACTIVE_STATUSES.includes(edit.status);

  const statusOptions = useMemo(() => {
    const statuses = new Set();

    items.forEach((invoice) => {
      if (invoice.status) {
        statuses.add(invoice.status);
      }
    });

    return Array.from(statuses);
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((invoice) => {
      if (
        statusFilter !== "all" &&
        invoice.status !== statusFilter
      ) {
        return false;
      }

      if (term) {
        const haystack = [
          invoice.invoice_number,
          invoice.client_name,
          invoice.client_id,
          invoice.project_name,
          invoice.project_id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) {
          return false;
        }
      }

      if (
        dateFrom &&
        invoice.period_end &&
        invoice.period_end < dateFrom
      ) {
        return false;
      }

      if (
        dateTo &&
        invoice.period_start &&
        invoice.period_start > dateTo
      ) {
        return false;
      }

      return true;
    });
  }, [
    items,
    search,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  const hasActiveFilters = Boolean(
    search ||
      dateFrom ||
      dateTo ||
      statusFilter !== "all",
  );

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
  }

  return (
    <>
      <Title
        tag="REVENUE OPERATIONS"
        title={
          <>
            Billing & <em>approvals.</em>
          </>
        }
        copy="Create, edit, approve, reject or void invoices with flexible line items."
        action={
          <button
            className="primary"
            type="button"
            onClick={() => open()}
          >
            New invoice ＋
          </button>
        }
      />

      <BillingToolbar
        search={search}
        setSearch={setSearch}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        statusOptions={statusOptions}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {filteredItems.length === 0 ? (
        <div className="panel empty">
          <b>—</b>

          {items.length === 0
            ? "No invoices found."
            : "No invoices match your filters."}

          {hasActiveFilters && (
            <button
              type="button"
              className="table-action"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="invoice-grid">
          {filteredItems.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onOpen={open}
            />
          ))}
        </div>
      )}

      {edit && (
        <Modal
          title={
            edit.id
              ? edit.invoice_number
              : "New invoice"
          }
          close={closeEditor}
        >
          <InvoiceForm
            edit={edit}
            setEdit={setEdit}
            clients={clientOptions}
            projects={projects}
            clientMetrics={clientMetrics}
            loading={loading}
            loadingMetrics={loadingMetrics}
            loadingProjects={loadingProjects}
            loadingClientMetrics={
              loadingClientMetrics
            }
            error={error}
            fieldErrors={fieldErrors}
            totals={totals}
            canApproveReject={canApproveReject}
            canVoid={canVoid}
            canSave={canSave}
            currencies={CURRENCIES}
            channelOptions={CHANNEL_OPTIONS}
            onClientChange={handleClientChange}
            onUpdateInvoice={updateInvoice}
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onGetMetricOptions={getMetricOptions}
            onSave={save}
            onAction={invoiceAction}
            onVoid={voidInvoice}
            sanitizeNumericString={
              sanitizeNumericString
            }
            clampNumber={clampNumber}
          />
        </Modal>
      )}
    </>
  );
}