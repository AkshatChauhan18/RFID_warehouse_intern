import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getInventory, getKpis, getActivity, getHeatmap } from "@/lib/warehouse.functions";
import { useTxSignal } from "@/components/AppShell"; // ? Transaction signal for sync reset
import { downloadCSV } from "@/lib/csv"; // ? CSV export utility
const inventoryQuery = queryOptions({
  queryKey: ["inventory"],
  queryFn: () => getInventory(),
});
const kpisQuery = queryOptions({
  queryKey: ["kpis"],
  queryFn: () => getKpis(),
});
const activityQuery = queryOptions({
  queryKey: ["activity"],
  queryFn: () => getActivity(),
});
const heatmapQuery = queryOptions({
  queryKey: ["heatmap"],
  queryFn: () => getHeatmap(),
});

function DashboardSkeleton() {
  return (
    <AppShell>
      <main className="flex-1 p-margin-desktop animate-fade-in">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <div className="h-9 w-64 animate-skeleton bg-surface-container-high rounded" />
            <div className="h-4 w-80 mt-2 animate-skeleton bg-surface-container-high rounded" />
          </div>
          <div className="flex gap-md">
            <div className="h-10 w-32 animate-skeleton bg-surface-container-high rounded" />
            <div className="h-10 w-36 animate-skeleton bg-surface-container-high rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-lg mb-xl">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-skeleton bg-surface-container-high rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
          <div className="lg:col-span-2 h-96 animate-skeleton bg-surface-container-high rounded" />
          <div className="space-y-xl">
            <div className="h-64 animate-skeleton bg-surface-container-high rounded" />
            <div className="h-72 animate-skeleton bg-surface-container-high rounded" />
          </div>
        </div>
      </main>
    </AppShell>
  );
}

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(inventoryQuery);
    context.queryClient.ensureQueryData(kpisQuery);
    context.queryClient.ensureQueryData(activityQuery);
    context.queryClient.ensureQueryData(heatmapQuery);
  },
  head: () => ({
    meta: [
      { title: "Smart Bin Inventory | LOGISTIX" },
      { name: "description", content: "Real-time IoT telemetry from Warehouse Node Alpha." },
    ],
  }),
  component: DashboardPage,
  pendingComponent: DashboardSkeleton,
  pendingMs: 100,
  pendingMinMs: 300,
});

type Row = {
  name: string;
  icon: string;
  sku: string;
  area: string; // ? Changed from bin
  qty: string;
  pct: number;
  status: "Optimal" | "Low Stock" | "Reorder" | "Critical";
};

function StatusPill({ s }: { s: Row["status"] }) {
  const map: Record<Row["status"], string> = {
    Optimal: "bg-green-100 text-green-800 border-green-200",
    "Low Stock": "bg-error-container text-error border-error",
    Reorder: "bg-tertiary-fixed text-tertiary border-tertiary-fixed-dim",
    Critical: "bg-error text-on-error animate-pulse border-transparent",
  };
  return (
    <span className={`px-sm py-xs rounded-full text-[10px] font-bold uppercase tracking-widest border ${map[s]}`}>{s}</span>
  );
}

function BarColor(s: Row["status"]) {
  if (s === "Critical" || s === "Low Stock") return "bg-primary";
  if (s === "Reorder") return "bg-tertiary";
  return "bg-green-600";
}

function KPI({ label, value, suffix, accent, icon }: { label: string; value: string | React.ReactNode; suffix?: string; accent?: boolean; icon: string }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg flex flex-col justify-between h-32 relative overflow-hidden">
      <div className="z-10">
        <p className="text-[12px] text-secondary uppercase tracking-widest font-semibold">{label}</p>
        <h3 className={`text-3xl font-bold mt-sm ${accent ? "text-primary" : "text-on-surface"}`}>
          {value}
          {suffix && <span className="text-base font-normal ml-xs text-on-surface">{suffix}</span>}
        </h3>
      </div>
      <div className={`absolute right-[-10px] bottom-[-10px] ${accent ? "text-primary opacity-20" : "opacity-10"}`}>
        <span className="material-symbols-outlined text-[80px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
    </div>
  );
}

