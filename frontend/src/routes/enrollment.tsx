import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/enrollment")({
  head: () => ({
    meta: [
      { title: "RFID Enrollment | LOGISTIX" },
      { name: "description", content: "Pre-commissioning workflow for high-frequency industrial RFID tags." },
    ],
  }),
  component: EnrollmentPage,
});

const sessionLog = [
  { uid: "E280-6890...4002", time: "14:22", name: "Precision Ball Bearing - X9", qty: "50", bin: "A-12", primary: true },
  { uid: "E280-6890...3811", time: "14:18", name: "M12 Industrial Bolt Set", qty: "120", bin: "C-04", primary: false },
  { uid: "E280-6890...9902", time: "14:15", name: "Lithium-Ion Pack 48V", qty: "4", bin: "HAZ-1", primary: false, dim: true },
];

function EnrollmentPage() {
  const [uid, setUid] = useState("E280-6890-0000-4005-A1C8-1F04");
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(false);

  const commission = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    }, 1000);
  };

  return (
    <AppShell>
      <main className="flex-1 p-margin-desktop grid grid-cols-12 gap-lg">
        {/* Left workspace */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-lg">
          <div>
            <h2 className="text-3xl font-semibold text-on-surface tracking-tight">RFID Enrollment</h2>
            <p className="text-on-surface-variant text-lg mt-1">
              Pre-commissioning workflow for high-frequency industrial tags.
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-xl">
            <div className="flex flex-col gap-xl">
              <div className="flex flex-col gap-sm">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] uppercase tracking-wider text-primary flex items-center gap-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px]">sensors</span>
                    RFID Tag UID
                  </label>
                  <span className="text-[10px] font-mono text-secondary uppercase animate-pulse font-semibold">
                    System Monitoring...
                  </span>
                </div>
                <div className="relative">
                  <input
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    placeholder="Awaiting tag scan..."
                    className="w-full bg-surface-container-low border border-outline-variant rounded p-md font-mono text-2xl text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <div className="absolute right-md top-1/2 -translate-y-1/2 flex items-center gap-sm">
                    <span className="text-secondary text-[11px] font-semibold tracking-wider">READY</span>
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant italic">
                  Hardware trigger active. Manual entry allowed for recovery.
                </p>
              </div>

              <div className="flex flex-col gap-sm">
                <label className="text-[12px] uppercase tracking-wider text-on-surface flex items-center gap-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px]">category</span>
                  Component Identification
                </label>
                <div className="relative">
                  <select
                    defaultValue="2"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded p-md text-lg text-on-surface appearance-none focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="">Search system for component ID...</option>
                    <option value="1">H-Type Hydraulic Cylinder (P-1044)</option>
                    <option value="2">Reinforced Steel Gasket - 40mm (S-0922)</option>
                    <option value="3">Micro-Processor Fan Unit (E-8832)</option>
                    <option value="4">Pneumatic Actuator Assembly (P-1120)</option>
                  </select>
                  <span className="absolute right-md top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none text-on-surface-variant">
                    expand_more
                  </span>
                </div>
              </div>

              <button
                onClick={commission}
                disabled={loading}
                className="w-full bg-primary text-on-primary py-md rounded-lg text-xl font-semibold flex items-center justify-center gap-md hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-70"
              >
                <span className={`material-symbols-outlined ${loading ? "animate-spin" : ""}`}>
                  {loading ? "sync" : "link"}
                </span>
                {loading ? "PROCESSING" : "COMMISSION TAG"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-xl bg-surface-container border border-outline-variant px-lg py-md rounded">
            <div className="flex items-center gap-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">Antenna 01: ONLINE</span>
            </div>
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">signal_cellular_alt</span>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">-42dBm</span>
            </div>
            <div className="ml-auto flex items-center gap-sm text-primary">
              <span className="material-symbols-outlined text-[18px]">sync</span>
              <span className="text-[11px] uppercase tracking-wider font-semibold">Last Sync: 2s ago</span>
            </div>
          </div>
        </div>

        {/* Right session info */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-lg">
          <div className="flex items-center justify-between border-b border-outline-variant pb-sm">
            <h3 className="text-[12px] text-on-surface uppercase tracking-widest font-bold">Session History</h3>
            <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded text-[10px] font-bold">12 TOTAL</span>
          </div>
          <div className="flex flex-col gap-sm">
            {sessionLog.map((l) => (
              <div
                key={l.uid}
                className={`bg-surface-container-lowest border-l-4 ${l.primary ? "border-primary" : "border-secondary"} p-md flex flex-col gap-xs transition-colors hover:bg-surface-container-low ${l.dim ? "opacity-70" : ""}`}
              >
                <div className="flex justify-between items-start">
                  <p className={`font-mono text-[12px] ${l.primary ? "text-primary" : "text-secondary"}`}>{l.uid}</p>
                  <span className="text-[11px] text-on-surface-variant font-mono">{l.time}</span>
                </div>
                <p className="font-bold text-on-surface">{l.name}</p>
                <div className="flex gap-sm mt-1">
                  <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-mono text-secondary border border-outline-variant">QTY: {l.qty}</span>
                  <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-mono text-secondary border border-outline-variant">BIN: {l.bin}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface-container-high p-lg border border-outline-variant rounded">
            <p className="text-[12px] text-on-surface-variant uppercase tracking-widest mb-md font-bold text-center">
              Session Reliability
            </p>
            <div className="h-3 w-full bg-surface-container-lowest rounded-full overflow-hidden mb-md border border-outline-variant">
              <div className="h-full bg-primary" style={{ width: "99.8%" }} />
            </div>
            <div className="flex justify-between px-1">
              {[
                { l: "Read Rate", v: "99.8%", c: "text-primary" },
                { l: "Collisions", v: "0", c: "text-on-surface" },
                { l: "Uptime", v: "4h 22m", c: "text-on-surface" },
              ].map((m) => (
                <div key={m.l} className="text-center">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase">{m.l}</p>
                  <p className={`font-mono ${m.c}`}>{m.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      <div
        className={`fixed bottom-margin-desktop right-margin-desktop z-50 transition-all duration-300 ease-in-out ${toast ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0 pointer-events-none"}`}
      >
        <div className="bg-surface-container-lowest shadow-lg border border-primary px-lg py-md rounded-lg flex items-center gap-md">
          <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <div>
            <p className="text-[12px] font-bold text-primary uppercase tracking-wider">Commissioning Successful</p>
            <p className="text-sm text-on-surface">Tag linked to inventory system.</p>
          </div>
          <button className="ml-lg text-secondary hover:text-on-surface" onClick={() => setToast(false)}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
