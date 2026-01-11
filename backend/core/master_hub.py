"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS Master Hub v2.0.0 (마스터 허브)
═══════════════════════════════════════════════════════════════════════════════

144,000 마스터 레지스트리 - 인류 지성의 정수를 저장

구조:
- 12 도메인 × 12 섹터 × 1,000 마스터 = 144,000 슬롯
- 각 마스터는 512차원 벡터로 표현
- 교차 검증을 통한 합의(Consensus) 도출

"80억 명의 노이즈를 삭제하고 144,000명의 정수를 배치하는 지능의 주소록"
═══════════════════════════════════════════════════════════════════════════════
"""

import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 정의
# ═══════════════════════════════════════════════════════════════════════════════

DOMAINS = 12  # 12 영역
SECTORS = 12  # 각 영역 12 섹터
MASTERS_PER_SECTOR = 1000  # 섹터당 1,000 마스터
TOTAL_MASTERS = DOMAINS * SECTORS * MASTERS_PER_SECTOR  # 144,000
VECTOR_DIM = 512  # 벡터 차원

# 엔트로피 임계값 (Zero Meaning 기준)
DEFAULT_ENTROPY_THRESHOLD = 0.144


# ═══════════════════════════════════════════════════════════════════════════════
# 도메인 정의 (nodes.json과 동기화)
# ═══════════════════════════════════════════════════════════════════════════════

class Domain(Enum):
    """12개 전략 도메인"""
    CAP = ("CAP", "Capital & Resource", "자본과 자원")
    COG = ("COG", "Cognition & Intelligence", "인지와 지성")
    BIO = ("BIO", "Bio-Vibrational Energy", "생체 진동 에너지")
    SOC = ("SOC", "Social Dynamics", "사회적 역학")
    TEM = ("TEM", "Temporal Mastery", "시간의 지배")
    SPA = ("SPA", "Spatial Awareness", "공간의 인식")
    CRE = ("CRE", "Creative Genesis", "창조의 기원")
    STR = ("STR", "Strategic Foresight", "전략적 선견")
    EMO = ("EMO", "Emotional Intelligence", "감정의 지성")
    ETH = ("ETH", "Ethical Foundation", "윤리적 기반")
    RES = ("RES", "Resilience Core", "회복탄력성 핵심")
    TRN = ("TRN", "Transcendence Gateway", "초월의 관문")
    
    def __init__(self, code: str, name_en: str, name_kr: str):
        self.code = code
        self.name_en = name_en
        self.name_kr = name_kr


# ═══════════════════════════════════════════════════════════════════════════════
# 마스터 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MasterProfile:
    """마스터(베테랑) 프로필"""
    master_id: str
    domain_id: int
    sector_id: int
    slot_id: int
    
    # 벡터 데이터
    vector: np.ndarray = field(default_factory=lambda: np.zeros(VECTOR_DIM))
    
    # 메타데이터
    experience_years: int = 0
    expertise_level: str = "veteran"  # veteran, master, grandmaster
    verified: bool = False
    
    # 물리 속성
    energy: float = 1.0
    entropy: float = 0.0
    resonance_score: float = 0.0
    
    # 타임스탬프
    registered_at: datetime = field(default_factory=datetime.utcnow)
    last_updated: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        return {
            "master_id": self.master_id,
            "domain_id": self.domain_id,
            "sector_id": self.sector_id,
            "slot_id": self.slot_id,
            "experience_years": self.experience_years,
            "expertise_level": self.expertise_level,
            "verified": self.verified,
            "energy": self.energy,
            "entropy": self.entropy,
            "resonance_score": self.resonance_score,
            "vector_norm": float(np.linalg.norm(self.vector)),
            "registered_at": self.registered_at.isoformat(),
        }


@dataclass
class SectorState:
    """섹터 상태"""
    domain_id: int
    sector_id: int
    filled_slots: int = 0
    total_slots: int = MASTERS_PER_SECTOR
    average_resonance: float = 0.0
    consensus_strength: float = 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# 마스터 레지스트리 (144,000 슬롯)
# ═══════════════════════════════════════════════════════════════════════════════

class MasterRegistry:
    """
    144,000 마스터 레지스트리
    
    12 도메인 × 12 섹터 × 1,000 마스터 = 144,000 슬롯
    """
    
    def __init__(self, use_numpy: bool = True):
        """
        Args:
            use_numpy: NumPy 텐서 사용 여부 (대규모 연산 최적화)
        """
        self.use_numpy = use_numpy
        
        # 마스터 벡터 텐서: [12, 12, 1000, 512]
        if use_numpy:
            self.grid = np.zeros((DOMAINS, SECTORS, MASTERS_PER_SECTOR, VECTOR_DIM), dtype=np.float32)
            self.resonance_scores = np.zeros((DOMAINS, SECTORS, MASTERS_PER_SECTOR), dtype=np.float32)
            self.slot_filled = np.zeros((DOMAINS, SECTORS, MASTERS_PER_SECTOR), dtype=bool)
        else:
            self.grid = None
            self.resonance_scores = None
            self.slot_filled = None
        
        # 마스터 프로필 저장소
        self.profiles: Dict[str, MasterProfile] = {}
        
        # 노드 정의 로드
        self._load_nodes_config()
        
        # 통계
        self._stats = {
            "total_registered": 0,
            "total_verified": 0,
            "total_resonance": 0.0,
            "last_alignment": None,
        }
    
    def _load_nodes_config(self):
        """nodes.json 설정 로드"""
        nodes_path = Path(__file__).parent / "nodes.json"
        if nodes_path.exists():
            with open(nodes_path, "r", encoding="utf-8") as f:
                self.nodes_config = json.load(f)
        else:
            self.nodes_config = {"domains": []}
    
    # ─────────────────────────────────────────────────────────────────────────
    # 마스터 등록 및 정렬
    # ─────────────────────────────────────────────────────────────────────────
    
    def align_master(
        self,
        master_vector: np.ndarray,
        domain_id: int,
        sector_id: int,
        experience_years: int = 30,
        expertise_level: str = "veteran",
        master_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[MasterProfile]]:
        """
        마스터 데이터를 1:12:144 격자에 정렬
        
        Args:
            master_vector: 512차원 노하우 벡터
            domain_id: 도메인 ID (0-11)
            sector_id: 섹터 ID (0-11)
            experience_years: 경력 연수
            expertise_level: 전문성 레벨
            master_id: 마스터 고유 ID (없으면 자동 생성)
        
        Returns:
            (success, profile)
        """
        # 유효성 검증
        if not self._validate_input(master_vector, domain_id, sector_id):
            return False, None
        
        # 최적 슬롯 찾기
        slot_id = self._find_best_slot(domain_id, sector_id)
        if slot_id is None:
            return False, None  # 섹터가 가득 찬 경우
        
        # 교차 검증
        if not self._cross_verify(domain_id, sector_id, master_vector):
            return False, None  # 기존 마스터들과 불일치
        
        # 벡터 정렬
        if self.use_numpy:
            self.grid[domain_id][sector_id][slot_id] = master_vector
            self.slot_filled[domain_id][sector_id][slot_id] = True
        
        # 마스터 ID 생성
        if master_id is None:
            master_id = self._generate_master_id(domain_id, sector_id, slot_id)
        
        # 프로필 생성
        profile = MasterProfile(
            master_id=master_id,
            domain_id=domain_id,
            sector_id=sector_id,
            slot_id=slot_id,
            vector=master_vector,
            experience_years=experience_years,
            expertise_level=expertise_level,
            verified=False,
        )
        
        # 공명 점수 계산
        profile.resonance_score = self._calculate_resonance(domain_id, sector_id, master_vector)
        if self.use_numpy:
            self.resonance_scores[domain_id][sector_id][slot_id] = profile.resonance_score
        
        # 저장
        self.profiles[master_id] = profile
        self._stats["total_registered"] += 1
        self._stats["total_resonance"] += profile.resonance_score
        self._stats["last_alignment"] = datetime.utcnow().isoformat()
        
        return True, profile
    
    def _validate_input(self, vector: np.ndarray, domain_id: int, sector_id: int) -> bool:
        """입력 유효성 검증"""
        if vector is None or len(vector) != VECTOR_DIM:
            return False
        if domain_id < 0 or domain_id >= DOMAINS:
            return False
        if sector_id < 0 or sector_id >= SECTORS:
            return False
        return True
    
    def _find_best_slot(self, domain_id: int, sector_id: int) -> Optional[int]:
        """
        최적 슬롯 찾기
        
        우선순위:
        1. 비어있는 슬롯
        2. 공명 점수가 가장 낮은 슬롯 (교체 대상)
        """
        if self.use_numpy:
            # 비어있는 슬롯 찾기
            empty_slots = np.where(~self.slot_filled[domain_id][sector_id])[0]
            if len(empty_slots) > 0:
                return int(empty_slots[0])
            
            # 가장 낮은 공명 점수 슬롯 (교체)
            min_slot = int(np.argmin(self.resonance_scores[domain_id][sector_id]))
            return min_slot
        else:
            # 순차 탐색
            for slot_id in range(MASTERS_PER_SECTOR):
                key = f"{domain_id}_{sector_id}_{slot_id}"
                if key not in self.profiles:
                    return slot_id
            return None
    
    def _cross_verify(self, domain_id: int, sector_id: int, new_vector: np.ndarray) -> bool:
        """
        교차 검증: 기존 마스터들과의 논리적 일치도 확인
        
        새 마스터의 벡터가 기존 합의(consensus)와 크게 벗어나면 거부
        """
        if self.use_numpy and np.any(self.slot_filled[domain_id][sector_id]):
            # 기존 마스터들의 평균 벡터
            filled_mask = self.slot_filled[domain_id][sector_id]
            existing_vectors = self.grid[domain_id][sector_id][filled_mask]
            consensus = np.mean(existing_vectors, axis=0)
            
            # 코사인 유사도 계산
            similarity = np.dot(new_vector, consensus) / (
                np.linalg.norm(new_vector) * np.linalg.norm(consensus) + 1e-10
            )
            
            # 유사도가 0.3 미만이면 거부 (너무 다른 관점)
            return similarity >= 0.3
        
        return True  # 첫 마스터는 항상 통과
    
    def _calculate_resonance(self, domain_id: int, sector_id: int, vector: np.ndarray) -> float:
        """공명 점수 계산"""
        if self.use_numpy and np.any(self.slot_filled[domain_id][sector_id]):
            filled_mask = self.slot_filled[domain_id][sector_id]
            existing_vectors = self.grid[domain_id][sector_id][filled_mask]
            consensus = np.mean(existing_vectors, axis=0)
            
            # 합의와의 유사도 = 공명 점수
            similarity = np.dot(vector, consensus) / (
                np.linalg.norm(vector) * np.linalg.norm(consensus) + 1e-10
            )
            return float(similarity)
        
        return 1.0  # 첫 마스터는 완벽한 공명
    
    def _generate_master_id(self, domain_id: int, sector_id: int, slot_id: int) -> str:
        """마스터 ID 생성"""
        timestamp = datetime.utcnow().timestamp()
        raw = f"{domain_id}_{sector_id}_{slot_id}_{timestamp}"
        return f"M{hashlib.sha256(raw.encode()).hexdigest()[:12].upper()}"
    
    # ─────────────────────────────────────────────────────────────────────────
    # 합의 (Consensus) 도출
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_global_consensus(self) -> np.ndarray:
        """
        8억 명에게 배포할 '정답 벡터' 산출
        
        각 섹터별 마스터들의 평균 벡터(정수)를 반환
        Returns: [12, 12, 512] 형태의 합의 벡터
        """
        if self.use_numpy:
            # 각 섹터별 평균 계산
            consensus = np.zeros((DOMAINS, SECTORS, VECTOR_DIM), dtype=np.float32)
            
            for d in range(DOMAINS):
                for s in range(SECTORS):
                    if np.any(self.slot_filled[d][s]):
                        filled_mask = self.slot_filled[d][s]
                        sector_vectors = self.grid[d][s][filled_mask]
                        consensus[d][s] = np.mean(sector_vectors, axis=0)
            
            return consensus
        
        return np.zeros((DOMAINS, SECTORS, VECTOR_DIM))
    
    def get_sector_consensus(self, domain_id: int, sector_id: int) -> np.ndarray:
        """특정 섹터의 합의 벡터"""
        if self.use_numpy and np.any(self.slot_filled[domain_id][sector_id]):
            filled_mask = self.slot_filled[domain_id][sector_id]
            sector_vectors = self.grid[domain_id][sector_id][filled_mask]
            return np.mean(sector_vectors, axis=0)
        return np.zeros(VECTOR_DIM)
    
    def get_domain_consensus(self, domain_id: int) -> np.ndarray:
        """특정 도메인의 합의 벡터"""
        if self.use_numpy:
            domain_vectors = []
            for s in range(SECTORS):
                if np.any(self.slot_filled[domain_id][s]):
                    filled_mask = self.slot_filled[domain_id][s]
                    sector_vectors = self.grid[domain_id][s][filled_mask]
                    domain_vectors.append(np.mean(sector_vectors, axis=0))
            
            if domain_vectors:
                return np.mean(domain_vectors, axis=0)
        
        return np.zeros(VECTOR_DIM)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 조회 및 통계
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_master(self, master_id: str) -> Optional[MasterProfile]:
        """마스터 조회"""
        return self.profiles.get(master_id)
    
    def get_sector_state(self, domain_id: int, sector_id: int) -> SectorState:
        """섹터 상태 조회"""
        if self.use_numpy:
            filled_count = int(np.sum(self.slot_filled[domain_id][sector_id]))
            avg_resonance = float(np.mean(
                self.resonance_scores[domain_id][sector_id][
                    self.slot_filled[domain_id][sector_id]
                ]
            )) if filled_count > 0 else 0.0
        else:
            filled_count = 0
            avg_resonance = 0.0
        
        return SectorState(
            domain_id=domain_id,
            sector_id=sector_id,
            filled_slots=filled_count,
            average_resonance=avg_resonance,
            consensus_strength=avg_resonance,
        )
    
    def get_registry_stats(self) -> Dict[str, Any]:
        """레지스트리 전체 통계"""
        if self.use_numpy:
            total_filled = int(np.sum(self.slot_filled))
            avg_resonance = float(np.mean(
                self.resonance_scores[self.slot_filled]
            )) if total_filled > 0 else 0.0
        else:
            total_filled = len(self.profiles)
            avg_resonance = 0.0
        
        # 도메인별 채움 비율
        domain_stats = {}
        for d in range(DOMAINS):
            domain_enum = list(Domain)[d]
            if self.use_numpy:
                domain_filled = int(np.sum(self.slot_filled[d]))
            else:
                domain_filled = sum(
                    1 for p in self.profiles.values()
                    if p.domain_id == d
                )
            domain_stats[domain_enum.code] = {
                "name": domain_enum.name_kr,
                "filled": domain_filled,
                "total": SECTORS * MASTERS_PER_SECTOR,
                "fill_rate": domain_filled / (SECTORS * MASTERS_PER_SECTOR) * 100,
            }
        
        return {
            "total_capacity": TOTAL_MASTERS,
            "total_filled": total_filled,
            "fill_rate": total_filled / TOTAL_MASTERS * 100,
            "average_resonance": avg_resonance,
            "domains": domain_stats,
            "last_alignment": self._stats["last_alignment"],
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 시리얼라이제이션
    # ─────────────────────────────────────────────────────────────────────────
    
    def export_profiles(self) -> List[Dict]:
        """모든 마스터 프로필 내보내기"""
        return [p.to_dict() for p in self.profiles.values()]
    
    def export_consensus(self) -> Dict:
        """합의 벡터 내보내기"""
        consensus = self.get_global_consensus()
        return {
            "shape": list(consensus.shape),
            "domains": [
                {
                    "domain_id": d,
                    "domain_code": list(Domain)[d].code,
                    "sectors": [
                        {
                            "sector_id": s,
                            "vector_norm": float(np.linalg.norm(consensus[d][s])),
                            "has_consensus": float(np.linalg.norm(consensus[d][s])) > 0.1,
                        }
                        for s in range(SECTORS)
                    ],
                }
                for d in range(DOMAINS)
            ],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════

_registry: Optional[MasterRegistry] = None


def get_master_registry() -> MasterRegistry:
    """마스터 레지스트리 싱글턴"""
    global _registry
    if _registry is None:
        _registry = MasterRegistry(use_numpy=True)
    return _registry


def initialize_master_registry(use_numpy: bool = True) -> MasterRegistry:
    """마스터 레지스트리 초기화"""
    global _registry
    _registry = MasterRegistry(use_numpy=use_numpy)
    return _registry


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "MasterRegistry",
    "MasterProfile",
    "SectorState",
    "Domain",
    "get_master_registry",
    "initialize_master_registry",
    "DOMAINS",
    "SECTORS",
    "MASTERS_PER_SECTOR",
    "TOTAL_MASTERS",
    "VECTOR_DIM",
]
