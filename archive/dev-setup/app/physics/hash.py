# app/physics/hash.py
"""
AUTUS Hash Utilities

감사 체인 무결성을 위한 해시 함수
"""

import hashlib
import json
from typing import Any, List


def sha256_hex(obj: Any) -> str:
    """
    객체를 JSON 직렬화 후 SHA256 해시 반환
    
    Args:
        obj: 해시할 객체 (JSON 직렬화 가능)
        
    Returns:
        64자리 hex string
    """
    raw = json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        default=str,
    ).encode("utf-8")
    
    return hashlib.sha256(raw).hexdigest()


def verify_chain(events: List[dict]) -> bool:
    """
    이벤트 체인 무결성 검증
    
    Args:
        events: 시간순 정렬된 이벤트 리스트
        
    Returns:
        체인이 유효하면 True
    """
    if not events:
        return True
    
    prev_hash = None
    
    for event in events:
        # prev_hash 검증
        if event.get("prev_hash") != prev_hash:
            return False
        
        # audit_hash 재계산
        expected_hash = sha256_hex({
            "prev": prev_hash,
            "entity_id": event["entity_id"],
            "entity_type": event["entity_type"],
            "event_type": event["event_type"],
            "ts": event["ts"],
            "payload": event.get("payload", {}),
        })
        
        # audit_hash 검증
        if event.get("audit_hash") != expected_hash:
            return False
        
        prev_hash = event["audit_hash"]
    
    return True


def compute_event_hash(
    prev_hash: str | None,
    entity_id: str,
    entity_type: str,
    event_type: str,
    ts: int,
    payload: dict,
) -> str:
    """
    Event audit_hash 계산
    
    Args:
        prev_hash: 이전 이벤트 해시
        entity_id: Entity ID
        entity_type: Entity 타입
        event_type: Event 타입
        ts: 타임스탬프
        payload: 페이로드
        
    Returns:
        audit_hash
    """
    return sha256_hex({
        "prev": prev_hash,
        "entity_id": entity_id,
        "entity_type": entity_type,
        "event_type": event_type,
        "ts": ts,
        "payload": payload,
    })


def compute_snapshot_hash(
    entity_id: str,
    ts: int,
    shadow32f: list,
    planets9: dict,
) -> str:
    """
    Snapshot audit_hash 계산
    
    Args:
        entity_id: Entity ID
        ts: 타임스탬프
        shadow32f: Shadow 벡터
        planets9: 9행성 값
        
    Returns:
        snapshot_hash
    """
    return sha256_hex({
        "entity_id": entity_id,
        "ts": ts,
        "shadow32f": shadow32f,
        "planets9": planets9,
    })
