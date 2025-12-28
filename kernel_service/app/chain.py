"""
AUTUS Chain - Immutable Log Chain
=================================

해시 체인 로그:
- append-only
- 불변성 보장
- 리플레이 지원

Version: 1.0.0
"""

import hashlib
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from datetime import datetime


@dataclass
class LogEntry:
    """Single log entry."""
    index: int
    timestamp_iso: str
    motion_id: str
    prev_hash: str
    state_snapshot: Dict
    hash: str = ""
    
    def compute_hash(self) -> str:
        """Compute SHA-256 hash of entry."""
        data = {
            "index": self.index,
            "timestamp_iso": self.timestamp_iso,
            "motion_id": self.motion_id,
            "prev_hash": self.prev_hash,
            "state_snapshot": self.state_snapshot
        }
        content = json.dumps(data, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()


class Chain:
    """
    Immutable Log Chain
    
    Rules:
    - Append-only
    - Each entry contains hash of previous
    - Tampering detectable via hash verification
    """
    
    GENESIS_HASH = "0" * 64
    
    def __init__(self):
        self.entries: List[LogEntry] = []
    
    def append(self, motion_id: str, state_snapshot: Dict, 
               timestamp_iso: Optional[str] = None) -> LogEntry:
        """
        Append new entry to chain.
        
        Note: timestamp is for logging only, not used in computation.
        """
        if timestamp_iso is None:
            timestamp_iso = datetime.utcnow().isoformat() + "Z"
        
        index = len(self.entries)
        prev_hash = self.entries[-1].hash if self.entries else self.GENESIS_HASH
        
        entry = LogEntry(
            index=index,
            timestamp_iso=timestamp_iso,
            motion_id=motion_id,
            prev_hash=prev_hash,
            state_snapshot=state_snapshot
        )
        entry.hash = entry.compute_hash()
        
        self.entries.append(entry)
        return entry
    
    def verify(self) -> Dict:
        """
        Verify chain integrity.
        
        Returns:
            {
                "valid": bool,
                "length": int,
                "errors": list
            }
        """
        errors = []
        
        for i, entry in enumerate(self.entries):
            # Verify hash
            computed = entry.compute_hash()
            if computed != entry.hash:
                errors.append(f"Entry {i}: hash mismatch")
            
            # Verify prev_hash link
            if i == 0:
                if entry.prev_hash != self.GENESIS_HASH:
                    errors.append(f"Entry 0: invalid genesis link")
            else:
                if entry.prev_hash != self.entries[i-1].hash:
                    errors.append(f"Entry {i}: prev_hash mismatch")
        
        return {
            "valid": len(errors) == 0,
            "length": len(self.entries),
            "errors": errors
        }
    
    def get_entries(self, start: int = 0, end: Optional[int] = None) -> List[Dict]:
        """Get entries as list of dicts."""
        end = end or len(self.entries)
        return [asdict(e) for e in self.entries[start:end]]
    
    def get_motion_sequence(self) -> List[str]:
        """Extract motion sequence from chain."""
        return [e.motion_id for e in self.entries]
    
    def export(self) -> Dict:
        """Export entire chain."""
        return {
            "version": "1.0.0",
            "length": len(self.entries),
            "entries": self.get_entries(),
            "integrity": self.verify()
        }
    
    def clear(self) -> None:
        """Clear chain (for testing only)."""
        self.entries = []


# Singleton
_chain_instance: Optional[Chain] = None

def get_chain() -> Chain:
    global _chain_instance
    if _chain_instance is None:
        _chain_instance = Chain()
    return _chain_instance







