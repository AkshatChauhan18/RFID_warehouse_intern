from sqlalchemy import Column, Integer, String,DateTime,ForeignKey,CheckConstraint,Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import mapped_column,Mapped
from app.database import Base, SessionLocal
class Part(Base):
    __tablename__ = 'parts'
    id:Mapped[int] =  mapped_column( primary_key=True,index=True)
    sku:Mapped[str] = mapped_column(String(50),unique=True,nullable=False)
    name:Mapped[str]  = mapped_column(String(100),nullable=False)
    description: Mapped[str] = mapped_column(String())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True),server_default=func.now())

class RFIDTag(Base):
    __tablename__ = "rfid_tags"

    rfid_uid: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False)
    enrolled_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
class Bin(Base):
    __tablename__ = "bins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bin_label: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    rfid_tag_id: Mapped[str] = mapped_column(String(100), unique=True)
    is_active: Mapped[Boolean] = mapped_column(Boolean, default=True)

class Inventory(Base):
    __tablename__ = "inventory"

    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("parts.id", ondelete="RESTRICT"), primary_key=True)
    bin_id: Mapped[int] = mapped_column(Integer, ForeignKey("bins.id", ondelete="RESTRICT"), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_updated: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint('quantity >= 0', name='check_positive_quantity'),
    )

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("parts.id"))
    bin_id: Mapped[int] = mapped_column(Integer, ForeignKey("bins.id"))
    tx_type: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    scanned_rfid_uid: Mapped[str] = mapped_column(String(100), nullable=False)
    tx_timestamp: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_valid_tx_quantity'),
        )
    