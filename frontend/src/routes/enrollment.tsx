import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/enrollment")({
  head: () => ({
    meta: [
      { title: "Batch Enrollment | LOGISTIX" },
      { name: "description", content: "Multi-tag commissioning workflow for high-density industrial RFID inventory." },
    ],
  }),
  component: EnrollmentPage,
});

/* ── Types ─────────────────────────────────────────────── */
interface ScannedTag {
  epc: string;
  timestamp: number;      // epoch ms
  antenna: number;
  rssi: number;
}

// ? Added real API endpoints for backend communication
const BASE_URL = process.env.FASTAPI_BASE_URL || "http://localhost:8000";

async function apiStartEnrollment() {
  return fetch(`${BASE_URL}/api/v1/enrollment/start`, { method: "POST" }).then(r => r.json());
}
async function apiConfirmEnrollment(partId: number) {
  return fetch(`${BASE_URL}/api/v1/enrollment/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ part_id: partId }),
  }).then(r => r.json());
}
async function apiCancelEnrollment() {
  return fetch(`${BASE_URL}/api/v1/enrollment/cancel`, { method: "POST" }).then(r => r.json());
}
async function apiFetchParts() {
  return fetch(`${BASE_URL}/api/v1/parts`).then(r => r.json());
}

/* ── Helpers ───────────────────────────────────────────── */
function relativeTime(ts: number): string {
  const delta = Math.round((Date.now() - ts) / 1000);
  if (delta < 2) return "JUST NOW";
  if (delta < 60) return `${delta}S AGO`;
  return `${Math.floor(delta / 60)}M AGO`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ── Page ──────────────────────────────────────────────── */
function EnrollmentPage() {
  const [isScanning, setIsScanning] = useState(false);
  // ? Replaced mock tags with empty initial state
  const [tags, setTags] = useState<ScannedTag[]>([]);
  // ? Added state for dynamic parts dropdown
  const [parts, setParts] = useState<{id: number; name: string; sku: string}[]>([]);
  const [selectedPartId, setSelectedPartId] = useState(0);
  const [toast, setToast] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Scan timer ─────────────────────────────────────── */
  useEffect(() => {
    if (isScanning) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isScanning]);

  // ? Load parts on component mount
  useEffect(() => {
    apiFetchParts().then(setParts);
  }, []);

  // ? Added WebSocket listener to receive tags in real-time
  useEffect(() => {
    if (!isScanning) return;
    const wsUrl = BASE_URL.replace(/^http/, "ws") + "/api/v1/ws";
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "enrollment_tag") {
        setTags((prev) => [
          { epc: data.uid, timestamp: Date.now(), antenna: data.antenna || 1, rssi: data.rssi || 0 },
          ...prev,
        ]);
      }
    };
    return () => ws.close();
  }, [isScanning]);

  /* ── Toggle scanning ────────────────────────────────── */
  const toggleScan = useCallback(async () => {
    if (!isScanning) {
      setElapsed(0);
      setTags([]);
      // ? Calls backend to start scanning
      await apiStartEnrollment();
      setIsScanning(true);

    }
    else{
      // await apiCancelEnrollment();
      setIsScanning(false);
    }
    // setIsScanning((s) => !s);
  }, [isScanning]);

  /* ── Confirm batch enrollment ───────────────────────── */
  const confirmEnrollment = useCallback(async () => {
    if (isScanning || tags.length === 0) return;
    setProcessing(true);
    // ? Sends selected part_id to backend for confirmation
    const result = await apiConfirmEnrollment(selectedPartId);
    setProcessing(false);
    if (result.status === "success") {
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    } else {
      // ? Show error message from backend (e.g. duplicate tags)
      alert(result.message);
    }
  }, [isScanning, tags.length, selectedPartId]);

  /* ── Cancel ─────────────────────────────────────────── */
  const cancel = useCallback(async () => {
    // ? Calls backend to cancel scanning
    await apiCancelEnrollment();
    setIsScanning(false);
    setTags([]);
    setElapsed(0);
  }, []);

  const scanStatus = isScanning ? "Scanning" : tags.length > 0 ? "Completed" : "Idle";

  return (
    <AppShell>
      <main className="flex-1 p-margin-desktop grid grid-cols-12 gap-lg overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

        {/* ────────── Left: Enrollment Controls (8 cols) ────────── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-lg overflow-y-auto pr-sm">

          {/* Header */}
          <div>
            <h2 className="text-3xl font-semibold text-on-surface tracking-tight">Batch Enrollment</h2>
            <p className="text-on-surface-variant text-lg mt-1">
              Multi-tag commissioning workflow for high-density inventory.
            </p>
          </div>

          {/* ── Live Counter Card ──────────────────────────────── */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded p-xl flex flex-col items-center justify-center gap-md text-center">
            <label className="text-[12px] uppercase tracking-wider text-primary flex items-center gap-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">sensors</span>
              Live Enrollment
            </label>

            <div className="flex flex-col gap-2">
              <div className="text-[64px] font-bold text-primary leading-none tabular-nums">
                {tags.length}
              </div>
              <p className="text-xl font-semibold text-on-surface uppercase tracking-tight">
                Unique Tags Found
              </p>
            </div>

            {/* Status badge */}
            <div className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant ${isScanning ? "bg-primary-fixed" : "bg-surface-container-low"}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? "bg-primary animate-pulse" : tags.length > 0 ? "bg-green-500" : "bg-secondary"}`} />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-on-surface-variant">
                {scanStatus}
              </span>
            </div>
          </div>

          {/* ── Controls Form ─────────────────────────────────── */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded p-xl flex flex-col gap-xl">

            {/* Start / Stop button */}
            <button
              onClick={toggleScan}
              className={`w-full py-xl border-2 border-primary font-semibold text-2xl rounded flex items-center justify-center gap-md transition-all active:scale-[0.99] ${
                isScanning
                  ? "bg-primary text-on-primary"
                  : "text-primary hover:bg-primary hover:text-on-primary"
              }`}
              style={isScanning ? { animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" } : undefined}
            >
              <span className="material-symbols-outlined text-[28px]">
                {isScanning ? "sensors" : "radar"}
              </span>
              {isScanning ? "STOP SCANNING" : "START ENROLLMENT"}
            </button>

            {/* Part selector */}
            <div className="flex flex-col gap-sm">
              <label className="text-[12px] uppercase tracking-wider text-on-surface flex items-center gap-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">category</span>
                Select Part to Link
              </label>
              <div className="relative">
                <select
                  // ? Bind select value to state
                  disabled={isScanning}
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(Number(e.target.value))}
                  className="w-full bg-surface-container-low border border-outline-variant rounded p-md text-lg text-on-surface appearance-none focus:border-primary focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={0}>Select system component ID...</option>
                  {/* ? Dynamically render parts from database */}
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                <span className="absolute right-md top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none text-on-surface-variant">
                  expand_more
                </span>
              </div>
            </div>

            {/* Confirm / Cancel */}
            <div className="grid grid-cols-2 gap-md pt-md border-t border-outline-variant">
              <button
                onClick={confirmEnrollment}
                disabled={processing || isScanning || tags.length === 0}
                className="bg-primary text-on-primary py-md rounded text-[12px] uppercase tracking-widest font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={`material-symbols-outlined ${processing ? "animate-spin" : ""}`}>
                  {processing ? "sync" : "verified"}
                </span>
                {processing ? "Processing" : "Confirm Enrollment"}
              </button>
              <button
                onClick={cancel}
                className="bg-surface-container-highest text-secondary py-md rounded text-[12px] uppercase tracking-widest font-semibold hover:bg-surface-variant active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
            </div>
          </div>

          {/* ── Hardware Status Bar ───────────────────────────── */}
          <div className="flex flex-wrap items-center gap-xl bg-surface-container border border-outline-variant px-lg py-md rounded">
            <div className="flex items-center gap-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">Antenna Array: Active</span>
            </div>
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">signal_cellular_alt</span>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">98% Sig. Strength</span>
            </div>
            <div className="ml-auto flex items-center gap-sm text-primary">
              <span className="material-symbols-outlined text-[18px]">sync</span>
              <span className="text-[11px] uppercase tracking-wider font-semibold">Last Sync: Live</span>
            </div>
          </div>
        </div>

        {/* ────────── Right: Live Tags (4 cols) ────────── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col bg-surface-container-low border-l border-outline-variant -my-margin-desktop p-margin-desktop overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant pb-sm mb-md">
            <h3 className="text-[12px] text-on-surface uppercase tracking-widest font-bold">Live Tags</h3>
            <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded text-[10px] font-bold">
              {tags.length} TAGS
            </span>
          </div>

          {/* Tag stream */}
          <div className="flex flex-col gap-sm flex-grow overflow-y-auto pr-2">
            {tags.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-md py-xl text-center opacity-60">
                <span className="material-symbols-outlined text-[48px] text-secondary">contactless</span>
                <p className="text-sm text-on-surface-variant">No tags scanned yet.<br />Press Start Enrollment to begin.</p>
              </div>
            )}
            {tags.map((tag, i) => (
              <div
                key={tag.epc}
                className="bg-surface-container-lowest border border-outline-variant p-md flex flex-col gap-xs transition-all hover:border-primary"
                style={{ opacity: Math.max(0.5, 1 - i * 0.1) }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="font-mono text-[12px] text-primary font-bold">{tag.epc}</p>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-mono">{relativeTime(tag.timestamp)}</span>
                </div>
                <div className="flex gap-sm mt-1">
                  <span className="bg-surface-container-low px-2 py-0.5 rounded text-[10px] font-mono text-on-surface-variant border border-outline-variant">
                    ANTENNA {String(tag.antenna).padStart(2, "0")}
                  </span>
                  <span className="bg-surface-container-low px-2 py-0.5 rounded text-[10px] font-mono text-on-surface-variant border border-outline-variant">
                    {tag.rssi}dBm
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Enrollment Summary Card ───────────────────── */}
          <div className="mt-md bg-inverse-surface text-inverse-on-surface p-md rounded shadow-md">
            <p className="text-[10px] uppercase tracking-widest mb-md opacity-70 font-bold">Enrollment Summary</p>
            <div className="grid grid-cols-2 gap-lg">
              <div>
                <p className="text-[20px] font-bold tabular-nums">{tags.length}</p>
                <p className="text-[10px] uppercase opacity-60">Unique Tags</p>
              </div>
              <div>
                <p className="text-[20px] font-bold tabular-nums">{formatDuration(elapsed)}</p>
                <p className="text-[10px] uppercase opacity-60">Scan Time</p>
              </div>
            </div>
            <div className="mt-md pt-md border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary-fixed-dim">
                Status: {scanStatus}
              </span>
              <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">verified_user</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Success Toast ────────────────────────────────── */}
      <div
        className={`fixed bottom-margin-desktop right-margin-desktop z-50 transition-all duration-300 ease-in-out ${
          toast ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-surface-container-lowest shadow-lg border border-primary px-lg py-md rounded-lg flex items-center gap-md">
          <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <div>
            <p className="text-[12px] font-bold text-primary uppercase tracking-wider">Batch Commissioned</p>
            <p className="text-sm text-on-surface">{tags.length} tags successfully linked to inventory.</p>
          </div>
          <button className="ml-lg text-secondary hover:text-on-surface" onClick={() => setToast(false)}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
