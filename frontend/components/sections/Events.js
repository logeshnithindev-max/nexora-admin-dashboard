"use client";

import { useState } from "react";
import { Title, Field, Modal, Empty } from "../ui/Primitives";
import { PropertyStructure } from "../schema/PropertyStructure";
import { blankEvent, blankProperty } from "../../lib/schema";
import { api } from "../../lib/api";
import { snakeName } from "../../lib/format";

export default function Events({ clients }) {
  const [client, setClient] = useState(""),
    [projects, setProjects] = useState([]),
    [project, setProject] = useState(""),
    [events, setEvents] = useState([]),
    [edit, setEdit] = useState(null),
    [error, setError] = useState("");
  async function chooseClient(id) {
    setClient(id);
    setProject("");
    setEvents([]);
    setProjects(id ? await api(`/api/admin/clients/${id}/projects`) : []);
  }
  async function loadEvents(id = project) {
    setProject(id);
    setEvents(
      id ? await api(`/api/admin/clients/${client}/projects/${id}/events`) : [],
    );
  }
  async function open(item) {
    setError("");
    setEdit(
      item
        ? await api(
            `/api/admin/clients/${client}/projects/${project}/events/${item.id}`,
          )
        : structuredClone(blankEvent),
    );
  }
  function updateProp(index, key, value, rule = false) {
    const properties = edit.properties.map((p, i) =>
      i === index
        ? rule
          ? { ...p, rule: { ...p.rule, [key]: value } }
          : { ...p, [key]: value }
        : p,
    );
    setEdit({ ...edit, properties });
  }
  async function save(e) {
    e.preventDefault();
    try {
      const body = {
        ...edit,
        properties: edit.properties.map((p) => ({
          ...p,
          is_required: !!p.is_required,
          is_conversion_event_property: !!p.is_conversion_event_property,
          is_live_activity: !!p.is_live_activity,
          rule: p.rule || {
            raw_json_path: p.raw_json_path,
            data_type: p.rule_data_type || p.data_type,
            is_loop: !!p.is_loop,
            parent_id: p.parent_id || 0,
            inner_data_type: p.rule_inner_data_type,
          },
        })),
      };
      await api(
        edit.id
          ? `/api/admin/clients/${client}/projects/${project}/events/${edit.id}`
          : `/api/admin/clients/${client}/projects/${project}/events`,
        { method: edit.id ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      setEdit(null);
      loadEvents();
    } catch (x) {
      setError(x.message);
    }
  }
  async function discard() {
    if (!confirm("Discard this event schema?")) return;
    await api(
      `/api/admin/clients/${client}/projects/${project}/events/${edit.id}`,
      { method: "DELETE" },
    );
    setEdit(null);
    loadEvents();
  }
  return (
    <>
      <Title
        tag="TENANT SCHEMA"
        title={
          <>
            Events, properties & <em>rules.</em>
          </>
        }
        copy="Manage the schema inside each client's isolated MySQL workspace."
        action={
          project && (
            <button className="primary" onClick={() => open()}>
              New event ＋
            </button>
          )
        }
      />
      <article className="panel selector-bar">
        <Field label="Client">
          <select value={client} onChange={(e) => chooseClient(e.target.value)}>
            <option value="">Select client</option>
            {clients.map((x) => (
              <option value={x.client_id} key={x.client_id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project">
          <select
            disabled={!client}
            value={project}
            onChange={(e) => loadEvents(e.target.value)}
          >
            <option value="">Select project</option>
            {projects.map((x) => (
              <option value={x.project_id} key={x.project_id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
      </article>
      {project && (
        <article className="panel table-panel">
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
              {events.map((x) => (
                <tr key={x.id}>
                  <td>
                    <b>{x.label}</b>
                    <small className="block">{x.name}</small>
                  </td>
                  <td>{x.type}</td>
                  <td>{x.property_count}</td>
                  <td>
                    <span className={`status ${x.status}`}>{x.status}</span>
                  </td>
                  <td>
                    <button className="table-action" onClick={() => open(x)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events.length && (
            <Empty>No events configured for this workspace</Empty>
          )}
        </article>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Edit event schema" : "New event schema"}
          close={() => setEdit(null)}
        >
          <form className="modal-form event-modal" onSubmit={save}>
            <div className="fields two">
              <Field label="Event name">
                <input
                  readOnly
                  value={snakeName(edit.label)}
                  placeholder="Created from label"
                />
              </Field>
              <Field label="Label">
                <input
                  required
                  value={edit.label}
                  onChange={(e) => setEdit({ ...edit, label: e.target.value })}
                />
              </Field>
              <Field label="Type">
                <select
                  value={edit.type}
                  onChange={(e) => setEdit({ ...edit, type: e.target.value })}
                >
                  <option value="custom">Custom</option>
                  <option value="system">System</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discard">Discard</option>
                </select>
              </Field>
            </div>
            <div className="repeat-head">
              <b>Properties and mapping rules</b>
              <button
                type="button"
                onClick={() =>
                  setEdit({
                    ...edit,
                    properties: [
                      ...edit.properties,
                      structuredClone(blankProperty),
                    ],
                  })
                }
              >
                ＋ Add property
              </button>
            </div>
            {edit.properties.map((p, i) => (
              <section className="property-editor" key={p.id || i}>
                <div className="property-title">
                  <b>Property {i + 1}</b>
                  <button
                    type="button"
                    onClick={() =>
                      setEdit({
                        ...edit,
                        properties: edit.properties.filter((_, n) => n !== i),
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
                      required
                      value={p.label}
                      onChange={(e) => updateProp(i, "label", e.target.value)}
                    />
                  </Field>
                  <Field label="Data type">
                    <select
                      value={p.data_type}
                      onChange={(e) => {
                        const data_type = e.target.value,
                          properties = edit.properties.map((item, n) =>
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
                                    ...(item.rule || {}),
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
                        setEdit({ ...edit, properties });
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
                  <Field label="Raw JSON path">
                    <input
                      required
                      value={p.rule?.raw_json_path || p.raw_json_path || ""}
                      onChange={(e) =>
                        updateProp(i, "raw_json_path", e.target.value, true)
                      }
                    />
                  </Field>
                  <Field label="Rule data type">
                    <select
                      value={
                        p.rule?.data_type || p.rule_data_type || p.data_type
                      }
                      onChange={(e) =>
                        updateProp(i, "data_type", e.target.value, true)
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
                  <Field label="Required">
                    <select
                      value={
                        p.is_required === true || p.is_required === "yes"
                          ? "yes"
                          : "no"
                      }
                      onChange={(e) =>
                        updateProp(i, "is_required", e.target.value === "yes")
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
                      const properties = edit.properties.map((item, n) =>
                        n === i ? next : item,
                      );
                      setEdit({ ...edit, properties });
                    }}
                  />
                )}
              </section>
            ))}
            {error && <div className="notice error">{error}</div>}
            <div className="modal-actions">
              {edit.id && (
                <button className="danger" type="button" onClick={discard}>
                  Discard event
                </button>
              )}
              <button className="primary">Save schema</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
