# app/models/calendar.py
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from app.database import Base

class CalendarConnection(Base):
    __tablename__ = "calendar_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    provider = Column(String)  # "google", "outlook", etc.
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    external_id = Column(String)
    title = Column(String)
    description = Column(Text)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    pressure_score = Column(Integer)  # 1-10 scale
    is_busy = Column(Boolean, default=True)
    created_at = Column(DateTime)