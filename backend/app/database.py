import os
from sqlalchemy.orm import sessionmaker,declarative_base
from sqlalchemy import create_engine

Base = declarative_base()
engine = create_engine(os.getenv("DATABASE_URL", "postgresql+psycopg://warehouse_manager:hello_world_123@localhost:5433/warehouse"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
