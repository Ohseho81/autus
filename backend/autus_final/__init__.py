"""
═══════════════════════════════════════════════════════════════════════════════
🎯 AUTUS Final v2.1
═══════════════════════════════════════════════════════════════════════════════

"무슨 존재가 될지는 당신이 정한다.
 그 존재를 유지하는 일은 우리가 한다."

AUTUS 최종 통합 시스템
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
import time


class SystemMode(Enum):
    """시스템 모드"""
    OBSERVER = "OBSERVER"       # 관찰 모드
    ASSISTANT = "ASSISTANT"     # 어시스턴트 모드
    AUTONOMOUS = "AUTONOMOUS"   # 자율 모드


@dataclass
class UserProfile:
    """사용자 프로필 (Zero Meaning 적용)"""
    user_id: str
    created_at: datetime = field(default_factory=datetime.now)
    mode: SystemMode = SystemMode.OBSERVER
    preferences: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SystemState:
    """시스템 상태"""
    active_users: int = 0
    total_events: int = 0
    uptime: float = 0.0
    last_sync: Optional[datetime] = None


@dataclass
class ActionProposal:
    """액션 제안"""
    id: str
    title: str
    description: str
    confidence: float
    impact: float
    category: str
    created_at: datetime = field(default_factory=datetime.now)
    accepted: Optional[bool] = None


class AutusFinal:
    """AUTUS Final 시스템"""
    
    VERSION = "2.1.0"
    
    def __init__(self):
        self._start_time = time.time()
        self._users: Dict[str, UserProfile] = {}
        self._proposals: List[ActionProposal] = []
        self._events: List[Dict] = []
        self._state = SystemState()
    
    @property
    def uptime(self) -> float:
        return time.time() - self._start_time
    
    # ─────────────────────────────────────────────────────────────
    # User Management
    # ─────────────────────────────────────────────────────────────
    
    def register_user(self, user_id: str, mode: SystemMode = SystemMode.OBSERVER) -> UserProfile:
        """사용자 등록"""
        profile = UserProfile(user_id=user_id, mode=mode)
        self._users[user_id] = profile
        self._state.active_users = len(self._users)
        return profile
    
    def get_user(self, user_id: str) -> Optional[UserProfile]:
        """사용자 조회"""
        return self._users.get(user_id)
    
    def set_mode(self, user_id: str, mode: SystemMode) -> bool:
        """모드 설정"""
        if user_id in self._users:
            self._users[user_id].mode = mode
            return True
        return False
    
    # ─────────────────────────────────────────────────────────────
    # Action Proposals
    # ─────────────────────────────────────────────────────────────
    
    def propose_action(
        self,
        title: str,
        description: str,
        confidence: float,
        impact: float,
        category: str = "general"
    ) -> ActionProposal:
        """액션 제안"""
        proposal = ActionProposal(
            id=f"p{len(self._proposals)}",
            title=title,
            description=description,
            confidence=min(1.0, max(0.0, confidence)),
            impact=min(1.0, max(0.0, impact)),
            category=category,
        )
        self._proposals.append(proposal)
        return proposal
    
    def accept_proposal(self, proposal_id: str) -> bool:
        """제안 수락"""
        for p in self._proposals:
            if p.id == proposal_id:
                p.accepted = True
                return True
        return False
    
    def reject_proposal(self, proposal_id: str) -> bool:
        """제안 거절"""
        for p in self._proposals:
            if p.id == proposal_id:
                p.accepted = False
                return True
        return False
    
    def get_pending_proposals(self) -> List[ActionProposal]:
        """대기 중인 제안"""
        return [p for p in self._proposals if p.accepted is None]
    
    # ─────────────────────────────────────────────────────────────
    # Events
    # ─────────────────────────────────────────────────────────────
    
    def log_event(self, event_type: str, data: Dict[str, Any]) -> Dict:
        """이벤트 로그"""
        event = {
            "id": f"e{len(self._events)}",
            "type": event_type,
            "data": data,
            "timestamp": int(time.time() * 1000),
        }
        self._events.append(event)
        self._state.total_events = len(self._events)
        return event
    
    def get_events(self, n: int = 10) -> List[Dict]:
        """이벤트 조회"""
        return self._events[-n:]
    
    # ─────────────────────────────────────────────────────────────
    # System
    # ─────────────────────────────────────────────────────────────
    
    def sync(self) -> Dict[str, Any]:
        """동기화"""
        self._state.last_sync = datetime.now()
        self._state.uptime = self.uptime
        
        return {
            "status": "synced",
            "timestamp": self._state.last_sync.isoformat(),
            "users": self._state.active_users,
            "events": self._state.total_events,
            "proposals": len(self._proposals),
        }
    
    def get_status(self) -> Dict[str, Any]:
        """상태 조회"""
        return {
            "version": self.VERSION,
            "uptime": round(self.uptime, 2),
            "active_users": self._state.active_users,
            "total_events": self._state.total_events,
            "pending_proposals": len(self.get_pending_proposals()),
            "last_sync": self._state.last_sync.isoformat() if self._state.last_sync else None,
        }
    
    def reset(self):
        """리셋"""
        self._users.clear()
        self._proposals.clear()
        self._events.clear()
        self._state = SystemState()
        self._start_time = time.time()


# ═══════════════════════════════════════════════════════════════════════════════
# Singleton & Exports
# ═══════════════════════════════════════════════════════════════════════════════

_system: Optional[AutusFinal] = None


def get_autus_final() -> AutusFinal:
    """시스템 싱글턴"""
    global _system
    if _system is None:
        _system = AutusFinal()
    return _system


# Convenience functions
def propose(title: str, description: str, confidence: float = 0.5, impact: float = 0.5) -> ActionProposal:
    return get_autus_final().propose_action(title, description, confidence, impact)


def sync() -> Dict[str, Any]:
    return get_autus_final().sync()


def status() -> Dict[str, Any]:
    return get_autus_final().get_status()


__all__ = [
    "SystemMode",
    "UserProfile",
    "SystemState",
    "ActionProposal",
    "AutusFinal",
    "get_autus_final",
    "propose",
    "sync",
    "status",
]
