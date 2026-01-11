"""
═══════════════════════════════════════════════════════════════════════════════
📏 AUTUS v3.0 - Measurement Layer (측정 계층)
═══════════════════════════════════════════════════════════════════════════════

변수 측정 방법:

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   [외부 소스] → [측정기] → [정규화] → [변수] → [저장소]                      │
│                                                                             │
│   Banking API  → CashMeter    → 0~1 → UserVar.n01 → LocalStore             │
│   Wearable     → HealthMeter  → 0~1 → UserVar.n09 → LocalStore             │
│   User Input   → ManualMeter  → 0~1 → UserVar.xxx → LocalStore             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Literal, Optional, Tuple
from datetime import datetime
from abc import ABC, abstractmethod
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 측정 소스 정의
# ═══════════════════════════════════════════════════════════════════════════════

class MeasurementSource(Enum):
    """측정 소스 타입"""
    # 자동 소스 (API 연동)
    BANKING = 'banking'           # 은행 API
    ACCOUNTING = 'accounting'     # 회계 소프트웨어
    WEARABLE = 'wearable'         # 웨어러블 기기
    CALENDAR = 'calendar'         # 캘린더
    PROJECT = 'project'           # 프로젝트 관리 도구
    CRM = 'crm'                   # CRM
    ANALYTICS = 'analytics'       # 분석 도구
    MARKET = 'market'             # 시장 데이터
    
    # 수동 소스 (사용자 입력)
    MANUAL_SCALE = 'manual_scale'     # 1~10 스케일
    MANUAL_BINARY = 'manual_binary'   # 예/아니오
    MANUAL_CHOICE = 'manual_choice'   # 선택지
    MANUAL_NUMBER = 'manual_number'   # 직접 숫자


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 측정기 인터페이스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class RawMeasurement:
    """원시 측정값"""
    source: MeasurementSource
    field_name: str
    raw_value: Any
    unit: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class NormalizedMeasurement:
    """정규화된 측정값 (0~1)"""
    source: MeasurementSource
    node_id: str
    pressure: float           # 0~1로 정규화됨
    confidence: float         # 측정 신뢰도 0~1
    raw: RawMeasurement
    timestamp: datetime = field(default_factory=datetime.now)


class BaseMeter(ABC):
    """측정기 기본 클래스"""
    
    @abstractmethod
    def measure(self, raw_data: Dict[str, Any]) -> List[RawMeasurement]:
        """원시 데이터 측정"""
        pass
    
    @abstractmethod
    def normalize(self, raw: RawMeasurement) -> NormalizedMeasurement:
        """압력값으로 정규화 (0~1)"""
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 정규화 함수들
# ═══════════════════════════════════════════════════════════════════════════════

class Normalizers:
    """정규화 함수 모음"""
    
    @staticmethod
    def threshold(value: float, low: float, high: float) -> float:
        """
        임계값 기반 정규화
        
        low 이하 → 0, high 이상 → 1, 사이 → 선형 보간
        """
        if value <= low:
            return 0.0
        if value >= high:
            return 1.0
        return (value - low) / (high - low)
    
    @staticmethod
    def inverse_threshold(value: float, low: float, high: float) -> float:
        """
        역 임계값 (높을수록 압력 낮음)
        
        예: 현금 많으면 압력 낮음
        """
        return 1.0 - Normalizers.threshold(value, low, high)
    
    @staticmethod
    def steps(value: float, steps: List[Tuple[float, float]]) -> float:
        """
        계단식 정규화
        
        steps = [(threshold, pressure), ...]
        예: [(3, 1.0), (6, 0.7), (12, 0.4), (inf, 0.2)]
        """
        for threshold, pressure in steps:
            if value < threshold:
                return pressure
        return steps[-1][1]
    
    @staticmethod
    def scale_10(value: float) -> float:
        """1~10 스케일 → 0~1"""
        return max(0, min(1, (value - 1) / 9))
    
    @staticmethod
    def percentage(value: float) -> float:
        """백분율 → 0~1"""
        return max(0, min(1, value / 100))
    
    @staticmethod
    def binary(value: bool) -> float:
        """이진값 → 0 또는 1"""
        return 1.0 if value else 0.0
    
    @staticmethod
    def sigmoid(value: float, center: float, steepness: float = 1.0) -> float:
        """
        시그모이드 정규화 (부드러운 전환)
        
        center: 0.5가 되는 지점
        steepness: 전환 급격도
        """
        return 1 / (1 + math.exp(-steepness * (value - center)))


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 구체적 측정기 구현
# ═══════════════════════════════════════════════════════════════════════════════

class FinancialMeter(BaseMeter):
    """
    재무 측정기
    
    측정 대상:
    - n01: 현금 (Cash)
    - n02: 현금흐름 (CashFlow)
    - n03: 런웨이 (Runway)
    - n04: 매출 (Revenue)
    - n05: 부채 (Debt)
    """
    
    # 정규화 설정 (사용자 환경에 맞게 조정 가능)
    THRESHOLDS = {
        'balance': {
            'low': 1_000_000,      # 100만원 이하 → 위험
            'high': 10_000_000,    # 1000만원 이상 → 안전
        },
        'cashflow': {
            'low': -500_000,       # 월 -50만원 → 위험
            'high': 500_000,       # 월 +50만원 → 안전
        },
        'runway_months': [         # 계단식
            (3, 1.0),             # 3개월 미만 → 위험
            (6, 0.7),             # 6개월 미만 → 경고
            (12, 0.4),            # 12개월 미만 → 주의
            (float('inf'), 0.2),  # 12개월 이상 → 안전
        ],
        'debt_ratio': {
            'low': 0.3,            # 30% 이하 → 안전
            'high': 0.7,           # 70% 이상 → 위험
        },
    }
    
    def measure(self, raw_data: Dict[str, Any]) -> List[RawMeasurement]:
        measurements = []
        
        if 'balance' in raw_data:
            measurements.append(RawMeasurement(
                source=MeasurementSource.BANKING,
                field_name='balance',
                raw_value=raw_data['balance'],
                unit='KRW',
            ))
        
        if 'monthly_cashflow' in raw_data:
            measurements.append(RawMeasurement(
                source=MeasurementSource.ACCOUNTING,
                field_name='cashflow',
                raw_value=raw_data['monthly_cashflow'],
                unit='KRW/month',
            ))
        
        if 'runway_months' in raw_data:
            measurements.append(RawMeasurement(
                source=MeasurementSource.ACCOUNTING,
                field_name='runway_months',
                raw_value=raw_data['runway_months'],
                unit='months',
            ))
        
        return measurements
    
    def normalize(self, raw: RawMeasurement) -> NormalizedMeasurement:
        node_map = {
            'balance': 'n01',
            'cashflow': 'n02',
            'runway_months': 'n03',
        }
        
        node_id = node_map.get(raw.field_name, 'n01')
        
        if raw.field_name == 'balance':
            t = self.THRESHOLDS['balance']
            pressure = Normalizers.inverse_threshold(raw.raw_value, t['low'], t['high'])
        elif raw.field_name == 'cashflow':
            t = self.THRESHOLDS['cashflow']
            pressure = Normalizers.inverse_threshold(raw.raw_value, t['low'], t['high'])
        elif raw.field_name == 'runway_months':
            pressure = Normalizers.steps(raw.raw_value, self.THRESHOLDS['runway_months'])
        else:
            pressure = 0.5
        
        return NormalizedMeasurement(
            source=raw.source,
            node_id=node_id,
            pressure=pressure,
            confidence=0.9,  # API 데이터는 신뢰도 높음
            raw=raw,
        )


class BiometricMeter(BaseMeter):
    """
    생체 측정기
    
    측정 대상:
    - n09: 수면 (Sleep)
    - n10: HRV
    - n11: 활동량 (Activity)
    - n12: 집중시간 (Focus)
    - n15: 스트레스 (Stress)
    """
    
    THRESHOLDS = {
        'sleep_hours': [
            (5, 1.0),             # 5시간 미만 → 위험
            (6, 0.7),             # 6시간 미만 → 경고
            (7, 0.4),             # 7시간 미만 → 주의
            (float('inf'), 0.2),  # 7시간 이상 → 양호
        ],
        'hrv': [
            (20, 1.0),            # HRV 20 미만 → 위험
            (40, 0.7),            # HRV 40 미만 → 경고
            (60, 0.4),            # HRV 60 미만 → 주의
            (float('inf'), 0.2),  # HRV 60 이상 → 양호
        ],
        'stress_score': {
            'low': 0,
            'high': 100,
        },
        'steps': {
            'low': 3000,          # 3000보 이하 → 위험
            'high': 10000,        # 10000보 이상 → 양호
        },
    }
    
    def measure(self, raw_data: Dict[str, Any]) -> List[RawMeasurement]:
        measurements = []
        
        fields = [
            ('sleep_hours', 'hours'),
            ('hrv', 'ms'),
            ('stress_score', 'score'),
            ('steps', 'steps'),
            ('focus_hours', 'hours'),
        ]
        
        for field, unit in fields:
            if field in raw_data:
                measurements.append(RawMeasurement(
                    source=MeasurementSource.WEARABLE,
                    field_name=field,
                    raw_value=raw_data[field],
                    unit=unit,
                ))
        
        return measurements
    
    def normalize(self, raw: RawMeasurement) -> NormalizedMeasurement:
        node_map = {
            'sleep_hours': 'n09',
            'hrv': 'n10',
            'steps': 'n11',
            'focus_hours': 'n12',
            'stress_score': 'n15',
        }
        
        node_id = node_map.get(raw.field_name, 'n09')
        
        if raw.field_name == 'sleep_hours':
            pressure = Normalizers.steps(raw.raw_value, self.THRESHOLDS['sleep_hours'])
        elif raw.field_name == 'hrv':
            pressure = Normalizers.steps(raw.raw_value, self.THRESHOLDS['hrv'])
        elif raw.field_name == 'stress_score':
            pressure = Normalizers.percentage(raw.raw_value)
        elif raw.field_name == 'steps':
            t = self.THRESHOLDS['steps']
            pressure = Normalizers.inverse_threshold(raw.raw_value, t['low'], t['high'])
        else:
            pressure = 0.5
        
        return NormalizedMeasurement(
            source=raw.source,
            node_id=node_id,
            pressure=pressure,
            confidence=0.85,
            raw=raw,
        )


class ManualMeter(BaseMeter):
    """
    수동 측정기 (사용자 직접 입력)
    
    입력 방식:
    1. 1~10 스케일: "현재 스트레스 레벨은?" → 7
    2. 이진 선택: "오늘 운동했나요?" → Yes/No
    3. 선택지: "수면 품질은?" → 나쁨/보통/좋음
    """
    
    def measure(self, raw_data: Dict[str, Any]) -> List[RawMeasurement]:
        measurements = []
        
        for field, value in raw_data.items():
            source = MeasurementSource.MANUAL_SCALE
            if isinstance(value, bool):
                source = MeasurementSource.MANUAL_BINARY
            elif isinstance(value, str):
                source = MeasurementSource.MANUAL_CHOICE
            
            measurements.append(RawMeasurement(
                source=source,
                field_name=field,
                raw_value=value,
                unit='manual',
            ))
        
        return measurements
    
    def normalize(self, raw: RawMeasurement) -> NormalizedMeasurement:
        # 수동 입력 → 노드 매핑 (사용자 정의 가능)
        node_map = {
            'stress_level': 'n15',
            'energy_level': 'n11',
            'sleep_quality': 'n09',
            'workload': 'n16',
            'mood': 'n15',
        }
        
        node_id = node_map.get(raw.field_name, 'n15')
        
        if raw.source == MeasurementSource.MANUAL_SCALE:
            # 1~10 → 0~1
            pressure = Normalizers.scale_10(raw.raw_value)
        elif raw.source == MeasurementSource.MANUAL_BINARY:
            pressure = Normalizers.binary(raw.raw_value)
        elif raw.source == MeasurementSource.MANUAL_CHOICE:
            # 선택지 매핑
            choice_map = {
                '나쁨': 1.0, 'bad': 1.0, 'low': 1.0,
                '보통': 0.5, 'normal': 0.5, 'medium': 0.5,
                '좋음': 0.0, 'good': 0.0, 'high': 0.0,
            }
            pressure = choice_map.get(str(raw.raw_value).lower(), 0.5)
        else:
            pressure = 0.5
        
        return NormalizedMeasurement(
            source=raw.source,
            node_id=node_id,
            pressure=pressure,
            confidence=0.7,  # 수동 입력은 신뢰도 낮음
            raw=raw,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 측정 레지스트리
# ═══════════════════════════════════════════════════════════════════════════════

class MeasurementRegistry:
    """측정기 레지스트리"""
    
    def __init__(self):
        self.meters: Dict[str, BaseMeter] = {
            'financial': FinancialMeter(),
            'biometric': BiometricMeter(),
            'manual': ManualMeter(),
        }
    
    def measure_all(
        self, 
        data: Dict[str, Dict[str, Any]]
    ) -> List[NormalizedMeasurement]:
        """
        모든 소스에서 측정
        
        data = {
            'financial': {'balance': 5000000, 'runway_months': 8},
            'biometric': {'sleep_hours': 6, 'stress_score': 60},
            'manual': {'stress_level': 7},
        }
        """
        results = []
        
        for meter_name, raw_data in data.items():
            if meter_name in self.meters:
                meter = self.meters[meter_name]
                raw_measurements = meter.measure(raw_data)
                
                for raw in raw_measurements:
                    normalized = meter.normalize(raw)
                    results.append(normalized)
        
        return results
    
    def get_node_pressures(
        self, 
        measurements: List[NormalizedMeasurement]
    ) -> Dict[str, float]:
        """측정값 → 노드 압력 딕셔너리"""
        pressures = {}
        confidences = {}
        
        for m in measurements:
            if m.node_id not in pressures:
                pressures[m.node_id] = m.pressure
                confidences[m.node_id] = m.confidence
            else:
                # 여러 소스가 같은 노드를 측정하면 가중 평균
                old_p = pressures[m.node_id]
                old_c = confidences[m.node_id]
                new_c = old_c + m.confidence
                pressures[m.node_id] = (old_p * old_c + m.pressure * m.confidence) / new_c
                confidences[m.node_id] = new_c / 2
        
        return pressures
