"use client";

import { Title, Empty } from "../ui/Primitives";

export default function Usage({ items }) {
  return (
    <>
      <Title
        tag="RESOURCE MONITOR"
        title={
          <>
            Usage before it <em>becomes overage.</em>
          </>
        }
        copy="Latest global and channel measurements for every client."
      />
      <div className="usage-grid">
        {items.map((x, i) => (
          <article
            className="usage"
            key={`${x.client_id}-${x.metric_code}-${x.channel}`}
          >
            <span>
              {x.client_name} · {x.channel}
            </span>
            <p>{x.metric_code.replaceAll("_", " ")}</p>
            <strong>{Number(x.quantity).toLocaleString()}</strong>
            <div>
              <i style={{ width: `${Math.min(96, 35 + i * 9)}%` }} />
            </div>
            <button>Send reminder →</button>
          </article>
        ))}
      </div>
      {!items.length && (
        <article className="panel">
          <Empty>Usage snapshots will appear after collection starts</Empty>
        </article>
      )}
    </>
  );
}
