export default function BillingToolbar({
  search,
  setSearch,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  hasActiveFilters,
  clearFilters,
  statusOptions,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <>
      <div className="invoice-toolbar">
        <div className="invoice-search">
          <span
            className="invoice-search-icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            type="search"
            placeholder="Search client, project or invoice #"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            aria-label="Search invoices"
          />
        </div>

        <div className="invoice-date-range">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) =>
              setDateFrom(event.target.value)
            }
            aria-label="Period from"
          />

          <span className="invoice-date-sep">
            →
          </span>

          <input
            type="date"
            value={dateTo}
            onChange={(event) =>
              setDateTo(event.target.value)
            }
            aria-label="Period to"
          />
        </div>

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

      {statusOptions.length > 0 && (
        <div className="invoice-status-chips">
          <button
            type="button"
            className={`chip${
              statusFilter === "all"
                ? " active"
                : ""
            }`}
            onClick={() =>
              setStatusFilter("all")
            }
          >
            All
          </button>

          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              className={`chip${
                statusFilter === status
                  ? " active"
                  : ""
              }`}
              onClick={() =>
                setStatusFilter(status)
              }
            >
              {String(status).replaceAll(
                "_",
                " ",
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}