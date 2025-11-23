"""
Data Collector - 사용자 행동 데이터 수집
"""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

from .base import (
    DataPoint,
    DataSession,
    EventType,
    DataSource,
    UsagePattern
)

class DataCollector:
    """
    사용자 행동 데이터 수집 (100% 로컬)
    """
    
    def __init__(self):
        self.current_session: Optional[DataSession] = None
        self.sessions: List[DataSession] = []
        self.patterns: Dict[str, UsagePattern] = {}
    
    def start_session(self) -> str:
        """새 세션 시작"""
        session_id = str(uuid.uuid4())
        
        self.current_session = DataSession(
            session_id=session_id,
            started_at=datetime.now(),
            ended_at=None
        )
        
        return session_id
    
    def end_session(self):
        """현재 세션 종료"""
        if self.current_session:
            self.current_session.ended_at = datetime.now()
            self.sessions.append(self.current_session)
            self.current_session = None
    
    def collect_event(
        self,
        event_type: EventType,
        data: Dict[str, Any],
        source: DataSource,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """이벤트 수집"""
        
        event_id = str(uuid.uuid4())
        
        event = DataPoint(
            event_id=event_id,
            event_type=event_type,
            timestamp=datetime.now(),
            data=data,
            source=source,
            metadata=metadata or {}
        )
        
        if self.current_session:
            self.current_session.add_event(event)
        
        return event_id
    
    def collect_code_generation(
        self,
        prompt: str,
        response: str,
        ai_provider: str,
        time_seconds: float,
        success: bool
    ):
        """코드 생성 이벤트 수집"""
        
        self.collect_event(
            event_type=EventType.CODE_GENERATED,
            data={
                'prompt': prompt,
                'response': response,
                'ai_provider': ai_provider,
                'time_seconds': time_seconds,
                'success': success,
                'response_length': len(response)
            },
            source=DataSource.AI_RESPONSE,
            metadata={
                'prompt_length': len(prompt),
                'provider': ai_provider
            }
        )
    
    def collect_pattern_learned(
        self,
        pattern_type: str,
        pattern_data: Dict[str, Any],
        confidence: float
    ):
        """패턴 학습 이벤트 수집"""
        
        self.collect_event(
            event_type=EventType.PATTERN_LEARNED,
            data={
                'pattern_type': pattern_type,
                'pattern_data': pattern_data,
                'confidence': confidence
            },
            source=DataSource.LEARNING_EVENT
        )
        
        # UsagePattern 업데이트
        pattern_id = f"{pattern_type}"
        
        if pattern_id not in self.patterns:
            self.patterns[pattern_id] = UsagePattern(
                pattern_id=pattern_id,
                pattern_type=pattern_type,
                frequency=1,
                last_seen=datetime.now(),
                first_seen=datetime.now(),
                effectiveness=confidence
            )
        else:
            self.patterns[pattern_id].update({
                'pattern_data': pattern_data,
                'confidence': confidence
            })
    
    def collect_error(
        self,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None
    ):
        """에러 이벤트 수집"""
        
        self.collect_event(
            event_type=EventType.ERROR_OCCURRED,
            data={
                'error_type': error_type,
                'error_message': error_message,
                'context': context or {}
            },
            source=DataSource.SYSTEM_EVENT
        )
    
    def get_session_summary(self) -> Dict[str, Any]:
        """현재 세션 요약"""
        if not self.current_session:
            return {'error': 'No active session'}
        
        return {
            'session_id': self.current_session.session_id,
            'started_at': self.current_session.started_at.isoformat(),
            'events_count': len(self.current_session.events),
            'summary': self.current_session.summary
        }
    
    def get_patterns_summary(self) -> Dict[str, Any]:
        """패턴 요약"""
        return {
            'total_patterns': len(self.patterns),
            'patterns': [
                {
                    'pattern_id': p.pattern_id,
                    'type': p.pattern_type,
                    'frequency': p.frequency,
                    'effectiveness': p.effectiveness,
                    'last_seen': p.last_seen.isoformat()
                }
                for p in self.patterns.values()
            ]
        }
