"use client";

export function ComparisonChart({
  title,
  caption,
  items = [],
  format = (value) => Number(value).toLocaleString(),
}) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return date.toISOString().slice(0, 7);
  });
  const values = months.map((month) =>
    Number(items.find((item) => item.month === month)?.value || 0),
  );
  const max = Math.max(1, ...values),
    points = values
      .map((value, index) => `${8 + index * 36.8},${82 - (value / max) * 64}`)
      .join(" ");
  const current = values.at(-1) || 0,
    previous = values.at(-2) || 0,
    delta = previous
      ? ((current - previous) / previous) * 100
      : current
        ? 100
        : 0;
  return (
    <article className="comparison-card">
      <div className="comparison-head">
        <div>
          <span>{caption}</span>
          <h3>{title}</h3>
        </div>
        <div className={`trend ${delta < 0 ? "down" : "up"}`}>
          <b>{format(current)}</b>
          <small>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs last month
          </small>
        </div>
      </div>
      <svg
        className="trend-chart"
        viewBox="0 0 200 92"
        preserveAspectRatio="none"
        aria-label={`${title} six month trend`}
      >
        <defs>
          <linearGradient
            id={`fill-${title.replace(/\W/g, "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" stopColor="#35e89e" stopOpacity=".28" />
            <stop offset="1" stopColor="#35e89e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`8,86 ${points} 192,86`}
          fill={`url(#fill-${title.replace(/\W/g, "")})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke="#20b978"
          strokeWidth="2.2"
          vectorEffect="non-scaling-stroke"
        />
        {values.map((value, index) => (
          <circle
            key={months[index]}
            cx={8 + index * 36.8}
            cy={82 - (value / max) * 64}
            r={index === 5 ? 3 : 2}
            fill={index === 5 ? "#151817" : "#50dfa3"}
          />
        ))}
      </svg>
      <div className="chart-months">
        {months.map((month) => (
          <span key={month}>
            {new Date(`${month}-02`).toLocaleString("en", { month: "short" })}
          </span>
        ))}
      </div>
    </article>
  );
}
