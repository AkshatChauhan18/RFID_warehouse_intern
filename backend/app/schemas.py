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

class EnrollmentData(BaseModel):
    rfid_uid: str = Field(..., description="UID of RFID tag to enroll")
    part_id: int = Field(..., description="ID of part to associate with RFID tag")
    
class InventoryResponse(BaseModel):
    name: str = Field(..., description="Name of the catalog part")
    sku: str = Field(..., description="SKU of the catalog part")
    bin: str = Field(..., description="Label of the physical warehouse bin")
    qty: int = Field(..., description="Current quantity of this part in the bin")
    status: str = Field(..., description="Calculated status pill text (e.g., Optimal, Low Stock, Critical)")

class PaginatedInventoryResponse(BaseModel):
    page: int
    limit: int
    total: int
    items: list[InventoryResponse]

class MovementItem(BaseModel):
    timestamp: str = Field(..., description="ISO format timestamp of the transaction")
    name: str = Field(..., description="Human-readable part name")
    bin: str = Field(..., description="Bin label where movement occurred")
    action: str = Field(..., description="IN or OUT")
    uid: str = Field(..., description="Scanned RFID tag UID")
    quantity: int = Field(..., description="Number of units moved")

class MovementsResponse(BaseModel):
    page: int
    limit: int
    total: int
    items: list[MovementItem]

class AuditSummaryResponse(BaseModel):
    todays_throughput: int = Field(..., description="Total units moved today")
    active_tag_uids: int = Field(..., description="Number of enrolled RFID tags")
    inbound_rate: float = Field(..., description="Percentage of today's movements that were IN")

# ? Added models for the batch enrollment workflow

class EnrollmentConfirm(BaseModel):
    part_id: int = Field(..., description="Part ID to link all scanned tags to")

class EnrollmentStartResponse(BaseModel):
    status: str

class EnrollmentConfirmResponse(BaseModel):
    status: str
    count: int
    message: str = ""
    duplicates: list[str] = []

class EnrollmentCancelResponse(BaseModel):
    status: str