"use client";

import { useState } from "react";
import { Title, Field } from "../ui/Primitives";
import { api } from "../../lib/api";

export default function Clients({ items, reload }) {
  const [client, setClient] = useState(null),
    [projects, setProjects] = useState([]),
    [project, setProject] = useState(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  function originsText(value) {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value !== "string") return "";
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(", ") : value;
    } catch {
      return value;
    }
  }
  async function selectClient(clientId) {
    setError("");
    setSaved(false);
    const next = items.find((x) => x.client_id === clientId) || null;
    setClient(next ? { ...next } : null);
    setProject(null);
    if (!next) {
      setProjects([]);
      return;
    }
    try {
      setProjects(await api(`/api/admin/clients/${next.client_id}/projects`));
    } catch (x) {
      setProjects([]);
      setError(x.message);
    }
  }
  function selectProject(projectId) {
    setSaved(false);
    const next = projects.find((x) => x.project_id === projectId) || null;
    setProject(next ? { ...next, origins: originsText(next.origins) } : null);
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await api(`/api/admin/clients/${client.client_id}`, {
        method: "PUT",
        body: JSON.stringify({ name: client.name, status: client.status }),
      });
      if (project)
        await api(
          `/api/admin/clients/${client.client_id}/projects/${project.project_id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name: project.name,
              status: project.status,
              category: project.category,
              mode: project.mode,
              crm_platform: project.crm_platform,
              origins: project.origins
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
            }),
          },
        );
      await reload();
      const refreshed = await api(
        `/api/admin/clients/${client.client_id}/projects`,
      );
      setProjects(refreshed);
      if (project) {
        const updated = refreshed.find(
          (x) => x.project_id === project.project_id,
        );
        if (updated)
          setProject({ ...updated, origins: originsText(updated.origins) });
      }
      setSaved(true);
    } catch (x) {
      setError(x.message);
    }
  }
  async function deactivate(kind, item) {
    if (!confirm(`Deactivate this ${kind}? Its data will be preserved.`))
      return;
    const url =
      kind === "client"
        ? `/api/admin/clients/${item.client_id}`
        : `/api/admin/clients/${item.client_id}/projects/${item.project_id}`;
    await api(url, { method: "DELETE" });
    await reload();
    if (kind === "project") await selectClient(client.client_id);
    else {
      setClient({ ...client, status: "inactive" });
      setProject(null);
    }
  }
  return (
    <>
      <Title
        tag="ACCOUNTS"
        title={
          <>
            Clients & <em>projects.</em>
          </>
        }
        copy="Choose an existing workspace and update it with the same structure used during onboarding."
      />
      <form className="workspace-editor" onSubmit={save}>
        <article className="panel form-card selector-card">
          <div className="step-head">
            <i>01</i>
            <div>
              <h2>Choose workspace</h2>
              <p>Select a client, then choose one of its mapped projects.</p>
            </div>
          </div>
          <div className="fields two">
            <Field label="Client">
              <select
                value={client?.client_id || ""}
                onChange={(e) => selectClient(e.target.value)}
              >
                <option value="">Select client</option>
                {items.map((x) => (
                  <option value={x.client_id} key={x.client_id}>
                    {x.name} · {x.project_count} project
                    {x.project_count === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project">
              <select
                disabled={!client || !projects.length}
                value={project?.project_id || ""}
                onChange={(e) => selectProject(e.target.value)}
              >
                <option value="">
                  {client && !projects.length
                    ? "No projects mapped"
                    : "Select project"}
                </option>
                {projects.map((x) => (
                  <option value={x.project_id} key={x.project_id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {client && !projects.length && (
            <div className="notice">
              This client has no projects yet. Use Create workspace to add its
              first project.
            </div>
          )}
        </article>
        {client && (
          <>
            <article className="panel form-card">
              <div className="step-head">
                <i>02</i>
                <div>
                  <h2>Client identity</h2>
                  <p>
                    Update the account-level information shared by all its
                    projects.
                  </p>
                </div>
              </div>
              <div className="fields two">
                <Field label="Client name">
                  <input
                    required
                    value={client.name}
                    onChange={(e) =>
                      setClient({ ...client, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Client ID">
                  <input readOnly value={client.client_id} />
                </Field>
                <Field label="Client status">
                  <select
                    value={client.status}
                    onChange={(e) =>
                      setClient({ ...client, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>
            </article>
            {project && (
              <>
                <article className="panel form-card">
                  <div className="step-head">
                    <i>03</i>
                    <div>
                      <h2>Project workspace</h2>
                      <p>
                        Update project identity, category, environment and
                        accepted origins.
                      </p>
                    </div>
                  </div>
                  <div className="fields two">
                    <Field label="Project name">
                      <input
                        required
                        value={project.name}
                        onChange={(e) =>
                          setProject({ ...project, name: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Project ID">
                      <input readOnly value={project.project_id} />
                    </Field>
                    <Field label="Category">
                      <select
                        value={project.category || "growth"}
                        onChange={(e) =>
                          setProject({ ...project, category: e.target.value })
                        }
                      >
                        <option value="growth">Growth</option>
                        <option value="business">Business</option>
                      </select>
                    </Field>
                    <Field label="Mode">
                      <select
                        value={project.mode || "live"}
                        onChange={(e) =>
                          setProject({ ...project, mode: e.target.value })
                        }
                      >
                        <option value="live">Live</option>
                        <option value="test">Test</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Allowed origins — comma separated">
                    <input
                      value={project.origins || ""}
                      onChange={(e) =>
                        setProject({ ...project, origins: e.target.value })
                      }
                    />
                  </Field>
                </article>
                <article className="panel form-card">
                  <div className="step-head">
                    <i>04</i>
                    <div>
                      <h2>Commerce provider</h2>
                      <p>
                        Choose which maintained or custom event schema this
                        project uses.
                      </p>
                    </div>
                  </div>
                  <div className="providers">
                    {["salla", "shopify", "zid", "custom"].map((x) => (
                      <button
                        type="button"
                        className={project.crm_platform === x ? "selected" : ""}
                        onClick={() =>
                          setProject({ ...project, crm_platform: x })
                        }
                        key={x}
                      >
                        <i>{x[0].toUpperCase()}</i>
                        <b>{x[0].toUpperCase() + x.slice(1)}</b>
                      </button>
                    ))}
                  </div>
                </article>
              </>
            )}
            {error && <div className="notice error">{error}</div>}
            {saved && (
              <div className="notice success">
                Workspace updated successfully.
              </div>
            )}
            <div className="editor-actions">
              <button
                className="danger"
                type="button"
                onClick={() => deactivate("client", client)}
              >
                Deactivate client
              </button>
              {project && (
                <button
                  className="danger-link"
                  type="button"
                  onClick={() => deactivate("project", project)}
                >
                  Deactivate project
                </button>
              )}
              <button className="primary">Update workspace</button>
            </div>
          </>
        )}
      </form>
    </>
  );
}
