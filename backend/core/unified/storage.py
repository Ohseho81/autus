"""
═══════════════════════════════════════════════════════════════════════════════
💾 AUTUS v3.0 - Storage Layer (저장소 계층)
═══════════════════════════════════════════════════════════════════════════════

백엔드 데이터 구조:

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Local Storage Architecture                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ~/.autus/                                                                 │
│   ├── config.json           # 사용자 설정                                   │
│   ├── state/                                                                │
│   │   ├── current.json      # 현재 상태 (36노드)                           │
│   │   └── snapshots/        # 스냅샷 히스토리                              │
│   ├── variables/                                                            │
│   │   ├── user/             # 사용자 변수 (시계열)                         │
│   │   └── interaction/      # 상호작용 변수 (시계열)                       │
│   └── cache/                # 캐시                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
"""

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import json
import os


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 사용자 변수 저장 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UserVariableRecord:
    """
    사용자 변수 레코드
    
    저장되는 것:
    - 36개 노드의 압력값 (0~1)
    - 업무의 P, M, ε, W 변수
    - 타임스탬프
    
    저장되지 않는 것:
    - 이름, 이메일 등 PII
    - 구체적인 금액
    - 구체적인 내용
    """
    timestamp: str                           # ISO format
    node_pressures: Dict[str, float]         # {"n01": 0.8, "n15": 0.5, ...}
    work_variables: Dict[str, Dict[str, float]]  # {"w1": {"P": 0.3, "M": 1.0, ...}}
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'UserVariableRecord':
        return cls(**data)


@dataclass
class InteractionVariableRecord:
    """
    상호작용 변수 레코드
    
    저장되는 것:
    - 엣지 가중치 (연결 강도)
    - 전파 델타 (변화량)
    - 엣지 활성화 횟수
    
    저장되지 않는 것:
    - 누구와 상호작용했는지
    - 거래 내용
    """
    timestamp: str
    edge_weights: Dict[str, float]           # {"n01→n03": 0.9, ...}
    propagation_deltas: Dict[str, float]     # {"n01": -0.05, "n15": 0.12, ...}
    edge_activations: Dict[str, int]         # 엣지별 활성화 횟수
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'InteractionVariableRecord':
        return cls(**data)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 시계열 저장소
# ═══════════════════════════════════════════════════════════════════════════════

class TimeSeriesStore:
    """
    시계열 데이터 저장소
    
    구조:
    - 일별 파일로 분할 (YYYY-MM-DD.json)
    - 메모리 캐시 + 디스크 영속화
    - 자동 정리 (retention 기반)
    """
    
    def __init__(self, base_path: str, retention_days: int = 90):
        self.base_path = Path(base_path)
        self.retention_days = retention_days
        self.cache: Dict[str, List[Dict]] = {}
        
        # 디렉토리 생성
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def append(self, record: Dict) -> None:
        """레코드 추가"""
        date_key = datetime.now().strftime('%Y-%m-%d')
        
        if date_key not in self.cache:
            self.cache[date_key] = self._load_day(date_key)
        
        self.cache[date_key].append(record)
        self._save_day(date_key)
    
    def query(
        self, 
        start: datetime, 
        end: datetime
    ) -> List[Dict]:
        """기간 조회"""
        results = []
        current = start
        
        while current <= end:
            date_key = current.strftime('%Y-%m-%d')
            day_data = self._load_day(date_key)
            
            for record in day_data:
                ts = datetime.fromisoformat(record['timestamp'])
                if start <= ts <= end:
                    results.append(record)
            
            current += timedelta(days=1)
        
        return results
    
    def get_latest(self, n: int = 1) -> List[Dict]:
        """최근 N개 조회"""
        today = datetime.now()
        results = []
        
        for i in range(30):  # 최대 30일 전까지 탐색
            date_key = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            day_data = self._load_day(date_key)
            results = day_data + results
            
            if len(results) >= n:
                break
        
        return results[-n:]
    
    def cleanup_old(self) -> int:
        """오래된 데이터 정리"""
        cutoff = datetime.now() - timedelta(days=self.retention_days)
        removed = 0
        
        for file in self.base_path.glob('*.json'):
            try:
                date_str = file.stem
                file_date = datetime.strptime(date_str, '%Y-%m-%d')
                
                if file_date < cutoff:
                    file.unlink()
                    removed += 1
            except:
                pass
        
        return removed
    
    def _load_day(self, date_key: str) -> List[Dict]:
        """일별 파일 로드"""
        file_path = self.base_path / f'{date_key}.json'
        
        if file_path.exists():
            with open(file_path, 'r') as f:
                return json.load(f)
        
        return []
    
    def _save_day(self, date_key: str) -> None:
        """일별 파일 저장"""
        file_path = self.base_path / f'{date_key}.json'
        
        with open(file_path, 'w') as f:
            json.dump(self.cache.get(date_key, []), f, indent=2)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통합 저장소
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class CurrentState:
    """현재 상태"""
    node_pressures: Dict[str, float]
    node_states: Dict[str, str]
    pending_works: List[Dict]
    stats: Dict[str, Any]
    last_update: str
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'CurrentState':
        return cls(**data)


