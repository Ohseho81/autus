"""
Audit Ledger - Append-only, 원본 없음
"""
import hashlib
import json
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path

AUDIT_FILE = Path("data/audit_ledger.jsonl")

class AuditLedger:
    def __init__(self):
        AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
        self._last_hash = "GENESIS"
    
    def _compute_hash(self, entry: Dict) -> str:
        body = json.dumps(entry, sort_keys=True)
        return hashlib.sha256(f"{self._last_hash}{body}".encode()).hexdigest()[:16]
    
    def append(self, event_type: str, shadow_hash: str, metadata: Dict = None) -> Dict:
        """감사 로그 추가 (원본 없음)"""
        entry = {
            "ts": datetime.utcnow().isoformat(),
            "type": event_type,
            "shadow_hash": shadow_hash,
            "meta": metadata or {},
            "prev_hash": self._last_hash
        }
        entry["hash"] = self._compute_hash(entry)
        self._last_hash = entry["hash"]
        
        with AUDIT_FILE.open("a") as f:
            f.write(json.dumps(entry) + "\n")
        
        return entry
    
    def verify(self) -> Dict[str, Any]:
        """체인 무결성 검증"""
        if not AUDIT_FILE.exists():
            return {"valid": True, "count": 0}
        
        entries = []
        with AUDIT_FILE.open() as f:
            for line in f:
                entries.append(json.loads(line))
        
        prev = "GENESIS"
        for e in entries:
            if e["prev_hash"] != prev:
                return {"valid": False, "error": f"Chain broken at {e['ts']}"}
            prev = e["hash"]
        
        return {"valid": True, "count": len(entries)}

audit = AuditLedger()
