"""
AUTUS Audit API
AUDIT 조회 전용 — 수정/삭제 불가
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import sqlite3
import json
import os

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])

DB_PATH = os.getenv("DB_PATH", "/tmp/autus.db")


def get_db():
    """SQLite 연결"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT 조회 API — 읽기 전용
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/latest")
async def get_latest_audit():
    """
    최신 AUDIT 1건 조회
    
    - 읽기 전용
    - 수정 UI ❌
    - 추가 행동 ❌
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT audit_id, entity_type, entity_id, snapshot, created_at, immutable
        FROM audit
        ORDER BY created_at DESC
        LIMIT 1
    """)
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {
            "audit_id": None,
            "message": "NO_AUDIT_FOUND"
        }
    
    return {
        "audit_id": row["audit_id"],
        "entity_type": row["entity_type"],
        "entity_id": row["entity_id"],
        "snapshot": json.loads(row["snapshot"]),
        "created_at": row["created_at"],
        "immutable": bool(row["immutable"])
    }


@router.get("/{audit_id}")
async def get_audit_by_id(audit_id: str):
    """특정 AUDIT 조회"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT audit_id, entity_type, entity_id, snapshot, created_at, immutable
        FROM audit
        WHERE audit_id = ?
    """, (audit_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="AUDIT_NOT_FOUND")
    
    return {
        "audit_id": row["audit_id"],
        "entity_type": row["entity_type"],
        "entity_id": row["entity_id"],
        "snapshot": json.loads(row["snapshot"]),
        "created_at": row["created_at"],
        "immutable": bool(row["immutable"])
    }


@router.get("/list/all")
async def list_all_audits(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    entity_type: Optional[str] = None
):
    """
    전체 AUDIT 목록
    
    - 페이지네이션 지원
    - 타입 필터링 가능
    """
    conn = get_db()
    cursor = conn.cursor()
    
    if entity_type:
        cursor.execute("""
            SELECT audit_id, entity_type, entity_id, snapshot, created_at, immutable
            FROM audit
            WHERE entity_type = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (entity_type, limit, offset))
    else:
        cursor.execute("""
            SELECT audit_id, entity_type, entity_id, snapshot, created_at, immutable
            FROM audit
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
    
    rows = cursor.fetchall()
    
    # 전체 개수
    if entity_type:
        cursor.execute("SELECT COUNT(*) as total FROM audit WHERE entity_type = ?", (entity_type,))
    else:
        cursor.execute("SELECT COUNT(*) as total FROM audit")
    
    total = cursor.fetchone()["total"]
    conn.close()
    
    return {
        "audits": [
            {
                "audit_id": row["audit_id"],
                "entity_type": row["entity_type"],
                "entity_id": row["entity_id"],
                "snapshot": json.loads(row["snapshot"]),
                "created_at": row["created_at"],
                "immutable": bool(row["immutable"])
            }
            for row in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/stats/summary")
async def get_audit_stats():
    """AUDIT 통계 요약"""
    conn = get_db()
    cursor = conn.cursor()
    
    # 타입별 개수
    cursor.execute("""
        SELECT entity_type, COUNT(*) as count
        FROM audit
        GROUP BY entity_type
    """)
    by_type = {row["entity_type"]: row["count"] for row in cursor.fetchall()}
    
    # 전체 개수
    cursor.execute("SELECT COUNT(*) as total FROM audit")
    total = cursor.fetchone()["total"]
    
    # 최근 24시간
    cursor.execute("""
        SELECT COUNT(*) as recent
        FROM audit
        WHERE created_at >= datetime('now', '-24 hours')
    """)
    recent_24h = cursor.fetchone()["recent"]
    
    # 최근 AUDIT
    cursor.execute("""
        SELECT audit_id, created_at
        FROM audit
        ORDER BY created_at DESC
        LIMIT 1
    """)
    latest = cursor.fetchone()
    
    conn.close()
    
    return {
        "total": total,
        "recent_24h": recent_24h,
        "by_type": by_type,
        "latest": {
            "audit_id": latest["audit_id"] if latest else None,
            "created_at": latest["created_at"] if latest else None
        }
    }


@router.get("/verify/{audit_id}")
async def verify_audit(audit_id: str):
    """
    AUDIT 무결성 검증
    
    - immutable = True 확인
    - 존재 여부 확인
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT audit_id, immutable, created_at
        FROM audit
        WHERE audit_id = ?
    """, (audit_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {
            "audit_id": audit_id,
            "exists": False,
            "verified": False,
            "reason": "AUDIT_NOT_FOUND"
        }
    
    return {
        "audit_id": audit_id,
        "exists": True,
        "verified": bool(row["immutable"]),
        "created_at": row["created_at"],
        "reason": "IMMUTABLE" if row["immutable"] else "MUTABLE_WARNING"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 시스템 AUDIT 생성 (내부용)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/system")
async def create_system_audit(payload: dict):
    """
    시스템 이벤트 AUDIT 생성
    
    - 자동 생성되는 시스템 기록
    - entity_type = 'system'
    """
    import uuid
    from datetime import datetime, timezone
    
    event_type = payload.get("event_type", "UNKNOWN")
    
    audit_id = f"SYS-{uuid.uuid4().hex[:12].upper()}"
    
    snapshot = {
        "event_type": event_type,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "details": payload.get("details", {}),
        "source": "SYSTEM",
        "immutable": True
    }
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO audit (audit_id, entity_type, entity_id, snapshot, immutable)
        VALUES (?, 'system', ?, ?, 1)
    """, (audit_id, event_type, json.dumps(snapshot)))
    
    conn.commit()
    conn.close()
    
    return {
        "audit_id": audit_id,
        "locked": True
    }
