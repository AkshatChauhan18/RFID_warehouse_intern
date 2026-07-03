from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import func
from app import models, schemas
from fastapi import WebSocket, WebSocketDisconnect

# ? Added imports for MQTT client and enrollment service
import asyncio
import logging
from contextlib import asynccontextmanager
from app.zebra_client import ZebraMQTTClient
from app.enrollment_service import EnrollmentService
# ? Import TrackingService
from app.tracking_service import TrackingService

logging.basicConfig(level=logging.INFO)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass # Ignore dropped connections
manager = ConnectionManager()

# ? Added lifespan to manage MQTT client background thread and enrollment service
@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_client = ZebraMQTTClient(broker="localhost", port=1883)
    enrollment_service = EnrollmentService(mqtt_client=mqtt_client, ws_manager=manager)
    
    # ? Instantiate tracking service
    tracking_service = TrackingService(ws_manager=manager, enrollment_service=enrollment_service)
    
    # ? Master callback router
    def _master_on_tag(uid: str, antenna: int, rssi: int):
        if enrollment_service.is_active:
            enrollment_service.on_tag_discovered(uid, antenna, rssi)
        else:
            tracking_service.on_tag_discovered(uid, antenna, rssi)

    mqtt_client.on_tag_callback = _master_on_tag
    
    enrollment_service.set_event_loop(asyncio.get_running_loop())
    tracking_service.set_event_loop(asyncio.get_running_loop())
    
    app.state.enrollment_service = enrollment_service
    mqtt_client.connect()
    
    # ? Automatically start inventory so it tracks 24/7 (except when enrollment overrides it)
    mqtt_client.start_inventory()
    
    yield
    mqtt_client.disconnect()

app = FastAPI(title="Warehouse Inventory API", lifespan=lifespan)

