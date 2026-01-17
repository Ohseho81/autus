"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 업무 일체화 매니저
Task Unifier - 업무 통합/삭제/최적화
═══════════════════════════════════════════════════════════════════════════════

기능:
1. 중복 업무 탐지 및 통합
2. 비활성 업무 자동 삭제 (r < 임계값)
3. 솔루션 최적화 (30개 모듈 기반)
4. 사용자 타입별 맞춤화
"""

from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from collections import defaultdict
import logging

from .models import TaskDefinition, UserType, TaskStatus, TaskLayer
from .task_taxonomy import TaxonomyManager, get_taxonomy_manager

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# 통합/삭제 액션 타입
# ═══════════════════════════════════════════════════════════════════════════════

class UnifyAction(str, Enum):
    """통합 액션"""
    MERGE = "MERGE"           # 병합 (N → 1)
    DEPRECATE = "DEPRECATE"   # 폐기 예정
    ELIMINATE = "ELIMINATE"   # 즉시 삭제
    ARCHIVE = "ARCHIVE"       # 아카이브
    KEEP = "KEEP"             # 유지


class EliminationReason(str, Enum):
    """삭제 사유"""
    R_DECAY = "R_DECAY"                   # r 지수 임계값 미달
    NO_USAGE = "NO_USAGE"                 # 사용량 없음
    DUPLICATE = "DUPLICATE"               # 중복
    SUPERSEDED = "SUPERSEDED"             # 대체됨
    MANUAL_DECISION = "MANUAL_DECISION"   # 수동 결정


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 제안
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UnificationProposal:
    """업무 통합 제안"""
    proposal_id: str
    action: UnifyAction
    
    # 대상 업무
    source_task_ids: List[str]        # 병합될 업무들
    target_task_id: Optional[str]     # 병합 대상 (MERGE 시)
    
    # 사유
    reason: str
    elimination_reason: Optional[EliminationReason] = None
    
    # 예상 효과
    expected_k_change: float = 0.0
    expected_energy_saving: float = 0.0
    expected_complexity_reduction: int = 0
    
    # 위험도
    risk_level: int = 1  # 1-5
    requires_human_approval: bool = False
    
    # 상태
    status: str = "PROPOSED"  # PROPOSED, APPROVED, REJECTED, EXECUTED
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    executed_at: Optional[datetime] = None


@dataclass
class EliminationCandidate:
    """삭제 후보"""
    task_id: str
    task_name: str
    
    current_r: float
    usage_count_30d: int
    last_used: Optional[datetime]
    
    reason: EliminationReason
    confidence: float  # 0-1
    
    # 영향 분석
    dependent_tasks: List[str] = field(default_factory=list)
    affected_users: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# 업무 일체화 매니저
# ═══════════════════════════════════════════════════════════════════════════════

class TaskUnifier:
    """업무 일체화 매니저"""
    
    # 임계값
    R_DECAY_THRESHOLD = -0.05         # r 지수 삭제 임계값
    NO_USAGE_DAYS = 90                # 미사용 일수 임계값
    SIMILARITY_THRESHOLD = 0.8        # 유사도 임계값 (중복 탐지)
    
    def __init__(self):
        self._proposals: Dict[str, UnificationProposal] = {}
        self._elimination_candidates: Dict[str, EliminationCandidate] = {}
        self._unified_tasks: Dict[str, List[str]] = {}  # target_id -> source_ids
        self._taxonomy = get_taxonomy_manager()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 중복 탐지
    # ═══════════════════════════════════════════════════════════════════════════
    
    def detect_duplicates(
        self,
        tasks: List[TaskDefinition],
    ) -> List[Tuple[str, str, float]]:
        """
        중복 업무 탐지
        
        Returns:
            List of (task_id_1, task_id_2, similarity)
        """
        duplicates = []
        
        for i, task1 in enumerate(tasks):
            for task2 in tasks[i+1:]:
                similarity = self._calculate_similarity(task1, task2)
                
                if similarity >= self.SIMILARITY_THRESHOLD:
                    duplicates.append((task1.task_id, task2.task_id, similarity))
        
        return duplicates
    
    def _calculate_similarity(self, task1: TaskDefinition, task2: TaskDefinition) -> float:
        """업무 유사도 계산"""
        score = 0.0
        
        # 1. 카테고리 일치 (30%)
        if task1.category == task2.category:
            score += 0.3
            if task1.subcategory == task2.subcategory:
                score += 0.1
        
        # 2. 이름 유사도 (30%)
        name_sim = self._text_similarity(task1.name_en, task2.name_en)
        score += name_sim * 0.3
        
        # 3. K/I 값 유사 (20%)
        k_diff = abs(task1.base_k - task2.base_k)
        i_diff = abs(task1.base_i - task2.base_i)
        if k_diff < 0.2 and i_diff < 0.2:
            score += 0.2
        
        # 4. 외부 툴 일치 (10%)
        if task1.external_tool == task2.external_tool and task1.external_tool:
            score += 0.1
        
        # 5. 자동화 레벨 유사 (10%)
        auto_diff = abs(task1.automation_level - task2.automation_level)
        if auto_diff <= 10:
            score += 0.1
        
        return round(score, 2)
    
    def _text_similarity(self, text1: str, text2: str) -> float:
        """텍스트 유사도 (간단한 Jaccard)"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 삭제 후보 탐지
    # ═══════════════════════════════════════════════════════════════════════════
    
    def detect_elimination_candidates(
        self,
        tasks: List[TaskDefinition],
        task_stats: Dict[str, Dict],  # task_id -> {r: float, usage_count: int, last_used: datetime}
    ) -> List[EliminationCandidate]:
        """삭제 후보 탐지"""
        candidates = []
        
        for task in tasks:
            stats = task_stats.get(task.task_id, {})
            
            r_value = stats.get("r", 0.0)
            usage_count = stats.get("usage_count", 0)
            last_used = stats.get("last_used")
            
            candidate = None
            
            # 1. r 지수 임계값 미달
            if r_value < self.R_DECAY_THRESHOLD:
                candidate = EliminationCandidate(
                    task_id=task.task_id,
                    task_name=task.name_ko,
                    current_r=r_value,
                    usage_count_30d=usage_count,
                    last_used=last_used,
                    reason=EliminationReason.R_DECAY,
                    confidence=min(0.9, abs(r_value) / 0.1),
                )
            
            # 2. 미사용
            elif last_used:
                days_since_use = (datetime.now(timezone.utc) - last_used).days
                if days_since_use > self.NO_USAGE_DAYS:
                    candidate = EliminationCandidate(
                        task_id=task.task_id,
                        task_name=task.name_ko,
                        current_r=r_value,
                        usage_count_30d=usage_count,
                        last_used=last_used,
                        reason=EliminationReason.NO_USAGE,
                        confidence=min(0.9, days_since_use / 180),
                    )
            
            if candidate:
                candidates.append(candidate)
                self._elimination_candidates[task.task_id] = candidate
        
        return candidates
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 통합 제안 생성
    # ═══════════════════════════════════════════════════════════════════════════
    
    def propose_merge(
        self,
        source_task_ids: List[str],
        target_task_id: str,
        reason: str,
    ) -> UnificationProposal:
        """병합 제안 생성"""
        proposal = UnificationProposal(
            proposal_id=f"MERGE_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            action=UnifyAction.MERGE,
            source_task_ids=source_task_ids,
            target_task_id=target_task_id,
            reason=reason,
            expected_complexity_reduction=len(source_task_ids) - 1,
            risk_level=2 if len(source_task_ids) <= 3 else 3,
            requires_human_approval=len(source_task_ids) > 5,
        )
        
        self._proposals[proposal.proposal_id] = proposal
        return proposal
    
    def propose_elimination(
        self,
        task_id: str,
        reason: EliminationReason,
    ) -> UnificationProposal:
        """삭제 제안 생성"""
        proposal = UnificationProposal(
            proposal_id=f"ELIM_{task_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            action=UnifyAction.ELIMINATE,
            source_task_ids=[task_id],
            target_task_id=None,
            reason=f"Elimination due to {reason.value}",
            elimination_reason=reason,
            risk_level=1 if reason == EliminationReason.NO_USAGE else 2,
            requires_human_approval=reason == EliminationReason.MANUAL_DECISION,
        )
        
        self._proposals[proposal.proposal_id] = proposal
        return proposal
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 제안 실행
    # ═══════════════════════════════════════════════════════════════════════════
    
    def execute_proposal(self, proposal_id: str) -> Dict[str, Any]:
        """제안 실행"""
        proposal = self._proposals.get(proposal_id)
        
        if not proposal:
            return {"success": False, "error": "Proposal not found"}
        
        if proposal.status != "APPROVED":
            return {"success": False, "error": "Proposal not approved"}
        
        result = {"success": True, "action": proposal.action.value}
        
        if proposal.action == UnifyAction.MERGE:
            self._unified_tasks[proposal.target_task_id] = proposal.source_task_ids
            result["merged_tasks"] = len(proposal.source_task_ids)
            result["target_task"] = proposal.target_task_id
        
        elif proposal.action == UnifyAction.ELIMINATE:
            result["eliminated_tasks"] = proposal.source_task_ids
        
        proposal.status = "EXECUTED"
        proposal.executed_at = datetime.now(timezone.utc)
        
        logger.info(f"[TaskUnifier] Executed proposal: {proposal_id}")
        
        return result
    
    def approve_proposal(self, proposal_id: str, approver: str) -> bool:
        """제안 승인"""
        proposal = self._proposals.get(proposal_id)
        if proposal and proposal.status == "PROPOSED":
            proposal.status = "APPROVED"
            logger.info(f"[TaskUnifier] Proposal {proposal_id} approved by {approver}")
            return True
        return False
    
    def reject_proposal(self, proposal_id: str, reason: str) -> bool:
        """제안 거부"""
        proposal = self._proposals.get(proposal_id)
        if proposal and proposal.status == "PROPOSED":
            proposal.status = "REJECTED"
            proposal.reason += f" | Rejected: {reason}"
            return True
        return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 솔루션 최적화 (30개 모듈 기반)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def optimize_solution(
        self,
        task: TaskDefinition,
        user_type: UserType,
        current_k: float,
        current_i: float,
    ) -> Dict[str, Any]:
        """
        솔루션 최적화 (30개 원자 모듈 기반)
        
        Returns:
            최적화된 모듈 파이프라인 + 예상 K 변화
        """
        optimization = {
            "task_id": task.task_id,
            "user_type": user_type.value,
            "current_k": current_k,
            "current_i": current_i,
        }
        
        # 사용자 타입별 최적화 전략
        if user_type == UserType.INDIVIDUAL:
            # 개인: 단순화, 높은 자동화
            optimization["strategy"] = "SIMPLIFY"
            optimization["recommended_modules"] = ["IN_FORM", "PR_VALIDATE", "OUT_DATA"]
            optimization["target_automation"] = 90
        
        elif user_type == UserType.SMALL_TEAM:
            # 소규모 팀: 협업 강화
            optimization["strategy"] = "COLLABORATE"
            optimization["recommended_modules"] = ["IN_FORM", "PR_VALIDATE", "DE_APPROVE", "CM_NOTIFY"]
            optimization["target_automation"] = 75
        
        elif user_type == UserType.SMB:
            # 중소기업: 균형 잡힌 자동화
            optimization["strategy"] = "BALANCE"
            optimization["recommended_modules"] = ["IN_API", "PR_VALIDATE", "PR_CALCULATE", "DE_RULE", "OUT_REPORT"]
            optimization["target_automation"] = 70
        
        elif user_type == UserType.ENTERPRISE:
            # 대기업: 규정 준수 + 감사
            optimization["strategy"] = "COMPLIANCE"
            optimization["recommended_modules"] = ["IN_API", "PR_VALIDATE", "DE_RULE", "DE_APPROVE", "OUT_LOG", "CM_NOTIFY"]
            optimization["target_automation"] = 60
        
        else:
            # 국가/글로벌: 보수적
            optimization["strategy"] = "CONSERVATIVE"
            optimization["recommended_modules"] = ["IN_FORM", "PR_VALIDATE", "DE_APPROVE", "OUT_LOG"]
            optimization["target_automation"] = 50
        
        # 예상 K 변화 계산
        current_auto = task.automation_level
        target_auto = optimization["target_automation"]
        k_change = (target_auto - current_auto) * 0.002  # 자동화 1% → K 0.002 변화
        
        optimization["expected_k_change"] = round(k_change, 4)
        optimization["expected_new_k"] = round(current_k + k_change, 2)
        
        return optimization
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 통계
    # ═══════════════════════════════════════════════════════════════════════════
    
    def get_statistics(self) -> Dict[str, Any]:
        """통계"""
        return {
            "total_proposals": len(self._proposals),
            "proposals_by_status": self._count_by_status(),
            "proposals_by_action": self._count_by_action(),
            "elimination_candidates": len(self._elimination_candidates),
            "unified_tasks": sum(len(v) for v in self._unified_tasks.values()),
        }
    
    def _count_by_status(self) -> Dict[str, int]:
        counts = defaultdict(int)
        for p in self._proposals.values():
            counts[p.status] += 1
        return dict(counts)
    
    def _count_by_action(self) -> Dict[str, int]:
        counts = defaultdict(int)
        for p in self._proposals.values():
            counts[p.action.value] += 1
        return dict(counts)


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

_task_unifier: Optional[TaskUnifier] = None


def get_task_unifier() -> TaskUnifier:
    """업무 일체화 매니저 싱글톤"""
    global _task_unifier
    if _task_unifier is None:
        _task_unifier = TaskUnifier()
    return _task_unifier
