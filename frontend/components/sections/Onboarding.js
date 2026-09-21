"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../app/i18n";
import { Title, Empty, Field, Modal } from "../ui/Primitives";
import { PropertyStructure } from "../schema/PropertyStructure";
import { blankEvent, blankProperty } from "../../lib/schema";
import { api } from "../../lib/api";
import { snakeName } from "../../lib/format";
import { today, workspaceInitial } from "../../lib/constants";

export default function Onboarding({ plans, clients, reload }) {
  const { t } = useI18n();
  const [form, setForm] = useState(workspaceInitial),
    [custom, setCustom] = useState([]),
    [customEdit, setCustomEdit] = useState(null),
    [notice, setNotice] = useState(null),
    [busy, setBusy] = useState(false);
  const set = (k) => (e) =>
    setForm({
      ...form,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });
  const ids = useMemo(() => {
    const s = (v) =>
      v
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return [
      s(form.clientName) || "client",
      `${s(form.clientName)}-${s(form.projectName)}`.replace(/^-|-$/g, "") ||
        "project",
    ];
  }, [form.clientName, form.projectName]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const payload = {
      client: {
        name: form.clientName,
        ...(form.clientId ? { client_id: form.clientId } : {}),
      },
      project: {
        name: form.projectName,
        mode: form.mode,
        category: form.category,
        crm_platform: form.provider,
        origins: form.origins
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        ...(form.provider === "custom" && custom.length
          ? { custom_schema: { events: custom } }
          : {}),
      },
      ...(form.adminEmail
        ? {
            user: { name: form.adminName, email: form.adminEmail },
            send_mail: form.sendMail,
          }
        : {}),
      ...(form.planId
        ? {
            subscription: {
              plan_id: Number(form.planId),
              status: form.subscriptionStatus,
              start_date: today,
              ...(form.subscriptionStatus === "trial"
                ? { trial_end: form.trialEnd }
                : {}),
            },
          }
        : {}),
    };
    try {
      const r = await api("/api/workspaces", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setNotice({
        ok: true,
        text: `Workspace ready — ${r.client_id} / ${r.project_id}`,
      });
      setForm(workspaceInitial);
      setCustom([]);
      reload();
    } catch (x) {
      setNotice({ ok: false, text: x.message });
    } finally {
      setBusy(false);
    }
  }
  function saveCustomEvent() {
    if (!customEdit.label.trim()) return;
    const event = {
      ...customEdit,
      name: snakeName(customEdit.label),
      properties: customEdit.properties.map((p) => ({
        ...p,
        name: snakeName(p.label),
        rule: { ...p.rule, data_type: p.rule.data_type || p.data_type },
      })),
    };
    if (Number.isInteger(customEdit.index)) {
      const next = [...custom];
      next[customEdit.index] = event;
      setCustom(next);
    } else setCustom([...custom, event]);
    setCustomEdit(null);
  }
  function updateCustomProp(index, key, value, rule = false) {
    const properties = customEdit.properties.map((p, i) =>
      i === index
        ? rule
          ? { ...p, rule: { ...p.rule, [key]: value } }
          : { ...p, [key]: value }
        : p,
    );
    setCustomEdit({ ...customEdit, properties });
  }
  return (
    <>
      <Title
        tag={t("onboarding.tag")}
        title={t("onboarding.title")}
        copy={t("onboarding.copy")}
      />
      <form className="onboard" onSubmit={submit}>
        <section>
          <article className="panel form-card">
            <h2>
              <i>01</i> Client & project
            </h2>
            <p>
              Choose an existing client for an additional project, or create a
              new one.
            </p>
            <div className="fields two">
              <Field label="Existing client">
                <select
                  value={form.clientId}
                  onChange={(e) => {
                    const c = clients.find(
                      (x) => x.client_id === e.target.value,
                    );
                    setForm({
                      ...form,
                      clientId: e.target.value,
                      clientName: c?.name || "",
                    });
                  }}
                >
                  <option value="">Create a new client</option>
                  {clients.map((x) => (
                    <option value={x.client_id} key={x.client_id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Client name">
                <input
                  required
                  disabled={!!form.clientId}
                  value={form.clientName}
                  onChange={set("clientName")}
                  placeholder="Fitze"
                />
              </Field>
              <Field label="Project name">
                <input
                  required
                  value={form.projectName}
                  onChange={set("projectName")}
                  placeholder="UAE Store"
                />
              </Field>
            </div>
            <div className="id-preview">
              <code>{form.clientId || `${ids[0]}-•••••`}</code>
              <code>{ids[1]}-•••••</code>
            </div>
          </article>
          <article className="panel form-card">
            <h2>
              <i>02</i> Workspace profile
            </h2>
            <p>Multiple projects can live under the same client.</p>
            <div className="choices">
              {[
                ["growth", "Growth", "Engagement and lifecycle"],
                ["business", "Business", "Enterprise operations"],
              ].map((x) => (
                <button
                  type="button"
                  className={form.category === x[0] ? "active" : ""}
                  onClick={() => setForm({ ...form, category: x[0] })}
                  key={x[0]}
                >
                  <i>{form.category === x[0] ? "✓" : ""}</i>
                  <span>
                    <b>{x[1]}</b>
                    <small>{x[2]}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="fields two">
              <Field label="Environment">
                <select value={form.mode} onChange={set("mode")}>
                  <option value="live">Live</option>
                  <option value="test">Test</option>
                </select>
              </Field>
              <Field label="Allowed origins">
                <input
                  value={form.origins}
                  onChange={set("origins")}
                  placeholder="https://store.example"
                />
              </Field>
            </div>
          </article>
          <article className="panel form-card">
            <h2>
              <i>03</i> Commerce provider
            </h2>
            <p>
              Known providers use maintained events, properties and mapping
              rules.
            </p>
            <div className="providers">
              {["salla", "shopify", "zid", "custom"].map((x) => (
                <button
                  type="button"
                  className={form.provider === x ? "active" : ""}
                  onClick={() => setForm({ ...form, provider: x })}
                  key={x}
                >
                  <i>{x[0].toUpperCase()}</i>
                  {x}
                </button>
              ))}
            </div>
            {form.provider === "custom" && (
              <div className="custom-schema">
                <div className="repeat-head">
                  <div>
                    <b>Custom events</b>
                    <small>Define events, properties and mapping rules</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomEdit(structuredClone(blankEvent))}
                  >
                    ＋ Add event
                  </button>
                </div>
                {custom.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Type</th>
                        <th>Properties</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {custom.map((event, index) => (
                        <tr key={`${event.name}-${index}`}>
                          <td>
                            <b>{event.label}</b>
                            <small className="block">{event.name}</small>
                          </td>
                          <td>{event.type}</td>
                          <td>{event.properties.length}</td>
                          <td>
                            <span className={`status ${event.status}`}>
                              {event.status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="table-action"
                              onClick={() =>
                                setCustomEdit({
                                  ...structuredClone(event),
                                  index,
                                })
                              }
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty>No custom events added yet</Empty>
                )}
              </div>
            )}
          </article>
          <article className="panel form-card">
            <h2>
              <i>04</i> Access & subscription
            </h2>
            <p>Email credentials only after provisioning completes.</p>
            <div className="fields two">
              <Field label="Administrator name">
                <input value={form.adminName} onChange={set("adminName")} />
              </Field>
              <Field label="Administrator email">
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={set("adminEmail")}
                />
              </Field>
              <Field label="Plan">
                <select value={form.planId} onChange={set("planId")}>
                  <option value="">No plan yet</option>
                  {plans.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.subscriptionStatus}
                  onChange={set("subscriptionStatus")}
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </Field>
              {form.planId && form.subscriptionStatus === "trial" && (
                <Field label="Trial end">
                  <input
                    type="date"
                    required
                    value={form.trialEnd}
                    onChange={set("trialEnd")}
                  />
                </Field>
              )}
            </div>
            {form.adminEmail && (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={form.sendMail}
                  onChange={set("sendMail")}
                />
                <i />
                <span>Send workspace credentials</span>
              </label>
            )}
          </article>
          {notice && (
            <div className={`notice ${notice.ok ? "success" : "error"}`}>
              {notice.text}
            </div>
          )}
          <button className="primary submit" disabled={busy}>
            {busy ? "Building workspace…" : "Create workspace →"}
          </button>
        </section>
        <aside className="ready">
          <span>● AUTOMATED SETUP</span>
          <h2>
            Your workspace
            <br />
            will be ready.
          </h2>
          {[
            "Register client and project",
            "Apply provider event schema",
            "Clone isolated databases",
            "Create subscription",
            "Email secure credentials",
          ].map((x, i) => (
            <div key={x}>
              <b>0{i + 1}</b>
              <p>{x}</p>
              <i>✓</i>
            </div>
          ))}
        </aside>
      </form>
      {customEdit && (
        <Modal
          title={
            Number.isInteger(customEdit.index)
              ? "Edit custom event"
              : "Add custom event"
          }
          close={() => setCustomEdit(null)}
        >
          <div className="modal-form event-modal">
            <div className="fields two">
              <Field label="Event name">
                <input
                  readOnly
                  value={snakeName(customEdit.label)}
                  placeholder="Created from label"
                />
              </Field>
              <Field label="Event label">
                <input
                  required
                  value={customEdit.label}
                  onChange={(e) =>
                    setCustomEdit({ ...customEdit, label: e.target.value })
                  }
                  placeholder="Order Completed"
                />
              </Field>
              <Field label="Type">
                <select
                  value={customEdit.type}
                  onChange={(e) =>
                    setCustomEdit({ ...customEdit, type: e.target.value })
                  }
                >
                  <option value="custom">Custom</option>
                  <option value="system">System</option>
                </select>
              </Field>
              <Field label="Nature">
                <select
                  value={customEdit.nature}
                  onChange={(e) =>
                    setCustomEdit({ ...customEdit, nature: e.target.value })
                  }
                >
                  <option value="defined">Defined</option>
                  <option value="undefined">Undefined</option>
                </select>
              </Field>
            </div>
            <div className="repeat-head">
              <div>
                <b>Event properties</b>
                <small>Each property includes its ingestion rule</small>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCustomEdit({
                    ...customEdit,
                    properties: [
                      ...customEdit.properties,
                      structuredClone(blankProperty),
                    ],
                  })
                }
              >
                ＋ Add property
              </button>
            </div>
            {customEdit.properties.map((p, i) => (
              <section className="property-editor" key={i}>
                <div className="property-title">
                  <b>Property {i + 1}</b>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomEdit({
                        ...customEdit,
                        properties: customEdit.properties.filter(
                          (_, n) => n !== i,
                        ),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
                <div className="fields three">
                  <Field label="Property name">
                    <input
                      readOnly
                      value={snakeName(p.label)}
                      placeholder="Created from label"
                    />
                  </Field>
                  <Field label="Label">
                    <input
                      value={p.label}
                      onChange={(e) =>
                        updateCustomProp(i, "label", e.target.value)
                      }
                      placeholder="Order ID"
                    />
                  </Field>
                  <Field label="Data type">
                    <select
                      value={p.data_type}
                      onChange={(e) => {
                        const data_type = e.target.value,
                          properties = customEdit.properties.map((item, n) =>
                            n === i
                              ? {
                                  ...item,
                                  data_type,
                                  inner_data_type:
                                    data_type === "list"
                                      ? item.inner_data_type || "string"
                                      : null,
                                  sub_properties: ["list", "json"].includes(
                                    data_type,
                                  )
                                    ? item.sub_properties || []
                                    : [],
                                  rule: {
                                    ...item.rule,
                                    data_type,
                                    is_loop: data_type === "list",
                                    inner_data_type:
                                      data_type === "list"
                                        ? item.inner_data_type || "string"
                                        : null,
                                  },
                                }
                              : item,
                          );
                        setCustomEdit({ ...customEdit, properties });
                      }}
                    >
                      {[
                        "string",
                        "boolean",
                        "json",
                        "list",
                        "mixin",
                        "date",
                        "number",
                        "date_time",
                        "time",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nature">
                    <select
                      value={p.nature || "defined"}
                      onChange={(e) =>
                        updateCustomProp(i, "nature", e.target.value)
                      }
                    >
                      <option value="defined">Defined</option>
                      <option value="undefined">Undefined</option>
                    </select>
                  </Field>
                  <Field label="Required">
                    <select
                      value={p.is_required ? "yes" : "no"}
                      onChange={(e) =>
                        updateCustomProp(
                          i,
                          "is_required",
                          e.target.value === "yes",
                        )
                      }
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </Field>
                  <Field label="Fallback">
                    <select
                      value={p.data_type_fallback || ""}
                      onChange={(e) =>
                        updateCustomProp(
                          i,
                          "data_type_fallback",
                          e.target.value || null,
                        )
                      }
                    >
                      <option value="">None</option>
                      <option value="drop_event">Drop event</option>
                      <option value="drop_event_property">Drop property</option>
                      <option value="allow_property">Allow property</option>
                    </select>
                  </Field>
                  <Field label="Raw JSON path">
                    <input
                      value={p.rule.raw_json_path}
                      onChange={(e) =>
                        updateCustomProp(
                          i,
                          "raw_json_path",
                          e.target.value,
                          true,
                        )
                      }
                      placeholder="payload.data.order_id"
                    />
                  </Field>
                  <Field label="Rule data type">
                    <select
                      value={p.rule.data_type}
                      onChange={(e) =>
                        updateCustomProp(i, "data_type", e.target.value, true)
                      }
                    >
                      {[
                        "string",
                        "boolean",
                        "json",
                        "list",
                        "mixin",
                        "date",
                        "number",
                        "date_time",
                        "time",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Loop">
                    <select
                      value={p.rule.is_loop ? "yes" : "no"}
                      onChange={(e) =>
                        updateCustomProp(
                          i,
                          "is_loop",
                          e.target.value === "yes",
                          true,
                        )
                      }
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </Field>
                </div>
                {["list", "json"].includes(p.data_type) && (
                  <PropertyStructure
                    property={p}
                    onChange={(next) => {
                      const properties = customEdit.properties.map((item, n) =>
                        n === i ? next : item,
                      );
                      setCustomEdit({ ...customEdit, properties });
                    }}
                  />
                )}
              </section>
            ))}
            <div className="modal-actions">
              {Number.isInteger(customEdit.index) && (
                <button
                  className="danger"
                  type="button"
                  onClick={() => {
                    setCustom(custom.filter((_, i) => i !== customEdit.index));
                    setCustomEdit(null);
                  }}
                >
                  Remove event
                </button>
              )}
              <button
                className="primary"
                type="button"
                onClick={saveCustomEvent}
              >
                Save event
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
