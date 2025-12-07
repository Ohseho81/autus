"""
AUTUS Succession - Guardian System
제12법칙: 영속 - Seho 없이도 AUTUS는 존속한다

승계자 관리 및 권한 이양
"""
import json
import hashlib
import secrets
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pathlib import Path


class Guardian:
    """
    수호자 시스템
    
    필연적 성공:
    - 승계자 지정 → 권한 분산
    - 트리거 발동 → 자동 이양
    - Seho 없음 → AUTUS 존속
    """
    
    SUCCESSION_FILE = "succession/guardians.json"
    
    def __init__(self):
        self.guardians: Dict[str, Dict] = {}
        self.succession_triggers = []
        self._load()
    
    def _load(self):
        """승계 정보 로드"""
        path = Path(self.SUCCESSION_FILE)
        if path.exists():
            with open(path) as f:
                data = json.load(f)
                self.guardians = data.get("guardians", {})
                self.succession_triggers = data.get("triggers", [])
    
    def _save(self):
        """승계 정보 저장"""
        path = Path(self.SUCCESSION_FILE)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump({
                "guardians": self.guardians,
                "triggers": self.succession_triggers,
                "updated_at": datetime.utcnow().isoformat()
            }, f, indent=2, ensure_ascii=False)
    
    def add_guardian(
        self,
        name: str,
        level: int,
        public_key: str = None,
        contact: str = None
    ) -> Dict[str, Any]:
        """수호자 추가"""
        guardian_id = hashlib.sha256(
            f"{name}{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:16]
        
        guardian = {
            "id": guardian_id,
            "name": name,
            "level": level,  # 1: Primary, 2: Secondary, 3: Community
            "public_key": public_key,
            "contact": contact,
            "added_at": datetime.utcnow().isoformat(),
            "status": "active",
            "permissions": self._get_permissions(level)
        }
        
        self.guardians[guardian_id] = guardian
        self._save()
        
        return guardian
    
    def remove_guardian(self, guardian_id: str) -> bool:
        """수호자 제거"""
        if guardian_id in self.guardians:
            del self.guardians[guardian_id]
            self._save()
            return True
        return False
    
    def get_guardians(self, level: int = None) -> List[Dict]:
        """수호자 목록"""
        guardians = list(self.guardians.values())
        if level is not None:
            guardians = [g for g in guardians if g.get("level") == level]
        return sorted(guardians, key=lambda x: x.get("level", 99))
    
    def add_trigger(
        self,
        trigger_type: str,
        condition: Dict[str, Any]
    ) -> Dict[str, Any]:
        """승계 트리거 추가"""
        trigger = {
            "id": secrets.token_hex(8),
            "type": trigger_type,
            "condition": condition,
            "created_at": datetime.utcnow().isoformat(),
            "status": "active"
        }
        
        self.succession_triggers.append(trigger)
        self._save()
        
        return trigger
    
    def check_triggers(self, context: Dict[str, Any] = None) -> List[Dict]:
        """트리거 확인"""
        triggered = []
        
        for trigger in self.succession_triggers:
            if trigger.get("status") != "active":
                continue
            
            trigger_type = trigger.get("type")
            condition = trigger.get("condition", {})
            
            if trigger_type == "inactivity":
                days = condition.get("days", 365)
                last_activity = context.get("last_activity") if context else None
                if last_activity:
                    last = datetime.fromisoformat(last_activity)
                    if datetime.utcnow() - last > timedelta(days=days):
                        triggered.append(trigger)
            
            elif trigger_type == "manual":
                if context and context.get("manual_trigger"):
                    triggered.append(trigger)
            
            elif trigger_type == "vote":
                votes = condition.get("required_votes", 2)
                current = context.get("votes", 0) if context else 0
                if current >= votes:
                    triggered.append(trigger)
        
        return triggered
    
    def get_succession_status(self) -> Dict[str, Any]:
        """승계 상태"""
        return {
            "total_guardians": len(self.guardians),
            "by_level": {
                "level_1": len([g for g in self.guardians.values() if g.get("level") == 1]),
                "level_2": len([g for g in self.guardians.values() if g.get("level") == 2]),
                "level_3": len([g for g in self.guardians.values() if g.get("level") == 3])
            },
            "triggers": len(self.succession_triggers),
            "active_triggers": len([t for t in self.succession_triggers if t.get("status") == "active"]),
            "status": "ready" if len(self.guardians) >= 2 else "needs_guardians"
        }
    
    def _get_permissions(self, level: int) -> List[str]:
        """레벨별 권한"""
        if level == 1:
            return ["all", "constitution", "code", "release", "guardian"]
        elif level == 2:
            return ["code", "release", "pack"]
        else:
            return ["pack", "feedback"]


# 싱글톤
_guardian = None

def get_guardian() -> Guardian:
    global _guardian
    if _guardian is None:
        _guardian = Guardian()
    return _guardian
