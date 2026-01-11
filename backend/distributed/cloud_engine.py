"""
AUTUS Cloud Calibration Engine v2.1
====================================

클라우드에서 실행되는 보정 엔진

- 익명화된 메타데이터 수집
- 전체/코호트별 상관관계 분석
- 최적 물리 상수 계산
- 조기 경보 패턴 추출

핵심 원칙: 법칙만 클라우드에서 흐르게 한다
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime
from collections import defaultdict
import statistics

from .protocol import (
    UpstreamPacket, DownstreamPacket, Cohort,
    EarlyWarningPattern
)


@dataclass
class AggregatedNodeStats:
    """집계된 노드 통계"""
    node_id: str
    pressure_values: List[float] = field(default_factory=list)
    phase_shift_count: int = 0
    state_distribution: Dict[str, int] = field(default_factory=dict)
    
    @property
    def avg_pressure(self) -> float:
        return statistics.mean(self.pressure_values) if self.pressure_values else 0.0
    
    @property
    def std_pressure(self) -> float:
        return statistics.stdev(self.pressure_values) if len(self.pressure_values) > 1 else 0.0


@dataclass
class AggregatedEdgeStats:
    """집계된 엣지 통계"""
    edge_id: str
    observed_strengths: List[float] = field(default_factory=list)
    
    @property
    def avg_strength(self) -> float:
        return statistics.mean(self.observed_strengths) if self.observed_strengths else 0.0


class CloudCalibrationEngine:
    """
    클라우드 보정 엔진
    
    - 익명화된 메타데이터 수집
    - 전체/코호트별 상관관계 분석
    - 최적 물리 상수 계산
    - 조기 경보 패턴 추출
    
    절대 저장하지 않는 것:
    - 개인 식별 정보
    - Raw 데이터
    - 실제 금액/시간
    """
    
    VERSION = "2.1.0"
    
    def __init__(self):
        # 수집된 패킷 (메모리/DB)
        self.upstream_packets: List[UpstreamPacket] = []
        
        # 집계된 통계
        self.global_node_stats: Dict[str, AggregatedNodeStats] = {}
        self.global_edge_stats: Dict[str, AggregatedEdgeStats] = {}
        
        # 코호트별 통계
        self.cohort_node_stats: Dict[str, Dict[str, AggregatedNodeStats]] = defaultdict(dict)
        self.cohort_edge_stats: Dict[str, Dict[str, AggregatedEdgeStats]] = defaultdict(dict)
        
        # 계산된 상수
        self.global_constants: Dict = {"physics": {}, "edges": {}}
        self.cohort_constants: Dict[str, Dict] = {}
        
        # 외부 환경 데이터 (API에서 수집)
        self.external_factors = {
            "interest_rate": 4.5,       # 기준금리
            "market_volatility": 0.15,  # 시장 변동성
            "inflation_rate": 3.5,      # 인플레이션
            "unemployment_rate": 3.0    # 실업률
        }
        
        # 발견된 조기 경보 패턴
        self.early_warning_patterns: List[EarlyWarningPattern] = []
        
        # 알려진 장치 ID (중복 방지)
        self.known_devices: Set[str] = set()
    
    # ========================================
    # 데이터 수집
    # ========================================
    
    def receive_upstream(self, packet: UpstreamPacket) -> bool:
        """
        Upstream 패킷 수신
        
        Returns:
            bool: 수신 성공 여부
        """
        # 중복 검사 (같은 시간대 같은 장치)
        packet_key = f"{packet.device_id}_{packet.timestamp[:10]}"
        if packet_key in self.known_devices:
            return False
        
        self.known_devices.add(packet_key)
        self.upstream_packets.append(packet)
        
        # 실시간 집계
        self._aggregate_packet(packet)
        
        return True
    
    def _aggregate_packet(self, packet: UpstreamPacket):
        """패킷 데이터 집계"""
        cohort = packet.cohort
        
        # 노드 통계 집계
        for stat in packet.node_stats:
            node_id = stat.get("node_id")
            avg_p = stat.get("avg_pressure_24h", 0)
            state = stat.get("current_state", "IGNORABLE")
            phase_shift = stat.get("phase_shift_count", 0)
            
            # Global 집계
            if node_id not in self.global_node_stats:
                self.global_node_stats[node_id] = AggregatedNodeStats(node_id=node_id)
            
            gns = self.global_node_stats[node_id]
            gns.pressure_values.append(avg_p)
            gns.phase_shift_count += phase_shift
            gns.state_distribution[state] = gns.state_distribution.get(state, 0) + 1
            
            # Cohort 집계
            if node_id not in self.cohort_node_stats[cohort]:
                self.cohort_node_stats[cohort][node_id] = AggregatedNodeStats(node_id=node_id)
            
            cns = self.cohort_node_stats[cohort][node_id]
            cns.pressure_values.append(avg_p)
            cns.phase_shift_count += phase_shift
            cns.state_distribution[state] = cns.state_distribution.get(state, 0) + 1
        
        # 엣지 통계 집계
        for corr in packet.edge_correlations:
            edge_id = corr.get("edge_id")
            strength = corr.get("observed_strength", 0)
            
            # Global 집계
            if edge_id not in self.global_edge_stats:
                self.global_edge_stats[edge_id] = AggregatedEdgeStats(edge_id=edge_id)
            
            self.global_edge_stats[edge_id].observed_strengths.append(strength)
            
            # Cohort 집계
            if edge_id not in self.cohort_edge_stats[cohort]:
                self.cohort_edge_stats[cohort][edge_id] = AggregatedEdgeStats(edge_id=edge_id)
            
            self.cohort_edge_stats[cohort][edge_id].observed_strengths.append(strength)
    
    # ========================================
    # 분석 및 최적화
    # ========================================
    
    def analyze_global_patterns(self):
        """
        전체 사용자 패턴 분석
        
        높은 압력 노드 → 전도도 상향 (빠른 경보)
        높은 상관관계 엣지 → 가중치 상향
        """
        # 노드별 최적 상수 계산
        for node_id, stats in self.global_node_stats.items():
            avg_p = stats.avg_pressure
            std_p = stats.std_pressure
            
            # 압력이 높을수록 전도도 올림 (빠른 경보)
            calibrated_k = 0.5 + avg_p * 0.5
            
            # 변동성이 클수록 엔트로피 올림
            calibrated_e = 0.01 + std_p * 0.05
            
            self.global_constants["physics"][node_id] = {
                "k": round(calibrated_k, 4),
                "entropy": round(calibrated_e, 5)
            }
        
        # 엣지별 최적 가중치 계산
        for edge_id, stats in self.global_edge_stats.items():
            avg_s = stats.avg_strength
            
            # 관측된 강도가 높으면 가중치 유지/상향
            calibrated_w = max(0.3, min(1.0, avg_s))
            
            self.global_constants["edges"][edge_id] = {
                "weight": round(calibrated_w, 4)
            }
    
    def analyze_cohort_patterns(self):
        """코호트별 패턴 분석"""
        for cohort, node_stats in self.cohort_node_stats.items():
            self.cohort_constants[cohort] = {"physics": {}, "edges": {}}
            
            # 노드 상수
            for node_id, stats in node_stats.items():
                avg_p = stats.avg_pressure
                std_p = stats.std_pressure
                
                self.cohort_constants[cohort]["physics"][node_id] = {
                    "k": round(0.5 + avg_p * 0.5, 4),
                    "entropy": round(0.01 + std_p * 0.05, 5)
                }
            
            # 엣지 가중치
            edge_stats = self.cohort_edge_stats.get(cohort, {})
            for edge_id, stats in edge_stats.items():
                avg_s = stats.avg_strength
                self.cohort_constants[cohort]["edges"][edge_id] = {
                    "weight": round(max(0.3, min(1.0, avg_s)), 4)
                }
    
    def extract_early_warnings(self):
        """
        조기 경보 패턴 추출
        
        상전이 전 패턴 분석하여 경보 규칙 생성
        """
        # 기본 경보 패턴 (도메인 지식 기반)
        self.early_warning_patterns = [
            EarlyWarningPattern(
                trigger="n09 < 5.0 AND n18 > 30",
                boost_edge="e32",
                boost_factor=1.3,
                description="수면 부족 + 태스크 과다 → HRV-지연 증폭"
            ),
            EarlyWarningPattern(
                trigger="n05 < 8 AND n31 > 20",
                boost_edge="e40",
                boost_factor=1.4,
                description="런웨이 부족 + 이직률 상승 → 악순환 증폭"
            ),
            EarlyWarningPattern(
                trigger="n24 > 10 AND n26 < 20",
                boost_edge="e20",
                boost_factor=1.2,
                description="이탈률 상승 + 반복구매 저조 → 고객 붕괴"
            ),
            EarlyWarningPattern(
                trigger="n10 < 25 AND n12 > 6",
                boost_edge="e13",
                boost_factor=1.3,
                description="HRV 저하 + 연속작업 과다 → 병가 위험"
            ),
            EarlyWarningPattern(
                trigger="n01 < 10000000 AND n03 > 8000000",
                boost_edge="e01",
                boost_factor=1.5,
                description="현금 부족 + 지출 과다 → 생존 위기"
            )
        ]
        
        # TODO: 데이터 기반 패턴 추출 (상전이 직전 패턴 학습)
    
    def calculate_external_entropy(self) -> Dict[str, float]:
        """
        외부 환경 엔트로피 계산
        
        금리, 시장 변동성 등 외부 요인 반영
        """
        result = {}
        
        # 금리 영향 → 부채 노드 (n04, n35)
        if self.external_factors["interest_rate"] > 5:
            delta = (self.external_factors["interest_rate"] - 5) * 0.002
            result["n04"] = delta  # 부채 엔트로피 증가
            result["n35"] = delta * 0.6
        
        # 시장 변동성 영향 → 외부 노드
        if self.external_factors["market_volatility"] > 0.2:
            delta = (self.external_factors["market_volatility"] - 0.2) * 0.01
            result["n33"] = delta  # 시장성장률 변동
            result["n34"] = delta * 1.5  # 환율변동
        
        # 인플레이션 영향 → 지출/마진
        if self.external_factors["inflation_rate"] > 3:
            delta = (self.external_factors["inflation_rate"] - 3) * 0.001
            result["n03"] = delta  # 지출 압력
            result["n08"] = delta * 0.5  # 마진 압력
        
        return result
    
    # ========================================
    # Downstream 생성
    # ========================================
    
    def generate_downstream_packet(self, cohort: str) -> DownstreamPacket:
        """
        Downstream 패킷 생성
        
        Args:
            cohort: 타겟 코호트
        
        Returns:
            DownstreamPacket: 보정된 물리 상수
        """
        # 분석 실행 (최신화)
        self.analyze_global_patterns()
        self.analyze_cohort_patterns()
        self.extract_early_warnings()
        
        return DownstreamPacket(
            version=self.VERSION,
            timestamp=datetime.now().isoformat(),
            global_constants=self.global_constants,
            cohort_constants=self.cohort_constants.get(cohort, {"physics": {}, "edges": {}}),
            external_entropy=self.calculate_external_entropy(),
            early_warning={
                "patterns": [p.to_dict() for p in self.early_warning_patterns]
            }
        )
    
    # ========================================
    # 외부 데이터 업데이트
    # ========================================
    
    def update_external_factors(self, factors: Dict):
        """
        외부 환경 데이터 업데이트
        
        실제 환경에서는 API로 자동 수집
        """
        self.external_factors.update(factors)
    
    # ========================================
    # 통계 조회
    # ========================================
    
    def get_global_stats(self) -> Dict:
        """전체 통계 조회"""
        return {
            "total_packets": len(self.upstream_packets),
            "total_devices": len(self.known_devices),
            "total_cohorts": len(self.cohort_node_stats),
            "node_count": len(self.global_node_stats),
            "edge_count": len(self.global_edge_stats),
            "early_warning_patterns": len(self.early_warning_patterns)
        }
    
    def get_cohort_stats(self, cohort: str) -> Dict:
        """코호트별 통계 조회"""
        packets = [p for p in self.upstream_packets if p.cohort == cohort]
        
        return {
            "cohort": cohort,
            "packet_count": len(packets),
            "node_count": len(self.cohort_node_stats.get(cohort, {})),
            "edge_count": len(self.cohort_edge_stats.get(cohort, {}))
        }
    
    def get_node_analysis(self, node_id: str) -> Optional[Dict]:
        """노드별 분석 결과 조회"""
        stats = self.global_node_stats.get(node_id)
        if not stats:
            return None
        
        return {
            "node_id": node_id,
            "avg_pressure": stats.avg_pressure,
            "std_pressure": stats.std_pressure,
            "sample_count": len(stats.pressure_values),
            "phase_shift_count": stats.phase_shift_count,
            "state_distribution": stats.state_distribution,
            "calibrated_k": self.global_constants.get("physics", {}).get(node_id, {}).get("k"),
            "calibrated_entropy": self.global_constants.get("physics", {}).get(node_id, {}).get("entropy")
        }
    
    def to_dict(self) -> Dict:
        """전체 상태를 딕셔너리로"""
        return {
            "version": self.VERSION,
            "stats": self.get_global_stats(),
            "external_factors": self.external_factors,
            "global_constants_count": {
                "physics": len(self.global_constants.get("physics", {})),
                "edges": len(self.global_constants.get("edges", {}))
            }
        }
