from sqlalchemy import Column, Integer, String,create_engine,DateTime,ForeignKey,CheckConstraint,Boolean
from sqlalchemy.orm import declarative_base,sessionmaker
from sqlalchemy.sql import func
Base = declarative_base()
engine = create_engine("postgresql+psycopg://warehouse_manager:hello_world_123@localhost:5432/warehouse")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Part(Base):
    __tablename__ = 'parts'
    id =  Column(Integer,primary_key=True,index=True)
    sku = Column(String(50),unique=True,nullable=False)
    name  = Column(String(100),nullable=False)
    description = Column(String())
    created_at = Column(DateTime(timezone=True),server_default=func.now())

class Bin(Base):
    __tablename__ = "bins"

    id = Column(Integer, primary_key=True, index=True)
    bin_label = Column(String(50), unique=True, nullable=False)
    rfid_tag_id = Column(String(100), unique=True)
    is_active = Column(Boolean, default=True)

class Inventory(Base):
    __tablename__ = "inventory"

    part_id = Column(Integer, ForeignKey("parts.id", ondelete="RESTRICT"), primary_key=True)
    bin_id = Column(Integer, ForeignKey("bins.id", ondelete="RESTRICT"), primary_key=True)
    quantity = Column(Integer, nullable=False, default=0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint('quantity >= 0', name='check_positive_quantity'),
    )

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(Integer, ForeignKey("parts.id"))
    bin_id = Column(Integer, ForeignKey("bins.id"))
    tx_type = Column(String(10), nullable=False)
    quantity = Column(Integer, nullable=False)
    scanned_rfid_uid = Column(String(100), nullable=False)
    tx_timestamp = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_valid_tx_quantity'),
        )
    