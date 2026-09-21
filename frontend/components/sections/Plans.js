"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Title, Field, Modal } from "../ui/Primitives";
import { api } from "../../lib/api";
import { cash } from "../../lib/format";

/* =========================================================================
   CONFIGURATION
========================================================================= */

const CURRENCIES = ["USD", "SAR", "AED", "QAR"];

const BILLING_INTERVALS = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
];

const PLAN_TYPES = ["standard", "custom"];

const blankLimit = {
  metric_id: "",
  metric_type: "basic",
  metric_name: "",
  metric_key: "",
  metric_code: "",
  channel_id: "",
  channel_name: "",
  channel: "",
  values: {},
  enabled: true,
};

const blankPlan = {
  code: "",
  name: "",
  description: "",
  currency: "USD",
  base_price: 0,
  billing_interval: "monthly",
  interval_days: null,
  is_custom: false,
  status: "active",
  limits: [],
};

const intervalLabels = {
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
  custom: "days",
};

/* Keys inside metric_value that are not part of the metric's own config. */
const RESERVED_VALUE_KEYS = new Set([
  "enabled",
  "metric_id",
  "metric_key",
  "metric_code",
  "metric_name",
  "metric_type",
  "channel",
  "channel_id",
  "channel_name",
  "channel_code",
]);

/* =========================================================================
   METRICS CACHE
========================================================================= */

let metricsCache = null;
let metricsRequest = null;

function fetchPlanMetrics({ force = false } = {}) {
  if (force) {
    metricsCache = null;
    metricsRequest = null;
  }

  if (metricsCache) return Promise.resolve(metricsCache);
  if (metricsRequest) return metricsRequest;

  metricsRequest = api("/api/admin/plan-metrics")
    .then((response) => {
      metricsCache = response;
      return response;
    })
    .finally(() => {
      metricsRequest = null;
    });

  return metricsRequest;
}

/* =========================================================================
   HELPERS
========================================================================= */

function getIntervalText(plan) {
  if (plan.billing_interval === "custom") {
    return `${plan.interval_days || 0} days`;
  }

  return intervalLabels[plan.billing_interval] || plan.billing_interval;
}

function getPlanType(plan) {
  if (plan.is_custom) return "Custom";

  const name = String(plan.name || "").toLowerCase();

  if (name.includes("enterprise")) return "Enterprise";
  if (name.includes("pro")) return "Professional";
  if (name.includes("growth")) return "Growth";
  if (name.includes("starter")) return "Starter";

  return "Standard";
}

function getPlanInitial(name) {
  return String(name || "P").trim().charAt(0).toUpperCase();
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return number.toLocaleString("en-US");
}

