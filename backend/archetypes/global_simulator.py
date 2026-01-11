"""
═══════════════════════════════════════════════════════════════════════════════
🌍 AUTUS Global Simulator v3.0 (글로벌 시뮬레이터)
═══════════════════════════════════════════════════════════════════════════════

80억 인류의 압력 분포를 시뮬레이션
에너지 소비: 0 (물리법칙 기반 계산만)

원리:
- 10개 아키타입 × 지역별 분포 × 물리법칙 = 실시간 글로벌 상태
- 실제 데이터 없이도 "살아있는 느낌" 연출

"5%의 완벽한 틀이 100%의 살아있는 우주를 만든다"
═══════════════════════════════════════════════════════════════════════════════
"""

import math
import time
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 정의
# ═══════════════════════════════════════════════════════════════════════════════

GLOBAL_POPULATION = 8_000_000_000

# 10개 아키타입
ARCHETYPES = {
    "A01": {"name": "창업가", "emoji": "🚀", "ratio": 0.02},
    "A02": {"name": "직장인", "emoji": "💼", "ratio": 0.45},
    "A03": {"name": "학생", "emoji": "📚", "ratio": 0.15},
    "A04": {"name": "프리랜서", "emoji": "🎨", "ratio": 0.08},
    "A05": {"name": "은퇴자", "emoji": "🌅", "ratio": 0.12},
    "A06": {"name": "창작자", "emoji": "✨", "ratio": 0.05},
    "A07": {"name": "투자자", "emoji": "📈", "ratio": 0.03},
    "A08": {"name": "소상공인", "emoji": "🏪", "ratio": 0.06},
    "A09": {"name": "구직자", "emoji": "🔍", "ratio": 0.04},
    "A10": {"name": "양육자", "emoji": "👨‍👩‍👧", "ratio": 0.20},
}

# 지역별 데이터
REGIONS = {
    "ASIA": {"population": 4_700_000_000, "timezone_offset": 8, "activity_peak": 14, "flag": "🌏"},
    "EUROPE": {"population": 750_000_000, "timezone_offset": 1, "activity_peak": 15, "flag": "🌍"},
    "NORTH_AMERICA": {"population": 580_000_000, "timezone_offset": -5, "activity_peak": 14, "flag": "🌎"},
    "SOUTH_AMERICA": {"population": 430_000_000, "timezone_offset": -3, "activity_peak": 15, "flag": "🌎"},
    "AFRICA": {"population": 1_400_000_000, "timezone_offset": 2, "activity_peak": 13, "flag": "🌍"},
    "OCEANIA": {"population": 45_000_000, "timezone_offset": 10, "activity_peak": 14, "flag": "🌏"},
}

# 36개 노드 (5개 레이어)
NODES = {
    # Financial (n01-n08)
    "n01": {"name": "현금", "layer": "financial"},
    "n02": {"name": "예금", "layer": "financial"},
    "n03": {"name": "런웨이", "layer": "financial"},
    "n04": {"name": "투자", "layer": "financial"},
    "n05": {"name": "부채", "layer": "financial"},
    "n06": {"name": "지출", "layer": "financial"},
    "n07": {"name": "수익", "layer": "financial"},
    "n08": {"name": "현금흐름", "layer": "financial"},
    # Biometric (n09-n15)
    "n09": {"name": "수면", "layer": "biometric"},
    "n10": {"name": "HRV", "layer": "biometric"},
    "n11": {"name": "피로", "layer": "biometric"},
    "n12": {"name": "활동", "layer": "biometric"},
    "n13": {"name": "영양", "layer": "biometric"},
    "n14": {"name": "건강", "layer": "biometric"},
    "n15": {"name": "스트레스", "layer": "biometric"},
    # Operational (n16-n23)
    "n16": {"name": "마감", "layer": "operational"},
    "n17": {"name": "백로그", "layer": "operational"},
    "n18": {"name": "생산성", "layer": "operational"},
    "n19": {"name": "태스크", "layer": "operational"},
    "n20": {"name": "오류", "layer": "operational"},
    "n21": {"name": "기술부채", "layer": "operational"},
    "n22": {"name": "배포", "layer": "operational"},
    "n23": {"name": "문서", "layer": "operational"},
    # Customer (n24-n30)
    "n24": {"name": "리텐션", "layer": "customer"},
    "n25": {"name": "이탈률", "layer": "customer"},
    "n26": {"name": "NPS", "layer": "customer"},
    "n27": {"name": "피드백", "layer": "customer"},
    "n28": {"name": "관계", "layer": "customer"},
    "n29": {"name": "CAC", "layer": "customer"},
    "n30": {"name": "ARPU", "layer": "customer"},
    # External (n31-n36)
    "n31": {"name": "변동성", "layer": "external"},
    "n32": {"name": "규제", "layer": "external"},
    "n33": {"name": "지정학", "layer": "external"},
    "n34": {"name": "경쟁", "layer": "external"},
    "n35": {"name": "기후", "layer": "external"},
    "n36": {"name": "티핑포인트", "layer": "external"},
}

