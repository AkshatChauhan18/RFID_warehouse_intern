import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getPaginatedInventory, getKpis } from "@/lib/warehouse.functions";

/* ------------------------------------------------------------------ */
/*  Query factories                                                    */
/* ------------------------------------------------------------------ */

const kpisQuery = queryOptions({
  queryKey: ["kpis"],
  queryFn: () => getKpis(),
});

const inventoryPageQuery = (
  page: number,
  limit: number,
  search: string,
  status: string,
) =>
  queryOptions({
    queryKey: ["inventory-page", page, limit, search, status],
    queryFn: () =>
      getPaginatedInventory({ data: { page, limit, search, status } }),
  });

/* ------------------------------------------------------------------ */
/*  Route definition                                                   */
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/inventory")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(kpisQuery);
    context.queryClient.ensureQueryData(inventoryPageQuery(1, 10, "", ""));
  },
  head: () => ({
    meta: [
      { title: "Inventory | LOGISTIX" },
      {
        name: "description",
        content:
          "Full paginated inventory ledger with search and status filtering.",
      },
    ],
  }),
  component: InventoryPage,
});

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Optimal: "bg-green-100 text-green-800 border-green-200",
    "Low Stock":
      "bg-amber-100 text-amber-800 border-amber-200",
    Critical: "bg-error text-on-error animate-pulse border-transparent",
  };
  return (
    <span
      className={`px-sm py-xs rounded-full text-[10px] font-bold uppercase tracking-widest border ${map[status] ?? "bg-surface-container text-secondary border-outline-variant"}`}
    >
      {status}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg flex flex-col justify-between h-28 relative overflow-hidden">
      <p className="text-[12px] text-secondary uppercase tracking-widest font-semibold">
        {label}
      </p>
      <h3
        className={`text-3xl font-bold ${accent ? "text-primary" : "text-on-surface"}`}
      >
        {value}
      </h3>
      <div
        className={`absolute right-[-10px] bottom-[-10px] ${accent ? "text-primary opacity-20" : "opacity-10"}`}
      >
        <span
          className="material-symbols-outlined text-[72px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

function InventoryPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: kpis } = useSuspenseQuery(kpisQuery);
  const { data: inventory } = useSuspenseQuery(
    inventoryPageQuery(page, limit, search, statusFilter),
  );

  const totalPages = Math.ceil(inventory.total / inventory.limit);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleStatusFilter = (s: string) => {
    setStatusFilter(s === statusFilter ? "" : s);
    setPage(1);
  };

  /* ---------- Pagination helpers ---------- */

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <AppShell>
      <main className="flex-1 p-margin-desktop">
        {/* ---- Header ---- */}
        <div className="flex flex-wrap justify-between items-end mb-xl gap-md">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              Inventory
            </h1>
            <p className="text-secondary mt-xs">
              Complete warehouse inventory ledger with real-time stock levels.
            </p>
          </div>
          <button className="bg-surface-container text-on-surface px-lg py-sm text-[12px] font-bold uppercase tracking-wider rounded border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-sm">
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            Export CSV
          </button>
        </div>

        {/* ---- KPI Cards ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
          <KpiCard
            label="Total SKUs in Stock"
            value={kpis.total_parts.toLocaleString()}
            icon="inventory_2"
          />
          <KpiCard
            label="Low Stock Items"
            value={kpis.critical_alerts.toLocaleString()}
            icon="trending_down"
            accent
          />
          <KpiCard
            label="Active Bins"
            value={kpis.bins_active.toLocaleString()}
            icon="sensors"
          />
          <KpiCard
            label="Recent Sync"
            value={`${kpis.last_update_seconds}s ago`}
            icon="sync"
          />
        </div>

        {/* ---- Toolbar ---- */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg mb-lg">
          <div className="flex flex-wrap gap-md items-center justify-between">
            {/* Search */}
            <div className="relative flex items-center flex-1 min-w-[240px] max-w-md">
              <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by Part or SKU..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-surface-container-low border border-outline-variant h-10 pl-10 pr-4 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-3 text-secondary hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              )}
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-sm">
              <span className="text-[12px] text-secondary font-semibold uppercase tracking-wider mr-xs">
                Status:
              </span>
              {["All", "Critical", "Low Stock", "Optimal"].map((s) => {
                const isActive =
                  s === "All"
                    ? statusFilter === "" || statusFilter === "All"
                    : statusFilter === s;
                const baseStyle =
                  "px-md py-xs text-[11px] font-bold uppercase tracking-wider rounded-full border transition-all cursor-pointer";
                const activeMap: Record<string, string> = {
                  All: "bg-on-surface text-surface border-on-surface",
                  Critical: "bg-error text-on-error border-error",
                  "Low Stock": "bg-amber-600 text-white border-amber-600",
                  Optimal: "bg-green-700 text-white border-green-700",
                };
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusFilter(s === "All" ? "" : s)}
                    className={`${baseStyle} ${
                      isActive
                        ? activeMap[s]
                        : "bg-transparent text-secondary border-outline-variant hover:bg-surface-container"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---- Data Table ---- */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
          {/* Table header bar */}
          <div className="p-md px-lg border-b border-outline-variant flex justify-between items-center bg-white">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-secondary">
              {inventory.total.toLocaleString()} items found
            </h4>
            <div className="flex items-center gap-sm">
              <span className="text-[11px] text-secondary font-semibold">
                Per page:
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-outline-variant text-xs font-semibold px-2 py-1 rounded bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  {["Part Name & SKU", "Area Location", "Quantity", "Status"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-lg py-md text-[12px] text-secondary uppercase tracking-widest font-bold ${i === 3 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {inventory.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-lg py-xl text-center text-secondary"
                    >
                      <div className="flex flex-col items-center gap-sm">
                        <span className="material-symbols-outlined text-4xl text-outline-variant">
                          inventory_2
                        </span>
                        <p className="text-sm">
                          No inventory items match your filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inventory.items.map((item, idx) => (
                    <tr
                      key={`${item.sku}-${item.area}-${idx}`}
                      className="hover:bg-surface-container-low transition-colors group"
                    >
                      {/* Part Name & SKU */}
                      <td className="px-lg py-md">
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                          <span className="font-mono text-[12px] text-secondary mt-0.5">
                            SKU: {item.sku}
                          </span>
                        </div>
                      </td>

                      {/* Area Location */}
                      <td className="px-lg py-md">
                        <span className="font-mono text-sm bg-surface-container border border-outline-variant px-sm py-xs rounded">
                          {item.area}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-lg py-md">
                        <span
                          className={`text-lg font-bold ${
                            item.status === "Critical"
                              ? "text-error"
                              : item.status === "Low Stock"
                                ? "text-amber-700"
                                : "text-on-surface"
                          }`}
                        >
                          {item.qty.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-secondary ml-xs">
                          units
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-lg py-md text-right">
                        <StatusPill status={item.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {inventory.total > 0 && (
            <div className="p-md px-lg bg-surface-container-low border-t border-outline-variant flex flex-wrap justify-between items-center gap-md">
              <span className="text-xs text-secondary">
                Showing{" "}
                <span className="font-bold text-on-surface">
                  {(page - 1) * limit + 1}–
                  {Math.min(page * limit, inventory.total)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-on-surface">
                  {inventory.total.toLocaleString()}
                </span>{" "}
                items
              </span>

              <div className="flex gap-xs">
                {/* Prev */}
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">
                    chevron_left
                  </span>
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((n, i) =>
                  n === "..." ? (
                    <span
                      key={`dots-${i}`}
                      className="w-8 h-8 flex items-center justify-center text-xs text-secondary"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={
                        n === page
                          ? "w-8 h-8 flex items-center justify-center border border-primary bg-primary text-on-primary text-xs font-bold rounded"
                          : "w-8 h-8 flex items-center justify-center border border-outline-variant hover:bg-surface-container transition-all text-xs rounded"
                      }
                    >
                      {n}
                    </button>
                  ),
                )}

                {/* Next */}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
