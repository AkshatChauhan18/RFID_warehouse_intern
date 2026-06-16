from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Shared properties for creating or reading a part
class PartBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None


# Properties required to create a new part via POST request
class PartCreate(PartBase):
    pass


# Properties returned to the React frontend via GET request
class PartResponse(PartBase):
    id: int
    created_at: datetime

    class Config:
        # This tells Pydantic to read the data directly from the SQLAlchemy object
        from_attributes = True


class HardwareScan(BaseModel):
    rfid_uid: str = Field(..., description="UID of scanned rfid tag")
    bin_label: str = Field(..., description="Label of bin")
    quantity: int = Field(
        default=1, description="Quantity of parts scanned, default is 1"
    )
