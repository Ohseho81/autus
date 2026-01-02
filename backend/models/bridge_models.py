#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Bridge Database Models
OCR 수집 데이터 영구 저장을 위한 데이터베이스 모델

Tables:
- bridge_events: OCR 이벤트 로그
- bridge_customers: 수집된 고객 정보
- bridge_stations: 스테이션(매장) 정보
- bridge_alerts: 알림 기록
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, JSON,
    ForeignKey, Index, UniqueConstraint, create_engine
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType(str, Enum):
    ACADEMY = "ACADEMY"
    RESTAURANT = "RESTAURANT"
    SPORTS = "SPORTS"
    CAFE = "CAFE"
    OTHER = "OTHER"


class AlertLevel(str, Enum):
    NORMAL = "normal"
    URGENT = "urgent"  # VIP
    CAUTION = "caution"  # 주의


class EventType(str, Enum):
    LOOKUP = "lookup"
    VIP_ALERT = "vip_alert"
    CAUTION_ALERT = "caution_alert"
    DATA_UPDATE = "data_update"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 스테이션 (매장 PC)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BridgeStation(Base):
    """Bridge 스테이션 (매장 PC) 정보"""
    
    __tablename__ = "bridge_stations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # 매장 정보
    biz_type = Column(String(50), nullable=False)
    biz_name = Column(String(200))
    location = Column(String(500))
    
    # 상태
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime)
    
    # 통계
    total_events = Column(Integer, default=0)
    vip_count = Column(Integer, default=0)
    caution_count = Column(Integer, default=0)
    
    # 설정 (JSON)
    config = Column(JSON, default=dict)
    
    # 타임스탬프
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # 관계
    events = relationship("BridgeEvent", back_populates="station")
    
    def __repr__(self):
        return f"<BridgeStation {self.station_id} ({self.biz_type})>"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 수집된 고객 정보
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BridgeCustomer(Base):
    """Bridge로 수집된 고객 정보"""
    
    __tablename__ = "bridge_customers"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    
    # 기본 정보
    name = Column(String(100))
    
    # 수집된 추가 정보 (업장별로 다름)
    # - 학원: school, grade, consult_keywords
    # - 식당: total_spent, menu_preferences
    # - 스포츠: locker, trainer, injuries
    extracted_data = Column(JSON, default=dict)
    
    # 통합 분류
    archetype = Column(String(50))  # PATRON, TYCOON, FAN, VAMPIRE, COMMON
    
    # 가치 점수
    score_m = Column(Float, default=0)  # Money
    score_t = Column(Float, default=0)  # Trouble (Entropy)
    score_s = Column(Float, default=0)  # Synergy
    
    # 조회 통계
    lookup_count = Column(Integer, default=0)
    last_lookup = Column(DateTime)
    first_seen = Column(DateTime, server_default=func.now())
    
    # 출처 (어느 매장에서 처음 수집됐는지)
    source_biz_type = Column(String(50))
    source_station_id = Column(String(100))
    
    # 타임스탬프
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # 관계
    events = relationship("BridgeEvent", back_populates="customer")
    alerts = relationship("BridgeAlert", back_populates="customer")
    
    # 인덱스
    __table_args__ = (
        Index('idx_customer_archetype', 'archetype'),
        Index('idx_customer_lookup', 'lookup_count'),
    )
    
    def __repr__(self):
        return f"<BridgeCustomer {self.name} ({self.phone[-4:]})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'phone': self.phone,
            'name': self.name,
            'archetype': self.archetype,
            'scores': {
                'm': self.score_m,
                't': self.score_t,
                's': self.score_s,
            },
            'lookup_count': self.lookup_count,
            'last_lookup': self.last_lookup.isoformat() if self.last_lookup else None,
            'extracted_data': self.extracted_data,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# OCR 이벤트 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BridgeEvent(Base):
    """Bridge OCR 이벤트 로그"""
    
    __tablename__ = "bridge_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 이벤트 유형
    event_type = Column(String(50), nullable=False)
    
    # 스테이션
    station_id = Column(String(100), ForeignKey("bridge_stations.station_id"))
    biz_type = Column(String(50))
    
    # 고객
    customer_phone = Column(String(20), ForeignKey("bridge_customers.phone"))
    customer_name = Column(String(100))
    
    # OCR 원본 (디버깅용, 선택적 저장)
    raw_text_hash = Column(String(64))  # SHA256 해시로 중복 방지
    
    # 파싱된 데이터
    extracted_data = Column(JSON, default=dict)
    
    # 결과
    alert_level = Column(String(20))
    guide_message = Column(Text)
    guide_data = Column(JSON)
    
    # 타임스탬프
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    # 관계
    station = relationship("BridgeStation", back_populates="events")
    customer = relationship("BridgeCustomer", back_populates="events")
    
    # 인덱스
    __table_args__ = (
        Index('idx_event_created', 'created_at'),
        Index('idx_event_station', 'station_id', 'created_at'),
        Index('idx_event_customer', 'customer_phone', 'created_at'),
    )
    
    def __repr__(self):
        return f"<BridgeEvent {self.event_type} @ {self.station_id}>"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 알림 기록
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BridgeAlert(Base):
    """VIP/주의 알림 기록"""
    
    __tablename__ = "bridge_alerts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 알림 유형
    alert_level = Column(String(20), nullable=False)  # urgent, caution
    
    # 대상
    customer_phone = Column(String(20), ForeignKey("bridge_customers.phone"))
    customer_name = Column(String(100))
    
    # 발생 위치
    station_id = Column(String(100))
    biz_type = Column(String(50))
    
    # 내용
    message = Column(Text)
    
    # 처리 상태
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(100))
    acknowledged_at = Column(DateTime)
    
    # 타임스탬프
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    # 관계
    customer = relationship("BridgeCustomer", back_populates="alerts")
    
    def __repr__(self):
        return f"<BridgeAlert {self.alert_level} for {self.customer_name}>"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터베이스 서비스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BridgeDBService:
    """Bridge 데이터베이스 서비스"""
    
    def __init__(self, session_factory):
        self.session_factory = session_factory
    
    # ─── Station 관리 ───
    
    def get_or_create_station(self, station_id: str, biz_type: str) -> BridgeStation:
        """스테이션 조회 또는 생성"""
        with self.session_factory() as session:
            station = session.query(BridgeStation).filter_by(station_id=station_id).first()
            
            if not station:
                station = BridgeStation(
                    station_id=station_id,
                    biz_type=biz_type,
                )
                session.add(station)
                session.commit()
                session.refresh(station)
            else:
                # 마지막 활동 시간 업데이트
                station.last_seen = datetime.utcnow()
                session.commit()
            
            return station
    
    def update_station_stats(self, station_id: str, alert_level: str = None):
        """스테이션 통계 업데이트"""
        with self.session_factory() as session:
            station = session.query(BridgeStation).filter_by(station_id=station_id).first()
            if station:
                station.total_events += 1
                if alert_level == 'urgent':
                    station.vip_count += 1
                elif alert_level == 'caution':
                    station.caution_count += 1
                session.commit()
    
    # ─── Customer 관리 ───
    
    def upsert_customer(self, phone: str, name: str = None, biz_type: str = None,
                       station_id: str = None, extracted_data: dict = None) -> BridgeCustomer:
        """고객 정보 생성 또는 업데이트"""
        with self.session_factory() as session:
            customer = session.query(BridgeCustomer).filter_by(phone=phone).first()
            
            if not customer:
                customer = BridgeCustomer(
                    phone=phone,
                    name=name,
                    source_biz_type=biz_type,
                    source_station_id=station_id,
                    extracted_data=extracted_data or {},
                )
                session.add(customer)
            else:
                # 기존 정보 업데이트
                if name and not customer.name:
                    customer.name = name
                
                # 추출 데이터 병합
                if extracted_data:
                    existing = customer.extracted_data or {}
                    existing.update(extracted_data)
                    customer.extracted_data = existing
            
            # 조회 통계 업데이트
            customer.lookup_count += 1
            customer.last_lookup = datetime.utcnow()
            
            session.commit()
            session.refresh(customer)
            
            return customer
    
    def get_customer(self, phone: str) -> Optional[BridgeCustomer]:
        """전화번호로 고객 조회"""
        with self.session_factory() as session:
            return session.query(BridgeCustomer).filter_by(phone=phone).first()
    
    def search_customers(self, name: str = None, archetype: str = None,
                        limit: int = 50) -> List[BridgeCustomer]:
        """고객 검색"""
        with self.session_factory() as session:
            query = session.query(BridgeCustomer)
            
            if name:
                query = query.filter(BridgeCustomer.name.contains(name))
            if archetype:
                query = query.filter_by(archetype=archetype)
            
            return query.order_by(BridgeCustomer.lookup_count.desc()).limit(limit).all()
    
    # ─── Event 로깅 ───
    
    def log_event(self, event_type: str, station_id: str, biz_type: str,
                 phone: str = None, name: str = None, extracted_data: dict = None,
                 alert_level: str = None, guide_message: str = None,
                 guide_data: dict = None) -> BridgeEvent:
        """이벤트 로그 저장"""
        with self.session_factory() as session:
            event = BridgeEvent(
                event_type=event_type,
                station_id=station_id,
                biz_type=biz_type,
                customer_phone=phone,
                customer_name=name,
                extracted_data=extracted_data or {},
                alert_level=alert_level,
                guide_message=guide_message,
                guide_data=guide_data,
            )
            session.add(event)
            session.commit()
            session.refresh(event)
            
            # 스테이션 통계 업데이트
            self.update_station_stats(station_id, alert_level)
            
            return event
    
    def get_recent_events(self, station_id: str = None, limit: int = 50) -> List[BridgeEvent]:
        """최근 이벤트 조회"""
        with self.session_factory() as session:
            query = session.query(BridgeEvent)
            
            if station_id:
                query = query.filter_by(station_id=station_id)
            
            return query.order_by(BridgeEvent.created_at.desc()).limit(limit).all()
    
    # ─── Alert 관리 ───
    
    def create_alert(self, alert_level: str, phone: str, name: str,
                    station_id: str, biz_type: str, message: str) -> BridgeAlert:
        """알림 생성"""
        with self.session_factory() as session:
            alert = BridgeAlert(
                alert_level=alert_level,
                customer_phone=phone,
                customer_name=name,
                station_id=station_id,
                biz_type=biz_type,
                message=message,
            )
            session.add(alert)
            session.commit()
            session.refresh(alert)
            
            return alert
    
    def get_unacknowledged_alerts(self, limit: int = 50) -> List[BridgeAlert]:
        """미확인 알림 조회"""
        with self.session_factory() as session:
            return (
                session.query(BridgeAlert)
                .filter_by(is_acknowledged=False)
                .order_by(BridgeAlert.created_at.desc())
                .limit(limit)
                .all()
            )
    
    def acknowledge_alert(self, alert_id: int, acknowledged_by: str):
        """알림 확인 처리"""
        with self.session_factory() as session:
            alert = session.query(BridgeAlert).filter_by(id=alert_id).first()
            if alert:
                alert.is_acknowledged = True
                alert.acknowledged_by = acknowledged_by
                alert.acknowledged_at = datetime.utcnow()
                session.commit()
    
    # ─── 통계 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """전체 통계"""
        with self.session_factory() as session:
            total_customers = session.query(BridgeCustomer).count()
            total_events = session.query(BridgeEvent).count()
            total_alerts = session.query(BridgeAlert).count()
            unack_alerts = session.query(BridgeAlert).filter_by(is_acknowledged=False).count()
            
            # 아키타입 분포
            archetype_dist = {}
            for archetype in ['PATRON', 'TYCOON', 'FAN', 'VAMPIRE', 'COMMON']:
                count = session.query(BridgeCustomer).filter_by(archetype=archetype).count()
                archetype_dist[archetype] = count
            
            return {
                'total_customers': total_customers,
                'total_events': total_events,
                'total_alerts': total_alerts,
                'unacknowledged_alerts': unack_alerts,
                'archetype_distribution': archetype_dist,
            }
