"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 업무 솔루션 매니저 (통합)
Task Solution Manager - 모든 업무 시스템 통합 관리
═══════════════════════════════════════════════════════════════════════════════

통합 구성요소:
1. 30개 원자 모듈 (modules_30.py)
2. 30개 솔루션 모듈 (solution_modules_30.py)
3. 570개 업무 정의 (task_definitions_570.py)
4. 5차 분류 체계 (task_taxonomy.py)
5. 사례 수집기 (case_collector.py)
6. 업무 일체화 (task_unifier.py)
7. 사용자 타입 시스템 (models.py)
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum

from .models import TaskDefinition, UserType, TaskLayer, UserTask, KIRSnapshot
from .task_taxonomy import TaxonomyManager, TaxonomyNode, get_taxonomy_manager
from .case_collector import CaseCollector, TaskCase, BestPractice, get_case_collector
from .task_unifier import TaskUnifier, UnificationProposal, get_task_unifier
from .modules_30 import ATOMIC_MODULES, ModulePipeline, create_custom_pipeline
from .solution_modules_30 import SOLUTION_MODULES, get_module as get_solution_module

# ═══════════════════════════════════════════════════════════════════════════════
# 사용자 상수 분류
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UserConstants:
    """사용자별 상수 프로필"""
    user_type: UserType
    
    # 기본 상수
    base_k: float = 1.0
    base_i: float = 0.0
    base_r: float = 0.0
    
    # 자동화 성향
    automation_preference: int = 50  # 0-100
    
    # 위험 허용도
    risk_tolerance: float = 0.5  # 0-1
    
    # 협업 지수
    collaboration_index: float = 0.5  # 0-1
    
    # 업무 복잡도 허용
    complexity_tolerance: int = 3  # 1-5


