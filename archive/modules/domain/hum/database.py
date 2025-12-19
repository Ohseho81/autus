import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Float, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "")
Base = declarative_base()

class HumProfileDB(Base):
    __tablename__ = "hum_profiles"
    hum_id = Column(String, primary_key=True)
    name = Column(String)
    route_code = Column(String, default="PH-KR")
    phase = Column(String, default="LIME")
    stage = Column(String, default="init")
    vector = Column(JSON)
    risk = Column(Float, default=0.5)
    success = Column(Float, default=0.5)
    created_at = Column(DateTime, default=datetime.utcnow)

class HumEventDB(Base):
    __tablename__ = "hum_events"
    id = Column(String, primary_key=True)
    hum_id = Column(String, index=True)
    event_code = Column(String)
    vector_before = Column(JSON)
    vector_after = Column(JSON)
    risk = Column(Float)
    success = Column(Float)
    phase = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

engine = None
SessionLocal = None
_db_ready = False

def init_db():
    global engine, SessionLocal, _db_ready
    if not DATABASE_URL:
        print("⚠️ No DATABASE_URL")
        return False
    try:
        url = DATABASE_URL.replace("postgres://", "postgresql://", 1) if DATABASE_URL.startswith("postgres://") else DATABASE_URL
        engine = create_engine(url, pool_pre_ping=True)
        SessionLocal = sessionmaker(bind=engine)
        Base.metadata.create_all(bind=engine)
        _db_ready = True
        print("✅ Database connected!")
        return True
    except Exception as e:
        print(f"⚠️ DB Error: {e}")
        return False

def get_session():
    return SessionLocal() if SessionLocal else None

def is_db_ready():
    return _db_ready
