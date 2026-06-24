import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getMovements, getAuditSummary } from "@/lib/warehouse.functions";

//TODO:just a info , added this part:
const auditSummaryQuery = queryOptions({
  queryKey: ["audit-summary"],
  queryFn: () => getAuditSummary(),
});

// Movement query is dynamic (depends on page), so define it as a function
const movementsQuery = (page: number) =>
  queryOptions({
    queryKey: ["movements", page],
    queryFn: () => getMovements({ data: { page, limit: 10 } }),
  });

export const Route = createFileRoute("/audit")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(auditSummaryQuery);
    context.queryClient.ensureQueryData(movementsQuery(1));
  },
  head: () => ({
    meta: [
      { title: "Audit Ledger | LOGISTIX" },
      { name: "description", content: "Real-time physical movement tracking for the Smart Bin Cluster." },
    ],
  }),
  component: AuditPage,
});

//TODO:just a info: my code ended here


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

function AuditPage() {
  const [page, setPage] = useState(1);
  const { data: summary } = useSuspenseQuery(auditSummaryQuery);
  const { data: movements } = useSuspenseQuery(movementsQuery(page));
  const totalPages = Math.ceil(movements.total / movements.limit);
  return (
    <AppShell>
      <main className="flex-1 flex flex-col">
        <div className="p-margin-desktop space-y-lg max-w-7xl">
          <div className="flex flex-wrap gap-md justify-between items-end">
            <div>
              <h2 className="text-3xl font-semibold text-on-surface tracking-tight">Audit Ledger</h2>
              <p className="text-secondary mt-1">Real-time physical movement tracking for Smart Bin Cluster Beta.</p>
            </div>
            <div className="flex gap-sm">
              <button className="px-md py-sm border border-outline text-secondary text-[12px] uppercase tracking-wider font-bold flex items-center gap-2 hover:bg-surface-container transition-colors rounded">
                <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
              </button>
              <button className="px-md py-sm border border-outline text-secondary text-[12px] uppercase tracking-wider font-bold flex items-center gap-2 hover:bg-surface-container transition-colors rounded">
                <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
              </button>
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
                <span className="text-xs font-mono text-secondary">SYNC: 14:22:01.08</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-left">
                    {["Time", "Part Name", "Bin Label", "Action", "Tag UID"].map((h) => (
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
                      <td className="px-lg py-sm font-mono text-sm text-secondary">
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </td>
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
            <div className="bg-surface-container-lowest p-md border-t border-outline-variant flex justify-between items-center">
              <span className="text-xs text-secondary">
                Showing {(page - 1) * 25 + 1}-{Math.min(page * 25, movements.total)} of {movements.total.toLocaleString()} entries
              </span>
              <div className="flex gap-xs">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center border border-outline-variant hover:bg-surface-container transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={
                      n === page
                        ? "w-8 h-8 flex items-center justify-center border border-primary bg-primary text-on-primary text-xs font-bold"
                        : "w-8 h-8 flex items-center justify-center border border-outline-variant hover:bg-surface-container transition-all text-xs"
                    }
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center border border-outline-variant hover:bg-surface-container transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
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
          </div>
        </div>

        <footer className="mt-auto p-margin-desktop border-t border-outline-variant text-xs text-secondary flex flex-wrap gap-md justify-between">
          <p>© 2026 LOGISTIX OPERATIONAL SUITE. INDUSTRIAL HARDWARE LAYER V2.4</p>
          <div className="flex gap-lg">
            <a className="hover:text-primary" href="#">System Status: Nominal</a>
            <a className="hover:text-primary" href="#">Security Protocol: E2EE</a>
          </div>
        </footer>
      </main>
    </AppShell>
  );
}
