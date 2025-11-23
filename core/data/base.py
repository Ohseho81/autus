"""
Data Engine Base Classes
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum

class EventType(Enum):
    """이벤트 타입"""
    CODE_GENERATED = "code_generated"
    PROMPT_SUBMITTED = "prompt_submitted"
    PATTERN_LEARNED = "pattern_learned"
    STYLE_APPLIED = "style_applied"
    ERROR_OCCURRED = "error_occurred"
    SUCCESS = "success"

class DataSource(Enum):
    """데이터 소스"""
    USER_INPUT = "user_input"
    AI_RESPONSE = "ai_response"
    SYSTEM_EVENT = "system_event"
    LEARNING_EVENT = "learning_event"

@dataclass
class DataPoint:
    """단일 데이터 포인트"""
    event_id: str
    event_type: EventType
    timestamp: datetime
    data: Dict[str, Any]
    source: DataSource
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return {
            'event_id': self.event_id,
            'event_type': self.event_type.value,
            'timestamp': self.timestamp.isoformat(),
            'data': self.data,
            'source': self.source.value,
            'metadata': self.metadata
        }

@dataclass
class DataSession:
    """데이터 세션"""
    session_id: str
    started_at: datetime
    ended_at: Optional[datetime]
    events: List[DataPoint] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
    
    def add_event(self, event: DataPoint):
        """이벤트 추가"""
        self.events.append(event)
        self._update_summary()
    
    def _update_summary(self):
        """요약 업데이트"""
        self.summary['total_events'] = len(self.events)
        self.summary['event_types'] = {}
        
        for event in self.events:
            event_type = event.event_type.value
            self.summary['event_types'][event_type] = \
                self.summary['event_types'].get(event_type, 0) + 1

@dataclass
class UsagePattern:
    """사용 패턴"""
    pattern_id: str
    pattern_type: str
    frequency: int
    last_seen: datetime
    first_seen: datetime
    examples: List[Dict[str, Any]] = field(default_factory=list)
    effectiveness: float = 0.5  # 0-1
    
    def update(self, new_example: Dict[str, Any]):
        """패턴 업데이트"""
        self.frequency += 1
        self.last_seen = datetime.now()
        self.examples.append(new_example)
        
        # 최근 5개만 유지
        if len(self.examples) > 5:
            self.examples = self.examples[-5:]

@dataclass
class DataStats:
    """데이터 통계"""
    total_events: int = 0
    total_sessions: int = 0
    patterns_discovered: int = 0
    avg_session_length: float = 0.0
    most_common_event: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
