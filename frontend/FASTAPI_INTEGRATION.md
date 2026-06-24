# Connecting LOGISTIX Frontend to Your FastAPI Backend

This guide is tailored to **your actual `main.py`** (Warehouse Inventory API) and shows exactly how to wire the React/TanStack Start frontend to it.

> Your backend currently exposes **5 endpoints** under `/api/v1/*` (plus a health check at `/`). This doc maps each frontend screen to the right endpoint and shows what extra endpoints you'll want to add to fully replace the demo data.

---

## 1. Architecture

```text
Browser (React)
    │  useServerFn / useSuspenseQuery
TanStack Start Server  (src/lib/*.functions.ts)
    │  fetch (HTTPS / JSON)
FastAPI  (main.py)  →  SQLAlchemy  →  PostgreSQL
```

Going through `createServerFn` means:
- No CORS pain for the browser.
- API URL / tokens stay server-side (`process.env.FASTAPI_BASE_URL`).
- SSR can prefetch data on first paint.

---

## 2. Your existing endpoints

Base URL: whatever you set as `FASTAPI_BASE_URL` (e.g. `http://localhost:8000`).

| # | Method | Path | Purpose | Used by frontend screen |
|---|--------|------|---------|--------------------------|
| 1 | GET  | `/`                        | Health check                              | (optional ping) |
| 2 | GET  | `/api/v1/parts`            | Full parts catalog                        | Enrollment (component dropdown) |
| 3 | GET  | `/api/v1/inventory`        | All inventory rows (part × bin × qty)     | Dashboard (inventory ledger), Audit |
| 4 | POST | `/api/v1/enrollrfid`       | Map an RFID UID to a part                 | Enrollment (commission tag) |
| 5 | POST | `/api/v1/scan`             | Process a hardware scan (auto IN/OUT)     | Audit (live movement), Dashboard (activity) |

### 2.1 `GET /api/v1/parts`

Response is `List[PartResponse]`. Expected shape (based on `schemas.PartResponse`):

```json
[
  { "id": 1, "name": "H-Type Hydraulic Cylinder", "sku": "P-1044" }
]
```

### 2.2 `GET /api/v1/inventory`

Returns all `Inventory` rows. Expected shape:

```json
[
  { "id": 10, "part_id": 1, "bin_id": 3, "quantity": 2450 }
]
```

> The frontend needs `name`, `bin label`, `sku`, `status` per row. Either (a) extend this endpoint to join `Part` + `Bin` server-side, or (b) call `/api/v1/parts` once on the client and merge by `part_id`. Option (a) is cleaner — see §5.

### 2.3 `POST /api/v1/enrollrfid`

Request body (`schemas.EnrollmentData`):

```json
{ "rfid_uid": "E280-6890-0000-4005-A1C8-1F04", "part_id": 1 }
```

Success (`201`):

```json
{ "status": "success", "message": "Sticker E280-... successfully mapped to 'H-Type Hydraulic Cylinder'." }
```

Errors: `400` if UID already enrolled, `404` if `part_id` not in catalog.

### 2.4 `POST /api/v1/scan`

Request body (`schemas.HardwareScan`):

```json
{ "rfid_uid": "E280-6890...", "bin_label": "A-12", "quantity": 50 }
```

Behavior:
- Looks up the bin and the tag.
- Infers `IN` or `OUT` by flipping the last transaction's direction.
- Enforces a **3-second cooldown** to prevent tag bouncing (returns `{"status":"ignored", "reason":"cooldown_active"}`).
- Updates `Inventory` and writes a `Transaction` row.

Success (`201`):

```json
{ "status": "success", "action": "IN", "new_quantity": 2500, "part_id": 1 }
```

Errors: `404` unknown bin / unregistered tag, `400` insufficient stock, `500` DB failure.

---

## 3. Endpoints you should add (to fully power the UI)

