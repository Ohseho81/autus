"""
═══════════════════════════════════════════════════════════════════════════════
🚀 AUTUS 통합 파이프라인 (Integration Pipeline)
═══════════════════════════════════════════════════════════════════════════════

"모으기-삭제하기-정리하기"를 단 하나의 명령어로 실행

팔란티어가 수개월 걸릴 정리를 아우투스는 수초 만에 끝낸다

파이프라인 단계:
1. INJECT (모으기): 외부 데이터를 UNP 규격으로 래핑
2. FILTER (삭제하기): 1:12:144 구조 외 노이즈 삭제
3. PLACE (정리하기): 36개 노드에 데이터 안착
4. VERIFY (검증): 영지식 증명 및 기여 증명
5. REWARD (보상): PoC 기반 보상 배분

═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from enum import Enum

# Core modules
from core.unp import UNPTransformer, UNPPacket, create_unp_packet, validate_unp
from core.compat import (
    VeteranIntuitionTransformer, 
    get_node_registry,
    NODE_DEFINITIONS,
    Node36 as Node36Registry,  # Alias for compatibility
)
from core.circuits import (
    SelfProtectionCircuit,
    get_protection_circuit,
    ObservationType,
    ENTROPY_THRESHOLDS,
)

# Sovereign modules
from sovereign.zkp import (
    ZKResonanceEngine,
    get_zkp_engine,
)
from sovereign.poc import (
    PoCEngine,
    ContributionType,
    get_poc_engine,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AUTUS.Pipeline")


class PipelineStage(Enum):
    """파이프라인 단계"""
    INJECT = "inject"       # 모으기
    FILTER = "filter"       # 삭제하기
    PLACE = "place"         # 정리하기
    VERIFY = "verify"       # 검증
    REWARD = "reward"       # 보상


class PipelineStatus(Enum):
    """파이프라인 상태"""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# ═══════════════════════════════════════════════════════════════════════════════
# 파이프라인 결과
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class StageResult:
    """단계별 결과"""
    stage: PipelineStage
    success: bool
    duration_ms: float
    input_size: int = 0
    output_size: int = 0
    filtered_count: int = 0
    details: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "stage": self.stage.value,
            "success": self.success,
            "duration_ms": round(self.duration_ms, 2),
            "input_size": self.input_size,
            "output_size": self.output_size,
            "filtered_count": self.filtered_count,
            "efficiency": (
                f"{(1 - self.output_size / max(self.input_size, 1)) * 100:.1f}%"
                if self.input_size > 0 else "N/A"
            ),
            "details": self.details,
        }


@dataclass
class PipelineResult:
    """파이프라인 전체 결과"""
    pipeline_id: str
    status: PipelineStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    stages: List[StageResult] = field(default_factory=list)
    final_vector: List[float] = field(default_factory=list)
    poc_score: float = 0.0
    reward: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "pipeline_id": self.pipeline_id,
            "status": self.status.value,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "total_duration_ms": (
                (self.completed_at - self.started_at).total_seconds() * 1000
                if self.completed_at else None
            ),
            "stages": [s.to_dict() for s in self.stages],
            "final_vector_sample": self.final_vector[:6],  # 처음 6개만
            "poc_score": round(self.poc_score, 4),
            "reward": round(self.reward, 4),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 파이프라인
# ═══════════════════════════════════════════════════════════════════════════════

class AutusPipeline:
    """
    AUTUS 통합 파이프라인
    
    모으기 → 삭제하기 → 정리하기 → 검증 → 보상
    """
    
    def __init__(self):
        self._node_registry = get_node_registry()
        self._circuit = get_protection_circuit()
        self._zkp_engine = get_zkp_engine()
        self._poc_engine = get_poc_engine()
        self._pipeline_count = 0
    
    # ─────────────────────────────────────────────────────────────────────────
    # 메인 실행
    # ─────────────────────────────────────────────────────────────────────────
    
    async def execute(
        self,
        raw_data: Dict[str, Any],
        owner_did: str,
        credential_hash: str = "",
        experience_years: int = 0,
        reward_pool: float = 100.0,
    ) -> PipelineResult:
        """
        파이프라인 실행
        
        Args:
            raw_data: 원시 데이터 (노하우)
            owner_did: 소유자 DID
            credential_hash: VC 해시
            experience_years: 경력 년수
            reward_pool: 보상 풀
        """
        self._pipeline_count += 1
        pipeline_id = f"pipe_{self._pipeline_count:06d}"
        
        result = PipelineResult(
            pipeline_id=pipeline_id,
            status=PipelineStatus.RUNNING,
            started_at=datetime.utcnow(),
        )
        
        logger.info(f"🚀 Pipeline {pipeline_id} started")
        
        try:
            # Stage 1: INJECT (모으기)
            stage1_result, unp_packet = await self._stage_inject(
                raw_data, owner_did, credential_hash
            )
            result.stages.append(stage1_result)
            
            if not stage1_result.success:
                raise ValueError("Inject stage failed")
            
            # Stage 2: FILTER (삭제하기)
            stage2_result, filtered_vector = await self._stage_filter(unp_packet)
            result.stages.append(stage2_result)
            
            # Stage 3: PLACE (정리하기)
            stage3_result = await self._stage_place(
                filtered_vector, experience_years
            )
            result.stages.append(stage3_result)
            
            # Stage 4: VERIFY (검증)
            stage4_result, registration_id = await self._stage_verify(
                owner_did, unp_packet
            )
            result.stages.append(stage4_result)
            
            # Stage 5: REWARD (보상)
            stage5_result, poc_score, reward = await self._stage_reward(
                owner_did, registration_id, stage1_result, stage2_result, reward_pool
            )
            result.stages.append(stage5_result)
            
            # 최종 결과
            result.status = PipelineStatus.COMPLETED
            result.completed_at = datetime.utcnow()
            result.final_vector = self._node_registry.to_36_vector()
            result.poc_score = poc_score
            result.reward = reward
            
            logger.info(f"✅ Pipeline {pipeline_id} completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Pipeline {pipeline_id} failed: {e}")
            result.status = PipelineStatus.FAILED
            result.completed_at = datetime.utcnow()
            result.stages.append(StageResult(
                stage=PipelineStage.INJECT,
                success=False,
                duration_ms=0,
                details={"error": str(e)},
            ))
        
        return result
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 1: INJECT (모으기)
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _stage_inject(
        self,
        raw_data: Dict,
        owner_did: str,
        credential_hash: str,
    ) -> tuple[StageResult, UNPPacket]:
        """
        모으기 단계
        - 원시 데이터를 UNP 규격으로 래핑
        """
        start = datetime.utcnow()
        
        # 입력 크기
        import json
        raw_size = len(json.dumps(raw_data))
        
        # UNP 패킷 생성
        packet = create_unp_packet(
            data=raw_data,
            owner=owner_did,
            credential=credential_hash,
        )
        
        # 검증
        validation = validate_unp(packet)
        
        duration = (datetime.utcnow() - start).total_seconds() * 1000
        
        return StageResult(
            stage=PipelineStage.INJECT,
            success=validation["valid"],
            duration_ms=duration,
            input_size=raw_size,
            output_size=len(packet.serialize()),
            details={
                "packet_uid": packet.header.uid,
                "validation": validation["valid"],
                "physics_dimension": packet.physics.dimension,
            },
        ), packet
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 2: FILTER (삭제하기)
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _stage_filter(self, packet: UNPPacket) -> tuple[StageResult, List[float]]:
        """
        삭제하기 단계
        - 1:12:144 구조에 맞지 않는 노이즈 제거
        - 엔트로피 기반 필터링
        """
        start = datetime.utcnow()
        
        # 원본 벡터
        original_vector = packet.get_36_vector()
        input_size = len(original_vector) * 4  # float bytes
        
        # 엔트로피 필터링
        filtered_count = 0
        filtered_vector = []
        
        for i, value in enumerate(original_vector):
            # 값의 엔트로피 체크 (극단값은 노이즈로 간주)
            if value < 0.01 or value > 0.99:
                filtered_vector.append(0.5)  # 중앙값으로 대체
                filtered_count += 1
            else:
                filtered_vector.append(value)
        
        # 프랙탈 구조 검증
        structure_result = self._circuit.validate_fractal_structure({
            "core": 1,
            "domains": list(range(12)),
            "indicators": list(range(144)),
        })
        
        duration = (datetime.utcnow() - start).total_seconds() * 1000
        
        return StageResult(
            stage=PipelineStage.FILTER,
            success=True,
            duration_ms=duration,
            input_size=input_size,
            output_size=len(filtered_vector) * 4,
            filtered_count=filtered_count,
            details={
                "noise_removed_percentage": f"{(filtered_count / 36) * 100:.1f}%",
                "fractal_valid": structure_result["valid"],
            },
        ), filtered_vector
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 3: PLACE (정리하기)
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _stage_place(
        self,
        vector: List[float],
        experience_years: int,
    ) -> StageResult:
        """
        정리하기 단계
        - 36개 노드에 데이터 안착
        - 베테랑 가중치 적용
        """
        start = datetime.utcnow()
        
        # 베테랑 가중치
        veteran_weight = min(experience_years / 50, 1.0) if experience_years >= 30 else 0.5
        
        # 노드에 배치
        placed_count = 0
        for i, value in enumerate(vector[:36]):
            node_id = f"n{i+1:02d}"
            
            # 접근 권한 확인
            access = self._circuit.request_access(
                observer_id="pipeline",
                node_id=node_id,
                observation_type=ObservationType.WRITE,
            )
            
            if access["granted"]:
                # 기존 값과 융합 (베테랑 가중치 적용)
                node = self._node_registry.get(node_id)
                if node:
                    new_value = (
                        node.value * (1 - veteran_weight * 0.3) +
                        value * veteran_weight * 0.3
                    )
                    self._node_registry.set_value(node_id, new_value)
                    placed_count += 1
        
        # 연결된 노드로 전파
        self._node_registry.propagate("n01", 0.1)
        
        duration = (datetime.utcnow() - start).total_seconds() * 1000
        
        return StageResult(
            stage=PipelineStage.PLACE,
            success=placed_count > 0,
            duration_ms=duration,
            input_size=len(vector),
            output_size=placed_count,
            details={
                "nodes_placed": placed_count,
                "veteran_weight": round(veteran_weight, 2),
                "propagation_applied": True,
            },
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 4: VERIFY (검증)
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _stage_verify(
        self,
        owner_did: str,
        packet: UNPPacket,
    ) -> tuple[StageResult, str]:
        """
        검증 단계
        - 영지식 증명으로 노하우 등록
        """
        start = datetime.utcnow()
        
        # 노하우 등록 (커밋먼트 생성)
        registration_id, info = self._zkp_engine.register_knowledge(
            owner_id=owner_did,
            knowledge_data=packet.serialize(),
            node_id="n01",  # 대표 노드
        )
        
        duration = (datetime.utcnow() - start).total_seconds() * 1000
        
        return StageResult(
            stage=PipelineStage.VERIFY,
            success=True,
            duration_ms=duration,
            input_size=len(packet.serialize()),
            output_size=32,  # 해시 크기
            details={
                "registration_id": registration_id,
                "commitment_created": True,
                "zkp_type": "pedersen",
            },
        ), registration_id
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 5: REWARD (보상)
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _stage_reward(
        self,
        owner_did: str,
        registration_id: str,
        inject_result: StageResult,
        filter_result: StageResult,
        reward_pool: float,
    ) -> tuple[StageResult, float, float]:
        """
        보상 단계
        - PoC 계산 및 보상 배분
        """
        start = datetime.utcnow()
        
        # 정제율 계산
        refinement_ratio = (
            (inject_result.input_size - inject_result.output_size) /
            max(inject_result.input_size, 1)
        )
        
        # 기여 등록
        contribution = self._poc_engine.register_contribution(
            contributor_did=owner_did,
            contribution_type=ContributionType.KNOWLEDGE,
            node_id="n01",
            domain="capital",  # 기본 도메인
            raw_data_size=inject_result.input_size,
            refined_data_size=inject_result.output_size,
            quality_factor=1.0 - (filter_result.filtered_count / 36),
        )
        
        # 보상 배분
        reward_allocation = self._poc_engine.allocate_reward(
            contribution_id=contribution.id,
            reward_pool=reward_pool,
        )
        
        duration = (datetime.utcnow() - start).total_seconds() * 1000
        
        return StageResult(
            stage=PipelineStage.REWARD,
            success=True,
            duration_ms=duration,
            details={
                "contribution_id": contribution.id,
                "poc_breakdown": {
                    "refinement": round(contribution.refinement_score, 4),
                    "resonance": round(contribution.resonance_score, 4),
                    "consistency": round(contribution.consistency_score, 4),
                },
                "reward_details": {
                    "level_multiplier": reward_allocation.level_multiplier,
                    "scarcity_bonus": round(reward_allocation.scarcity_bonus, 4),
                },
            },
        ), contribution.total_poc, reward_allocation.final_reward
    
    # ─────────────────────────────────────────────────────────────────────────
    # 상태 조회
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_system_state(self) -> Dict:
        """시스템 전체 상태"""
        return {
            "pipeline_count": self._pipeline_count,
            "nodes": self._node_registry.get_stats(),
            "security": self._circuit.get_all_status(),
            "zkp": self._zkp_engine.get_stats(),
            "poc": self._poc_engine.get_stats(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 및 CLI
# ═══════════════════════════════════════════════════════════════════════════════

_pipeline: Optional[AutusPipeline] = None


def get_pipeline() -> AutusPipeline:
    """파이프라인 싱글턴"""
    global _pipeline
    if _pipeline is None:
        _pipeline = AutusPipeline()
    return _pipeline


async def run_pipeline(
    data: Dict,
    owner: str,
    years: int = 0,
) -> Dict:
    """파이프라인 실행 (편의 함수)"""
    pipeline = get_pipeline()
    result = await pipeline.execute(
        raw_data=data,
        owner_did=owner,
        experience_years=years,
    )
    return result.to_dict()


# CLI 실행
if __name__ == "__main__":
    import json
    
    # 테스트 데이터
    test_data = {
        "type": "veteran_knowledge",
        "domain": "capital",
        "content": "30년 투자 경험에서 배운 것: 복리의 힘, 분산 투자, 장기 관점",
        "metrics": {
            "annual_return": 12.5,
            "risk_score": 0.3,
            "consistency": 0.85,
        },
    }
    
    async def main():
        print("=" * 70)
        print("🚀 AUTUS 통합 파이프라인 실행")
        print("=" * 70)
        
        result = await run_pipeline(
            data=test_data,
            owner="did:autus:test_veteran_001",
            years=30,
        )
        
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    asyncio.run(main())
