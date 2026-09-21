"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const initialForm = {
  metric_name: "",
  metric_key: "",
  input_type: "number",
  channel_id: "",
  is_active: "1",
};

function normalizeResponse(response) {
  if (Array.isArray(response)) return response;

  return response?.items || response?.data || [];
}

function generateMetricKey(metricName) {
  return metricName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function humanize(value) {
  const text = String(value || "").replace(/[_-]+/g, " ").trim();

  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* =========================================================================
   CONFIG FIELD ICONS
========================================================================= */

function fieldSymbol(inputType) {
  if (inputType === "checkbox" || inputType === "boolean") return "✓";
  if (inputType === "text" || inputType === "string") return "T";
  if (inputType === "select") return "▾";

  return "#";
}

/* =========================================================================
   STANDARD CONFIG TEMPLATE
========================================================================= */

const PERIOD_CYCLE_OPTIONS = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];

function buildTemplateFields(inputType) {
  return [
    {
      label: "free_limit",
      input_type: inputType,
    },
    {
      label: "overage_price",
      input_type: inputType,
    },
    {
      label: "period_cycle",
      input_type: "select",
      options: PERIOD_CYCLE_OPTIONS,
    },
  ];
}

function blankCustomField() {
  return {
    label: "",
    input_type: "text",
    options: "",
  };
}

/* =========================================================================
   CONFIG JSON HELPERS
========================================================================= */

function parseConfig(metric) {
  let config = metric?.config_json;

  if (typeof config === "string") {
    try {
      config = JSON.parse(config);
    } catch {
      config = [];
    }
  }

  return config || [];
}

function getConfigFields(metric) {
  const config = parseConfig(metric);

  if (Array.isArray(config)) return config;

  if (Array.isArray(config?.fields)) {
    return config.fields;
  }

  return [];
}

function getMetricType(metric) {
  const fields = getConfigFields(metric);

  if (fields.length === 0) {
    return "Not defined";
  }

  const primary =
    fields.find((field) =>
      ["free_limit", "overage_price"].includes(field.label || field.key),
    ) || fields[0];

  const inputType = primary?.input_type;

  if (inputType === "checkbox" || inputType === "boolean") {
    return "Checkbox";
  }

  if (inputType === "text" || inputType === "string") {
    return "Text";
  }

  if (inputType === "select") {
    return "Select";
  }

  if (inputType === "number") {
    return "Number";
  }

  return humanize(inputType) || "Not defined";
}

function getMetricStatus(metric) {
  return Number(metric?.is_active) === 1 ? "Active" : "Inactive";
}

function isTemplateFieldSet(fields) {
  const labels = fields.map((field) => field.label || field.key);

  return (
    labels.length === 3 &&
    ["free_limit", "overage_price", "period_cycle"].every((label) =>
      labels.includes(label),
    )
  );
}

/* =========================================================================
   COMPONENT
========================================================================= */

export default function Master() {
  const [activeTab, setActiveTab] = useState("basic");

  const [basicMetrics, setBasicMetrics] = useState([]);
  const [channelMetrics, setChannelMetrics] = useState([]);
  const [channels, setChannels] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [modalMode, setModalMode] = useState("create");
  const [editingMetric, setEditingMetric] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [configMode, setConfigMode] = useState("template");
  const [customFields, setCustomFields] = useState([
    blankCustomField(),
  ]);

  /* =========================================================================
     LOAD METRICS
  ========================================================================= */

  async function loadMetrics() {
    try {
      setLoading(true);
      setError("");

      const [basicResponse, channelResponse] = await Promise.all([
        api("/api/admin/basic-metrics"),
        api("/api/admin/channel-metrics"),
      ]);

      setBasicMetrics(normalizeResponse(basicResponse));
      setChannelMetrics(normalizeResponse(channelResponse));
    } catch (err) {
      console.error("LOAD METRICS ERROR:", err);
      setError(err?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================================
     LOAD CHANNELS
  ========================================================================= */

  async function loadChannels() {
    try {
      const response = await api("/api/admin/channels");

      const channelList = normalizeResponse(response);

      setChannels(
        channelList.map((channel) => ({
          id: Number(channel.id),
          name:
            channel.name ||
            channel.channel_name ||
            channel.code ||
            `Channel ${channel.id}`,
          code: channel.code || "",
        })),
      );
    } catch (err) {
      console.error("LOAD CHANNELS ERROR:", err);
      setChannels([]);
    }
  }

  useEffect(() => {
    loadMetrics();
    loadChannels();
  }, []);

  /* =========================================================================
     DERIVED DATA
  ========================================================================= */

  const metrics = useMemo(() => {
    return activeTab === "basic" ? basicMetrics : channelMetrics;
  }, [activeTab, basicMetrics, channelMetrics]);

  const activeCount = metrics.filter(
    (metric) => Number(metric?.is_active) === 1,
  ).length;

  /* =========================================================================
     CHANNEL NAME
  ========================================================================= */

  function getChannelName(metric) {
    if (metric?.channel_name) {
      return metric.channel_name;
    }

    if (metric?.channel) {
      return metric.channel;
    }

    const matchedChannel = channels.find(
      (channel) =>
        Number(channel.id) === Number(metric?.channel_id),
    );

    return (
      matchedChannel?.name ||
      matchedChannel?.code ||
      `Channel ${metric?.channel_id ?? "-"}`
    );
  }

  /* =========================================================================
     CREATE MODAL
  ========================================================================= */

  function openNewMetricModal() {
    setForm(initialForm);
    setFormError("");
    setConfigMode("template");
    setCustomFields([blankCustomField()]);
    setModalMode("create");
    setEditingMetric(null);
    setShowModal(true);
  }

  /* =========================================================================
     EDIT MODAL
  ========================================================================= */

  function openEditMetricModal(metric) {
    setFormError("");
    setModalMode("edit");
    setEditingMetric(metric);

    const fields = getConfigFields(metric);
    const asTemplate = isTemplateFieldSet(fields);

    if (asTemplate) {
      const primary =
        fields.find(
          (field) =>
            (field.label || field.key) === "free_limit",
        ) || fields[0];

      setConfigMode("template");
      setCustomFields([blankCustomField()]);

      setForm({
        metric_name: metric.metric_name || "",
        metric_key: metric.metric_key || "",
        input_type: primary?.input_type || "number",
        channel_id: metric.channel_id
          ? String(metric.channel_id)
          : "",
        is_active:
          Number(metric.is_active) === 1 ? "1" : "0",
      });
    } else {
      setConfigMode("custom");

      setCustomFields(
        fields.length > 0
          ? fields.map((field) => ({
              label: field.label || field.key || "",
              input_type: field.input_type || "text",
              options: Array.isArray(field.options)
                ? field.options.join(", ")
                : "",
            }))
          : [blankCustomField()],
      );

      setForm({
        metric_name: metric.metric_name || "",
        metric_key: metric.metric_key || "",
        input_type: "text",
        channel_id: metric.channel_id
          ? String(metric.channel_id)
          : "",
        is_active:
          Number(metric.is_active) === 1 ? "1" : "0",
      });
    }

    setShowModal(true);
  }

  /* =========================================================================
     CLOSE MODAL
  ========================================================================= */

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setForm(initialForm);
    setFormError("");
    setConfigMode("template");
    setCustomFields([blankCustomField()]);
    setModalMode("create");
    setEditingMetric(null);
  }

  /* =========================================================================
     FORM CHANGE
  ========================================================================= */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      if (name === "metric_name") {
        return {
          ...previous,
          metric_name: value,

          metric_key:
            modalMode === "edit"
              ? previous.metric_key
              : generateMetricKey(value),
        };
      }

      return {
        ...previous,
        [name]: value,
      };
    });
  }

  /* =========================================================================
     DELETE METRIC
  ========================================================================= */

  async function deleteMetric(metric) {
    const confirmed = window.confirm(
      `Delete "${metric.metric_name}"? Plans that already include this metric will keep their saved values, but it can no longer be added to new plans.`,
    );

    if (!confirmed) return;

    setDeletingId(metric.id);

    try {
      const endpoint =
        activeTab === "channel"
          ? `/api/admin/channel-metrics/${metric.id}`
          : `/api/admin/basic-metrics/${metric.id}`;

      await api(endpoint, {
        method: "DELETE",
      });

      await loadMetrics();
    } catch (err) {
      console.error("DELETE METRIC ERROR:", err);
      alert(err?.message || "Failed to delete metric");
    } finally {
      setDeletingId(null);
    }
  }

  /* =========================================================================
     CUSTOM FIELD BUILDER
  ========================================================================= */

  function addCustomField() {
    setCustomFields((previous) => [
      ...previous,
      blankCustomField(),
    ]);
  }

  function removeCustomField(index) {
    setCustomFields((previous) =>
      previous.filter((_, i) => i !== index),
    );
  }

  function updateCustomField(index, patch) {
    setCustomFields((previous) => {
      const next = [...previous];

      next[index] = {
        ...next[index],
        ...patch,
      };

      return next;
    });
  }

  /* =========================================================================
     SAVE METRIC
  ========================================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");

      const metricName = form.metric_name.trim();
      const metricKey = generateMetricKey(metricName);

      if (!metricName) {
        setFormError("Metric name is required.");
        return;
      }

      if (!metricKey) {
        setFormError(
          "A valid metric key could not be generated.",
        );
        return;
      }

      if (
        activeTab === "channel" &&
        !String(form.channel_id).trim()
      ) {
        setFormError("Please select a channel.");
        return;
      }

      /* =====================================================================
         BUILD CONFIG JSON
      ===================================================================== */

      let configFields;

      if (configMode === "custom") {
        const cleaned = customFields
          .map((field) => ({
            label: field.label.trim(),
            input_type: field.input_type,

            options:
              field.input_type === "select"
                ? field.options
                    .split(",")
                    .map((option) => option.trim())
                    .filter(Boolean)
                : [],
          }))
          .filter((field) => field.label);

        if (cleaned.length === 0) {
          setFormError(
            "Add at least one field with a name.",
          );
          return;
        }

        const missingOptions = cleaned.find(
          (field) =>
            field.input_type === "select" &&
            field.options.length === 0,
        );

        if (missingOptions) {
          setFormError(
            `"${humanize(
              missingOptions.label,
            )}" needs at least one option.`,
          );
          return;
        }

        configFields = cleaned;
      } else {
        configFields = buildTemplateFields(
          form.input_type,
        );
      }

      /* =====================================================================
         PAYLOAD
      ===================================================================== */

      const payload = {
        metric_name: metricName,
        metric_key: metricKey,
        config_json: configFields,
        is_active: Number(form.is_active),
      };

      let endpoint = "/api/admin/basic-metrics";

      if (activeTab === "channel") {
        endpoint = "/api/admin/channel-metrics";
        payload.channel_id = Number(form.channel_id);
      }

      const isEditing =
        modalMode === "edit" && editingMetric?.id;

      if (isEditing) {
        endpoint = `${endpoint}/${editingMetric.id}`;
      }

      await api(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      closeModal();

      await loadMetrics();
    } catch (err) {
      console.error("SAVE METRIC ERROR:", err);

      setFormError(
        err?.message || "Failed to save metric",
      );
    } finally {
      setSaving(false);
    }
  }

  const previewFields =
    configMode === "template"
      ? buildTemplateFields(form.input_type)
      : [];

  /* =========================================================================
     RENDER
  ========================================================================= */

  return (
    <main className="master-page">
      {/* =====================================================================
          HERO
      ===================================================================== */}

      <section className="master-hero">
        <div className="master-hero-content">
          <span className="master-eyebrow">
            SYSTEM CONFIGURATION
          </span>

          <h1>
            Metric <em>management</em>
          </h1>

          <p>
            Configure the usage metrics that power
            subscriptions, client limits and billing.
          </p>
        </div>

        <button
          type="button"
          className="master-primary-button"
          onClick={openNewMetricModal}
        >
          <span className="button-plus">+</span>
          New metric
        </button>
      </section>

      {/* =====================================================================
          SUMMARY
      ===================================================================== */}

      <section className="metric-summary-grid">
        <div className="metric-summary-card">
          <div className="summary-icon purple">∑</div>

          <div>
            <span className="summary-label">
              Total metrics
            </span>

            <strong>{metrics.length}</strong>

            <small>
              {activeTab === "basic"
                ? "Global configuration"
                : "Channel configuration"}
            </small>
          </div>
        </div>

        <div className="metric-summary-card">
          <div className="summary-icon green">✓</div>

          <div>
            <span className="summary-label">
              Active metrics
            </span>

            <strong>{activeCount}</strong>

            <small>Currently available</small>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CONTENT
      ===================================================================== */}

      <section className="master-content-card">
        <div className="master-content-top">
          <div>
            <h2>
              {activeTab === "basic"
                ? "Basic metrics"
                : "Channel metrics"}
            </h2>

            <p>
              {activeTab === "basic"
                ? "Metrics available across the entire platform."
                : "Metrics assigned to individual communication channels."}
            </p>
          </div>

          <span className="metric-total-badge">
            {metrics.length} total
          </span>
        </div>

        {/* ===================================================================
            TABS
        =================================================================== */}

        <div className="master-tabs">
          <button
            type="button"
            className={
              activeTab === "basic"
                ? "master-tab active"
                : "master-tab"
            }
            onClick={() => setActiveTab("basic")}
          >
            <span className="tab-symbol">◈</span>
            Basic metrics
          </button>

          <button
            type="button"
            className={
              activeTab === "channel"
                ? "master-tab active"
                : "master-tab"
            }
            onClick={() => setActiveTab("channel")}
          >
            <span className="tab-symbol">◉</span>
            Channel metrics
          </button>
        </div>

        {/* ===================================================================
            LOADING
        =================================================================== */}

        {loading && (
          <div className="metric-state-card">
            <div className="loading-spinner" />
            <span>Loading metrics...</span>
          </div>
        )}

        {/* ===================================================================
            ERROR
        =================================================================== */}

        {!loading && error && (
          <div className="metric-state-card error-state">
            <strong>Unable to load metrics</strong>

            <span>{error}</span>

            <button
              type="button"
              className="retry-button"
              onClick={loadMetrics}
            >
              Try again
            </button>
          </div>
        )}

        {/* ===================================================================
            EMPTY
        =================================================================== */}

        {!loading &&
          !error &&
          metrics.length === 0 && (
            <div className="metric-state-card">
              <div className="empty-icon">∅</div>

              <strong>No metrics found</strong>

              <span>
                Create your first metric to start configuring
                usage and billing rules.
              </span>

              <button
                type="button"
                className="master-primary-button small"
                onClick={openNewMetricModal}
              >
                + Create metric
              </button>
            </div>
          )}

        {/* ===================================================================
            METRIC CARDS
        =================================================================== */}

        {!loading &&
          !error &&
          metrics.length > 0 && (
            <div className="metrics-card-grid">
              {metrics.map((metric) => {
                const status = getMetricStatus(metric);
                const type = getMetricType(metric);

                return (
                  <article
                    className="metric-card"
                    key={metric.id}
                  >
                    <div className="metric-card-top">
                      <div className="metric-card-symbol">
                        {type === "Checkbox"
                          ? "✓"
                          : type === "Text"
                            ? "T"
                            : type === "Select"
                              ? "▾"
                              : "#"}
                      </div>

                      <span
                        className={`metric-status ${status.toLowerCase()}`}
                      >
                        <span className="status-dot" />
                        {status}
                      </span>
                    </div>

                    <div className="metric-card-heading">
                      <h3>
                        {metric.metric_name ||
                          "Unnamed metric"}
                      </h3>

                      <code>
                        {metric.metric_key || "no_key"}
                      </code>
                    </div>

                    <div className="metric-card-details">
                      {activeTab === "channel" && (
                        <div className="metric-detail-row">
                          <span>Channel</span>

                          <strong>
                            {getChannelName(metric)}
                          </strong>
                        </div>
                      )}

                      <div className="metric-detail-row">
                        <span>Input type</span>

                        <strong>{type}</strong>
                      </div>

                      <div className="metric-detail-row">
                        <span>Fields</span>

                        <strong>
                          {getConfigFields(metric)
                            .map((field) =>
                              humanize(
                                field.label ||
                                  field.key,
                              ),
                            )
                            .join(", ") || "—"}
                        </strong>
                      </div>
                    </div>

                    <div className="metric-card-footer">
                      <span className="metric-id">
                        ID #{metric.id}
                      </span>

                      <div className="metric-card-actions">
                        <button
                          type="button"
                          className="metric-edit-button"
                          onClick={() =>
                            openEditMetricModal(metric)
                          }
                        >
                          Edit
                          <span>↗</span>
                        </button>

                        <button
                          type="button"
                          className="metric-delete-button"
                          onClick={() =>
                            deleteMetric(metric)
                          }
                          disabled={
                            deletingId === metric.id
                          }
                        >
                          {deletingId === metric.id
                            ? "Deleting…"
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </section>

      {/* =====================================================================
          CREATE / EDIT MODAL
      ===================================================================== */}

      {showModal && (
        <div className="metric-modal-backdrop">
          <div
            className="metric-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="metric-modal-title"
          >
            <div className="metric-modal-header">
              <div>
                <span className="modal-eyebrow">
                  {modalMode === "edit"
                    ? "EDIT CONFIGURATION"
                    : "NEW CONFIGURATION"}
                </span>

                <h2 id="metric-modal-title">
                  {modalMode === "edit"
                    ? "Edit"
                    : "Create"}{" "}
                  {activeTab === "basic"
                    ? "basic"
                    : "channel"}{" "}
                  metric
                </h2>

                <p>
                  {modalMode === "edit"
                    ? "Update this metric's details and configuration."
                    : "Add a metric to your master configuration."}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* =============================================================
                  METRIC INFORMATION
              ============================================================= */}

              <div className="metric-form-section">
                <h3>Metric information</h3>

                <div className="metric-form-grid">
                  <div className="metric-form-field">
                    <label htmlFor="metric_name">
                      Metric name
                    </label>

                    <input
                      id="metric_name"
                      name="metric_name"
                      type="text"
                      placeholder="Example: Active Users"
                      value={form.metric_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="metric-form-field">
                    <label htmlFor="metric_key">
                      Metric key
                    </label>

                    <input
                      id="metric_key"
                      name="metric_key"
                      type="text"
                      placeholder="Generated automatically"
                      value={form.metric_key}
                      readOnly
                    />

                    <small>
                      Automatically generated from metric
                      name.
                    </small>
                  </div>

                  {activeTab === "channel" && (
                    <div className="metric-form-field">
                      <label htmlFor="channel_id">
                        Channel
                      </label>

                      <select
                        id="channel_id"
                        name="channel_id"
                        value={form.channel_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">
                          Select channel
                        </option>

                        {channels.map((channel) => (
                          <option
                            key={channel.id}
                            value={channel.id}
                          >
                            {channel.name}
                          </option>
                        ))}
                      </select>

                      {channels.length === 0 && (
                        <small>
                          No channels available. Check the
                          channels API.
                        </small>
                      )}
                    </div>
                  )}

                  {configMode === "template" && (
                    <div className="metric-form-field">
                      <label htmlFor="input_type">
                        Input type
                      </label>

                      <select
                        id="input_type"
                        name="input_type"
                        value={form.input_type}
                        onChange={handleChange}
                      >
                        <option value="number">
                          Number
                        </option>

                        <option value="checkbox">
                          Checkbox
                        </option>

                        <option value="text">
                          Text
                        </option>
                      </select>

                      <small>
                        Applies to the free limit and overage
                        price fields below.
                      </small>
                    </div>
                  )}

                  <div className="metric-form-field">
                    <label htmlFor="is_active">
                      Status
                    </label>

                    <select
                      id="is_active"
                      name="is_active"
                      value={form.is_active}
                      onChange={handleChange}
                    >
                      <option value="1">
                        Active
                      </option>

                      <option value="0">
                        Inactive
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* =============================================================
                  CONFIGURATION
              ============================================================= */}

              <div className="metric-form-section">
                <h3>Configuration</h3>

                <div className="config-mode-switch">
                  <button
                    type="button"
                    className={
                      configMode === "template"
                        ? "on"
                        : ""
                    }
                    onClick={() =>
                      setConfigMode("template")
                    }
                  >
                    Standard template
                  </button>

                  <button
                    type="button"
                    className={
                      configMode === "custom"
                        ? "on"
                        : ""
                    }
                    onClick={() =>
                      setConfigMode("custom")
                    }
                  >
                    Custom fields
                  </button>
                </div>

                {configMode === "template" ? (
                  <div className="config-preview">
                    <div className="config-preview-head">
                      <div>
                        <span className="config-preview-title">
                          Fields this metric will carry
                        </span>

                        <small className="config-preview-subtitle">
                          Set once here, filled in with real
                          numbers on the subscription plan
                          page.
                        </small>
                      </div>

                      <span className="config-preview-count">
                        {previewFields.length} fields
                      </span>
                    </div>

                    <div className="config-preview-rows">
                      {previewFields.map((field) => (
                        <div
                          className="config-preview-row"
                          key={field.label}
                        >
                          <div className="config-preview-row-icon">
                            {fieldSymbol(
                              field.input_type,
                            )}
                          </div>

                          <div className="config-preview-row-body">
                            <span className="config-preview-row-name">
                              {humanize(field.label)}
                            </span>

                            <span className="config-preview-row-meta">
                              {field.input_type ===
                                "select" &&
                              field.options?.length > 0
                                ? field.options.join(
                                    " / ",
                                  )
                                : `Stored as ${field.label}`}
                            </span>
                          </div>

                          <span className="config-preview-row-type">
                            {humanize(
                              field.input_type,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="custom-field-builder">
                    <small className="config-preview-subtitle">
                      Define the fields this metric will ask
                      for on the subscription plan page — like
                      the "status: enable / disable" toggle
                      used by Premium Services.
                    </small>

                    <div className="custom-field-list">
                      {customFields.map(
                        (field, index) => (
                          <div
                            className="custom-field-row"
                            key={index}
                          >
                            <input
                              type="text"
                              placeholder="Field name, e.g. status"
                              value={field.label}
                              onChange={(e) =>
                                updateCustomField(
                                  index,
                                  {
                                    label:
                                      e.target.value,
                                  },
                                )
                              }
                            />

                            <select
                              value={field.input_type}
                              onChange={(e) =>
                                updateCustomField(
                                  index,
                                  {
                                    input_type:
                                      e.target.value,
                                  },
                                )
                              }
                            >
                              <option value="text">
                                Text
                              </option>

                              <option value="number">
                                Number
                              </option>

                              <option value="select">
                                Select
                              </option>

                              <option value="checkbox">
                                Checkbox
                              </option>
                            </select>

                            {field.input_type ===
                            "select" ? (
                              <input
                                type="text"
                                placeholder="Options, comma separated (e.g. enable, disable)"
                                value={field.options}
                                onChange={(e) =>
                                  updateCustomField(
                                    index,
                                    {
                                      options:
                                        e.target.value,
                                    },
                                  )
                                }
                              />
                            ) : (
                              <span />
                            )}

                            <button
                              type="button"
                              className="remove-custom-field"
                              onClick={() =>
                                removeCustomField(
                                  index,
                                )
                              }
                              disabled={
                                customFields.length === 1
                              }
                              title="Remove field"
                            >
                              ×
                            </button>
                          </div>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="add-custom-field-button"
                      onClick={addCustomField}
                    >
                      ＋ Add field
                    </button>
                  </div>
                )}
              </div>

              {/* =============================================================
                  ERROR
              ============================================================= */}

              {formError && (
                <div className="metric-form-error">
                  {formError}
                </div>
              )}

              {/* =============================================================
                  ACTIONS
              ============================================================= */}

              <div className="metric-modal-actions">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="master-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? modalMode === "edit"
                      ? "Saving..."
                      : "Creating..."
                    : modalMode === "edit"
                      ? "Save changes"
                      : "Create metric"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}