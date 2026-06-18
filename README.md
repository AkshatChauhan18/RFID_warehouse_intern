# Backend Setup Guide

This backend is a FastAPI application using SQLAlchemy, Alembic, and PostgreSQL. The local development setup uses Docker for the database and `uvicorn` for the API server.

## Prerequisites

Install these first:

- Python 3.11 or newer
- Docker Desktop
- Git

## Project Structure

- `app/` contains the FastAPI app, SQLAlchemy models, schemas, and database setup
- `alembic/` contains database migrations
- `seed.py` loads sample warehouse data into the database
- `docker-compose.yaml` starts PostgreSQL and pgAdmin locally

## Local Setup

1. Open a terminal in the `backend` folder.
2. Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Install the Python dependencies:

```powershell
pip install -r requirements.txt
```

## Start PostgreSQL

The project expects PostgreSQL on `localhost:5433` with these credentials:

- database: `warehouse`
- user: `warehouse_manager`
- password: `hello_world_123`

Start the containers with:

```powershell
docker compose -f docker-compose.yaml up -d
```

If you want to open pgAdmin, go to:

- http://localhost:5050

pgAdmin login details:

- email: `admin@example.com`
- password: `hello#123`

## Database Configuration

The database URL is currently hardcoded in both of these files:

- `app/database.py`
- `alembic.ini`

If you change the database host, port, username, or password, update both files so the app and migrations stay in sync.

## Run Migrations

After the database is running, apply the Alembic migrations:

```powershell
alembic upgrade head
```

If you create a new migration later, use:

```powershell
alembic revision --autogenerate -m "your message"
```

## Seed Sample Data

Load the sample warehouse data after the schema exists:

```powershell
python seed.py
```

The seed script is safe to run more than once. It skips seeding if data already exists.

## Run the API

Start the FastAPI server with:

```powershell
uvicorn app.main:app --reload
```

The API will be available at:

- http://127.0.0.1:8000

Interactive API docs:

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Useful Endpoints

- `GET /` returns a basic health check
- `GET /api/v1/parts` returns the parts catalog
- `POST /api/v1/enrollrfid` enrolls an RFID tag for a part
- `POST /api/v1/scan` processes a hardware RFID scan

## Common Troubleshooting

- If the API cannot connect to the database, confirm Docker is running and PostgreSQL is listening on port `5433`.
- If migrations fail, make sure the database exists and the connection string in `alembic.ini` matches `app/database.py`.
- If `uvicorn` is not found, verify the virtual environment is activated.
- If PowerShell blocks activation scripts, run PowerShell as needed for your local policy or use a terminal profile that allows script execution.

## Notes for Coworkers

- The backend currently uses a direct connection string instead of environment variables.
- CORS is configured to allow all origins for local development.
- If this is going to shared or production use, the database credentials and CORS settings should be externalized before deployment.