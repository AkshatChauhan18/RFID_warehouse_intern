# LIME — Live Inventory Monitoring Engine

**Project Report**

---

## 1. Executive Summary

LIME is a real-time warehouse inventory management system that leverages RFID technology for automated parts tracking. Built with a FastAPI backend and a React/TanStack Start frontend, it connects to Zebra RFID readers via MQTT to provide live inventory visibility, batch tag enrollment, movement auditing, and warehouse heatmap analytics.

---

## 2. Tech Stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| Backend          | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Uvicorn       |
| Frontend         | TypeScript 5.8, React 19, TanStack Start, TanStack Router    |
| UI               | shadcn/ui, Tailwind CSS v4, Recharts                         |
| Database         | PostgreSQL 18                                                 |
| Real-time        | WebSocket (backend → UI), MQTT (reader → backend)             |
| Auth             | JWT + Argon2 password hashing                                |
| Containerization | Docker & Docker Compose                                       |
| MQTT Broker      | Eclipse Mosquitto                                             |

---

## 3. Architecture

```
Browser (React SPA)
       │
       │ HTTP/JSON + WebSocket
       ▼
Frontend (TanStack Start SSR, port 3000)
       │
       │ REST via fetchWithAuth
       ▼
FastAPI Backend (port 8000)
       │                   │
       ▼                   ▼
PostgreSQL (5433)    Mosquitto MQTT (1883)
                            │
                            ▼
                     Zebra RFID Reader
```

Docker Compose runs five services: `postgres`, `pgadmin`, `mosquitto`, `backend`, and `frontend`.

---

## 4. Database Schema

| Table          | Purpose                          | Key Columns                          |
| -------------- | -------------------------------- | ------------------------------------ |
| `parts`        | Parts catalog                    | `id`, `sku` (unique), `name`         |
| `rfid_tags`    | Maps RFID UIDs to parts          | `rfid_uid` (PK), `part_id` (FK)      |
| `area`         | Warehouse zones (bins)           | `id`, `bin_label` (unique)           |
| `inventory`    | Stock levels (composite PK)      | `part_id`, `bin_id`, `quantity`      |
| `users`        | Operator accounts                | `id`, `email`, `hashed_password`     |
| `transactions` | Audit log of movements           | `id`, `part_id`, `tx_type` (IN/OUT)  |

---

## 5. Features

### Real-time RFID Tracking
- MQTT-based communication with Zebra RFID readers
- Automatic IN/OUT inference with 30-second anti-bounce cooldown
- Live inventory updates pushed via WebSocket

### Batch Tag Enrollment
- Start/stop/cancel/confirm enrollment sessions
- Real-time stream of discovered tags with RSSI and antenna info
- Associate multiple tags with a single part in one operation

### Dashboard
- KPI cards: total parts, active areas, critical alerts, last update
- Recent activity feed (last 5 transactions)
- Warehouse heatmap (4×4 zone grid)
- CSV export

### Inventory Management
- Paginated inventory table with search (name/SKU) and status filter
- CSV export

### Audit Ledger
- Paginated movement log with search by part/UID/area
- Filter by IN/OUT action
- Live relative timestamps
- CSV export

### Authentication
- JWT-based login with 60-minute token expiry
- Argon2 password hashing
- Route guard redirects to `/auth` if unauthenticated

---

## 6. API Endpoints

| Method | Endpoint                          | Purpose                         |
| ------ | --------------------------------- | ------------------------------- |
| POST   | `/api/v1/login`                   | JWT login                       |
| GET    | `/api/v1/parts`                   | List all parts                  |
| GET    | `/api/v1/inventory`               | All inventory rows              |
| GET    | `/api/v1/inventory/paginated`     | Paginated inventory with search |
| POST   | `/api/v1/scan`                    | Process RFID scan               |
| POST   | `/api/v1/enrollrfid`              | Single RFID enrollment          |
| POST   | `/api/v1/enrollment/start`        | Start batch enrollment          |
| POST   | `/api/v1/enrollment/stop`         | Stop enrollment                 |
| POST   | `/api/v1/enrollment/cancel`       | Cancel enrollment               |
| POST   | `/api/v1/enrollment/confirm`      | Confirm batch enrollment        |
| GET    | `/api/v1/enrollment/pending`      | Pending tags in session         |
| GET    | `/api/v1/dashboard/kpis`          | Dashboard KPIs                  |
| GET    | `/api/v1/dashboard/activity`      | Recent activity                 |
| GET    | `/api/v1/audit/movements`         | Paginated movement log          |
| GET    | `/api/v1/audit/summary`           | Today's audit summary           |
| GET    | `/api/v1/heatmap`                 | Warehouse heatmap               |
| WS     | `/api/v1/ws`                      | Real-time inventory updates     |

---

## 7. Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── routers/            # API route handlers
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic (tracking, enrollment, MQTT)
│   │   └── database.py         # DB connection
│   ├── alembic/                # Database migrations
│   ├── seed.py                 # Seed data script
│   ├── mock_sensor.py          # Simulated RFID reader
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # React components + shadcn/ui
│   │   ├── routes/             # TanStack Router file-based routes
│   │   ├── lib/                # Utilities, API client, auth helpers
│   │   └── styles/             # Global CSS
│   ├── app.config.ts           # TanStack Start config
│   └── server.ts               # SSR entry point
├── docker-compose.yaml
└── README.md
```

---

## 8. Running the Project

### Full Docker deployment
```bash
docker compose up -d
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Swagger docs: http://localhost:8000/docs
# pgAdmin: http://localhost:5050
```

### Backend (development)
```bash
docker compose up -d postgres mosquitto
cd backend
python -m venv .venv && .venv\Scripts\Activate
pip install -r requirements.txt
alembic upgrade head
python seed.py
uvicorn app.main:app --reload
```

### Frontend (development)
```bash
cd frontend
npm install
npm run dev
```

### Default credentials
- **Admin**: admin@logistix.com / admin123
- **PostgreSQL**: warehouse_manager / hello_world_123, DB: warehouse
- **pgAdmin**: admin@example.com / hello#123

---

## 9. Development Notes

- Repository originates from [RFID_warehouse_intern](https://github.com/AkshatChauhan18/RFID_warehouse_intern)
- LG Electronics branding visible in the frontend
- Mock sensor available for development without hardware
- WebSocket broadcasts `inventory_updated` events to all connected clients
- CORS is open (`*`) — should be locked for production
- Secrets in `.env` are tracked in git — should be externalized for production
