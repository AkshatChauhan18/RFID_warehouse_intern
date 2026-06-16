from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas


app = FastAPI(title="Warehouse Inventory API")

# 1. CORS Configuration (Allows React to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your React app's URL
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

@app.post(("/api/v1/add_part"))