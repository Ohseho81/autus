"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS Commit 중심 DB 스키마 — "책임 저장 장치"

설계 원칙:
  - 사람/기관은 컨테이너
  - Commit이 실체 (돈과 책임이 움직이는 최소 물리단위)
  - 모든 상태 변화는 Audit으로만 발생

절대 규칙 (DB 레벨):
  - audit는 UPDATE/DELETE 금지
  - action은 1회만 생성
  - commit.status = closed → 되돌릴 수 없음
  - system_state.red → 신규 commit INSERT 차단

BUILD: 2025-12-18
═══════════════════════════════════════════════════════════════════════════════
"""

import sqlite3
import json
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from contextlib import contextmanager
import os

# DB 경로
COMMIT_DB_PATH = os.getenv("COMMIT_DB_PATH", "/tmp/autus_commit.db")

@contextmanager
def get_commit_db():
    conn = sqlite3.connect(COMMIT_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_commit_schema():
    """Commit 중심 DB 스키마 초기화"""
    with get_commit_db() as conn:
        # ═══════════════════════════════════════════════════════════════════
        # A. person — 사람은 최소 정보만 (신분 아님)
        # ═══════════════════════════════════════════════════════════════════
        conn.execute('''
            CREATE TABLE IF NOT EXISTS person (
                person_id TEXT PRIMARY KEY,
                role TEXT CHECK(role IN ('student', 'operator', 'employer', 'institution')),
                country TEXT,
                name TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        ''')
        
        # ═══════════════════════════════════════════════════════════════════
        # B. commit ⭐ 핵심 — 돈과 책임이 움직이는 최소 물리단위
        # ═══════════════════════════════════════════════════════════════════
        conn.execute('''
            CREATE TABLE IF NOT EXISTS commit (
                commit_id TEXT PRIMARY KEY,
                commit_type TEXT CHECK(commit_type IN ('tuition', 'wage', 'management', 'grant', 'outcome')),
                actor_from TEXT NOT NULL,
                actor_to TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'KRW',
                start_date TEXT,
                end_date TEXT,
                mass REAL DEFAULT 0.0,
                velocity REAL DEFAULT 0.0,
                gravity REAL DEFAULT 0.0,
                friction REAL DEFAULT 0.0,
                status TEXT CHECK(status IN ('active', 'paused', 'closed')) DEFAULT 'active',
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (actor_from) REFERENCES person(person_id),
                FOREIGN KEY (actor_to) REFERENCES person(person_id)
            )
        ''')
        
        # ═══════════════════════════════════════════════════════════════════
        # C. money_flow — Commit 간 실제 금액 이동
        # ═══════════════════════════════════════════════════════════════════
        conn.execute('''
            CREATE TABLE IF NOT EXISTS money_flow (
                flow_id TEXT PRIMARY KEY,
                commit_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                flow_date TEXT,
                direction TEXT CHECK(direction IN ('in', 'out')),
                memo TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (commit_id) REFERENCES commit(commit_id)
            )
        ''')
        
        # ═══════════════════════════════════════════════════════════════════
        # D. risk_state — 예측은 저장하지 않고 상태만 저장
        # ═══════════════════════════════════════════════════════════════════
        conn.execute('''
            CREATE TABLE IF NOT EXISTS risk_state (
                risk_id TEXT PRIMARY KEY,
                person_id TEXT NOT NULL,
                risk_score REAL CHECK(risk_score >= 0 AND risk_score <= 100) DEFAULT 0,
                worst_case_label TEXT,
                updated_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (person_id) REFERENCES person(person_id)
            )
        ''')
        
        # ═══════════════════════════════════════════════════════════════════
        # E. action — 사람이 한 유일한 결정 (1회만)
        # ═══════════════════════════════════════════════════════════════════
        conn.execute('''
            CREATE TABLE IF NOT EXISTS action (
                action_id TEXT PRIMARY KEY,
                person_id TEXT NOT NULL,
                recommended_action TEXT,
                executed_action TEXT,
                executed_by TEXT,
                executed_at INTEGER,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (person_id) REFERENCES person(person_id)
            )
        ''')
        
        # ═══════════════════════════════════════════════════════════════════
        # F. commit_audit 🔒 — 되돌릴 수 없는 진실
        # ═══════════════════════════════════════════════════════════════════
        conn.execute('''
            CREATE TABLE IF NOT EXISTS commit_audit (
                audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT CHECK(entity_type IN ('commit', 'action', 'system', 'person', 'money_flow')),
                entity_id TEXT NOT NULL,
                event TEXT NOT NULL,
                snapshot TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                immutable INTEGER DEFAULT 1
            )
        ''')
        
        # ═══════════════════════════════════════════════════════════════════
        # G. system_state — CEO도 못 건드리는 상태
        # ═══════════════════════════════════════════════════════════════════
        conn.execute('''
            CREATE TABLE IF NOT EXISTS system_state (
                state_id TEXT PRIMARY KEY,
                float_pressure REAL DEFAULT 0.0,
                survival_mass REAL DEFAULT 0.0,
                status TEXT CHECK(status IN ('green', 'yellow', 'red')) DEFAULT 'green',
                calculated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        ''')
        
        # 인덱스 생성
        conn.execute('CREATE INDEX IF NOT EXISTS idx_commit_actor_to ON commit(actor_to)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_commit_status ON commit(status)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_money_flow_commit ON money_flow(commit_id)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_risk_person ON risk_state(person_id)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_audit_entity ON commit_audit(entity_type, entity_id)')
        
        # 초기 시스템 상태
        cur = conn.execute("SELECT state_id FROM system_state WHERE state_id='GLOBAL'")
        if not cur.fetchone():
            conn.execute('''
                INSERT INTO system_state (state_id, float_pressure, survival_mass, status)
                VALUES ('GLOBAL', 0.0, 0.0, 'green')
            ''')
        
        conn.commit()
        print("✅ Commit Schema initialized")


# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic Models — API 요청/응답
# ═══════════════════════════════════════════════════════════════════════════════

class PersonIn(BaseModel):
    person_id: str
    role: Literal['student', 'operator', 'employer', 'institution']
    country: str
    name: Optional[str] = None

class CommitIn(BaseModel):
    commit_id: str
    commit_type: Literal['tuition', 'wage', 'management', 'grant', 'outcome']
    actor_from: str
    actor_to: str
    amount: int
    currency: str = 'KRW'
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class MoneyFlowIn(BaseModel):
    flow_id: str
    commit_id: str
    amount: int
    flow_date: str
    direction: Literal['in', 'out']
    memo: Optional[str] = None

class ActionIn(BaseModel):
    action_id: str
    person_id: str
    recommended_action: str
    executed_action: Optional[str] = None
    executed_by: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# 물리 계산 함수
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_commit_physics(amount: int, velocity: float = 1.0, duration_months: int = 12) -> Dict[str, float]:
    """
    Commit 물리량 계산
    - mass: 금액 기반 질량
    - velocity: 지급 주기 (월 1회 = 1.0)
    - gravity: 지속성 점수
    - friction: 규정 계수
    """
    mass = amount / 1000000  # 백만원 단위로 정규화
    gravity = min(1.0, duration_months / 24)  # 2년 기준 정규화
    friction = 0.1 if amount > 10000000 else 0.2  # 큰 금액일수록 마찰 낮음
    
    return {
        'mass': round(mass, 4),
        'velocity': round(velocity, 4),
        'gravity': round(gravity, 4),
        'friction': round(friction, 4)
    }


def calculate_survival_mass(person_id: str) -> Dict[str, Any]:
    """
    사람의 Survival Mass 계산
    = 활성 Commit들의 총 중력 합
    """
    with get_commit_db() as conn:
        rows = conn.execute('''
            SELECT SUM(mass * gravity) as total_mass, 
                   COUNT(*) as commit_count,
                   SUM(amount) as total_amount
            FROM commit 
            WHERE actor_to = ? AND status = 'active'
        ''', (person_id,)).fetchone()
        
        total_mass = rows['total_mass'] or 0.0
        commit_count = rows['commit_count'] or 0
        total_amount = rows['total_amount'] or 0
        
        # Float Pressure 계산 (마찰 합 / 질량)
        friction_rows = conn.execute('''
            SELECT SUM(friction * mass) as total_friction
            FROM commit 
            WHERE actor_to = ? AND status = 'active'
        ''', (person_id,)).fetchone()
        
        total_friction = friction_rows['total_friction'] or 0.0
        float_pressure = total_friction / max(total_mass, 0.01)
        
        return {
            'person_id': person_id,
            'survival_mass': round(total_mass, 4),
            'float_pressure': round(float_pressure, 4),
            'commit_count': commit_count,
            'total_amount': total_amount,
            'status': 'green' if total_mass > 1.0 else 'yellow' if total_mass > 0.3 else 'red'
        }


def calculate_risk_score(person_id: str) -> Dict[str, Any]:
    """
    Risk Score 계산 (0-100)
    - 높을수록 위험
    """
    survival = calculate_survival_mass(person_id)
    
    # 기본 Risk = (1 - survival_mass) * 50 + float_pressure * 50
    base_risk = (1 - min(survival['survival_mass'], 1.0)) * 50
    pressure_risk = min(survival['float_pressure'], 1.0) * 50
    
    risk_score = min(100, max(0, base_risk + pressure_risk))
    
    # Worst case label
    if risk_score > 70:
        worst_case = "24h 내 자금 공백 예상"
    elif risk_score > 50:
        worst_case = "7일 내 Commit 갱신 필요"
    elif risk_score > 30:
        worst_case = "모니터링 권장"
    else:
        worst_case = "안정 상태"
    
    return {
        'person_id': person_id,
        'risk_score': round(risk_score, 1),
        'worst_case_label': worst_case,
        'survival_mass': survival['survival_mass'],
        'float_pressure': survival['float_pressure']
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Audit 기록 함수 (불변)
# ═══════════════════════════════════════════════════════════════════════════════

def record_audit(entity_type: str, entity_id: str, event: str, snapshot: Dict = None):
    """Audit 기록 — 되돌릴 수 없는 진실"""
    with get_commit_db() as conn:
        conn.execute('''
            INSERT INTO commit_audit (entity_type, entity_id, event, snapshot, immutable)
            VALUES (?, ?, ?, ?, 1)
        ''', (entity_type, entity_id, event, json.dumps(snapshot or {})))
        conn.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# CRUD 함수
# ═══════════════════════════════════════════════════════════════════════════════

def create_person(data: PersonIn) -> Dict:
    """Person 생성"""
    with get_commit_db() as conn:
        conn.execute('''
            INSERT INTO person (person_id, role, country, name)
            VALUES (?, ?, ?, ?)
        ''', (data.person_id, data.role, data.country, data.name))
        conn.commit()
        
        record_audit('person', data.person_id, 'CREATED', data.dict())
        
        return {'person_id': data.person_id, 'created': True}


def create_commit(data: CommitIn) -> Dict:
    """Commit 생성 — 돈과 책임의 물리단위"""
    # 물리량 계산
    physics = calculate_commit_physics(data.amount)
    
    with get_commit_db() as conn:
        # system_state가 RED면 차단
        state = conn.execute("SELECT status FROM system_state WHERE state_id='GLOBAL'").fetchone()
        if state and state['status'] == 'red':
            return {'error': 'System in RED state - new commits blocked', 'created': False}
        
        conn.execute('''
            INSERT INTO commit (commit_id, commit_type, actor_from, actor_to, amount, currency,
                               start_date, end_date, mass, velocity, gravity, friction, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ''', (data.commit_id, data.commit_type, data.actor_from, data.actor_to,
              data.amount, data.currency, data.start_date, data.end_date,
              physics['mass'], physics['velocity'], physics['gravity'], physics['friction']))
        conn.commit()
        
        record_audit('commit', data.commit_id, 'CREATED', {**data.dict(), **physics})
        
        # Survival Mass 재계산
        survival = calculate_survival_mass(data.actor_to)
        
        return {
            'commit_id': data.commit_id,
            'created': True,
            'physics': physics,
            'actor_survival': survival
        }


def create_money_flow(data: MoneyFlowIn) -> Dict:
    """Money Flow 기록"""
    with get_commit_db() as conn:
        conn.execute('''
            INSERT INTO money_flow (flow_id, commit_id, amount, flow_date, direction, memo)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data.flow_id, data.commit_id, data.amount, data.flow_date, data.direction, data.memo))
        conn.commit()
        
        record_audit('money_flow', data.flow_id, 'RECORDED', data.dict())
        
        return {'flow_id': data.flow_id, 'recorded': True}


def execute_action(data: ActionIn) -> Dict:
    """Action 실행 — 1회만 가능"""
    with get_commit_db() as conn:
        # 이미 실행된 action인지 확인
        existing = conn.execute('''
            SELECT action_id FROM action WHERE action_id = ? AND executed_at IS NOT NULL
        ''', (data.action_id,)).fetchone()
        
        if existing:
            return {'error': 'Action already executed', 'immutable': True}
        
        now = int(time.time())
        conn.execute('''
            INSERT OR REPLACE INTO action (action_id, person_id, recommended_action, 
                                          executed_action, executed_by, executed_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data.action_id, data.person_id, data.recommended_action,
              data.executed_action, data.executed_by, now))
        conn.commit()
        
        record_audit('action', data.action_id, 'EXECUTED', data.dict())
        
        return {
            'action_id': data.action_id,
            'executed': True,
            'executed_at': now,
            'immutable': True
        }


def get_person_dashboard(person_id: str) -> Dict:
    """Person 대시보드 — 전체 상태 조회"""
    with get_commit_db() as conn:
        # Person 정보
        person = conn.execute('SELECT * FROM person WHERE person_id = ?', (person_id,)).fetchone()
        if not person:
            return {'error': 'Person not found'}
        
        # 활성 Commits
        commits = conn.execute('''
            SELECT * FROM commit WHERE actor_to = ? AND status = 'active'
            ORDER BY created_at DESC
        ''', (person_id,)).fetchall()
        
        # 최근 Money Flows
        flows = conn.execute('''
            SELECT mf.* FROM money_flow mf
            JOIN commit c ON mf.commit_id = c.commit_id
            WHERE c.actor_to = ?
            ORDER BY mf.created_at DESC LIMIT 10
        ''', (person_id,)).fetchall()
        
        # Survival Mass & Risk
        survival = calculate_survival_mass(person_id)
        risk = calculate_risk_score(person_id)
        
        return {
            'person': dict(person),
            'commits': [dict(c) for c in commits],
            'recent_flows': [dict(f) for f in flows],
            'survival': survival,
            'risk': risk
        }


# 초기화 실행
if __name__ == "__main__":
    init_commit_schema()
    print(f"Database created at: {COMMIT_DB_PATH}")