The current frontend renders KPIs, activity feeds, bay heatmaps, audit trends, etc. Your `main.py` does not yet expose those aggregates. Add the following endpoints — all are simple SQLAlchemy queries against the tables you already have (`Part`, `Bin`, `Inventory`, `RFIDTag`, `Transaction`).

### Dashboard

```python
@app.get("/api/v1/dashboard/kpis")
def kpis(db: Session = Depends(get_db)):
    total_parts = db.query(func.coalesce(func.sum(models.Inventory.quantity), 0)).scalar()
    bins_active = db.query(models.Bin).count()
    critical = db.query(models.Inventory).filter(models.Inventory.quantity < 10).count()
    return {
        "total_parts": total_parts,
        "bins_active": bins_active,
        "critical_alerts": critical,
        "last_update_seconds": 0.4,
    }

@app.get("/api/v1/dashboard/activity")
def recent_activity(db: Session = Depends(get_db)):
    rows = (db.query(models.Transaction)
              .order_by(models.Transaction.tx_timestamp.desc())
              .limit(10).all())
    return {"activities": [
        {
          "icon": "add" if r.tx_type == "IN" else "remove",
          "title": f"{r.quantity} units {'added' if r.tx_type=='IN' else 'removed'}",
          "sub": f"Bin {r.bin_id} • UID {r.scanned_rfid_uid}",
          "time": r.tx_timestamp.isoformat(),
        } for r in rows
    ]}
```

### Audit

```python
@app.get("/api/v1/audit/movements")
def movements(page: int = 1, limit: int = 25, db: Session = Depends(get_db)):
    q = db.query(models.Transaction).order_by(models.Transaction.tx_timestamp.desc())
    total = q.count()
    items = q.offset((page-1)*limit).limit(limit).all()
    return {
        "page": page, "limit": limit, "total": total,
        "items": [{
            "timestamp": r.tx_timestamp.isoformat(),
            "bin": r.bin_id,
            "action": r.tx_type,
            "uid": r.scanned_rfid_uid,
            "part_id": r.part_id,
            "quantity": r.quantity,
        } for r in items],
    }

@app.get("/api/v1/audit/summary")
def summary(db: Session = Depends(get_db)):
    today = datetime.now(timezone.utc).date()
    todays = (db.query(func.coalesce(func.sum(models.Transaction.quantity), 0))
                .filter(func.date(models.Transaction.tx_timestamp) == today).scalar())
    return {
        "todays_throughput": todays,
        "active_tag_uids": db.query(models.RFIDTag).count(),
    }
```

You can add `/api/v1/dashboard/bay-heatmap`, `/api/v1/audit/trends`, etc. the same way — group transactions by hour/bin and return arrays.

---

## 4. Frontend wiring

### 4.1 Set the backend URL

In **Project Settings → Secrets** (or a local `.env` file) add:

```bash
FASTAPI_BASE_URL=http://localhost:8000
```

Never prefix with `VITE_` — that would ship the URL to the browser.

### 4.2 API client — `src/lib/logistix-api.ts`

```typescript
const base = () => {
  const url = process.env.FASTAPI_BASE_URL;
  if (!url) throw new Error("FASTAPI_BASE_URL is not set");
  return url.replace(/\/$/, "");
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base()}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = { get, post };
```

### 4.3 Server functions — `src/lib/warehouse.functions.ts`

```typescript
import { createServerFn } from "@tanstack/react-start";
import { api } from "./logistix-api";

export const getParts      = createServerFn({ method: "GET" }).handler(() => api.get("/api/v1/parts"));
export const getInventory  = createServerFn({ method: "GET" }).handler(() => api.get("/api/v1/inventory"));
export const getKpis       = createServerFn({ method: "GET" }).handler(() => api.get("/api/v1/dashboard/kpis"));
export const getActivity   = createServerFn({ method: "GET" }).handler(() => api.get("/api/v1/dashboard/activity"));
export const getMovements  = createServerFn({ method: "GET" })
  .inputValidator((d: { page: number; limit: number }) => d)
  .handler(({ data }) => api.get(`/api/v1/audit/movements?page=${data.page}&limit=${data.limit}`));

export const enrollRfid = createServerFn({ method: "POST" })
  .inputValidator((d: { rfid_uid: string; part_id: number }) => d)
  .handler(({ data }) => api.post("/api/v1/enrollrfid", data));

export const sendScan = createServerFn({ method: "POST" })
  .inputValidator((d: { rfid_uid: string; bin_label: string; quantity: number }) => d)
  .handler(({ data }) => api.post("/api/v1/scan", data));
```

