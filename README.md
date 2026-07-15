# LIME — Live Inventory Monitoring Engine

A real-time warehouse inventory management system that uses RFID technology for automated parts tracking. Built with a FastAPI backend and React/TanStack Start frontend, it connects to Zebra RFID readers via MQTT to provide live inventory visibility, batch tag enrollment, movement auditing, and warehouse heatmap analytics.

---

## Tech Stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| Backend          | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Uvicorn       |
| Frontend         | TypeScript 5.8, React 19, TanStack Start, TanStack Router    |
| UI               | shadcn/ui (Radix), Tailwind CSS 4, Recharts, Lucide Icons    |
| Database         | PostgreSQL 18, psycopg 3                                     |
| Real-time        | WebSocket (backend → UI), MQTT (reader → backend)            |
| Auth             | JWT (HS256) + Argon2 password hashing                        |
| MQTT Broker      | Eclipse Mosquitto 2                                           |
| Containerization | Docker & Docker Compose                                       |

---

## Architecture

```
Browser (React SPA)
       │
       │ HTTP/JSON + WebSocket
       ▼
Frontend (TanStack Start SSR, port 3000)
       │
       │ REST via fetchWithAuth (JWT)
       ▼
FastAPI Backend (port 8000)
       │                   │
       ▼                   ▼
PostgreSQL (5433)    Mosquitto MQTT (1883)
                            │
                            ▼
                     Zebra RFID Reader
```

**Data flow:**
- Zebra RFID readers publish scan events to Mosquitto (MQTT)
- Backend subscribes to MQTT topics, processes scans (IN/OUT inference with 30-second anti-bounce cooldown)
- Backend broadcasts inventory updates via WebSocket to connected frontend clients
- Frontend uses TanStack React Query for data fetching and TanStack Router for routing

---

## Prerequisites

- Python 3.12 or newer
- Node.js 22 or newer
- Docker Desktop
- Git

---

## Quick Start (Full Docker Deployment)

```powershell
docker compose up -d
```

| Service  | URL                                |
| -------- | ---------------------------------- |
| Frontend | http://localhost:3000              |
| Backend  | http://localhost:8000              |
| API Docs | http://localhost:8000/docs         |
| pgAdmin  | http://localhost:5050              |

---

## Development Setup

### Backend

1. Start the dependencies (PostgreSQL + Mosquitto):

```powershell
docker compose up -d postgres mosquitto
```

2. Open a terminal in the `backend` folder, create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Install dependencies:

```powershell
pip install -r requirements.txt
```

4. Run database migrations:

```powershell
alembic upgrade head
```

5. (Optional) Seed sample warehouse data:

```powershell
python seed.py
```

6. Start the API server:

```powershell
uvicorn app.main:app --reload
```

The API will be available at http://127.0.0.1:8000.

#### Creating new migrations

```powershell
alembic revision --autogenerate -m "description of change"
```

### Frontend

1. Open a terminal in the `frontend` folder:

```powershell
cd frontend
```

2. Install dependencies:

```powershell
npm install
```

3. Start the dev server:

```powershell
npm run dev
```

The frontend will be available at the URL shown in the terminal (typically http://localhost:3000).

By default the frontend expects the backend at `http://localhost:8000`. To use a different URL, set the `FASTAPI_BASE_URL` environment variable.

---

## Mock Sensor

A simulated RFID reader script is available for development without hardware:

```powershell
cd backend
python mock_sensor.py
```

This publishes fake RFID tag reads to the MQTT broker, which the backend processes as real scans. Tags are randomly selected from the seeded data.

---

## API Endpoints

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

## Default Credentials

| Service    | Username / Email             | Password          |
| ---------- | ---------------------------- | ----------------- |
| App (User) | admin@logistix.com           | admin123          |
| PostgreSQL | warehouse_manager            | hello_world_123   |
| pgAdmin    | admin@example.com            | hello#123         |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── database.py          # DB connection
│   │   ├── auth.py              # JWT + Argon2 auth
│   │   ├── tracking_service.py  # RFID tracking logic
│   │   ├── enrollment_service.py# Batch tag enrollment
│   │   ├── zebra_client.py      # MQTT client for readers
│   │   └── sensor_comm.py       # Simulated sensor communication
│   ├── alembic/                 # Database migrations
│   ├── mosquitto/               # Mosquitto MQTT config
│   ├── seed.py                  # Sample data loader
│   ├── mock_sensor.py           # Simulated RFID reader
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # React components + shadcn/ui
│   │   ├── routes/              # TanStack Router file-based routes
│   │   ├── lib/                 # Utilities, API client, auth helpers
│   │   └── styles.css           # Global CSS
│   ├── app.config.ts            # TanStack Start config
│   ├── server.ts                # SSR entry point
│   └── package.json
├── docker-compose.yaml
└── README.md
```

---

## Database Schema

| Table          | Purpose                          | Key Columns                          |
| -------------- | -------------------------------- | ------------------------------------ |
| `parts`        | Parts catalog                    | `id`, `sku` (unique), `name`         |
| `rfid_tags`    | Maps RFID UIDs to parts          | `rfid_uid` (PK), `part_id` (FK)      |
| `area`         | Warehouse zones (bins)           | `id`, `bin_label` (unique)           |
| `inventory`    | Stock levels (composite PK)      | `part_id`, `bin_id`, `quantity`      |
| `users`        | Operator accounts                | `id`, `email`, `hashed_password`     |
| `transactions` | Audit log of movements           | `id`, `part_id`, `tx_type` (IN/OUT)  |

---

## Troubleshooting

- If the API cannot connect to the database, confirm Docker is running and PostgreSQL is listening on port `5433`.
- If migrations fail, make sure the database exists and the connection string in `alembic.ini` matches `app/database.py`.
- If `uvicorn` is not found, verify the virtual environment is activated.
- If PowerShell blocks activation scripts, run PowerShell as administrator or set execution policy: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- The seed script is safe to run more than once — it skips seeding if data already exists.

---

## Notes

- The backend currently uses a hardcoded connection string instead of environment variables for the database URL.
- CORS is configured to allow all origins (`*`) for local development — should be locked down for production.
- Secrets in `backend/.env` are tracked in git — should be externalized (e.g., Docker secrets, vault) for production.
- WebSocket at `/api/v1/ws` broadcasts `inventory_updated` events to all connected clients.
- The frontend uses JWT tokens stored in `localStorage` for authenticated API calls.
- Repository originates from [RFID_warehouse_intern](https://github.com/AkshatChauhan18/RFID_warehouse_intern).