function SyncTick({ seconds }: { seconds: number }) { // ? Live-ticking seconds counter
  const tx = useTxSignal(); // ? Reset on every inventory_updated WebSocket event
  const [tick, setTick] = useState(seconds);
  useEffect(() => {
    setTick(seconds);
    const id = setInterval(() => setTick((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [seconds, tx.count]); // ? tx.count forces instant reset on transaction
  const m = Math.floor(tick / 60);
  const s = tick % 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0) return <>{h}h {min}m ago</>;
  if (m > 0) return <>{m}m {s}s ago</>;
  return <>{s}s ago</>;
}

function DashboardPage() {
  const { data: inventoryData } = useSuspenseQuery(inventoryQuery);
  const { data: kpis } = useSuspenseQuery(kpisQuery);
  const { data: activity } = useSuspenseQuery(activityQuery);
  const { data: heatmap } = useSuspenseQuery(heatmapQuery);
  // fallback icon selection helper
  const getIcon = (name: string) => {
    if (name.toLowerCase().includes("bolt")) return "settings_input_component";
    if (name.toLowerCase().includes("controller")) return "memory";
    if (name.toLowerCase().includes("core") || name.toLowerCase().includes("wire")) return "cable";
    if (name.toLowerCase().includes("cell") || name.toLowerCase().includes("battery")) return "bolt";
    return "construction";
  };
  const exportReport = () => { // ? Export full dashboard report with KPIs + inventory snapshot
    const csvRows: string[][] = [
      ["Metric", "Value"],
      ["Total Parts", kpis.total_parts.toLocaleString()],
      ["Active Areas", kpis.bins_active.toLocaleString()],
      ["Critical Alerts", kpis.critical_alerts.toLocaleString()],
      ["Last Update", `${kpis.last_update_seconds}s ago`],
      [],
      ["--- Inventory Ledger ---"],
      ["Part Name", "SKU", "Area", "Quantity", "Status"],
      ...inventoryData.map((r: any) => [r.name, r.sku, r.area, String(r.qty), r.status]),
    ];
    downloadCSV(
      `dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`,
      [],
      csvRows,
    );
  };
  return (
    <AppShell>
      <main className="flex-1 p-margin-desktop animate-fade-in">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">Smart Bin Inventory</h1>
            <p className="text-secondary mt-xs">Real-time IoT telemetry from Warehouse Node Alpha</p>
          </div>
          <div className="flex gap-md">
            <button onClick={exportReport} className="bg-surface-container text-on-surface px-lg py-sm text-[12px] font-bold uppercase tracking-wider rounded border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-sm">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Report
            </button>
            <button className="bg-primary text-on-primary px-lg py-sm text-[12px] font-bold uppercase tracking-wider rounded hover:opacity-90 transition-opacity flex items-center gap-sm">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Manual Adjust
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-lg mb-xl animate-stagger">
          <KPI label="Total Parts" value={kpis.total_parts.toLocaleString()} icon="inventory_2" />
          <KPI label="Active Areas" value={kpis.bins_active.toLocaleString()} icon="sensors" /> {/* ? Changed label to Active Areas */}
          <KPI label="Critical Alerts" value={kpis.critical_alerts.toLocaleString()} icon="warning" accent />
          <KPI label="Last Update" value={<SyncTick seconds={kpis.last_update_seconds} />} suffix="" icon="update" />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl animate-fade-in-up">
          {/* Inventory ledger */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded shadow-sm flex flex-col overflow-hidden">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-white">
              <h4 className="text-lg font-bold">Inventory Ledger</h4>
              <span className="flex items-center gap-xs text-[12px] text-secondary border border-outline-variant px-sm py-xs rounded font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Live Status
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    {["Part Name", "SKU", "Location", "Quantity", "Status"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-lg py-md text-[12px] text-secondary uppercase tracking-widest font-bold ${i === 4 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {/* <tbody className="divide-y divide-outline-variant">
                  {rows.map((r) => (
                    <tr key={r.sku} className="hover:bg-surface-container transition-colors group">
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">{r.icon}</span>
                          <span className="font-bold">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md font-mono text-sm text-secondary">{r.sku}</td>
                      <td className="px-lg py-md">{r.bin}</td>
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <span className={`font-bold ${r.status === "Critical" ? "text-primary" : ""}`}>{r.qty}</span>
                          <div className="w-12 h-1.5 bg-secondary-container rounded-full overflow-hidden">
                            <div className={`${BarColor(r.status)} h-full`} style={{ width: `${r.pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-lg py-md text-right">
                        <StatusPill s={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody> */}
                <tbody className="divide-y divide-outline-variant">
                  {inventoryData.map((r) => (
                    <tr key={r.sku} className="hover:bg-surface-container transition-colors group">
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">
                            {getIcon(r.name)}
                          </span>
                          <span className="font-bold">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md font-mono text-sm text-secondary">{r.sku}</td>
                      <td className="px-lg py-md">{r.area}</td> {/* ? Changed from r.bin */}
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <span className={`font-bold ${r.status === "Critical" ? "text-primary" : ""}`}>
                            {r.qty.toLocaleString()}
                          </span>
                          <div className="w-16 h-1.5 bg-secondary-container rounded-full overflow-hidden">
                            <div className={`${BarColor(r.status)} h-full rounded-full`} style={{ width: `${Math.min((r.qty / 50) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-lg py-md text-right">
                        <StatusPill s={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-md bg-surface-container-low border-t border-outline-variant text-center">
              <Link to="/inventory" className="text-[12px] font-bold text-primary hover:underline uppercase tracking-widest">
                View Full Inventory
              </Link>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-xl">
            <div className="bg-surface-container-lowest border border-outline-variant rounded p-lg shadow-sm">
              <h4 className="text-lg font-bold mb-md">Recent Activity</h4>
              <div className="space-y-md">
              {activity.activities.map((a, i) => (
                <div key={i} className="flex gap-md">
                  <div className={`w-8 h-8 rounded-full ${a.icon === "add" ? "bg-secondary-container" : "bg-primary-fixed"} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined ${a.icon === "add" ? "text-secondary" : "text-primary"} text-[18px]`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {a.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{a.title}</p>
                    <p className="text-xs text-secondary">{a.sub}</p>
                    <p className="text-[10px] text-secondary-fixed-dim uppercase mt-xs font-bold">{a.time}</p>
                  </div>
                </div>
              ))}
              </div>
              <Link to="/audit" className="block w-full mt-lg py-sm text-[12px] text-center font-bold text-secondary border border-outline-variant rounded hover:bg-surface-container transition-colors uppercase tracking-wider">
                Full Audit Trail
              </Link>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded p-lg shadow-sm">
              <div className="flex justify-between items-center mb-md">
                <h4 className="text-lg font-bold">Bay Heatmap</h4>
                <span className="text-[11px] text-secondary font-semibold font-mono">{heatmap.zones.length} zones active</span>
              </div>
              <div className="aspect-square bg-surface-container rounded border border-outline-variant relative p-md grid grid-cols-4 grid-rows-4 gap-xs">
                {heatmap.zones.length === 0 ? (
                  <div className="col-span-4 row-span-4 flex flex-col items-center justify-center text-secondary gap-sm">
                    <span className="material-symbols-outlined text-[40px] text-outline-variant">grid_view</span>
                    <p className="text-[11px] uppercase tracking-wider font-semibold">No zones configured</p>
                  </div>
                ) : (
                  Array.from({ length: heatmap.rows * heatmap.cols }, (_, i) => {
                    const cell = heatmap.zones.find((z) => z.row === Math.floor(i / heatmap.cols) && z.col === i % heatmap.cols);
                    const cls = !cell ? "bg-surface-container border-outline-variant opacity-30"
                      : cell.status === "full" ? "bg-green-100 border-green-200"
                      : cell.status === "partial" ? "bg-primary-fixed border-primary"
                      : cell.status === "critical" ? "bg-primary border-primary animate-pulse"
                      : "bg-surface-container border-outline-variant";
                    return (
                      <div key={i} className={`relative border rounded-sm flex items-center justify-center group transition-all ${cls}`}>
                        {cell ? (
                          <>
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-mono text-secondary font-bold select-none leading-tight">{cell.label}</span>
                              <span className="text-[7px] text-secondary/60 font-mono mt-0.5">{cell.item_count}u</span>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-sm" />
                          </>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex items-center justify-center gap-lg mt-md">
                {[
                  { color: "bg-green-100 border-green-200", label: "Stocked" },
                  { color: "bg-primary-fixed border-primary", label: "Partial" },
                  { color: "bg-primary border-primary", label: "Critical" },
                  { color: "bg-surface-container border-outline-variant", label: "Empty" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-sm border ${l.color}`} />
                    <span className="text-[10px] text-secondary uppercase tracking-wider font-semibold">{l.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-secondary mt-md uppercase tracking-widest text-center font-semibold">
                Node Alpha Sector B · Real-time Occupancy
              </p>
            </div>

            {/* <div className="bg-surface-container-high p-lg rounded border border-outline shadow-sm">
              <div className="flex items-center justify-between mb-md">
                <span className="text-[12px] font-bold uppercase tracking-widest text-secondary">Warehouse Health</span>
                <span className="material-symbols-outlined text-green-600">check_circle</span>
              </div>
              <div className="flex justify-between items-center">
                {[
                  { l: "Temp", v: "21.4°C" },
                  { l: "Humidity", v: "44%" },
                  { l: "Uptime", v: "99.9%" },
                ].map((s, i) => (
                  <div key={s.l} className="flex items-center gap-md">
                    {i > 0 && <div className="w-px h-8 bg-outline-variant mr-md" />}
                    <div>
                      <p className="text-[10px] text-secondary uppercase font-bold">{s.l}</p>
                      <p className="text-xl font-bold">{s.v}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