### 4.4 Using them in a route (`src/routes/index.tsx`)

```typescript
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getKpis, getInventory } from "@/lib/warehouse.functions";

const kpisQuery = queryOptions({ queryKey: ["kpis"], queryFn: () => getKpis() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(kpisQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data: kpis } = useSuspenseQuery(kpisQuery);
  return <h1>{kpis.total_parts} parts</h1>;
}
```

### 4.5 Enrollment form (mutation)

```typescript
import { useServerFn } from "@tanstack/react-start";
import { enrollRfid } from "@/lib/warehouse.functions";

const enroll = useServerFn(enrollRfid);

async function handleSubmit() {
  const res = await enroll({ data: { rfid_uid: scannedUid, part_id: selectedPartId } });
  toast(res.message);
}
```

---

## 5. Recommended backend tweak

Your `/api/v1/inventory` currently returns raw FK ids. The dashboard ledger needs human labels. Patch it to join:

```python
@app.get("/api/v1/inventory")
def get_inventory(db: Session = Depends(get_db)):
    rows = (db.query(models.Inventory, models.Part, models.Bin)
              .join(models.Part, models.Part.id == models.Inventory.part_id)
              .join(models.Bin,  models.Bin.id  == models.Inventory.bin_id).all())
    return [{
        "id": inv.id,
        "part_id": inv.part_id,
        "name": part.name,
        "sku": getattr(part, "sku", None),
        "bin": bin_.bin_label,
        "qty": inv.quantity,
        "status": "Critical" if inv.quantity < 5 else "Low Stock" if inv.quantity < 25 else "Optimal",
    } for inv, part, bin_ in rows]
```

---

## 6. CORS

You already set `allow_origins=["*"]`. That's fine for dev. For production, restrict to:

```python
allow_origins=[
    "https://id-preview--8100f75a-ce32-4fb5-a6b4-0734d2d14007.lovable.app",
    "https://<your-published-domain>",
]
```

If you call FastAPI **only** through `createServerFn` (recommended), the browser never hits FastAPI directly and CORS isn't required at all.

---

## 7. Local dev workflow

1. Start FastAPI:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
2. Add `FASTAPI_BASE_URL=http://localhost:8000` to the Lovable project secrets.
3. Open the preview — the dashboard, enrollment dropdown and audit table will hit your live DB.

---

## 8. Endpoint cheat-sheet

| Frontend need | Endpoint | Status |
|---|---|---|
| Component dropdown (Enrollment) | `GET /api/v1/parts` | ✅ exists |
| Inventory ledger (Dashboard) | `GET /api/v1/inventory` | ✅ exists (consider join in §5) |
| Commission RFID tag | `POST /api/v1/enrollrfid` | ✅ exists |
| Live scan (IN/OUT) | `POST /api/v1/scan` | ✅ exists |
| KPI cards | `GET /api/v1/dashboard/kpis` | ➕ add (§3) |
| Activity feed | `GET /api/v1/dashboard/activity` | ➕ add (§3) |
| Audit movement log | `GET /api/v1/audit/movements` | ➕ add (§3) |
| Audit summary stats | `GET /api/v1/audit/summary` | ➕ add (§3) |
| Bay heatmap / trends | `GET /api/v1/dashboard/bay-heatmap`, `/api/v1/audit/trends` | ➕ add (similar pattern) |

Implement the ➕ rows and the frontend can drop its demo data entirely.
