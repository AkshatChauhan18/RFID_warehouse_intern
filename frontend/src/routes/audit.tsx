import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getMovements, getAuditSummary } from "@/lib/warehouse.functions";
import { downloadCSV } from "@/lib/csv"; // ? CSV export utility

// !ansh: query calls plain async function (no createServerFn), token read from localStorage inside fetchWithAuth
//TODO:just a info , added this part:
const auditSummaryQuery = queryOptions({
  queryKey: ["audit-summary"],
  queryFn: () => getAuditSummary(),
});

// Movement query is dynamic (depends on page, search, action), so define it as a function
const movementsQuery = (page: number, search: string, action: string) =>
  queryOptions({
    queryKey: ["movements", page, search, action],
    queryFn: () => getMovements(page, search, action),
    refetchInterval: 3000,
  });

function AuditSkeleton() {
  return (
    <AppShell>
      <main className="flex-1 flex flex-col">
        <div className="p-margin-desktop space-y-lg max-w-7xl animate-fade-in">
          <div className="flex justify-between items-end">
            <div>
              <div className="h-9 w-48 animate-skeleton bg-surface-container-high rounded" />
              <div className="h-4 w-64 mt-2 animate-skeleton bg-surface-container-high rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-skeleton bg-surface-container-high rounded" />
            ))}
          </div>
          <div className="h-14 animate-skeleton bg-surface-container-high rounded-lg" />
          <div className="h-96 animate-skeleton bg-surface-container-high rounded-lg" />
        </div>
      </main>
    </AppShell>
  );
}

export const Route = createFileRoute("/audit")({
  // !ansh: prefetchQuery instead of ensureQueryData — SSR data fetch failures don't crash the page
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(auditSummaryQuery);
    context.queryClient.prefetchQuery(movementsQuery(1, "", ""));
  },
  head: () => ({
    meta: [
      { title: "Audit Ledger | LOGISTIX" },
      { name: "description", content: "Real-time physical movement tracking for the Smart Bin Cluster." },
    ],
  }),
  component: AuditPage,
  pendingComponent: AuditSkeleton,
  pendingMs: 100,
  pendingMinMs: 300,
});


// type Entry = { t: string; name: string; bin: string; action: "IN" | "OUT"; uid: string };
// const entries: Entry[] = [
//   { t: "14:21:45.02", name: "Micro-Controller Unit X7", bin: "BIN-042-A", action: "IN", uid: "UID_8829_012A" },
//   { t: "14:21:30.14", name: "Thermal Regulator S-9", bin: "BIN-018-C", action: "OUT", uid: "UID_4451_990B" },
//   { t: "14:21:22.09", name: "Precision Gasket Kit", bin: "BIN-109-F", action: "IN", uid: "UID_0012_772C" },
//   { t: "14:20:58.55", name: "Lithium Cell 3.2V", bin: "BIN-042-A", action: "OUT", uid: "UID_6672_114X" },
//   { t: "14:20:41.12", name: "Pneumatic Actuator M4", bin: "BIN-002-Z", action: "IN", uid: "UID_9921_505M" },
//   { t: "14:20:33.00", name: "Copper Coil 40mm", bin: "BIN-055-B", action: "IN", uid: "UID_1204_003K" },
//   { t: "14:19:59.18", name: "Fiber Optic Patch 2m", bin: "BIN-012-C", action: "OUT", uid: "UID_5541_221S" },
//   { t: "14:19:22.44", name: "Steel Fastener M8", bin: "BIN-099-X", action: "IN", uid: "UID_3300_123F" },
// ];

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function LiveTime({ timestamp }: { timestamp: string }) {
  const now = useNow();
  const t = new Date(timestamp).getTime();
  const delta = Math.round((now - t) / 1000);
  let display: string;
  if (delta < 0) display = "JUST NOW";
  else if (delta < 2) display = "JUST NOW";
  else if (delta < 60) display = `${delta}S AGO`;
  else if (delta < 3600) display = `${Math.floor(delta / 60)}M AGO`;
  else display = new Date(timestamp).toLocaleTimeString();
  return <span className={delta < 60 ? "text-primary font-bold" : ""}>{display}</span>;
}

function LiveSync() {
  const now = useNow();
  return <span className="text-xs font-mono text-secondary">SYNC: {new Date(now).toLocaleTimeString()}</span>;
}

function AuditPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const exportCSV = () => { // ? Live Export CSV with relative timestamps
    const now = Date.now();
    const rows = movements.items.map((e) => [
      `${Math.round((now - new Date(e.timestamp).getTime()) / 1000)}s ago`,
      e.name,
      e.area,
      e.action,
      e.uid,
      String(e.quantity),
    ]);
    downloadCSV(`audit-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Time Ago", "Part Name", "Area", "Action", "Tag UID", "Quantity"], rows);
  };
  const { data: summary } = useSuspenseQuery(auditSummaryQuery);
  const { data: movements } = useSuspenseQuery(movementsQuery(page, search, actionFilter));
  const totalPages = Math.ceil(movements.total / movements.limit);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleActionFilter = (a: string) => {
    setActionFilter(a === actionFilter ? "" : a);
    setPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <AppShell>
      <main className="flex-1 flex flex-col">
        <div className="p-margin-desktop space-y-lg max-w-7xl animate-fade-in">
          <div className="flex flex-wrap gap-md justify-between items-end">
            <div>
              <h2 className="text-3xl font-semibold text-on-surface tracking-tight">Audit Ledger</h2>
              <p className="text-secondary mt-1">Real-time physical movement tracking for Smart Bin Cluster Beta.</p>
            </div>
            <div className="flex gap-sm">
              <button onClick={exportCSV} className="px-md py-sm border border-outline text-secondary text-[12px] uppercase tracking-wider font-bold flex items-center gap-2 hover:bg-surface-container transition-colors rounded">
                <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
              </button>
            </div>
          </div>

          {/* Filter toolbar */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg">
            <div className="flex flex-wrap gap-md items-center justify-between">
              <div className="relative flex items-center flex-1 min-w-[240px] max-w-md">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search by Part, UID or Area..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-surface-container-low border border-outline-variant h-10 pl-10 pr-4 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                    className="absolute right-3 text-secondary hover:text-on-surface">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-sm">
                <span className="text-[12px] text-secondary font-semibold uppercase tracking-wider mr-xs">Action:</span>
                {["All", "IN", "OUT"].map((a) => {
                  const isActive = a === "All" ? actionFilter === "" : actionFilter === a;
                  return (
                    <button key={a} onClick={() => handleActionFilter(a === "All" ? "" : a)}
                      className={`px-md py-xs text-[11px] font-bold uppercase tracking-wider rounded-full border transition-all cursor-pointer ${
                        isActive
                          ? a === "All" ? "bg-on-surface text-surface border-on-surface"
                            : a === "IN" ? "bg-green-700 text-white border-green-700"
                            : "bg-error text-on-error border-error"
                          : "bg-transparent text-secondary border-outline-variant hover:bg-surface-container"
                      }`}>
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Overview */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
            <div className="bg-surface-container-lowest border border-outline-variant p-lg space-y-md rounded">
              <p className="text-[12px] uppercase text-secondary font-bold tracking-wider">Today's Throughput</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">1,284</span>
                <span className="text-xs text-green-700 font-bold">+12%</span>
              </div>
              <div className="w-full h-1 bg-surface-container">
                <div className="w-3/4 h-full bg-primary" />
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-lg space-y-md rounded">
              <p className="text-[12px] uppercase text-secondary font-bold tracking-wider">Active Tag UIDs</p>
              <div className="text-3xl font-bold">45,021</div>
              <p className="text-xs text-secondary italic">Tracking in cluster Alpha-9</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-lg space-y-md rounded">
              <p className="text-[12px] uppercase text-secondary font-bold tracking-wider">Inbound Rate</p>
              <div className="text-3xl font-bold text-green-700">88.4%</div>
              <p className="text-xs text-secondary">Current cycle efficiency</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-lg space-y-md rounded">
              <p className="text-[12px] uppercase text-secondary font-bold tracking-wider">System Latency</p>
              <div className="text-3xl font-bold">14ms</div>
              <p className="text-xs text-secondary">Sensor-to-ledger delay</p>
            </div>
          </div> */}
          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
            <div className="bg-surface-container-lowest border border-outline-variant p-lg space-y-md rounded">
              <p className="text-[12px] uppercase text-secondary font-bold tracking-wider">Today's Throughput</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{summary.todays_throughput.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-lg space-y-md rounded">
              <p className="text-[12px] uppercase text-secondary font-bold tracking-wider">Active Tag UIDs</p>
              <div className="text-3xl font-bold">{summary.active_tag_uids.toLocaleString()}</div>
              <p className="text-xs text-secondary italic">Tracking in cluster Alpha-9</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-lg space-y-md rounded">
              <p className="text-[12px] uppercase text-secondary font-bold tracking-wider">Inbound Rate</p>
              <div className="text-3xl font-bold text-green-700">{summary.inbound_rate}%</div>
              <p className="text-xs text-secondary">Current cycle efficiency</p>
            </div>
            {/* <div className="bg-surface-container-lowest border border-outline-variant p-lg space-y-md rounded">
              <p className="text-[12px] uppercase text-secondary font-bold tracking-wider">System Latency</p>
              <div className="text-3xl font-bold">14ms</div>
              <p className="text-xs text-secondary">Sensor-to-ledger delay</p>
            </div> */}
          </div>

          {/* Movement log */}
          <div className="bg-surface-container-lowest border border-outline-variant overflow-hidden shadow-sm rounded">
            <div className="bg-surface-container p-md border-b border-outline-variant flex justify-between items-center">
              <h3 className="text-[12px] uppercase tracking-wider font-bold">Movement Log</h3>
              <div className="flex items-center gap-md">
                <span className="flex items-center gap-2 text-xs text-secondary font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> Live Monitoring
                </span>
                <LiveSync />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-left">
                    {["Time", "Part Name", "Area", "Action", "Tag UID"].map((h) => (
                      <th key={h} className="px-lg py-md text-[12px] uppercase tracking-wider border-b border-outline-variant font-bold text-secondary">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {/* <tbody className="divide-y divide-outline-variant">
                  {entries.map((e) => (
                    <tr key={e.uid} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-lg py-sm font-mono text-sm text-secondary">{e.t}</td>
                      <td className="px-lg py-sm font-bold text-sm">{e.name}</td>
                      <td className="px-lg py-sm text-sm">{e.bin}</td>
                      <td className="px-lg py-sm">
                        <span
                          className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border ${
                            e.action === "IN"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }`}
                        >
                          {e.action}
                        </span>
                      </td>
                      <td className="px-lg py-sm font-mono text-xs text-secondary">{e.uid}</td>
                    </tr>
                  ))}
                </tbody> */}
                <tbody className="divide-y divide-outline-variant">
                  {movements.items.map((e, i) => (
                    <tr key={`${e.uid}-${i}`} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-lg py-sm font-mono text-sm">
                        <LiveTime timestamp={e.timestamp} />
                      </td>
                      <td className="px-lg py-sm font-bold text-sm">{e.name}</td>
                      <td className="px-lg py-sm text-sm">{e.area}</td>
                      <td className="px-lg py-sm">
                        <span
                          className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border ${
                            e.action === "IN"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }`}
                        >
                          {e.action}
                        </span>
                      </td>
                      <td className="px-lg py-sm font-mono text-xs text-secondary">{e.uid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* <div className="bg-surface-container-lowest p-md border-t border-outline-variant flex justify-between items-center">
              <span className="text-xs text-secondary">Showing 1-25 of 14,882 entries</span>
              <div className="flex gap-xs">
                <button className="w-8 h-8 flex items-center justify-center border border-outline-variant hover:bg-surface-container transition-all">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className={
                      n === 1
                        ? "w-8 h-8 flex items-center justify-center border border-primary bg-primary text-on-primary text-xs font-bold"
                        : "w-8 h-8 flex items-center justify-center border border-outline-variant hover:bg-surface-container transition-all text-xs"
                    }
                  >
                    {n}
                  </button>
                ))}
                <button className="w-8 h-8 flex items-center justify-center border border-outline-variant hover:bg-surface-container transition-all">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div> */}
            {movements.total > 0 && (
            <div className="bg-surface-container-lowest p-md border-t border-outline-variant flex flex-wrap justify-between items-center gap-md">
              <span className="text-xs text-secondary">
                Showing {" "}
                <span className="font-bold text-on-surface">{(page - 1) * 10 + 1}–{Math.min(page * 10, movements.total)}</span>{" "}
                of {" "}
                <span className="font-bold text-on-surface">{movements.total.toLocaleString()}</span>{" "}
                entries
              </span>
              <div className="flex gap-xs">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {getPageNumbers().map((n, i) =>
                  n === "..." ? (
                    <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-secondary">…</span>
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
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
            )}
          </div>

          {/* Visualizations */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded">
              <div className="flex justify-between items-center mb-lg">
                <h4 className="text-[12px] uppercase tracking-wider font-bold">Node Occupancy Heatmap</h4>
                <span className="material-symbols-outlined text-secondary">more_horiz</span>
              </div>
              <div className="h-48 w-full bg-surface-container flex items-center justify-center border border-outline-variant">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl text-outline-variant">grid_view</span>
                  <p className="text-xs text-secondary mt-2">Visual cluster map loading...</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded">
              <div className="flex justify-between items-center mb-lg">
                <h4 className="text-[12px] uppercase tracking-wider font-bold">Trend Analysis</h4>
                <select className="bg-transparent border border-outline-variant text-xs font-semibold px-2 py-1 rounded">
                  <option>Last 24 Hours</option>
                  <option>Last 7 Days</option>
                </select>
              </div>
              <div className="h-48 w-full flex items-end gap-1 px-4">
                {[40, 60, 50, 80, 95, 70, 45, 85].map((h, i) => (
                  <div
                    key={i}
                    className={i === 4 ? "bg-primary w-full" : "bg-primary-container w-full"}
                    style={{ height: `${h}%`, opacity: i === 4 ? 1 : 0.2 + (h / 200) }}
                  />
                ))}
              </div>
            </div>
            
          </div> */}
        </div>

        {/* <footer className="mt-auto p-margin-desktop border-t border-outline-variant text-xs text-secondary flex flex-wrap gap-md justify-between">
          <p>© 2026 LOGISTIX OPERATIONAL SUITE. INDUSTRIAL HARDWARE LAYER V2.4</p>
          <div className="flex gap-lg">
            <a className="hover:text-primary" href="#">System Status: Nominal</a>
            <a className="hover:text-primary" href="#">Security Protocol: E2EE</a>
          </div>
        </footer> */}
      </main>
    </AppShell>
  );
}
