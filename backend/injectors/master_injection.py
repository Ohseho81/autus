"""
═══════════════════════════════════════════════════════════════════════════════
🚀 AUTUS Master Injection System (마스터 인젝션 시스템)
═══════════════════════════════════════════════════════════════════════════════

베테랑 노하우를 36개 전략 노드에 대량 주입하는 시스템

기능:
1. 지식인/Notion 데이터 수집
2. Zero Meaning 필터링
3. UNP 규격 변환
4. 36노드 배치
5. 공명 계산

"인류 최초의 원기옥이 시작된다"
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from enum import Enum

# Core imports
from core.strategic_nodes import get_strategic_matrix, PhysicsDimension
from core.unp import UNPTransformer, create_unp_packet
from core.nodes36 import VeteranIntuitionTransformer
from core.circuits import get_protection_circuit, ObservationType
from sovereign.zkp import get_zkp_engine
from sovereign.poc import get_poc_engine, ContributionType


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AUTUS.Injection")


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 소스 정의
# ═══════════════════════════════════════════════════════════════════════════════

class DataSource(Enum):
    """데이터 소스"""
    NAVER_KIN = "naver_kin"           # 네이버 지식인
    NOTION = "notion"                  # 노션
    MANUAL = "manual"                  # 수동 입력
    WEBHOOK = "webhook"                # 웹훅
    SCRAPER = "scraper"                # 스크래퍼


class InjectionStatus(Enum):
    """주입 상태"""
    PENDING = "pending"
    PROCESSING = "processing"
    FILTERED = "filtered"              # 노이즈로 걸러짐
    INJECTED = "injected"
    FAILED = "failed"


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class RawKnowledge:
    """원시 노하우 데이터"""
    id: str
    source: DataSource
    author_id: str
    content: str
    domain: str                        # 영역 (health, capital, cognition 등)
    experience_years: int = 0
    metadata: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "source": self.source.value,
            "author_hash": hashlib.sha256(self.author_id.encode()).hexdigest()[:8],
            "content_preview": self.content[:100] + "..." if len(self.content) > 100 else self.content,
            "domain": self.domain,
            "experience_years": self.experience_years,
        }


@dataclass
class InjectionResult:
    """주입 결과"""
    knowledge_id: str
    status: InjectionStatus
    target_node: Optional[str] = None
    vector: List[float] = field(default_factory=list)
    poc_score: float = 0.0
    resonance_delta: float = 0.0
    processing_time_ms: float = 0.0
    error_message: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "id": self.knowledge_id,
            "status": self.status.value,
            "target_node": self.target_node,
            "vector_sample": self.vector[:6] if self.vector else [],
            "poc_score": round(self.poc_score, 4),
            "resonance_delta": round(self.resonance_delta, 4),
            "processing_ms": round(self.processing_time_ms, 2),
            "error": self.error_message if self.error_message else None,
        }


@dataclass
class BatchInjectionReport:
    """배치 주입 리포트"""
    batch_id: str
    total_items: int
    injected: int = 0
    filtered: int = 0
    failed: int = 0
    total_poc: float = 0.0
    avg_resonance: float = 0.0
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    results: List[InjectionResult] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "batch_id": self.batch_id,
            "total": self.total_items,
            "injected": self.injected,
            "filtered": self.filtered,
            "failed": self.failed,
            "success_rate": f"{(self.injected / max(self.total_items, 1)) * 100:.1f}%",
            "total_poc": round(self.total_poc, 4),
            "avg_resonance": round(self.avg_resonance, 4),
            "duration_ms": (
                (self.completed_at - self.started_at).total_seconds() * 1000
                if self.completed_at else None
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Zero Meaning 필터
# ═══════════════════════════════════════════════════════════════════════════════

class ZeroMeaningFilter:
    """
    Zero Meaning 필터
    
    베테랑의 답변에서 노이즈를 제거하고 본질만 추출
    """
    
    # 제거할 표현들
    NOISE_PATTERNS = [
        # 주관적 표현
        "제 생각에는", "아마도", "글쎄요", "잘 모르겠지만",
        "제 경험상", "개인적으로", "솔직히 말해서",
        # 불필요한 수식어
        "매우", "정말", "진짜", "엄청", "완전",
        "너무", "많이", "조금", "약간",
        # 감정 표현
        "ㅋㅋ", "ㅎㅎ", "ㅠㅠ", "...", "!!",
        # 인사/마무리
        "안녕하세요", "감사합니다", "도움이 되셨으면",
    ]
    
    # 본질 키워드 (가중치 증가)
    ESSENCE_KEYWORDS = [
        "핵심", "원칙", "법칙", "규칙", "패턴",
        "원인", "결과", "순서", "단계", "방법",
        "항상", "반드시", "절대", "필수",
    ]
    
    def filter(self, text: str) -> tuple[str, float]:
        """
        필터링 수행
        
        Returns:
            (정제된 텍스트, 순도 점수)
        """
        original_length = len(text)
        filtered_text = text
        
        # 노이즈 제거
        for pattern in self.NOISE_PATTERNS:
            filtered_text = filtered_text.replace(pattern, "")
        
        # 연속 공백 정리
        import re
        filtered_text = re.sub(r'\s+', ' ', filtered_text).strip()
        
        # 순도 계산
        filtered_length = len(filtered_text)
        reduction_ratio = 1 - (filtered_length / max(original_length, 1))
        
        # 본질 키워드 보너스
        essence_count = sum(1 for kw in self.ESSENCE_KEYWORDS if kw in text)
        essence_bonus = min(essence_count * 0.05, 0.2)
        
        # 최종 순도 (0.3 ~ 1.0)
        purity = max(0.3, min(1.0, 0.5 + essence_bonus - reduction_ratio * 0.3))
        
        return filtered_text, purity
    
    def should_reject(self, text: str) -> tuple[bool, str]:
        """
        거부 여부 판단
        """
        # 너무 짧음
        if len(text) < 20:
            return True, "Content too short"
        
        # 노이즈 비율이 너무 높음
        filtered, purity = self.filter(text)
        if purity < 0.3:
            return True, "Purity too low (noise dominant)"
        
        # 본질 없음
        if len(filtered) < 10:
            return True, "No essence after filtering"
        
        return False, ""


# ═══════════════════════════════════════════════════════════════════════════════
# 도메인 매퍼
# ═══════════════════════════════════════════════════════════════════════════════

class DomainMapper:
    """도메인 → 노드 매퍼"""
    
    DOMAIN_NODE_MAP = {
        # BIO
        "health": ["n01", "n02", "n03"],
        "fitness": ["n04", "n05", "n06"],
        "medical": ["n01", "n02"],
        "exercise": ["n04", "n05"],
        
        # CAPITAL
        "finance": ["n07", "n08", "n09"],
        "investment": ["n10", "n11", "n12"],
        "money": ["n07", "n09"],
        "stock": ["n11"],
        "real_estate": ["n10"],
        
        # COGNITION
        "learning": ["n13", "n14", "n15"],
        "skill": ["n16", "n17", "n18"],
        "study": ["n13", "n14"],
        "creativity": ["n17"],
        "problem_solving": ["n18"],
        
        # RELATION
        "family": ["n19", "n20", "n21"],
        "network": ["n22", "n23", "n24"],
        "relationship": ["n19", "n22"],
        "parenting": ["n19", "n20"],
        
        # ENVIRONMENT
        "home": ["n25", "n26", "n27"],
        "work": ["n28", "n29", "n30"],
        "interior": ["n25", "n26"],
        "career": ["n28", "n29"],
        
        # LEGACY
        "purpose": ["n31", "n32", "n33"],
        "impact": ["n34", "n35", "n36"],
        "meaning": ["n31", "n32"],
        "mentoring": ["n35"],
    }
    
    def map_to_nodes(self, domain: str, text: str = "") -> List[str]:
        """도메인과 텍스트를 기반으로 최적 노드 결정"""
        domain_lower = domain.lower()
        
        # 직접 매핑
        if domain_lower in self.DOMAIN_NODE_MAP:
            return self.DOMAIN_NODE_MAP[domain_lower]
        
        # 키워드 기반 추론
        for key, nodes in self.DOMAIN_NODE_MAP.items():
            if key in domain_lower or key in text.lower():
                return nodes
        
        # 기본값 (CAPITAL 영역)
        return ["n07", "n08", "n09"]
    
    def select_best_node(self, nodes: List[str], vector: List[float]) -> str:
        """벡터 기반 최적 노드 선택"""
        if not nodes:
            return "n01"
        
        if not vector:
            return nodes[0]
        
        # 벡터 값이 가장 높은 노드
        best_node = nodes[0]
        best_value = 0.0
        
        for node_id in nodes:
            try:
                idx = int(node_id[1:]) - 1
                if idx < len(vector) and vector[idx] > best_value:
                    best_value = vector[idx]
                    best_node = node_id
            except (ValueError, IndexError):
                pass
        
        return best_node


# ═══════════════════════════════════════════════════════════════════════════════
# 마스터 인젝션 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class MasterInjectionEngine:
    """
    마스터 인젝션 엔진
    
    베테랑 노하우를 대량으로 36개 노드에 주입
    """
    
    def __init__(self):
        self._matrix = get_strategic_matrix()
        self._circuit = get_protection_circuit()
        self._zkp = get_zkp_engine()
        self._poc = get_poc_engine()
        
        self._filter = ZeroMeaningFilter()
        self._mapper = DomainMapper()
        
        self._injection_count = 0
        self._batch_count = 0
    
    # ─────────────────────────────────────────────────────────────────────────
    # 단일 주입
    # ─────────────────────────────────────────────────────────────────────────
    
    async def inject_single(self, knowledge: RawKnowledge) -> InjectionResult:
        """단일 노하우 주입"""
        start = datetime.utcnow()
        self._injection_count += 1
        
        try:
            # 1. 접근 권한 확인
            access = self._circuit.request_access(
                observer_id="injection_engine",
                node_id="n01",  # 대표 노드
                observation_type=ObservationType.WRITE,
            )
            
            if not access["granted"]:
                return InjectionResult(
                    knowledge_id=knowledge.id,
                    status=InjectionStatus.FAILED,
                    error_message=f"Access denied: {access.get('reason', 'Unknown')}",
                    processing_time_ms=(datetime.utcnow() - start).total_seconds() * 1000,
                )
            
            # 2. Zero Meaning 필터링
            should_reject, reason = self._filter.should_reject(knowledge.content)
            if should_reject:
                return InjectionResult(
                    knowledge_id=knowledge.id,
                    status=InjectionStatus.FILTERED,
                    error_message=reason,
                    processing_time_ms=(datetime.utcnow() - start).total_seconds() * 1000,
                )
            
            filtered_text, purity = self._filter.filter(knowledge.content)
            
            # 3. 벡터 변환
            vector = VeteranIntuitionTransformer.transform(
                text=filtered_text,
                experience_years=knowledge.experience_years,
            )
            
            # 4. 최적 노드 선택
            candidate_nodes = self._mapper.map_to_nodes(knowledge.domain, filtered_text)
            target_node = self._mapper.select_best_node(candidate_nodes, vector)
            
            # 5. 노드에 주입
            prev_resonance = self._matrix.calculate_global_resonance()["global_resonance"]
            
            injection_result = self._matrix.inject_veteran_knowledge(
                node_id=target_node,
                knowledge_vector=vector,
                veteran_years=knowledge.experience_years,
            )
            
            if not injection_result["success"]:
                return InjectionResult(
                    knowledge_id=knowledge.id,
                    status=InjectionStatus.FAILED,
                    error_message=injection_result.get("error", "Injection failed"),
                    processing_time_ms=(datetime.utcnow() - start).total_seconds() * 1000,
                )
            
            # 6. 공명 변화 계산
            new_resonance = self._matrix.calculate_global_resonance()["global_resonance"]
            resonance_delta = new_resonance - prev_resonance
            
            # 7. PoC 등록
            contribution = self._poc.register_contribution(
                contributor_did=f"did:autus:{knowledge.author_id}",
                contribution_type=ContributionType.KNOWLEDGE,
                node_id=target_node,
                domain=knowledge.domain,
                raw_data_size=len(knowledge.content),
                refined_data_size=len(filtered_text),
                quality_factor=purity,
            )
            
            # 8. 결과 반환
            return InjectionResult(
                knowledge_id=knowledge.id,
                status=InjectionStatus.INJECTED,
                target_node=target_node,
                vector=vector,
                poc_score=contribution.total_poc,
                resonance_delta=resonance_delta,
                processing_time_ms=(datetime.utcnow() - start).total_seconds() * 1000,
            )
            
        except Exception as e:
            logger.error(f"Injection failed for {knowledge.id}: {e}")
            return InjectionResult(
                knowledge_id=knowledge.id,
                status=InjectionStatus.FAILED,
                error_message=str(e),
                processing_time_ms=(datetime.utcnow() - start).total_seconds() * 1000,
            )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 배치 주입
    # ─────────────────────────────────────────────────────────────────────────
    
    async def inject_batch(
        self,
        knowledge_list: List[RawKnowledge],
        parallel: bool = True,
    ) -> BatchInjectionReport:
        """배치 주입"""
        self._batch_count += 1
        batch_id = f"batch_{self._batch_count:06d}"
        
        report = BatchInjectionReport(
            batch_id=batch_id,
            total_items=len(knowledge_list),
        )
        
        logger.info(f"🚀 Starting batch injection: {batch_id} ({len(knowledge_list)} items)")
        
        if parallel:
            # 병렬 처리
            tasks = [self.inject_single(k) for k in knowledge_list]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        else:
            # 순차 처리
            results = []
            for k in knowledge_list:
                result = await self.inject_single(k)
                results.append(result)
        
        # 결과 집계
        for result in results:
            if isinstance(result, Exception):
                report.failed += 1
                continue
            
            report.results.append(result)
            
            if result.status == InjectionStatus.INJECTED:
                report.injected += 1
                report.total_poc += result.poc_score
            elif result.status == InjectionStatus.FILTERED:
                report.filtered += 1
            else:
                report.failed += 1
        
        # 평균 공명 계산
        resonance_deltas = [r.resonance_delta for r in report.results if r.resonance_delta != 0]
        report.avg_resonance = sum(resonance_deltas) / len(resonance_deltas) if resonance_deltas else 0
        
        report.completed_at = datetime.utcnow()
        
        logger.info(f"✅ Batch {batch_id} completed: {report.injected}/{report.total_items} injected")
        
        return report
    
    # ─────────────────────────────────────────────────────────────────────────
    # 상태 조회
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_stats(self) -> Dict:
        """통계"""
        return {
            "total_injections": self._injection_count,
            "total_batches": self._batch_count,
            "matrix_stats": self._matrix.get_stats(),
            "global_resonance": self._matrix.calculate_global_resonance(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴
# ═══════════════════════════════════════════════════════════════════════════════

_engine: Optional[MasterInjectionEngine] = None


def get_injection_engine() -> MasterInjectionEngine:
    """인젝션 엔진 싱글턴"""
    global _engine
    if _engine is None:
        _engine = MasterInjectionEngine()
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def inject_veteran_knowledge(
    content: str,
    domain: str,
    author_id: str = "anonymous",
    experience_years: int = 0,
) -> Dict:
    """베테랑 지식 주입 (편의 함수)"""
    engine = get_injection_engine()
    
    knowledge = RawKnowledge(
        id=hashlib.sha256(f"{author_id}:{content[:50]}:{datetime.utcnow()}".encode()).hexdigest()[:16],
        source=DataSource.MANUAL,
        author_id=author_id,
        content=content,
        domain=domain,
        experience_years=experience_years,
    )
    
    result = await engine.inject_single(knowledge)
    return result.to_dict()


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "MasterInjectionEngine",
    "RawKnowledge",
    "InjectionResult",
    "BatchInjectionReport",
    "ZeroMeaningFilter",
    "DomainMapper",
    "DataSource",
    "InjectionStatus",
    "get_injection_engine",
    "inject_veteran_knowledge",
]
