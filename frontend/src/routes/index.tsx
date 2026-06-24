import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getInventory, getKpis, getActivity } from "@/lib/warehouse.functions";
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

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(inventoryQuery);
    context.queryClient.ensureQueryData(kpisQuery);
    context.queryClient.ensureQueryData(activityQuery);
  },
  head: () => ({
    meta: [
      { title: "Smart Bin Inventory | LOGISTIX" },
      { name: "description", content: "Real-time IoT telemetry from Warehouse Node Alpha." },
    ],
  }),
  component: DashboardPage,
});

type Row = {
  name: string;
  icon: string;
  sku: string;
  bin: string;
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

function KPI({ label, value, suffix, accent, icon }: { label: string; value: string; suffix?: string; accent?: boolean; icon: string }) {
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

function DashboardPage() {
  const { data: inventoryData } = useSuspenseQuery(inventoryQuery);
  const { data: kpis } = useSuspenseQuery(kpisQuery);
  const { data: activity } = useSuspenseQuery(activityQuery);
  // fallback icon selection helper
  const getIcon = (name: string) => {
    if (name.toLowerCase().includes("bolt")) return "settings_input_component";
    if (name.toLowerCase().includes("controller")) return "memory";
    if (name.toLowerCase().includes("core") || name.toLowerCase().includes("wire")) return "cable";
    if (name.toLowerCase().includes("cell") || name.toLowerCase().includes("battery")) return "bolt";
    return "construction";
  };
  return (
    <AppShell>
      <main className="flex-1 p-margin-desktop">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">Smart Bin Inventory</h1>
            <p className="text-secondary mt-xs">Real-time IoT telemetry from Warehouse Node Alpha</p>
          </div>
          <div className="flex gap-md">
            <button className="bg-surface-container text-on-surface px-lg py-sm text-[12px] font-bold uppercase tracking-wider rounded border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-sm">
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-lg mb-xl">
          <KPI label="Total Parts" value={kpis.total_parts.toLocaleString()} icon="inventory_2" />
          <KPI label="Bins Active" value={kpis.bins_active.toLocaleString()} icon="sensors" />
          <KPI label="Critical Alerts" value={kpis.critical_alerts.toLocaleString()} icon="warning" accent />
          <KPI label="Last Update" value={kpis.last_update_seconds.toString()} suffix="s ago" icon="update" />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
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
                      <td className="px-lg py-md">{r.bin}</td>
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <span className={`font-bold ${r.status === "Critical" ? "text-primary" : ""}`}>
                            {r.qty.toLocaleString()}
                          </span>
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
                <span className="material-symbols-outlined text-secondary cursor-pointer">open_in_new</span>
              </div>
              <div className="aspect-square bg-surface-container rounded border border-outline-variant relative p-md grid grid-cols-4 grid-rows-4 gap-xs">
                {[
                  "w", "w", "pf", "w",
                  "w", "p", "w", "w",
                  "w", "w", "sc", "w",
                  "pf", "w", "w", "w",
                ].map((c, i) => {
                  const cls =
                    c === "w" ? "bg-white" :
                    c === "pf" ? "bg-primary-fixed border-primary" :
                    c === "p" ? "bg-primary border-primary animate-pulse" :
                    "bg-secondary-container";
                  return <div key={i} className={`border border-outline-variant rounded-sm ${cls}`} />;
                })}
              </div>
              <p className="text-[10px] text-secondary mt-md uppercase tracking-widest text-center font-semibold">
                Node Alpha Sector B Visualization
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
