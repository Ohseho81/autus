"""
═══════════════════════════════════════════════════════════════════════════════
💾 AUTUS v2.1 - Lightweight Storage
═══════════════════════════════════════════════════════════════════════════════

핵심 원칙:
  • 사용자 변수: 36개 노드 값 (user-specific, ~500 bytes)
  • 연결고리 변수: 48개 링크 (shared constant, 코드에 내장)

이 설계로 1000만 사용자 = 5GB DB로 충분
"""

from typing import Dict, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
import json

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 사용자 변수 (User Variables)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UserState:
    """사용자별 저장 데이터 - 최소화"""
    user_id: str
    nodes: Dict[str, float]  # {node_id: value} - 36개
    updated_at: str = ""
    
    def __post_init__(self):
        if not self.updated_at:
            self.updated_at = datetime.now().isoformat()
    
    def to_json(self) -> str:
        return json.dumps(asdict(self), separators=(',', ':'))
    
    @classmethod
    def from_json(cls, data: str) -> 'UserState':
        return cls(**json.loads(data))
    
    @property
    def size_bytes(self) -> int:
        return len(self.to_json())


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Storage Interface
# ═══════════════════════════════════════════════════════════════════════════════

class UserStorage:
    """사용자 상태 저장소 - 추상화"""
    
    def save(self, state: UserState) -> bool:
        raise NotImplementedError
    
    def load(self, user_id: str) -> Optional[UserState]:
        raise NotImplementedError
    
    def delete(self, user_id: str) -> bool:
        raise NotImplementedError
    
    def count(self) -> int:
        raise NotImplementedError


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 In-Memory Storage (개발/테스트)
# ═══════════════════════════════════════════════════════════════════════════════

class MemoryUserStorage(UserStorage):
    """인메모리 저장소"""
    
    def __init__(self):
        self._store: Dict[str, str] = {}
    
    def save(self, state: UserState) -> bool:
        self._store[state.user_id] = state.to_json()
        return True
    
    def load(self, user_id: str) -> Optional[UserState]:
        data = self._store.get(user_id)
        return UserState.from_json(data) if data else None
    
    def delete(self, user_id: str) -> bool:
        if user_id in self._store:
            del self._store[user_id]
            return True
        return False
    
    def count(self) -> int:
        return len(self._store)
    
    @property
    def total_size_bytes(self) -> int:
        return sum(len(v) for v in self._store.values())


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SQLite Storage (로컬/소규모)
# ═══════════════════════════════════════════════════════════════════════════════

class SQLiteUserStorage(UserStorage):
    """SQLite 저장소 - 로컬 배포용"""
    
    def __init__(self, db_path: str = "autus_users.db"):
        import sqlite3
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init_table()
    
    def _init_table(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                nodes TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        self.conn.commit()
    
    def save(self, state: UserState) -> bool:
        self.conn.execute(
            "INSERT OR REPLACE INTO users (user_id, nodes, updated_at) VALUES (?, ?, ?)",
            (state.user_id, json.dumps(state.nodes), state.updated_at)
        )
        self.conn.commit()
        return True
    
    def load(self, user_id: str) -> Optional[UserState]:
        cur = self.conn.execute(
            "SELECT user_id, nodes, updated_at FROM users WHERE user_id = ?",
            (user_id,)
        )
        row = cur.fetchone()
        if row:
            return UserState(
                user_id=row[0],
                nodes=json.loads(row[1]),
                updated_at=row[2]
            )
        return None
    
    def delete(self, user_id: str) -> bool:
        self.conn.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
        self.conn.commit()
        return True
    
    def count(self) -> int:
        cur = self.conn.execute("SELECT COUNT(*) FROM users")
        return cur.fetchone()[0]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PostgreSQL Storage (프로덕션)
# ═══════════════════════════════════════════════════════════════════════════════

class PostgresUserStorage(UserStorage):
    """PostgreSQL 저장소 - 프로덕션용"""
    
    def __init__(self, connection_string: str):
        try:
            import psycopg2
            self.conn = psycopg2.connect(connection_string)
            self._init_table()
            self.available = True
        except ImportError:
            self.available = False
            print("⚠️ psycopg2 미설치")
    
    def _init_table(self):
        with self.conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    nodes JSONB NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                )
            """)
            # JSONB 인덱스 (특정 노드 조회 최적화)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_nodes 
                ON users USING GIN (nodes)
            """)
        self.conn.commit()
    
    def save(self, state: UserState) -> bool:
        if not self.available:
            return False
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (user_id, nodes, updated_at) 
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id) 
                DO UPDATE SET nodes = %s, updated_at = %s
            """, (
                state.user_id, 
                json.dumps(state.nodes),
                state.updated_at,
                json.dumps(state.nodes),
                state.updated_at
            ))
        self.conn.commit()
        return True
    
    def load(self, user_id: str) -> Optional[UserState]:
        if not self.available:
            return None
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT user_id, nodes, updated_at FROM users WHERE user_id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            if row:
                return UserState(
                    user_id=row[0],
                    nodes=row[1],
                    updated_at=str(row[2])
                )
        return None
    
    def delete(self, user_id: str) -> bool:
        if not self.available:
            return False
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        self.conn.commit()
        return True
    
    def count(self) -> int:
        if not self.available:
            return 0
        with self.conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users")
            return cur.fetchone()[0]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Factory
# ═══════════════════════════════════════════════════════════════════════════════

def create_storage(storage_type: str = "memory", **kwargs) -> UserStorage:
    """저장소 팩토리"""
    if storage_type == "memory":
        return MemoryUserStorage()
    elif storage_type == "sqlite":
        return SQLiteUserStorage(kwargs.get("db_path", "autus_users.db"))
    elif storage_type == "postgres":
        return PostgresUserStorage(kwargs["connection_string"])
    else:
        raise ValueError(f"Unknown storage type: {storage_type}")


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import time
    
    print("=" * 60)
    print("🧪 UserStorage 테스트")
    print("=" * 60)
    
    # 테스트 데이터
    nodes = {f"n{i:02d}": float(i * 1000) for i in range(1, 37)}
    
    # Memory Storage 테스트
    storage = MemoryUserStorage()
    
    # 10,000 사용자 생성
    start = time.time()
    for i in range(10000):
        state = UserState(user_id=f"user_{i}", nodes=nodes.copy())
        storage.save(state)
    elapsed = time.time() - start
    
    print(f"\n✓ 10,000명 저장: {elapsed:.2f}초")
    print(f"✓ 총 크기: {storage.total_size_bytes / 1024 / 1024:.1f} MB")
    print(f"✓ 사용자당: {storage.total_size_bytes / 10000:.0f} bytes")
    
    # 조회 테스트
    start = time.time()
    for i in range(10000):
        storage.load(f"user_{i}")
    elapsed = time.time() - start
    
    print(f"✓ 10,000명 조회: {elapsed:.2f}초")
    print(f"✓ QPS: {10000/elapsed:,.0f}")
    
    print("=" * 60)
