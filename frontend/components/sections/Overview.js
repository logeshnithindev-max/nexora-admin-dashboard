"use client";

import { useI18n } from "../../app/i18n";
import { Title, Empty } from "../ui/Primitives";
import { ComparisonChart } from "../charts/ComparisonChart";
import { cash } from "../../lib/format";

export default function Overview({ data, go }) {
  const { t } = useI18n();
  const max = Math.max(
    1,
    ...(data.plan_counts || []).map((x) => Number(x.count)),
  );
  return (
    <>
      <Title
        tag={t("overview.tag")}
        title={t("overview.title")}
        copy={t("overview.copy")}
        action={
          <button className="primary" onClick={() => go("onboarding")}>
            {t("overview.create")} ＋
          </button>
        }
      />
      <div className="stats">
        {[
          ["Total clients", data.clients],
          ["Live projects", data.projects],
          ["Active subscriptions", data.active_subscriptions],
          ["Revenue collected", cash(data.collected)],
        ].map((x, i) => (
          <article className={i === 0 ? "stat accent" : "stat"} key={x[0]}>
            <span>{x[0]}</span>
            <strong>{x[1] || 0}</strong>
            <small>
              {i === 3 ? `${cash(data.pending)} pending` : "Across Nexora"}
            </small>
          </article>
        ))}
      </div>
      <div className="comparison-grid">
        <ComparisonChart
          title="Client onboarding"
          caption="NEW CLIENTS"
          items={data.history?.clients}
        />
        <ComparisonChart
          title="Resource usage"
          caption="ALL MEASURED RESOURCES"
          items={data.history?.usage}
        />
        <ComparisonChart
          title="Collected revenue"
          caption="PAID INVOICES"
          items={data.history?.revenue}
          format={(value) => cash(value)}
        />
      </div>
      <div className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <span>PORTFOLIO</span>
              <h2>Plans in circulation</h2>
            </div>
          </div>
          {(data.plan_counts || []).map((x) => (
            <div className="bar" key={x.name}>
              <b>{x.name}</b>
              <span>
                <i
                  style={{
                    width: `${Math.max(8, (Number(x.count) / max) * 100)}%`,
                  }}
                />
              </span>
              <strong>{x.count}</strong>
            </div>
          ))}
          {!data.plan_counts?.length && <Empty>Create your first plan</Empty>}
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <span>LATEST</span>
              <h2>Recently launched</h2>
            </div>
          </div>
          {(data.recent_projects || []).map((x) => (
            <div className="row" key={x.project_id}>
              <i className="avatar">{x.client_name?.[0]}</i>
              <div>
                <b>{x.project_name}</b>
                <small>
                  {x.client_name} · {x.crm_platform}
                </small>
              </div>
              <span className={`status ${x.category}`}>{x.category}</span>
            </div>
          ))}
        </article>
      </div>
    </>
  );
}
