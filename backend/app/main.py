from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas

app = FastAPI(title="Warehouse Inventory API")

# 1. CORS Configuration (Allows React to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your React app's URL
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


@app.post("/api/v1/enrollrfid",status_code=status.HTTP_201_CREATED)
def enroll_rfid(payload: schemas.EnrollmentData, db: Session = Depends(get_db)):
    # Implementation for enrolling RFID tag
    existing_tag = db.query(models.RFIDTag).filter(models.RFIDTag.rfid_uid == payload.rfid_uid).first()
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
        "message": f"Sticker {payload.rfid_uid} successfully mapped to '{part.name}'."
    }

@app.post(("/api/v1/scan"), status_code=status.HTTP_201_CREATED)
def process_hardware_scan(payload: schemas.HardwareScan, db: Session = Depends(get_db)):
    bin_record = (
        db.query(models.Bin).filter(models.Bin.bin_label == payload.bin_label).first()
    )
    if not bin_record:
        raise HTTPException(
            status_code=404, detail=f"Bin {payload.bin_label} not found"
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
        raw_time:datetime= last_transaction.tx_timestamp #type:ignore
        tx_time = raw_time.replace(tzinfo=timezone.utc) if raw_time.tzinfo is None else raw_time
        if (now_utc - tx_time) < timedelta(seconds=3): 
            return {"status": "ignored", "reason": "cooldown_active", "message": "Tag bouncing prevented."}
        inferred_action = "OUT" if last_transaction.tx_type == "IN" else "IN"
    try:
        inventory_record = db.query(models.Inventory).filter(
            models.Inventory.part_id == part_id,
            models.Inventory.bin_id == bin_record.id
        ).first()
        
        if inventory_record is None:
            if inferred_action == "OUT":
                raise ValueError("Cannot remove an item that is not in this bin.")
            inventory_record = models.Inventory(part_id=part_id, bin_id=bin_record.id, quantity=0)
            db.add(inventory_record)

        if inferred_action == "IN":
            inventory_record.quantity += payload.quantity
        elif inferred_action == "OUT":
            if inventory_record.quantity < payload.quantity:
                raise ValueError("Insufficient stock to remove.")
            inventory_record.quantity -= payload.quantity
        new_tx = models.Transaction(
            part_id=part_id,
            bin_id=bin_record.id,
            tx_type=inferred_action,
            quantity=payload.quantity,
            scanned_rfid_uid=payload.rfid_uid
        )
        db.add(new_tx)

        # C. Commit everything simultaneously
        db.commit()

        return {
            "status": "success", 
            "action": inferred_action, 
            "new_quantity": inventory_record.quantity,
            "part_id": part_id
        }

    except ValueError as ve:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database transaction failed.") 
