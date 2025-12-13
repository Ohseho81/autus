import hashlib
import json
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Dict

DB_PATH = Path("data/atlas_ledger.db")

def _hash(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()[:16]

def _ensure_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ledger (
            id INTEGER PRIMARY KEY,
            gmu_id TEXT, idx INTEGER, hash TEXT, prev_hash TEXT,
            event_type TEXT, payload TEXT, created_at TEXT,
            UNIQUE(gmu_id, idx)
        )
    """)
    conn.commit()
    conn.close()

class LedgerWriter:
    def __init__(self):
        _ensure_db()
    
    def append(self, gmu_id: str, event_type: str, payload: Dict) -> dict:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.execute("SELECT hash, idx FROM ledger WHERE gmu_id=? ORDER BY idx DESC LIMIT 1", (gmu_id,))
        row = cur.fetchone()
        prev_hash, idx = (row[0], row[1]+1) if row else ("GENESIS", 0)
        
        body = json.dumps(payload, sort_keys=True)
        new_hash = _hash(prev_hash + body)
        now = datetime.utcnow().isoformat()
        
        conn.execute("INSERT INTO ledger VALUES (NULL,?,?,?,?,?,?,?)",
                     (gmu_id, idx, new_hash, prev_hash, event_type, body, now))
        conn.commit()
        conn.close()
        return {"gmu_id": gmu_id, "idx": idx, "hash": new_hash}

_writer = None
def get_writer():
    global _writer
    if _writer is None:
        _writer = LedgerWriter()
    return _writer
