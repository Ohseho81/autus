# app/models.py
"""
AUTUS Models — SQLAlchemy ORM (LOCK)

Tables:
1. events — Immutable ledger (원장)
2. shadow_snapshots — Reconstructable cache (캐시)
3. trace_pairs — Audit trail (감사 추적)

Entity Types: human, company, city, nation, admin
"""

import uuid
from datetime import datetime
from sqlalchemy import String, BigInteger, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base"""
    pass


class Event(Base):
    """
    Immutable Event Ledger
    
    - 모든 상태 변화는 Event로 기록
    - INSERT only (UPDATE/DELETE 불가)
    - audit_hash + prev_hash로 체인 형성
    """
    __tablename__ = "events"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    
    # Entity identification
    entity_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    
    # Event data
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ts: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    # Audit chain
    audit_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    
    __table_args__ = (
        Index("ix_events_entity_ts", "entity_id", "ts"),
        Index("ix_events_entity_type_ts", "entity_type", "ts"),
    )


class ShadowSnapshot(Base):
    """
    Shadow State Snapshot
    
    - Entity당 1개만 존재 (UPSERT)
    - events로부터 언제든 재계산 가능
    - shadow32f: 32차원 벡터
    - planets9: 9행성 정규화 값
    """
    __tablename__ = "shadow_snapshots"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    
    # Entity (unique per entity)
    entity_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    
    # Timestamp
    ts: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    
    # Shadow state
    shadow32f: Mapped[list] = mapped_column(JSONB, nullable=False)
    planets9: Mapped[dict] = mapped_column(JSONB, nullable=False)
    
    # Audit
    audit_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    last_event_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="SET NULL"),
        nullable=True
    )


class TracePair(Base):
    """
    Event → Snapshot Trace
    
    - 어떤 Event가 어떤 Snapshot을 생성했는지 기록
    - 리플레이/검증에 사용
    """
    __tablename__ = "trace_pairs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    
    entity_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    source_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    derived_snapshot_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    ts: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