USER_TYPE_CONSTANTS: Dict[UserType, UserConstants] = {
    UserType.INDIVIDUAL: UserConstants(
        user_type=UserType.INDIVIDUAL,
        base_k=1.0, base_i=0.0, base_r=0.0,
        automation_preference=90,
        risk_tolerance=0.3,
        collaboration_index=0.1,
        complexity_tolerance=2,
    ),
    UserType.SMALL_TEAM: UserConstants(
        user_type=UserType.SMALL_TEAM,
        base_k=0.95, base_i=0.15, base_r=0.0,
        automation_preference=75,
        risk_tolerance=0.4,
        collaboration_index=0.5,
        complexity_tolerance=3,
    ),
    UserType.SMB: UserConstants(
        user_type=UserType.SMB,
        base_k=0.9, base_i=0.2, base_r=0.0,
        automation_preference=70,
        risk_tolerance=0.5,
        collaboration_index=0.6,
        complexity_tolerance=4,
    ),
    UserType.ENTERPRISE: UserConstants(
        user_type=UserType.ENTERPRISE,
        base_k=0.85, base_i=0.25, base_r=0.0,
        automation_preference=60,
        risk_tolerance=0.3,
        collaboration_index=0.7,
        complexity_tolerance=5,
    ),
    UserType.NATION: UserConstants(
        user_type=UserType.NATION,
        base_k=0.8, base_i=0.3, base_r=0.0,
        automation_preference=40,
        risk_tolerance=0.2,
        collaboration_index=0.8,
        complexity_tolerance=5,
    ),
    UserType.GLOBAL: UserConstants(
        user_type=UserType.GLOBAL,
        base_k=0.75, base_i=0.35, base_r=0.0,
        automation_preference=30,
        risk_tolerance=0.1,
        collaboration_index=0.9,
        complexity_tolerance=5,
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 솔루션 매니저
# ═══════════════════════════════════════════════════════════════════════════════

class SolutionManager:
    """
    AUTUS 업무 솔루션 통합 매니저
    
    기능:
    1. 업무 재정의 - 30개 모듈 기반 파이프라인 구성
    2. 글로벌 업무 분류 - 5차 분류 + 국제 표준 매핑
    3. 사례 수집/학습 - Best Practice 자동 추출
    4. 사용자 맞춤화 - 타입별 상수 + 최적화
    5. 업무 일체화 - 중복 제거, 자동 삭제
    """
    
    def __init__(self):
        self._taxonomy = get_taxonomy_manager()
        self._case_collector = get_case_collector()
        self._unifier = get_task_unifier()
        
        self._user_constants = USER_TYPE_CONSTANTS
        self._active_tasks: Dict[str, TaskDefinition] = {}
        self._user_profiles: Dict[str, UserConstants] = {}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 업무 재정의 (모듈 기반)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def redefine_task(
        self,
        task_id: str,
        user_type: UserType,
        custom_modules: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        업무 재정의 - 30개 원자 모듈로 파이프라인 구성
        """
        # 사용자 타입별 기본 모듈 추천
        if custom_modules:
            modules = custom_modules
        else:
            modules = self._recommend_modules(task_id, user_type)
        
        # 파이프라인 생성
        try:
            pipeline = create_custom_pipeline(
                name=f"Pipeline for {task_id}",
                name_ko=f"{task_id} 파이프라인",
                modules=modules,
                category="REDEFINED",
            )
            
            return {
                "success": True,
                "task_id": task_id,
                "pipeline_id": pipeline.id,
                "modules": modules,
                "computed_k": pipeline.computed_k,
                "computed_i": pipeline.computed_i,
                "requires_human": pipeline.requires_human,
            }
        except ValueError as e:
            return {"success": False, "error": str(e)}
    
    def _recommend_modules(self, task_id: str, user_type: UserType) -> List[str]:
        """사용자 타입별 모듈 추천"""
        constants = self._user_constants.get(user_type)
        
        base_modules = ["IN_FORM", "PR_VALIDATE"]
        
        if constants:
            # 자동화 선호도에 따라 모듈 추가
            if constants.automation_preference >= 80:
                base_modules.extend(["PR_CALCULATE", "OUT_DATA", "CM_STORE"])
            elif constants.automation_preference >= 60:
                base_modules.extend(["PR_CALCULATE", "DE_RULE", "OUT_REPORT"])
            else:
                base_modules.extend(["DE_APPROVE", "OUT_LOG", "CM_NOTIFY"])
            
            # 협업 지수에 따라
            if constants.collaboration_index >= 0.5:
                if "CM_NOTIFY" not in base_modules:
                    base_modules.append("CM_NOTIFY")
        
        return base_modules
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 글로벌 업무 분류 (5차)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def classify_task(
        self,
        task_name: str,
        task_description: str,
    ) -> Dict[str, Any]:
        """
        업무를 5차 분류 체계에 배치
        """
        # 키워드 검색
        results = self._taxonomy.search(task_name)
        
        if results:
            best_match = results[0]
            return {
                "success": True,
                "taxonomy_code": best_match.code,
                "level": best_match.level,
                "full_path": self._taxonomy.get_full_path(best_match.code),
                "global_standards": {
                    "isic": best_match.isic_code,
                    "isco": best_match.isco_code,
                    "apqc": best_match.apqc_code,
                },
                "default_k": best_match.default_k,
                "default_i": best_match.default_i,
            }
        
        return {
            "success": False,
            "error": "No matching taxonomy found",
            "suggestion": "Use L1 domains to manually classify",
        }
    
    def get_taxonomy_tree(self, root_code: Optional[str] = None, max_depth: int = 3) -> Dict[str, Any]:
        """분류 체계 트리 조회"""
        if root_code:
            node = self._taxonomy.get_node(root_code)
            if not node:
                return {"error": "Node not found"}
            return self._build_tree(node, max_depth)
        
        # 전체 L1 루트
        l1_nodes = self._taxonomy.get_by_level(1)
        return {
            "roots": [self._build_tree(n, max_depth) for n in l1_nodes],
            "statistics": self._taxonomy.get_statistics(),
        }
    
    def _build_tree(self, node: TaxonomyNode, depth: int) -> Dict[str, Any]:
        """트리 빌드"""
        tree = {
            "code": node.code,
            "name_ko": node.name_ko,
            "name_en": node.name_en,
            "level": node.level,
        }
        
        if depth > 0 and node.children:
            tree["children"] = [
                self._build_tree(self._taxonomy.get_node(c), depth - 1)
                for c in node.children
                if self._taxonomy.get_node(c)
            ]
        
        return tree
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 사례 수집 및 학습
    # ═══════════════════════════════════════════════════════════════════════════
    
    def collect_case(self, case: TaskCase) -> str:
        """사례 수집"""
        return self._case_collector.collect(case)
    
    def get_best_practice(self, task_id: str) -> Optional[BestPractice]:
        """Best Practice 조회"""
        bp = self._case_collector.get_best_practice(task_id)
        if bp:
            return bp
        
        # 없으면 자동 추출 시도
        return self._case_collector.extract_best_practice(task_id)
    
    def analyze_cases(self, task_id: str) -> Dict[str, Any]:
        """사례 분석"""
        return self._case_collector.analyze_task(task_id)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. 사용자 맞춤화
    # ═══════════════════════════════════════════════════════════════════════════
    
    def get_user_constants(self, user_type: UserType) -> UserConstants:
        """사용자 타입별 상수 조회"""
        return self._user_constants.get(user_type, USER_TYPE_CONSTANTS[UserType.INDIVIDUAL])
    
    def customize_for_user(
        self,
        task: TaskDefinition,
        user_type: UserType,
    ) -> Dict[str, Any]:
        """사용자 맞춤화"""
        constants = self.get_user_constants(user_type)
        
        # K/I 조정
        adjusted_k = task.base_k * (1 + (constants.automation_preference - 50) / 100)
        adjusted_i = task.base_i + constants.collaboration_index * 0.1
        
        # 자동화 레벨 조정
        adjusted_automation = min(100, max(0, 
            task.automation_level + (constants.automation_preference - 50)
        ))
        
        return {
            "task_id": task.task_id,
            "user_type": user_type.value,
            "original_k": task.base_k,
            "adjusted_k": round(adjusted_k, 2),
            "original_i": task.base_i,
            "adjusted_i": round(adjusted_i, 2),
            "original_automation": task.automation_level,
            "adjusted_automation": int(adjusted_automation),
            "risk_tolerance": constants.risk_tolerance,
            "complexity_tolerance": constants.complexity_tolerance,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. 업무 일체화 (삭제/통합)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def propose_unification(
        self,
        tasks: List[TaskDefinition],
        task_stats: Dict[str, Dict],
    ) -> Dict[str, Any]:
        """
        업무 일체화 제안 생성
        - 중복 탐지 → 병합 제안
        - 비활성 탐지 → 삭제 제안
        """
        results = {
            "duplicates": [],
            "elimination_candidates": [],
            "proposals": [],
        }
        
        # 1. 중복 탐지
        duplicates = self._unifier.detect_duplicates(tasks)
        results["duplicates"] = duplicates
        
        # 중복에 대해 병합 제안
        processed_pairs = set()
        for task1_id, task2_id, similarity in duplicates:
            pair_key = tuple(sorted([task1_id, task2_id]))
            if pair_key not in processed_pairs:
                proposal = self._unifier.propose_merge(
                    source_task_ids=[task1_id],
                    target_task_id=task2_id,
                    reason=f"Duplicate detected (similarity: {similarity})",
                )
                results["proposals"].append(proposal)
                processed_pairs.add(pair_key)
        
        # 2. 삭제 후보 탐지
        candidates = self._unifier.detect_elimination_candidates(tasks, task_stats)
        results["elimination_candidates"] = [
            {"task_id": c.task_id, "reason": c.reason.value, "confidence": c.confidence}
            for c in candidates
        ]
        
        # 삭제 제안
        for candidate in candidates:
            if candidate.confidence >= 0.7:
                proposal = self._unifier.propose_elimination(
                    task_id=candidate.task_id,
                    reason=candidate.reason,
                )
                results["proposals"].append(proposal)
        
        return results
    
    def execute_unification(self, proposal_id: str) -> Dict[str, Any]:
        """일체화 실행"""
        return self._unifier.execute_proposal(proposal_id)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 통합 통계
    # ═══════════════════════════════════════════════════════════════════════════
    
    def get_system_statistics(self) -> Dict[str, Any]:
        """전체 시스템 통계"""
        return {
            "taxonomy": self._taxonomy.get_statistics(),
            "cases": self._case_collector.get_statistics(),
            "unification": self._unifier.get_statistics(),
            "modules": {
                "atomic_modules": len(ATOMIC_MODULES),
                "solution_modules": len(SOLUTION_MODULES),
            },
            "user_types": {
                ut.value: {
                    "base_k": uc.base_k,
                    "automation_pref": uc.automation_preference,
                }
                for ut, uc in self._user_constants.items()
            },
        }
    
    def get_completion_status(self) -> Dict[str, Any]:
        """완성도 체크"""
        return {
            "module_setup": {
                "status": "COMPLETE",
                "atomic_modules": 30,
                "solution_modules": 30,
            },
            "task_categorization": {
                "status": "COMPLETE",
                "levels": 5,
                "l1_domains": 8,
                "total_nodes": len(self._taxonomy.taxonomy),
            },
            "case_collection": {
                "status": "ACTIVE",
                "total_cases": self._case_collector.get_statistics().get("total_cases", 0),
            },
            "user_type_classification": {
                "status": "COMPLETE",
                "types": 6,
                "user_types": list(UserType),
            },
            "user_constants": {
                "status": "COMPLETE",
                "defined": len(self._user_constants),
            },
            "solution_optimization": {
                "status": "COMPLETE",
                "unifier_active": True,
            },
            "unification": {
                "status": "ACTIVE",
                "proposals": self._unifier.get_statistics().get("total_proposals", 0),
            },
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

_solution_manager: Optional[SolutionManager] = None


def get_solution_manager() -> SolutionManager:
    """솔루션 매니저 싱글톤"""
    global _solution_manager
    if _solution_manager is None:
        _solution_manager = SolutionManager()
    return _solution_manager