class UnifiedStorage:
    """
    통합 저장소
    
    구조:
    ├── config.json           # 설정
    ├── state/
    │   └── current.json      # 현재 상태
    ├── variables/
    │   ├── user/             # 사용자 변수 시계열
    │   └── interaction/      # 상호작용 변수 시계열
    └── aggregates/
        ├── hourly/           # 시간별 집계
        ├── daily/            # 일별 집계
        └── weekly/           # 주별 집계
    """
    
    def __init__(self, base_path: str = '~/.autus'):
        self.base_path = Path(base_path).expanduser()
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # 서브 저장소
        self.user_vars = TimeSeriesStore(
            str(self.base_path / 'variables' / 'user')
        )
        self.interaction_vars = TimeSeriesStore(
            str(self.base_path / 'variables' / 'interaction')
        )
        
        # 현재 상태
        self._current_state: Optional[CurrentState] = None
    
    # ─────────────────────────────────────────────────────────────────────────
    # 현재 상태
    # ─────────────────────────────────────────────────────────────────────────
    
    def save_current_state(self, state: CurrentState) -> None:
        """현재 상태 저장"""
        state_dir = self.base_path / 'state'
        state_dir.mkdir(parents=True, exist_ok=True)
        
        with open(state_dir / 'current.json', 'w') as f:
            json.dump(state.to_dict(), f, indent=2)
        
        self._current_state = state
    
    def load_current_state(self) -> Optional[CurrentState]:
        """현재 상태 로드"""
        state_file = self.base_path / 'state' / 'current.json'
        
        if state_file.exists():
            with open(state_file, 'r') as f:
                data = json.load(f)
                self._current_state = CurrentState.from_dict(data)
                return self._current_state
        
        return None
    
    # ─────────────────────────────────────────────────────────────────────────
    # 사용자 변수
    # ─────────────────────────────────────────────────────────────────────────
    
    def record_user_variable(
        self,
        node_pressures: Dict[str, float],
        work_variables: Optional[Dict[str, Dict[str, float]]] = None
    ) -> UserVariableRecord:
        """사용자 변수 기록"""
        record = UserVariableRecord(
            timestamp=datetime.now().isoformat(),
            node_pressures=node_pressures,
            work_variables=work_variables or {},
        )
        
        self.user_vars.append(record.to_dict())
        return record
    
    def get_user_variable_history(
        self,
        start: datetime,
        end: datetime
    ) -> List[UserVariableRecord]:
        """사용자 변수 히스토리 조회"""
        records = self.user_vars.query(start, end)
        return [UserVariableRecord.from_dict(r) for r in records]
    
    # ─────────────────────────────────────────────────────────────────────────
    # 상호작용 변수
    # ─────────────────────────────────────────────────────────────────────────
    
    def record_interaction_variable(
        self,
        edge_weights: Dict[str, float],
        propagation_deltas: Dict[str, float],
        edge_activations: Optional[Dict[str, int]] = None
    ) -> InteractionVariableRecord:
        """상호작용 변수 기록"""
        record = InteractionVariableRecord(
            timestamp=datetime.now().isoformat(),
            edge_weights=edge_weights,
            propagation_deltas=propagation_deltas,
            edge_activations=edge_activations or {},
        )
        
        self.interaction_vars.append(record.to_dict())
        return record
    
    def get_interaction_history(
        self,
        start: datetime,
        end: datetime
    ) -> List[InteractionVariableRecord]:
        """상호작용 변수 히스토리 조회"""
        records = self.interaction_vars.query(start, end)
        return [InteractionVariableRecord.from_dict(r) for r in records]
    
    # ─────────────────────────────────────────────────────────────────────────
    # 집계
    # ─────────────────────────────────────────────────────────────────────────
    
    def aggregate_node_trend(
        self, 
        node_id: str, 
        days: int = 7
    ) -> List[Tuple[str, float]]:
        """노드 압력 추세"""
        end = datetime.now()
        start = end - timedelta(days=days)
        
        records = self.get_user_variable_history(start, end)
        
        trend = []
        for r in records:
            if node_id in r.node_pressures:
                trend.append((r.timestamp, r.node_pressures[node_id]))
        
        return trend
    
    def get_statistics(self) -> Dict[str, Any]:
        """저장소 통계"""
        user_recent = self.user_vars.get_latest(1)
        inter_recent = self.interaction_vars.get_latest(1)
        
        return {
            'base_path': str(self.base_path),
            'has_current_state': self._current_state is not None,
            'last_user_var': user_recent[0]['timestamp'] if user_recent else None,
            'last_interaction_var': inter_recent[0]['timestamp'] if inter_recent else None,
        }