# 런칭일
LAUNCH_DATE = datetime(2025, 1, 1, tzinfo=timezone.utc)


# ═══════════════════════════════════════════════════════════════════════════════
# 글로벌 시뮬레이터
# ═══════════════════════════════════════════════════════════════════════════════

class GlobalSimulator:
    """
    80억 인류 시뮬레이션 엔진
    
    물리법칙 기반으로 실시간 상태 계산
    에너지 소비: 0
    """
    
    def __init__(self):
        self.start_time = time.time()
        self._base_synced = self._calculate_initial_sync()
    
    # ─────────────────────────────────────────────────────────────────────────
    # 초기화 계산
    # ─────────────────────────────────────────────────────────────────────────
    
    def _calculate_initial_sync(self) -> int:
        """
        초기 동기화 사용자 수 계산
        - 서비스 런칭 시점부터 경과 시간 기반
        - 로그 성장 곡선 (초기 급성장 → 안정화)
        """
        now = datetime.now(timezone.utc)
        days_since_launch = (now - LAUNCH_DATE).total_seconds() / (60 * 60 * 24)
        
        # 로그 성장: 초기 10,000 + 일당 로그 성장
        base = 10_000
        growth = math.log10(max(days_since_launch, 1) + 1) * 1_000_000
        
        return int(base + growth)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 실시간 카운터
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_live_sync_count(self) -> int:
        """
        실시간 동기화 카운터
        - 초당 자연 증가 + 랜덤 변동
        """
        elapsed = time.time() - self.start_time
        natural_growth = elapsed * 0.5  # 초당 0.5명
        random_variation = math.sin(elapsed * 0.1) * 10
        
        return int(self._base_synced + natural_growth + random_variation)
    
    def get_sync_per_second(self) -> float:
        """초당 동기화 속도"""
        return 0.5 + math.sin(time.time() * 0.1) * 0.3
    
    # ─────────────────────────────────────────────────────────────────────────
    # 활성 사용자
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_active_users(self) -> int:
        """
        현재 시간 기반 활성 사용자 계산
        - 지역별 시간대 고려
        - 피크 시간대 activity 증가
        """
        now = datetime.now(timezone.utc)
        utc_hour = now.hour
        
        total_active = 0
        
        for region_name, region_data in REGIONS.items():
            local_hour = (utc_hour + region_data["timezone_offset"]) % 24
            
            # 수면 시간 (23-6시) 활동 감소
            if local_hour >= 23 or local_hour < 6:
                activity_multiplier = 0.2
            elif 6 <= local_hour < 9:
                activity_multiplier = 0.6  # 아침
            elif abs(local_hour - region_data["activity_peak"]) <= 2:
                activity_multiplier = 1.3  # 피크 시간
            else:
                activity_multiplier = 1.0
            
            region_synced = self._base_synced * (region_data["population"] / GLOBAL_POPULATION)
            total_active += region_synced * activity_multiplier * 0.1  # 10% DAU
        
        return int(total_active)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노드 압력
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_global_node_pressure(self, node_id: str) -> float:
        """
        글로벌 노드 압력 계산
        - 아키타입 분포 × 노드 가중치
        - 시간대별 변동
        """
        now = datetime.now()
        hour = now.hour
        
        # 기본 압력
        base_pressure = 0.5
        
        # 시간대별 조정
        time_factors = {
            "financial": 1.2 if 9 <= hour <= 17 else 0.9,
            "biometric": 1.3 if hour >= 22 or hour < 6 else 0.8,
            "operational": 1.4 if 9 <= hour <= 18 else 0.6,
            "customer": 1.2 if 10 <= hour <= 20 else 0.8,
            "external": 1.0 + math.sin(hour * 0.26) * 0.2,
        }
        
        node = NODES.get(node_id)
        if node:
            base_pressure *= time_factors.get(node["layer"], 1.0)
        
        # 랜덤 변동 (±10%)
        random_factor = 0.9 + (math.sin(time.time() + hash(node_id)) * 0.5 + 0.5) * 0.2
        
        return max(0.0, min(1.0, base_pressure * random_factor))
    
    def get_all_node_pressures(self) -> Dict[str, float]:
        """모든 노드의 압력 조회"""
        return {
            node_id: self.get_global_node_pressure(node_id)
            for node_id in NODES.keys()
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 공명 지수
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_resonance_value(self) -> int:
        """
        글로벌 공명 값 계산
        - 모든 노드 압력의 조화
        - 낮을수록 좋음 (평형 상태)
        """
        total_dissonance = 0.0
        
        for node_id in NODES.keys():
            pressure = self.get_global_node_pressure(node_id)
            # 0.5에서 벗어날수록 불협화음
            total_dissonance += abs(pressure - 0.5)
        
        # 공명값 = 100 - 평균 불협화음
        avg_dissonance = total_dissonance / len(NODES)
        return int((1 - avg_dissonance) * 100)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 지역별 현황
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_regional_sync(self) -> List[Dict]:
        """지역별 동기화 상태"""
        total_synced = self.get_live_sync_count()
        total_active = self.get_active_users()
        
        result = []
        for region_name, region_data in REGIONS.items():
            region_ratio = region_data["population"] / GLOBAL_POPULATION
            synced = int(total_synced * region_ratio)
            active = int(total_active * region_ratio)
            
            result.append({
                "name": region_name,
                "flag": region_data["flag"],
                "population": region_data["population"],
                "synced": synced,
                "active": active,
                "sync_rate": round((synced / region_data["population"]) * 100, 6),
            })
        
        return result
    
    # ─────────────────────────────────────────────────────────────────────────
    # 아키타입 분포
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_archetype_distribution(self) -> List[Dict]:
        """아키타입별 분포"""
        total_synced = self.get_live_sync_count()
        
        return [
            {
                "id": arch_id,
                "name": arch_data["name"],
                "emoji": arch_data["emoji"],
                "ratio": arch_data["ratio"],
                "count": int(total_synced * arch_data["ratio"]),
                "global_count": int(GLOBAL_POPULATION * arch_data["ratio"]),
            }
            for arch_id, arch_data in ARCHETYPES.items()
        ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # 전체 스냅샷
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_snapshot(self) -> Dict:
        """전체 상태 스냅샷"""
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "global": {
                "total_synced": self.get_live_sync_count(),
                "active_now": self.get_active_users(),
                "resonance": self.get_resonance_value(),
                "sync_per_second": round(self.get_sync_per_second(), 2),
            },
            "regions": self.get_regional_sync(),
            "archetypes": self.get_archetype_distribution(),
            "nodes": {
                node_id: {
                    **node_data,
                    "pressure": round(self.get_global_node_pressure(node_id), 4),
                }
                for node_id, node_data in NODES.items()
            },
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 아키타입 매칭 (온보딩)
# ═══════════════════════════════════════════════════════════════════════════════

class ArchetypeMatcher:
    """
    사용자 온보딩 - 아키타입 매칭
    
    3개의 간단한 질문으로 아키타입 조합 결정
    """
    
    # 온보딩 질문
    QUESTIONS = [
        {
            "id": "q1",
            "question": "당신의 주된 수입원은?",
            "options": [
                {"label": "회사 월급", "archetypes": {"A02": 0.8, "A10": 0.2}},
                {"label": "내 사업", "archetypes": {"A01": 0.5, "A08": 0.5}},
                {"label": "프로젝트/계약", "archetypes": {"A04": 0.7, "A06": 0.3}},
                {"label": "투자 수익", "archetypes": {"A07": 0.9, "A05": 0.1}},
                {"label": "없음/구직중", "archetypes": {"A09": 0.7, "A03": 0.3}},
            ],
        },
        {
            "id": "q2",
            "question": "지금 가장 큰 고민은?",
            "options": [
                {"label": "돈이 부족해요", "archetypes": {"A01": 0.3, "A08": 0.3, "A09": 0.4}},
                {"label": "시간이 부족해요", "archetypes": {"A02": 0.4, "A10": 0.4, "A04": 0.2}},
                {"label": "방향을 모르겠어요", "archetypes": {"A03": 0.5, "A09": 0.3, "A06": 0.2}},
                {"label": "건강이 걱정돼요", "archetypes": {"A05": 0.6, "A10": 0.3, "A02": 0.1}},
                {"label": "성장이 멈춘 느낌", "archetypes": {"A02": 0.4, "A04": 0.3, "A06": 0.3}},
            ],
        },
        {
            "id": "q3",
            "question": "5년 후 원하는 모습은?",
            "options": [
                {"label": "재정적 자유", "archetypes": {"A07": 0.4, "A01": 0.4, "A08": 0.2}},
                {"label": "일과 삶의 균형", "archetypes": {"A02": 0.4, "A10": 0.4, "A05": 0.2}},
                {"label": "영향력 있는 사람", "archetypes": {"A06": 0.5, "A01": 0.3, "A04": 0.2}},
                {"label": "전문가로 인정", "archetypes": {"A04": 0.5, "A02": 0.3, "A06": 0.2}},
                {"label": "평화로운 삶", "archetypes": {"A05": 0.5, "A10": 0.3, "A02": 0.2}},
            ],
        },
    ]
    
    @classmethod
    def get_questions(cls) -> List[Dict]:
        """온보딩 질문 반환"""
        return cls.QUESTIONS
    
    @classmethod
    def calculate_archetypes(cls, answers: List[Dict]) -> List[Dict]:
        """
        응답 기반 아키타입 조합 계산
        
        Args:
            answers: 선택한 옵션 리스트 [{"archetypes": {...}}, ...]
        
        Returns:
            상위 3개 아키타입과 가중치
        """
        # 점수 초기화
        scores = {arch_id: 0.0 for arch_id in ARCHETYPES.keys()}
        
        # 응답별 점수 합산
        for answer in answers:
            for arch_id, weight in answer.get("archetypes", {}).items():
                scores[arch_id] += weight
        
        # 상위 3개 추출
        sorted_archetypes = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # 정규화
        total_score = sum(score for _, score in sorted_archetypes)
        
        return [
            {
                "id": arch_id,
                "name": ARCHETYPES[arch_id]["name"],
                "emoji": ARCHETYPES[arch_id]["emoji"],
                "weight": round(score / total_score, 2) if total_score > 0 else 0,
            }
            for arch_id, score in sorted_archetypes
        ]
    
    @classmethod
    def generate_sync_number(cls, simulator: GlobalSimulator) -> int:
        """동기화 번호 생성"""
        return simulator.get_live_sync_count() + 1


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴
# ═══════════════════════════════════════════════════════════════════════════════

_simulator: Optional[GlobalSimulator] = None


def get_global_simulator() -> GlobalSimulator:
    """글로벌 시뮬레이터 싱글턴"""
    global _simulator
    if _simulator is None:
        _simulator = GlobalSimulator()
    return _simulator


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "GlobalSimulator",
    "ArchetypeMatcher",
    "ARCHETYPES",
    "REGIONS",
    "NODES",
    "GLOBAL_POPULATION",
    "get_global_simulator",
]