# ? Restored CORS configuration that was accidentally removed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Database Session Manager
def get_db():
    db = models.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.websocket("/api/v1/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back the received message (for testing)
            await websocket.send_text(f"Message text was: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# 3. API Endpoints
@app.get("/")
def health_check():
    return {"status": "FastAPI is running and connected!"}


@app.get("/api/v1/parts", response_model=List[schemas.PartResponse])
def get_all_parts(db: Session = Depends(get_db)):
    """
    Fetch the entire parts catalog from PostgreSQL.
    """
    parts = db.query(models.Part).all()
    return parts


@app.get("/api/v1/inventory", response_model=List[schemas.InventoryResponse])
def get_inventory(db: Session = Depends(get_db)):
    # Join Inventory with Part and Area tables
    rows = (
        db.query(models.Inventory, models.Part, models.Area)
        .join(models.Part, models.Part.id == models.Inventory.part_id)
        .join(models.Area, models.Area.id == models.Inventory.bin_id)
        .all()
    )
    
    return [
        {
            "name": part.name,
            "sku": part.sku,
            "area": area.bin_label, # ? Changed bin to area
            "qty": inv.quantity,
            "status": "Critical" if inv.quantity < 5 else "Low Stock" if inv.quantity < 25 else "Optimal"
        }
        for inv, part, area in rows
    ]


@app.post("/api/v1/enrollrfid", status_code=status.HTTP_201_CREATED)
def enroll_rfid(payload: schemas.EnrollmentData, db: Session = Depends(get_db)):
    # Implementation for enrolling RFID tag
    existing_tag = (
        db.query(models.RFIDTag)
        .filter(models.RFIDTag.rfid_uid == payload.rfid_uid)
        .first()
    )
    if existing_tag:
        raise HTTPException(status_code=400, detail="RFID tag already enrolled.")

    part = db.query(models.Part).filter(models.Part.id == payload.part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found in the catalog.")

    new_tag = models.RFIDTag(rfid_uid=payload.rfid_uid, part_id=payload.part_id)
    db.add(new_tag)
    db.commit()
    return {
        "status": "success",
        "message": f"Sticker {payload.rfid_uid} successfully mapped to '{part.name}'.",
    }


@app.post(("/api/v1/scan"), status_code=status.HTTP_201_CREATED)
async def process_hardware_scan(payload: schemas.HardwareScan, db: Session = Depends(get_db)):
    area_record = (
        db.query(models.Area).filter(models.Area.bin_label == payload.area_label).first()
    )
    if not area_record:
        raise HTTPException(
            status_code=404, detail=f"Area {payload.area_label} not found"
        )

    tag_record = (
        db.query(models.RFIDTag)
        .filter(models.RFIDTag.rfid_uid == payload.rfid_uid)
        .first()
    )
    if not tag_record:
        raise HTTPException(
            status_code=404,
            detail=f"Unregistered RFID tag please take to enrollment center",
        )

    part_id = tag_record.part_id
    inferred_action = ""
    last_transaction = (
        db.query(models.Transaction)
        .filter(models.Transaction.scanned_rfid_uid == payload.rfid_uid)
        .order_by(models.Transaction.tx_timestamp.desc())
        .first()
    )
    if last_transaction is None:
        inferred_action = "IN"
    else:
        now_utc = datetime.now(timezone.utc)
        raw_time: datetime = last_transaction.tx_timestamp  # type: ignore
        tx_time = (
            raw_time.replace(tzinfo=timezone.utc)
            if raw_time.tzinfo is None
            else raw_time
        )
        if (now_utc - tx_time) < timedelta(seconds=30):
            return {
                "status": "ignored",
                "reason": "cooldown_active",
                "message": "Tag bouncing prevented (30s cooldown).",
            }
        inferred_action = "OUT" if last_transaction.tx_type == "IN" else "IN"
    try:
        inventory_record = (
            db.query(models.Inventory)
            .filter(
                models.Inventory.part_id == part_id,
                models.Inventory.bin_id == area_record.id,
            )
            .first()
        )

        if inventory_record is None:
            if inferred_action == "OUT":
                raise ValueError("Cannot remove an item that is not in this area.")
            inventory_record = models.Inventory(
                part_id=part_id, bin_id=area_record.id, quantity=0
            )
            db.add(inventory_record)

        if inferred_action == "IN":
            inventory_record.quantity += payload.quantity
        elif inferred_action == "OUT":
            if inventory_record.quantity < payload.quantity:
                raise ValueError("Insufficient stock to remove.")
            inventory_record.quantity -= payload.quantity
        new_tx = models.Transaction(
            part_id=part_id,
            bin_id=area_record.id,
            tx_type=inferred_action,
            quantity=payload.quantity,
            scanned_rfid_uid=payload.rfid_uid,
        )
        db.add(new_tx)

        # C. Commit everything simultaneously
        db.commit()
        await manager.broadcast({"event": "inventory_updated"})

        return {
            "status": "success",
            "action": inferred_action,
            "new_quantity": inventory_record.quantity,
            "part_id": part_id,
        }

    except ValueError as ve:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database transaction failed.")
    
@app.get("/api/v1/dashboard/kpis")
def get_kpis(db: Session = Depends(get_db)):
    total_parts = db.query(func.coalesce(func.sum(models.Inventory.quantity), 0)).scalar()
    areas_active = db.query(models.Area).filter(models.Area.is_active == True).count()
    critical_alerts = db.query(models.Inventory).filter(models.Inventory.quantity < 10).count()
    
    return {
        "total_parts": int(total_parts),
        "bins_active": areas_active, # Kept as bins_active so UI doesn't break
        "critical_alerts": critical_alerts,
        "last_update_seconds": 0.4  # Or compute actual time elapsed since last transaction
    }
@app.get("/api/v1/dashboard/activity")
def get_recent_activity(db: Session = Depends(get_db)):
    # Join with Part and Area to print user-friendly logs
    rows = (
        db.query(models.Transaction, models.Part, models.Area)
        .join(models.Part, models.Part.id == models.Transaction.part_id)
        .join(models.Area, models.Area.id == models.Transaction.bin_id)
        .order_by(models.Transaction.tx_timestamp.desc())
        .limit(5)
        .all()
    )
    
    activities = []
    for tx, part, area in rows:
        activities.append({
            "icon": "add" if tx.tx_type == "IN" else "remove",
            "title": f"{tx.quantity} units {'added' if tx.tx_type == 'IN' else 'removed'}",
            "sub": f"{part.name} • Area {area.bin_label} • UID {tx.scanned_rfid_uid}",
            "time": tx.tx_timestamp.isoformat()
        })
    return {"activities": activities}

@app.get("/api/v1/audit/movements", response_model=schemas.MovementsResponse)
def get_movements(page: int = 1, limit: int = 25, db: Session = Depends(get_db)):
    query = (
        db.query(models.Transaction, models.Part, models.Area)
        .join(models.Part, models.Part.id == models.Transaction.part_id)
        .join(models.Area, models.Area.id == models.Transaction.bin_id)
        .order_by(models.Transaction.tx_timestamp.desc())
    )

    total = query.count()
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "items": [
            {
                "timestamp": tx.tx_timestamp.isoformat(),
                "name": part.name,
                "area": area.bin_label,
                "action": tx.tx_type,
                "uid": tx.scanned_rfid_uid,
                "quantity": tx.quantity,
            }
            for tx, part, area in items
        ],
    }


@app.get("/api/v1/audit/summary", response_model=schemas.AuditSummaryResponse)
def get_audit_summary(db: Session = Depends(get_db)):
    today = datetime.now(timezone.utc).date()

    todays_throughput = (
        db.query(func.coalesce(func.sum(models.Transaction.quantity), 0))
        .filter(func.date(models.Transaction.tx_timestamp) == today)
        .scalar()
    )

    active_tag_uids = db.query(models.RFIDTag).count()

    # Calculate inbound rate (percentage of today's IN transactions)
    todays_total_tx = (
        db.query(func.count(models.Transaction.id))
        .filter(func.date(models.Transaction.tx_timestamp) == today)
        .scalar()
    )
    todays_in_tx = (
        db.query(func.count(models.Transaction.id))
        .filter(
            func.date(models.Transaction.tx_timestamp) == today,
            models.Transaction.tx_type == "IN",
        )
        .scalar()
    )
    inbound_rate = round((todays_in_tx / todays_total_tx * 100), 1) if todays_total_tx > 0 else 0.0

    return {
        "todays_throughput": int(todays_throughput),
        "active_tag_uids": active_tag_uids,
        "inbound_rate": inbound_rate,
    }


@app.get("/api/v1/inventory/paginated", response_model=schemas.PaginatedInventoryResponse)
def get_paginated_inventory(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    status: str = "",
    db: Session = Depends(get_db),
):
    """
    Paginated inventory with optional search (by part name or SKU)
    and status filtering (Critical, Low Stock, Optimal).
    """
    from sqlalchemy import or_

    query = (
        db.query(models.Inventory, models.Part, models.Area)
        .join(models.Part, models.Part.id == models.Inventory.part_id)
        .join(models.Area, models.Area.id == models.Inventory.bin_id)
    )

    # Search filter: match part name or SKU (case-insensitive)
    if search:
        query = query.filter(
            or_(
                models.Part.name.ilike(f"%{search}%"),
                models.Part.sku.ilike(f"%{search}%"),
            )
        )

    # Fetch all matching rows (we need to compute status before filtering by it)
    all_rows = query.all()

    # Compute status for each row
    def compute_status(qty: int) -> str:
        if qty < 5:
            return "Critical"
        elif qty < 25:
            return "Low Stock"
        return "Optimal"

    results = [
        {
            "name": part.name,
            "sku": part.sku,
            "area": area.bin_label,
            "qty": inv.quantity,
            "status": compute_status(inv.quantity),
        }
        for inv, part, area in all_rows
    ]

    # Status filter (applied after computation)
    if status and status.lower() != "all":
        results = [r for r in results if r["status"].lower() == status.lower()]

    total = len(results)
    offset = (page - 1) * limit
    paginated = results[offset : offset + limit]

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "items": paginated,
    }


# ── Batch Enrollment Endpoints ────────────────────────
# ? Added 4 new endpoints for the batch enrollment workflow

@app.post("/api/v1/enrollment/start", response_model=schemas.EnrollmentStartResponse)
async def start_enrollment(request: Request):
    service = request.app.state.enrollment_service
    await service.start()
    return {"status": "started"}

@app.post("/api/v1/enrollment/confirm", response_model=schemas.EnrollmentConfirmResponse)
async def confirm_enrollment(body: schemas.EnrollmentConfirm, request: Request, db: Session = Depends(get_db)):
    service = request.app.state.enrollment_service
    result = await service.confirm(part_id=body.part_id, db=db)
    return result

@app.post("/api/v1/enrollment/cancel", response_model=schemas.EnrollmentCancelResponse)
async def cancel_enrollment(request: Request):
    service = request.app.state.enrollment_service
    await service.cancel()
    return {"status": "cancelled"}

@app.get("/api/v1/enrollment/pending")
async def get_pending_tags(request: Request):
    service = request.app.state.enrollment_service
    uids = service.get_pending_uids()
    return {"uids": uids, "count": len(uids), "is_active": service.is_active}
