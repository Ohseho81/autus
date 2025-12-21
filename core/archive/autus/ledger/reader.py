import sqlite3
import json
from pathlib import Path
from typing import List, Dict

DB_PATH = Path("data/atlas_ledger.db")

class LedgerReader:
    def get_entries(self, gmu_id: str, limit: int = 100) -> List[Dict]:
        if not DB_PATH.exists():
            return []
        conn = sqlite3.connect(DB_PATH)
        cur = conn.execute(
            "SELECT idx, hash, event_type, payload, created_at FROM ledger WHERE gmu_id=? ORDER BY idx DESC LIMIT ?",
            (gmu_id, limit))
        rows = cur.fetchall()
        conn.close()
        return [{"idx": r[0], "hash": r[1], "event_type": r[2], "payload": json.loads(r[3]), "created_at": r[4]} for r in rows]

_reader = None
def get_reader():
    global _reader
    if _reader is None:
        _reader = LedgerReader()
    return _reader