function humanize(value) {
  const text = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseJson(value) {
  if (!value) return null;

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asObject(value) {
  const parsed = parseJson(value);

  if (!parsed || Array.isArray(parsed)) {
    return {};
  }

  return parsed;
}

/* =========================================================================
   FIELD DEFINITIONS FROM config_json
========================================================================= */

function normalizeFields(config) {
  const parsed = parseJson(config);

  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.fields)
      ? parsed.fields
      : [];

  return rows
    .map((row) => {
      const key = row?.key || row?.label || row?.name || "";

      if (!key) return null;

      const inputType = String(
        row?.input_type || row?.type || "number",
      ).toLowerCase();

      return {
        key: String(key),
        label: row?.display_label || humanize(key),
        input_type: inputType,
        options: Array.isArray(row?.options) ? row.options : [],
        unit: row?.unit || "",
        placeholder: row?.placeholder || "",
        required: Boolean(row?.required || row?.is_required),
        help: row?.help || row?.description || "",
      };
    })
    .filter(Boolean);
}

function buildValues(fields, previous = {}) {
  const values = {};

  fields.forEach((field) => {
    const existing = previous[field.key];

    if (
      existing !== undefined &&
      existing !== null &&
      existing !== ""
    ) {
      values[field.key] = existing;
      return;
    }

    if (
      field.input_type === "boolean" ||
      field.input_type === "checkbox"
    ) {
      values[field.key] = false;
      return;
    }

    values[field.key] = "";
  });

  return values;
}

function serializeValue(field, value) {
  if (
    field.input_type === "boolean" ||
    field.input_type === "checkbox"
  ) {
    return Boolean(value);
  }

  if (field.input_type === "number") {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isNaN(number) ? null : number;
  }

  if (value === "" || value === undefined) {
    return null;
  }

  return value;
}

function isPriceField(field) {
  return /price|cost|rate|amount|fee/i.test(field.key);
}

/* =========================================================================
   NORMALIZE BASIC METRICS
========================================================================= */

function normalizeBasicMetrics(data) {
  const rows = Array.isArray(data)
    ? data
    : data?.basic_metrics || [];

  return rows
    .filter((metric) => metric?.is_active !== false)
    .map((metric) => ({
      id: metric.id,
      metric_name: metric.metric_name,
      metric_key: metric.metric_key,
      fields: normalizeFields(
        metric.config_json ?? metric.config,
      ),
      is_mandatory:
        metric.is_mandatory === true ||
        metric.is_mandatory === "yes",
      is_active: metric.is_active !== false,
    }));
}

/* =========================================================================
   NORMALIZE CHANNEL METRICS
========================================================================= */

function normalizeChannelMetrics(data) {
  const rows = Array.isArray(data)
    ? data
    : data?.channel_metrics || [];

  const result = [];

  rows.forEach((row) => {
    if (row?.channel && Array.isArray(row.metrics)) {
      row.metrics
        .filter((metric) => metric?.is_active !== false)
        .forEach((metric) => {
          result.push({
            id: metric.id,
            metric_name: metric.metric_name,
            metric_key: metric.metric_key,
            channel_id: row.channel.id,
            channel_name: row.channel.name,
            channel_code: row.channel.code,
            fields: normalizeFields(
              metric.config_json ?? metric.config,
            ),
            is_mandatory:
              metric.is_mandatory === true ||
              metric.is_mandatory === "yes",
            is_active: metric.is_active !== false,
          });
        });

      return;
    }

    if (row?.is_active === false) return;

    result.push({
      id: row.id,
      metric_name: row.metric_name,
      metric_key: row.metric_key,
      channel_id: row.channel_id,
      channel_name:
        row.channel_name ||
        row.channel ||
        `Channel ${row.channel_id}`,
      channel_code: row.channel_code || "",
      fields: normalizeFields(
        row.config_json ?? row.config,
      ),
      is_mandatory:
        row.is_mandatory === true ||
        row.is_mandatory === "yes",
      is_active: row.is_active !== false,
    });
  });

  return result;
}

/* =========================================================================
   NORMALIZE CHANNELS
========================================================================= */

function normalizeChannels(data, channelMetrics = []) {
  const grouped = Array.isArray(data?.channel_metrics)
    ? data.channel_metrics
    : null;

  if (grouped) {
    const fromGroups = grouped
      .filter((row) => row?.channel)
      .filter(
        (row) =>
          Array.isArray(row.metrics) &&
          row.metrics.some(
            (metric) => metric?.is_active !== false,
          ),
      )
      .map((row) => ({
        id: row.channel.id,
        name: row.channel.name,
        code: row.channel.code,
      }));

    if (fromGroups.length > 0) {
      return fromGroups;
    }
  }

  const seen = new Map();

  channelMetrics.forEach((metric) => {
    if (
      metric.channel_id === null ||
      metric.channel_id === undefined
    ) {
      return;
    }

    const key = String(metric.channel_id);

    if (seen.has(key)) return;

    seen.set(key, {
      id: metric.channel_id,
      name:
        metric.channel_name ||
        `Channel ${metric.channel_id}`,
      code: metric.channel_code || "",
    });
  });

  return Array.from(seen.values());
}

/* =========================================================================
   PLAN CARD SUMMARY
========================================================================= */

function summarizeLimit(limit) {
  const bag = {
    ...asObject(
      limit.metric_value || limit.metricValue,
    ),
  };

  Object.keys(limit || {}).forEach((key) => {
    if (RESERVED_VALUE_KEYS.has(key)) return;

    if (
      ["metric_value", "metricValue", "id", "values"].includes(
        key,
      )
    ) {
      return;
    }

    if (bag[key] === undefined) {
      bag[key] = limit[key];
    }
  });

  Object.entries(limit.values || {}).forEach(
    ([key, value]) => {
      bag[key] = value;
    },
  );

  const limitKey = Object.keys(bag).find((key) =>
    /limit|quantity|included|quota/i.test(key),
  );

  const cycleKey = Object.keys(bag).find((key) =>
    /cycle|period|interval/i.test(key),
  );

  return {
    quantity: limitKey ? bag[limitKey] : undefined,
    cycle: cycleKey ? bag[cycleKey] : "",
  };
}

/* =========================================================================
   COMPONENT
========================================================================= */

export default function Plans({ items = [], reload }) {
  const [edit, setEdit] = useState(null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const [metricsData, setMetricsData] = useState(metricsCache);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState("");

  const isModalOpen = Boolean(edit);

  useEffect(() => {
    void isModalOpen;
  }, [isModalOpen]);

  /* -----------------------------------------------------------------------
     LOAD METRICS
  ----------------------------------------------------------------------- */

  const loadMetrics = useCallback(
    async ({ force = false } = {}) => {
      if (!force && metricsCache) {
        setMetricsData(metricsCache);
        return;
      }

      setMetricsLoading(true);
      setMetricsError("");

      try {
        const response = await fetchPlanMetrics({ force });
        setMetricsData(response);
      } catch (err) {
        setMetricsError(
          err?.message ||
            "The metrics catalog didn't load. Reload to try again.",
        );
      } finally {
        setMetricsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  /* -----------------------------------------------------------------------
     DERIVED METRIC LOOKUPS
  ----------------------------------------------------------------------- */

  const basicMetrics = useMemo(
    () => normalizeBasicMetrics(metricsData),
    [metricsData],
  );

  const channelMetrics = useMemo(
    () => normalizeChannelMetrics(metricsData),
    [metricsData],
  );

  const channels = useMemo(
    () => normalizeChannels(metricsData, channelMetrics),
    [metricsData, channelMetrics],
  );

  const channelMetricsByChannel = useMemo(() => {
    const map = new Map();

    channelMetrics.forEach((metric) => {
      const key = String(metric.channel_id);

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(metric);
    });

    return map;
  }, [channelMetrics]);

  const findMetric = useCallback(
    (limit) => {
      if (!limit?.metric_id) return null;

      if (limit.metric_type === "channel") {
        return (
          channelMetrics.find(
            (metric) =>
              String(metric.id) ===
                String(limit.metric_id) &&
              String(metric.channel_id) ===
                String(limit.channel_id),
          ) || null
        );
      }

      return (
        basicMetrics.find(
          (metric) =>
            String(metric.id) ===
            String(limit.metric_id),
        ) || null
      );
    },
    [basicMetrics, channelMetrics],
  );

  function getMetricDisplayName(limit) {
    const metric = findMetric(limit);

    return (
      metric?.metric_name ||
      limit.metric_name ||
      limit.metric_code ||
      limit.metric_key ||
      `Metric #${limit.metric_id}`
    );
  }

  /* -----------------------------------------------------------------------
     PLAN STATISTICS
  ----------------------------------------------------------------------- */

  const stats = useMemo(() => {
    const active = items.filter(
      (item) => item.status === "active",
    ).length;

    const archived = items.filter(
      (item) => item.status === "archived",
    ).length;

    const custom = items.filter(
      (item) => Boolean(item.is_custom),
    ).length;

    return {
      total: items.length,
      active,
      archived,
      custom,
    };
  }, [items]);

  /* -----------------------------------------------------------------------
     ARCHIVE PLAN
  ----------------------------------------------------------------------- */

  async function archive() {
    if (!edit?.id) return;

    const confirmed = window.confirm(
      `Archive "${edit.name}"? Existing subscriptions keep running.`,
    );

    if (!confirmed) return;

    setArchiving(true);
    setError("");

    try {
      await api(
        `/api/admin/subscription-plans/${edit.id}`,
        {
          method: "DELETE",
        },
      );

      setEdit(null);

      if (reload) {
        await reload();
      }
    } catch (err) {
      console.error("Archive plan failed:", err);

      setError(
        err?.message ||
          "The plan wasn't archived. Try again.",
      );
    } finally {
      setArchiving(false);
    }
  }

  /* -----------------------------------------------------------------------
     OPEN PLAN
  ----------------------------------------------------------------------- */

  function open(plan) {
    setError("");

    if (plan) {
      const limits = (plan.limits || []).map((item) => {
        const stored = asObject(
          item.metric_value || item.metricValue,
        );

        const isChannel =
          item.metric_type === "channel" ||
          Boolean(item.channel_id);

        const values = {};

        Object.entries(stored).forEach(
          ([key, value]) => {
            if (RESERVED_VALUE_KEYS.has(key)) return;

            values[key] =
              value === null ? "" : value;
          },
        );

        return {
          ...blankLimit,

          id: item.id,

          metric_type: isChannel
            ? "channel"
            : "basic",

          metric_id:
            item.metric_id ??
            item.metricId ??
            "",

          metric_name:
            item.metric_name ??
            stored.metric_name ??
            "",

          metric_key:
            item.metric_key ??
            item.metric_code ??
            stored.metric_key ??
            "",

          metric_code:
            item.metric_code ??
            item.metric_key ??
            stored.metric_code ??
            "",

          channel_id:
            item.channel_id ??
            stored.channel_id ??
            "",

          channel_name:
            item.channel_name ??
            stored.channel_name ??
            "",

          channel:
            item.channel ??
            item.channel_code ??
            stored.channel ??
            "",

          values,

          enabled:
            stored.enabled ??
            item.enabled ??
            true,
        };
      });

      setEdit({
        ...blankPlan,
        ...plan,
        limits,
      });

      return;
    }

    setEdit({
      ...blankPlan,
      limits: [],
    });
  }

  /* -----------------------------------------------------------------------
     UPDATE PLAN
  ----------------------------------------------------------------------- */

  function updatePlan(field, value) {
    setEdit((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* -----------------------------------------------------------------------
     ADD / REMOVE METRIC
  ----------------------------------------------------------------------- */

  function addLimit() {
    setEdit((current) => ({
      ...current,
      limits: [
        ...(current.limits || []),
        {
          ...blankLimit,
          values: {},
          metric_type: "basic",
        },
      ],
    }));
  }

  function removeLimit(index) {
    setEdit((current) => ({
      ...current,
      limits: (current.limits || []).filter(
        (_, i) => i !== index,
      ),
    }));
  }

  /* -----------------------------------------------------------------------
     UPDATE METRIC ROW
  ----------------------------------------------------------------------- */

  function updateLimit(index, field, value) {
    setEdit((current) => {
      const limits = [...(current.limits || [])];

      const patch =
        typeof field === "object"
          ? field
          : { [field]: value };

      limits[index] = {
        ...limits[index],
        ...patch,
      };

      return {
        ...current,
        limits,
      };
    });
  }

  function updateLimitValue(index, key, value) {
    setEdit((current) => {
      const limits = [...(current.limits || [])];

      limits[index] = {
        ...limits[index],
        values: {
          ...(limits[index].values || {}),
          [key]: value,
        },
      };

      return {
        ...current,
        limits,
      };
    });
  }

  function changeMetricType(index, type) {
    updateLimit(index, {
      metric_type: type,
      metric_id: "",
      metric_name: "",
      metric_key: "",
      metric_code: "",
      channel_id: "",
      channel_name: "",
      channel: "",
      values: {},
    });
  }

  function selectBasicMetric(limitIndex, metricId) {
    if (!metricId) {
      updateLimit(limitIndex, {
        metric_id: "",
        metric_name: "",
        metric_code: "",
        values: {},
      });

      return;
    }

    const metric = basicMetrics.find(
      (item) =>
        String(item.id) === String(metricId),
    );

    if (!metric) return;

    const previous =
      edit?.limits?.[limitIndex]?.values || {};

    updateLimit(limitIndex, {
      metric_type: "basic",
      metric_id: metric.id,
      metric_code: metric.metric_key,
      metric_name: metric.metric_name,
      metric_key: metric.metric_key,
      channel_id: "",
      channel_name: "",
      channel: "",
      values: buildValues(
        metric.fields,
        previous,
      ),
    });
  }

  function selectChannel(index, channelId) {
    const channel = channels.find(
      (item) =>
        String(item.id) === String(channelId),
    );

    updateLimit(index, {
      metric_type: "channel",
      metric_id: "",
      metric_code: "",
      metric_name: "",
      metric_key: "",
      channel_id: channelId,
      channel_name: channel?.name || "",
      channel: channel?.code || "",
      values: {},
    });
  }

  function selectChannelMetric(index, metricId) {
    const currentLimit = edit?.limits?.[index];

    if (!currentLimit?.channel_id) return;

    if (!metricId) {
      updateLimit(index, {
        metric_id: "",
        metric_name: "",
        metric_code: "",
        values: {},
      });

      return;
    }

    const metric = channelMetrics.find(
      (item) =>
        String(item.id) === String(metricId) &&
        String(item.channel_id) ===
          String(currentLimit.channel_id),
    );

    if (!metric) return;

    updateLimit(index, {
      metric_type: "channel",
      metric_id: metric.id,
      metric_code: metric.metric_key,
      metric_name: metric.metric_name,
      metric_key: metric.metric_key,
      channel_id: metric.channel_id,
      channel_name: metric.channel_name,
      channel: metric.channel_code,
      values: buildValues(
        metric.fields,
        currentLimit.values || {},
      ),
    });
  }

  /* -----------------------------------------------------------------------
     SAVE PLAN
  ----------------------------------------------------------------------- */

  async function save(e) {
    e.preventDefault();

    setError("");
    setSaving(true);

    try {
      const method = edit.id ? "PUT" : "POST";

      const url = edit.id
        ? `/api/admin/subscription-plans/${edit.id}`
        : "/api/admin/subscription-plans";

      const payload = {
        code: edit.code,
        name: edit.name,
        description: edit.description || "",
        currency: edit.currency,

        base_price:
          edit.base_price === "" ||
          edit.base_price === null ||
          edit.base_price === undefined
            ? 0
            : Number(edit.base_price),

        billing_interval: edit.billing_interval,

        interval_days:
          edit.billing_interval === "custom"
            ? Number(edit.interval_days)
            : null,

        is_custom:
          edit.billing_interval === "custom"
            ? true
            : Boolean(edit.is_custom),

        status: edit.status,

        limits: (edit.limits || [])
          .filter((item) => item.metric_id)
          .map((item) => {
            const metric = findMetric(item);
            const fields = metric?.fields || [];

            const metricValue = {};

            if (fields.length > 0) {
              fields.forEach((field) => {
                metricValue[field.key] =
                  serializeValue(
                    field,
                    item.values?.[field.key],
                  );
              });
            } else {
              Object.entries(
                item.values || {},
              ).forEach(([key, value]) => {
                metricValue[key] =
                  value === "" ? null : value;
              });
            }

            metricValue.enabled =
              Boolean(item.enabled);

            return {
              metric_id: Number(item.metric_id),

              metric_type:
                item.metric_type === "channel"
                  ? "channel"
                  : "basic",

              channel_id:
                item.metric_type === "channel"
                  ? Number(item.channel_id)
                  : null,

              metric_value: metricValue,
            };
          }),
      };

      await api(url, {
        method,
        body: JSON.stringify(payload),
      });

      setEdit(null);

      if (reload) {
        await reload();
      }
    } catch (err) {
      console.error("SAVE PLAN ERROR:", err);

      setError(
        err?.message ||
          "The plan wasn't saved. Check the fields and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const limits = edit?.limits || [];

  const readyLimits = limits.filter(
    (limit) => limit.metric_id,
  ).length;

  /* -----------------------------------------------------------------------
     RENDER
  ----------------------------------------------------------------------- */

  return (
    <div className="plans-page">
      <Title
        tag="COMMERCIAL CATALOG"
        title={
          <>
            Subscription <em>plans.</em>
          </>
        }
        copy="Manage pricing, billing cycles, and usage limits for every subscription tier."
        action={
          <button
            className="primary"
            onClick={() => open()}
          >
            New plan ＋
          </button>
        }
      />

      <div className="plans-top">
        <div className="stat-card">
          <span className="stat-label">
            Total plans
          </span>

          <div className="stat-value">
            {stats.total}
          </div>

          <div className="stat-description">
            Configured subscription tiers
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Active
          </span>

          <div className="stat-value">
            {stats.active}
          </div>

          <div className="stat-description">
            Currently available plans
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Archived
          </span>

          <div className="stat-value">
            {stats.archived}
          </div>

          <div className="stat-description">
            Retained for existing subscriptions
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Custom
          </span>

          <div className="stat-value">
            {stats.custom}
          </div>

          <div className="stat-description">
            Flexible billing configurations
          </div>
        </div>
      </div>

      <div className="plans-section-head">
        <div>
          <h2>Available subscription tiers</h2>

          <p>
            Pricing and included usage are controlled
            from this catalog.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-plans">
          <div>
            <div className="empty-icon">◇</div>

            <h3>No subscription plans yet</h3>

            <p>
              Create your first plan to define pricing,
              billing intervals, and usage limits.
            </p>

            <button
              className="primary"
              onClick={() => open()}
            >
              Create first plan ＋
            </button>
          </div>
        </div>
      ) : (
        <div className="plan-grid-new">
          {items.map((plan, index) => {
            const planLimits = plan.limits || [];
            const visibleLimits =
              planLimits.slice(0, 5);

            const isFeatured =
              String(plan.name || "").toLowerCase() ===
              "pro";

            return (
              <article
                className={`plan-card-new ${
                  isFeatured ? "featured" : ""
                }`}
                key={plan.id}
              >
                {isFeatured && (
                  <span className="featured-label">
                    ✨ Recommended
                  </span>
                )}

                <div className="plan-card-head">
                  <div className="plan-identity">
                    <div className="plan-avatar">
                      {getPlanInitial(plan.name)}
                    </div>

                    <div>
                      <div className="plan-type">
                        {getPlanType(plan)}
                      </div>

                      <h3 className="plan-name">
                        {plan.name ||
                          "Unnamed plan"}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`status-badge ${
                      plan.status === "active"
                        ? "active"
                        : "archived"
                    }`}
                  >
                    {plan.status || "unknown"}
                  </span>
                </div>

                <p className="plan-description">
                  {plan.description ||
                    "Flexible subscription plan with configurable usage limits."}
                </p>

                <div className="price-row">
                  <span className="price">
                    {cash(
                      plan.base_price,
                      plan.currency,
                    )}
                  </span>

                  <span className="price-period">
                    / {getIntervalText(plan)}
                  </span>
                </div>

                <div className="limits-head">
                  <span className="limits-title">
                    Included usage
                  </span>

                  <span className="limit-count">
                    {planLimits.length} metric
                    {planLimits.length === 1
                      ? ""
                      : "s"}
                  </span>
                </div>

                <div className="limit-list">
                  {visibleLimits.length > 0 ? (
                    visibleLimits.map(
                      (limit, limitIndex) => {
                        const summary =
                          summarizeLimit(limit);

                        return (
                          <div
                            className="limit-item"
                            key={
                              limit.id ||
                              `${plan.id}-${
                                limit.metric_id ||
                                limit.metric_code
                              }-${limitIndex}`
                            }
                          >
                            <div className="limit-main">
                              <span className="limit-check">
                                ✓
                              </span>

                              <div>
                                <div className="limit-name">
                                  {getMetricDisplayName(
                                    limit,
                                  )}
                                </div>

                                <span className="limit-channel">
                                  {limit.metric_type ===
                                  "channel"
                                    ? limit.channel_name ||
                                      limit.channel ||
                                      findMetric(
                                        limit,
                                      )
                                        ?.channel_name ||
                                      `Channel ${
                                        limit.channel_id ||
                                        ""
                                      }`
                                    : "Global usage"}
                                </span>
                              </div>
                            </div>

                            <span className="limit-value">
                              {formatNumber(
                                summary.quantity,
                              )}
                            </span>
                          </div>
                        );
                      },
                    )
                  ) : (
                    <div className="no-limits">
                      No usage limits configured
                    </div>
                  )}
                </div>

                <div className="plan-footer">
                  <span className="plan-code">
                    {plan.code ||
                      `plan-${index + 1}`}
                  </span>

                  <button
                    className="edit-plan"
                    onClick={() => open(plan)}
                  >
                    Edit plan →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          CREATE / EDIT MODAL
      ===================================================================== */}

      {edit && (
        <Modal
          title={
            edit.id
              ? "Edit subscription plan"
              : "Create subscription plan"
          }
          close={() => {
            if (!saving && !archiving) {
              setEdit(null);
            }
          }}
        >
          <form
            className="modal-form wide-modal"
            onSubmit={save}
          >
            <div className="modal-intro">
              <strong>
                {edit.id
                  ? `Editing ${
                      edit.name ||
                      "subscription plan"
                    }`
                  : "Create a new subscription tier"}
              </strong>

              <span>
                Set the commercial details first, then
                pick the metrics included with this plan.
                Each metric asks for the fields defined in
                its own configuration.
              </span>
            </div>

            <div className="fields two">
              <Field label="Plan name">
                <input
                  required
                  value={edit.name}
                  placeholder="Growth"
                  onChange={(e) => {
                    const name = e.target.value;

                    setEdit((current) => ({
                      ...current,
                      name,
                      code: current.id
                        ? current.code
                        : name
                            .toLowerCase()
                            .replace(
                              /[^a-z0-9]+/g,
                              "-",
                            )
                            .replace(
                              /^-+|-+$/g,
                              "",
                            ),
                    }));
                  }}
                />
              </Field>

              <Field label="Plan code">
                <input
                  required
                  pattern="^[a-z0-9_-]{2,60}$"
                  title="Use lowercase letters, numbers, hyphens, or underscores."
                  value={edit.code}
                  placeholder="growth"
                  onChange={(e) =>
                    updatePlan(
                      "code",
                      e.target.value.toLowerCase(),
                    )
                  }
                />

                <small className="field-hint">
                  Used in the API and on invoices.
                </small>
              </Field>

              <Field label="Base price">
                <span className="input-affix">
                  <span>{edit.currency}</span>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={edit.base_price}
                    onChange={(e) =>
                      updatePlan(
                        "base_price",
                        e.target.value,
                      )
                    }
                  />
                </span>

                <small className="field-hint">
                  Charged every{" "}
                  {getIntervalText(edit)} before
                  overage.
                </small>
              </Field>

              <Field label="Currency">
                <select
                  value={edit.currency}
                  onChange={(e) =>
                    updatePlan(
                      "currency",
                      e.target.value,
                    )
                  }
                >
                  {CURRENCIES.map((currency) => (
                    <option
                      key={currency}
                      value={currency}
                    >
                      {currency}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Billing interval">
                <select
                  value={edit.billing_interval}
                  onChange={(e) => {
                    const value = e.target.value;

                    setEdit((current) => ({
                      ...current,
                      billing_interval: value,
                      interval_days:
                        value === "custom"
                          ? current.interval_days ||
                            30
                          : null,
                      is_custom:
                        value === "custom"
                          ? true
                          : current.is_custom,
                    }));
                  }}
                >
                  {BILLING_INTERVALS.map(
                    (interval) => (
                      <option
                        key={interval}
                        value={interval}
                      >
                        {humanize(interval)}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              {edit.billing_interval ===
                "custom" && (
                <Field label="Interval days">
                  <input
                    type="number"
                    min="1"
                    max="366"
                    required
                    inputMode="numeric"
                    placeholder="30"
                    value={
                      edit.interval_days || ""
                    }
                    onChange={(e) =>
                      updatePlan(
                        "interval_days",
                        e.target.value,
                      )
                    }
                  />

                  <small className="field-hint">
                    Between 1 and 366 days.
                  </small>
                </Field>
              )}

              <Field label="Status">
                <select
                  value={edit.status}
                  onChange={(e) =>
                    updatePlan(
                      "status",
                      e.target.value,
                    )
                  }
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="archived">
                    Archived
                  </option>
                </select>
              </Field>

              <Field label="Plan type">
                <select
                  value={
                    edit.is_custom
                      ? "custom"
                      : "standard"
                  }
                  onChange={(e) =>
                    updatePlan(
                      "is_custom",
                      e.target.value ===
                        "custom",
                    )
                  }
                >
                  {PLAN_TYPES.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {humanize(type)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea
                rows="3"
                maxLength="500"
                value={edit.description || ""}
                placeholder="Who this plan is for, in one or two lines."
                onChange={(e) =>
                  updatePlan(
                    "description",
                    e.target.value,
                  )
                }
              />

              <small className="field-hint">
                {(edit.description || "").length}
                /500 characters. Shown on the plan
                card.
              </small>
            </Field>

            {/* ===============================================================
                USAGE LIMITS
            =============================================================== */}

            <div className="limits-bar">
              <div>
                <h4>Usage limits</h4>

                <p>
                  {limits.length === 0
                    ? "Nothing included yet — add a metric to set what this plan covers."
                    : `${readyLimits} of ${
                        limits.length
                      } metric${
                        limits.length === 1
                          ? ""
                          : "s"
                      } ready to save.`}
                </p>
              </div>

              <div className="limits-bar-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={metricsLoading}
                  onClick={() =>
                    loadMetrics({
                      force: true,
                    })
                  }
                  title="Fetch the metrics catalog again"
                >
                  {metricsLoading
                    ? "Loading…"
                    : "Reload metrics"}
                </button>
              </div>
            </div>

            {metricsError && (
              <div className="notice warn">
                <span>{metricsError}</span>

                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    loadMetrics({
                      force: true,
                    })
                  }
                >
                  Try again
                </button>
              </div>
            )}

            {metricsLoading && limits.length === 0 ? (
              <div className="no-limits">
                Loading the metrics catalog…
              </div>
            ) : limits.length === 0 ? (
              <div className="no-limits">
                Add a metric to define the usage
                included with this plan.
              </div>
            ) : (
              <div className="metric-list">
                {limits.map((limit, index) => {
                  const isChannel =
                    limit.metric_type ===
                    "channel";

                  const selectedChannelMetrics =
                    isChannel
                      ? channelMetricsByChannel.get(
                          String(
                            limit.channel_id,
                          ),
                        ) || []
                      : [];

                  const metric =
                    findMetric(limit);

                  const fields =
                    metric?.fields || [];

                  const headTitle =
                    metric?.metric_name ||
                    limit.metric_name ||
                    (isChannel
                      ? "New channel metric"
                      : "New metric");

                  const headSub = isChannel
                    ? limit.channel_name
                      ? `${limit.channel_name} channel`
                      : "Applies to one channel"
                    : "Applies across all channels";

                  return (
                    <div
                      className={`metric-editor ${
                        limit.metric_id
                          ? ""
                          : "incomplete"
                      }`}
                      key={
                        limit.id ||
                        `limit-${index}`
                      }
                    >
                      <div className="metric-editor-head">
                        <div>
                          <div className="metric-head-title">
                            {headTitle}
                          </div>

                          <div className="metric-head-sub">
                            {headSub}
                          </div>
                        </div>

                        <div className="metric-head-actions">
                          <div className="type-switch">
                            <button
                              type="button"
                              className={
                                isChannel
                                  ? ""
                                  : "on"
                              }
                              onClick={() =>
                                isChannel &&
                                changeMetricType(
                                  index,
                                  "basic",
                                )
                              }
                            >
                              Basic
                            </button>

                            <button
                              type="button"
                              className={
                                isChannel
                                  ? "on"
                                  : ""
                              }
                              onClick={() =>
                                !isChannel &&
                                changeMetricType(
                                  index,
                                  "channel",
                                )
                              }
                            >
                              Channel
                            </button>
                          </div>

                          <button
                            type="button"
                            className="remove-metric"
                            title="Remove this metric"
                            onClick={() =>
                              removeLimit(index)
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {!isChannel ? (
                        <div className="metric-fields one">
                          <Field label="Metric">
                            <select
                              required
                              value={
                                limit.metric_id ||
                                ""
                              }
                              onChange={(e) =>
                                selectBasicMetric(
                                  index,
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">
                                Choose a metric
                              </option>

                              {basicMetrics.map(
                                (item) => (
                                  <option
                                    key={item.id}
                                    value={
                                      item.id
                                    }
                                  >
                                    {
                                      item.metric_name
                                    }
                                    {item.is_mandatory
                                      ? " (mandatory)"
                                      : ""}
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>
                        </div>
                      ) : (
                        <div className="metric-fields">
                          <Field label="Channel">
                            <select
                              required
                              value={
                                limit.channel_id ||
                                ""
                              }
                              onChange={(e) =>
                                selectChannel(
                                  index,
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">
                                Choose a channel
                              </option>

                              {channels.map(
                                (channel) => (
                                  <option
                                    key={
                                      channel.id
                                    }
                                    value={
                                      channel.id
                                    }
                                  >
                                    {channel.name}
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>

                          <Field label="Channel metric">
                            <select
                              required
                              disabled={
                                !limit.channel_id
                              }
                              value={
                                limit.metric_id ||
                                ""
                              }
                              onChange={(e) =>
                                selectChannelMetric(
                                  index,
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">
                                {limit.channel_id
                                  ? "Choose a metric"
                                  : "Choose a channel first"}
                              </option>

                              {selectedChannelMetrics.map(
                                (item) => (
                                  <option
                                    key={
                                      item.id
                                    }
                                    value={
                                      item.id
                                    }
                                  >
                                    {
                                      item.metric_name
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>
                        </div>
                      )}

                      {limit.metric_id && (
                        <div className="metric-meta">
                          <span className="code">
                            {limit.metric_code ||
                              limit.metric_key}
                          </span>

                          {limit.channel_name && (
                            <span>
                              {
                                limit.channel_name
                              }
                            </span>
                          )}

                          {metric?.is_mandatory && (
                            <span>
                              Mandatory metric
                            </span>
                          )}
                        </div>
                      )}

                      {limit.metric_id && (
                        <div className="config-block">
                          <div className="config-block-head">
                            <span className="config-block-title">
                              Metric settings
                            </span>

                            <span className="config-block-note">
                              {fields.length >
                              0
                                ? `${
                                    fields.length
                                  } field${
                                    fields.length ===
                                    1
                                      ? ""
                                      : "s"
                                  } from the metric configuration`
                                : "This metric has no configured fields"}
                            </span>
                          </div>

                          {fields.length > 0 && (
                            <div className="config-fields">
                              {fields.map(
                                (field) => {
                                  const value =
                                    limit
                                      .values?.[
                                      field.key
                                    ] ?? "";

                                  if (
                                    field.input_type ===
                                    "select"
                                  ) {
                                    return (
                                      <Field
                                        key={
                                          field.key
                                        }
                                        label={
                                          field.label
                                        }
                                      >
                                        <select
                                          required={
                                            field.required
                                          }
                                          value={
                                            value
                                          }
                                          onChange={(
                                            e,
                                          ) =>
                                            updateLimitValue(
                                              index,
                                              field.key,
                                              e
                                                .target
                                                .value,
                                            )
                                          }
                                        >
                                          <option value="">
                                            Choose{" "}
                                            {field.label.toLowerCase()}
                                          </option>

                                          {field.options.map(
                                            (
                                              option,
                                            ) => (
                                              <option
                                                key={
                                                  option
                                                }
                                                value={
                                                  option
                                                }
                                              >
                                                {humanize(
                                                  option,
                                                )}
                                              </option>
                                            ),
                                          )}
                                        </select>

                                        {field.help && (
                                          <small className="field-hint">
                                            {
                                              field.help
                                            }
                                          </small>
                                        )}
                                      </Field>
                                    );
                                  }

                                  if (
                                    field.input_type ===
                                      "boolean" ||
                                    field.input_type ===
                                      "checkbox"
                                  ) {
                                    return (
                                      <Field
                                        key={
                                          field.key
                                        }
                                        label={
                                          field.label
                                        }
                                      >
                                        <label className="metric-toggle">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(
                                              limit
                                                .values?.[
                                                field
                                                  .key
                                              ],
                                            )}
                                            onChange={(
                                              e,
                                            ) =>
                                              updateLimitValue(
                                                index,
                                                field.key,
                                                e
                                                  .target
                                                  .checked,
                                              )
                                            }
                                          />

                                          {
                                            field.label
                                          }
                                        </label>
                                      </Field>
                                    );
                                  }

                                  if (
                                    field.input_type ===
                                      "text" ||
                                    field.input_type ===
                                      "string"
                                  ) {
                                    return (
                                      <Field
                                        key={
                                          field.key
                                        }
                                        label={
                                          field.label
                                        }
                                      >
                                        <input
                                          type="text"
                                          required={
                                            field.required
                                          }
                                          placeholder={
                                            field.placeholder
                                          }
                                          value={
                                            value
                                          }
                                          onChange={(
                                            e,
                                          ) =>
                                            updateLimitValue(
                                              index,
                                              field.key,
                                              e
                                                .target
                                                .value,
                                            )
                                          }
                                        />

                                        {field.help && (
                                          <small className="field-hint">
                                            {
                                              field.help
                                            }
                                          </small>
                                        )}
                                      </Field>
                                    );
                                  }

                                  const numberInput = (
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      inputMode="decimal"
                                      required={
                                        field.required
                                      }
                                      placeholder={
                                        field.placeholder ||
                                        "0"
                                      }
                                      value={
                                        value
                                      }
                                      onChange={(
                                        e,
                                      ) =>
                                        updateLimitValue(
                                          index,
                                          field.key,
                                          e
                                            .target
                                            .value,
                                        )
                                      }
                                    />
                                  );

                                  return (
                                    <Field
                                      key={
                                        field.key
                                      }
                                      label={
                                        field.label
                                      }
                                    >
                                      {isPriceField(
                                        field,
                                      ) ? (
                                        <span className="input-affix">
                                          <span>
                                            {
                                              edit.currency
                                            }
                                          </span>

                                          {
                                            numberInput
                                          }
                                        </span>
                                      ) : (
                                        numberInput
                                      )}

                                      {(
                                        field.help ||
                                        field.unit
                                      ) && (
                                        <small className="field-hint">
                                          {field.help ||
                                            `Measured in ${field.unit}`}
                                        </small>
                                      )}
                                    </Field>
                                  );
                                },
                              )}
                            </div>
                          )}

                          <label className="metric-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(
                                limit.enabled,
                              )}
                              onChange={(e) =>
                                updateLimit(
                                  index,
                                  "enabled",
                                  e.target.checked,
                                )
                              }
                            />

                            Include this metric in
                            the plan
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              className="add-metric-button"
              onClick={addLimit}
            >
              ＋ Add metric
            </button>

            {error && (
              <div className="notice error">
                {error}
              </div>
            )}

            <div className="modal-actions">
              {edit.id && (
                <button
                  className="danger"
                  type="button"
                  disabled={
                    saving || archiving
                  }
                  onClick={archive}
                >
                  {archiving
                    ? "Archiving…"
                    : "Archive"}
                </button>
              )}

              <button
                className="primary save-button"
                type="submit"
                disabled={
                  saving || archiving
                }
              >
                {saving
                  ? "Saving…"
                  : edit.id
                    ? "Save changes"
                    : "Create plan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}