import { cash } from "../../lib/format";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : 0;
}

function round2(value) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

export default function BillingLineItems({
  edit,
  loadingMetrics,
  loadingClientMetrics,
  channelOptions,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onGetMetricOptions,
  NumberField,
  Dropdown,
  fieldErrors,
}) {
  return (
    <>
      <div className="repeat-head">
        <div>
          <b>Line items</b>

          <small>
            {edit.client_id
              ? loadingClientMetrics
                ? "Loading client metrics..."
                : "Showing metrics mapped to this client."
              : "Select a client to load mapped metrics."}
          </small>
        </div>

        <button
          type="button"
          onClick={onAddItem}
          disabled={!edit.client_id}
        >
          ＋ Add item
        </button>
      </div>

      <div className="billing-items">
        <div className="billing-items-head">
          <span>Scope</span>
          <span>Metric</span>
          <span>Qty</span>
          <span>Unit price</span>
          <span>Line total</span>
          <span />
        </div>

        {edit.items.map((item, index) => {
          const metricOptions =
            onGetMetricOptions(
              item.channel,
            );

          const itemError =
            fieldErrors.items?.[index];

          const lineTotal = round2(
            toNumber(item.quantity) *
              toNumber(item.unit_price),
          );

          return (
            <div
              className="billing-item-row"
              key={index}
            >
              <Dropdown
                value={
                  item.channel || "global"
                }
                disabled={
                  !edit.client_id ||
                  loadingClientMetrics
                }
                ariaLabel={`Metric scope, item ${
                  index + 1
                }`}
                onChange={(value) =>
                  onUpdateItem(
                    index,
                    "channel",
                    value,
                  )
                }
              >
                {channelOptions.map(
                  (channel) => (
                    <option
                      key={channel.value}
                      value={channel.value}
                    >
                      {channel.label}
                    </option>
                  ),
                )}
              </Dropdown>

              <Dropdown
                value={item.metric_code || ""}
                disabled={
                  !edit.client_id ||
                  loadingMetrics ||
                  loadingClientMetrics
                }
                ariaLabel={`Metric, item ${
                  index + 1
                }`}
                onChange={(value) =>
                  onUpdateItem(
                    index,
                    "metric_code",
                    value,
                  )
                }
              >
                <option value="">
                  {!edit.client_id
                    ? "Select client first"
                    : loadingClientMetrics
                      ? "Loading client metrics..."
                      : metricOptions.length ===
                          0
                        ? "No mapped metrics"
                        : "Select metric"}
                </option>

                {metricOptions.map(
                  (metric) => (
                    <option
                      key={`${metric.channel || "global"}-${
                        metric.id ||
                        metric.metric_id ||
                        metric.metric_code
                      }`}
                      value={metric.metric_code}
                    >
                      {metric.metric_name}
                    </option>
                  ),
                )}
              </Dropdown>

              <NumberField
                value={item.quantity}
                ariaLabel={`Quantity, item ${
                  index + 1
                }`}
                onChange={(value) =>
                  onUpdateItem(
                    index,
                    "quantity",
                    value,
                  )
                }
              />

              <NumberField
                value={item.unit_price}
                ariaLabel={`Unit price, item ${
                  index + 1
                }`}
                onChange={(value) =>
                  onUpdateItem(
                    index,
                    "unit_price",
                    value,
                  )
                }
              />

              <div className="billing-line-total">
                {cash(
                  lineTotal,
                  edit.currency,
                )}
              </div>

              <button
                className="remove-item"
                type="button"
                onClick={() =>
                  onRemoveItem(index)
                }
                aria-label={`Remove item ${
                  index + 1
                }`}
              >
                ×
              </button>

              {itemError && (
                <div className="billing-item-error">
                  {itemError}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}