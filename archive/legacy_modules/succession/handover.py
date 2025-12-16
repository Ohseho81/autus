"""
AUTUS Succession - Handover System
제12법칙: 영속 - 권한 이양 및 커뮤니티 이관

Seho → Guardian → Community 이양 프로세스
"""
import json
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
from enum import Enum


class HandoverStage(Enum):
    """이양 단계"""
    FOUNDER = "founder"           # Seho 운영
    TRANSITION = "transition"     # 이양 중
    GUARDIAN = "guardian"         # Guardian 운영
    COMMUNITY = "community"       # 커뮤니티 운영
    DAO = "dao"                   # DAO 운영


class Handover:
    """
    권한 이양 시스템
    
    필연적 성공:
    - 이양 시작 → 검증 → 완료
    - 단계별 진행 → 안전한 전환
    - 실패 시 → 롤백 가능
    """
    
    HANDOVER_FILE = "succession/handover_log.json"
    
    def __init__(self):
        self.current_stage = HandoverStage.FOUNDER
        self.handover_log: List[Dict] = []
        self.pending_handovers: Dict[str, Dict] = {}
        self._load()
    
    def _load(self):
        """이양 기록 로드"""
        path = Path(self.HANDOVER_FILE)
        if path.exists():
            with open(path) as f:
                data = json.load(f)
                self.current_stage = HandoverStage(data.get("stage", "founder"))
                self.handover_log = data.get("log", [])
                self.pending_handovers = data.get("pending", {})
    
    def _save(self):
        """이양 기록 저장"""
        path = Path(self.HANDOVER_FILE)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump({
                "stage": self.current_stage.value,
                "log": self.handover_log,
                "pending": self.pending_handovers,
                "updated_at": datetime.utcnow().isoformat()
            }, f, indent=2, ensure_ascii=False)
    
    def initiate_handover(
        self,
        from_entity: str,
        to_entity: str,
        permissions: List[str],
        reason: str = ""
    ) -> Dict[str, Any]:
        """이양 시작"""
        handover_id = hashlib.sha256(
            f"{from_entity}{to_entity}{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:16]
        
        handover = {
            "id": handover_id,
            "from": from_entity,
            "to": to_entity,
            "permissions": permissions,
            "reason": reason,
            "initiated_at": datetime.utcnow().isoformat(),
            "status": "pending",
            "approvals": [],
            "required_approvals": 2 if "all" in permissions else 1
        }
        
        self.pending_handovers[handover_id] = handover
        self._save()
        
        return handover
    
    def approve_handover(
        self,
        handover_id: str,
        approver: str,
        signature: str = None
    ) -> Dict[str, Any]:
        """이양 승인"""
        if handover_id not in self.pending_handovers:
            return {"error": "Handover not found"}
        
        handover = self.pending_handovers[handover_id]
        
        if handover["status"] != "pending":
            return {"error": f"Handover is {handover['status']}"}
        
        # 승인 추가
        handover["approvals"].append({
            "approver": approver,
            "signature": signature,
            "approved_at": datetime.utcnow().isoformat()
        })
        
        # 필요 승인 수 충족 확인
        if len(handover["approvals"]) >= handover["required_approvals"]:
            return self.execute_handover(handover_id)
        
        self._save()
        return {
            "status": "approved",
            "handover": handover,
            "remaining_approvals": handover["required_approvals"] - len(handover["approvals"])
        }
    
    def execute_handover(self, handover_id: str) -> Dict[str, Any]:
        """이양 실행"""
        if handover_id not in self.pending_handovers:
            return {"error": "Handover not found"}
        
        handover = self.pending_handovers[handover_id]
        
        # 실행
        handover["status"] = "completed"
        handover["completed_at"] = datetime.utcnow().isoformat()
        
        # 로그 기록
        self.handover_log.append(handover)
        
        # 대기 목록에서 제거
        del self.pending_handovers[handover_id]
        
        # 단계 업데이트
        self._update_stage(handover)
        
        self._save()
        
        return {
            "status": "completed",
            "handover": handover,
            "new_stage": self.current_stage.value
        }
    
    def reject_handover(self, handover_id: str, reason: str = "") -> Dict[str, Any]:
        """이양 거부"""
        if handover_id not in self.pending_handovers:
            return {"error": "Handover not found"}
        
        handover = self.pending_handovers[handover_id]
        handover["status"] = "rejected"
        handover["rejected_at"] = datetime.utcnow().isoformat()
        handover["rejection_reason"] = reason
        
        # 로그 기록
        self.handover_log.append(handover)
        del self.pending_handovers[handover_id]
        
        self._save()
        
        return {"status": "rejected", "handover": handover}
    
    def get_status(self) -> Dict[str, Any]:
        """이양 상태"""
        return {
            "current_stage": self.current_stage.value,
            "stage_description": self._get_stage_description(),
            "pending_handovers": len(self.pending_handovers),
            "completed_handovers": len(self.handover_log),
            "succession_path": [
                {"stage": "founder", "status": "completed" if self.current_stage != HandoverStage.FOUNDER else "current"},
                {"stage": "transition", "status": self._get_path_status(HandoverStage.TRANSITION)},
                {"stage": "guardian", "status": self._get_path_status(HandoverStage.GUARDIAN)},
                {"stage": "community", "status": self._get_path_status(HandoverStage.COMMUNITY)},
                {"stage": "dao", "status": self._get_path_status(HandoverStage.DAO)}
            ]
        }
    
    def get_history(self) -> List[Dict]:
        """이양 기록"""
        return self.handover_log
    
    def _update_stage(self, handover: Dict):
        """단계 업데이트"""
        to_entity = handover.get("to", "").lower()
        permissions = handover.get("permissions", [])
        
        if "all" in permissions:
            if "guardian" in to_entity:
                self.current_stage = HandoverStage.GUARDIAN
            elif "community" in to_entity:
                self.current_stage = HandoverStage.COMMUNITY
            elif "dao" in to_entity:
                self.current_stage = HandoverStage.DAO
    
    def _get_stage_description(self) -> str:
        """단계 설명"""
        descriptions = {
            HandoverStage.FOUNDER: "Seho가 AUTUS를 운영 중",
            HandoverStage.TRANSITION: "권한 이양 진행 중",
            HandoverStage.GUARDIAN: "Guardian들이 AUTUS를 운영 중",
            HandoverStage.COMMUNITY: "커뮤니티가 AUTUS를 운영 중",
            HandoverStage.DAO: "DAO가 AUTUS를 운영 중"
        }
        return descriptions.get(self.current_stage, "Unknown")
    
    def _get_path_status(self, stage: HandoverStage) -> str:
        """경로 상태"""
        stages = list(HandoverStage)
        current_idx = stages.index(self.current_stage)
        target_idx = stages.index(stage)
        
        if target_idx < current_idx:
            return "completed"
        elif target_idx == current_idx:
            return "current"
        else:
            return "pending"


# 싱글톤
_handover = None

def get_handover() -> Handover:
    global _handover
    if _handover is None:
        _handover = Handover()
    return _handover
