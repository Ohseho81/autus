"""
Arbutus Analyzer + AUTUS Integration
=====================================

Arbutus 감사 데이터 → AUTUS 물리 엔진 → 웹 대시보드

구조:
1. Arbutus Analyzer: 감사 데이터 분석 (데스크톱)
2. AUTUS Bridge: Python 통합 레이어
3. AUTUS Engine: 물리 법칙 기반 리스크 모델링
4. Web Dashboard: React 기반 실시간 시각화
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any
from enum import IntEnum, Enum
import json
import time
import os
import struct
import asyncio
from concurrent.futures import ThreadPoolExecutor
import math


# ============================================================
# 1. ARBUTUS 데이터 모델
# ============================================================

class AuditRiskLevel(Enum):
    """감사 리스크 레벨"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class AuditCategory(Enum):
    """감사 카테고리 (Arbutus 분류)"""
    FRAUD = "FRAUD"                 # 부정
    COMPLIANCE = "COMPLIANCE"       # 규정 준수
    FINANCIAL = "FINANCIAL"         # 재무
    OPERATIONAL = "OPERATIONAL"     # 운영
    IT_SECURITY = "IT_SECURITY"     # IT 보안
    VENDOR = "VENDOR"               # 공급업체


@dataclass
class ArbutusFindings:
    """Arbutus 감사 결과"""
    id: str
    timestamp: int
    category: AuditCategory
    risk_level: AuditRiskLevel
    score: float               # 0-100
    description: str
    affected_records: int
    monetary_impact: float     # 금액 영향
    source_table: str
    query_used: str
    
    # Arbutus AI 분석 결과
    sentiment_score: float = 0.0      # -1 to 1
    cluster_id: int = -1
    outlier_probability: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "category": self.category.value,
            "risk_level": self.risk_level.value,
            "score": self.score,
            "description": self.description,
            "affected_records": self.affected_records,
            "monetary_impact": self.monetary_impact,
            "source_table": self.source_table,
            "sentiment_score": self.sentiment_score,
            "cluster_id": self.cluster_id,
            "outlier_probability": self.outlier_probability
        }


# ============================================================
# 2. AUTUS PHYSICS MAPPING
# ============================================================

class AuditPhysics(IntEnum):
    """
    감사 물리 노드 (6D)
    
    AUTUS 6 Physics → Audit 도메인 매핑
    """
    FINANCIAL_HEALTH = 0    # BIO → 재무 건강성
    CAPITAL_RISK = 1        # CAPITAL → 자본 리스크
    COMPLIANCE_IQ = 2       # COGNITION → 규정 준수 지능
    STAKEHOLDER = 3         # RELATION → 이해관계자 관계
    CONTROL_ENV = 4         # ENVIRONMENT → 통제 환경
    REPUTATION = 5          # LEGACY → 평판/지속가능성


class AuditMotion(IntEnum):
    """
    감사 모션 유형 (12)
    
    AUTUS 12 Motion → Audit 활동 매핑
    """
    # SURVIVE → 리스크 관리
    DETECT = 0          # 탐지 (CONSUME)
    MONITOR = 1         # 모니터링 (REST)
    INVESTIGATE = 2     # 조사 (MOVE)
    MITIGATE = 3        # 완화 (PROTECT)
    
    # GROW → 개선
    REMEDIATE = 4       # 시정 (ACQUIRE)
    IMPLEMENT = 5       # 구현 (CREATE)
    TRAIN = 6           # 교육 (LEARN)
    TEST = 7            # 테스트 (PRACTICE)
    
    # CONNECT → 보고
    REPORT = 8          # 보고 (BOND)
    COMMUNICATE = 9     # 소통 (EXCHANGE)
    SUPPORT = 10        # 지원 (NURTURE)
    DISCLOSE = 11       # 공시 (EXPRESS)


# Arbutus 카테고리 → Physics 매핑
CATEGORY_PHYSICS_MAP = {
    AuditCategory.FRAUD: [
        (AuditPhysics.CAPITAL_RISK, 0.4),
        (AuditPhysics.REPUTATION, 0.3),
        (AuditPhysics.CONTROL_ENV, 0.2),
        (AuditPhysics.COMPLIANCE_IQ, 0.1),
    ],
    AuditCategory.COMPLIANCE: [
        (AuditPhysics.COMPLIANCE_IQ, 0.5),
        (AuditPhysics.CONTROL_ENV, 0.3),
        (AuditPhysics.REPUTATION, 0.2),
    ],
    AuditCategory.FINANCIAL: [
        (AuditPhysics.FINANCIAL_HEALTH, 0.5),
        (AuditPhysics.CAPITAL_RISK, 0.3),
        (AuditPhysics.STAKEHOLDER, 0.2),
    ],
    AuditCategory.OPERATIONAL: [
        (AuditPhysics.CONTROL_ENV, 0.4),
        (AuditPhysics.FINANCIAL_HEALTH, 0.3),
        (AuditPhysics.COMPLIANCE_IQ, 0.3),
    ],
    AuditCategory.IT_SECURITY: [
        (AuditPhysics.CONTROL_ENV, 0.4),
        (AuditPhysics.REPUTATION, 0.3),
        (AuditPhysics.CAPITAL_RISK, 0.3),
    ],
    AuditCategory.VENDOR: [
        (AuditPhysics.STAKEHOLDER, 0.4),
        (AuditPhysics.CAPITAL_RISK, 0.3),
        (AuditPhysics.CONTROL_ENV, 0.3),
    ],
}

# Risk Level → Delta 매핑
RISK_DELTA_MAP = {
    AuditRiskLevel.CRITICAL: -0.3,
    AuditRiskLevel.HIGH: -0.2,
    AuditRiskLevel.MEDIUM: -0.1,
    AuditRiskLevel.LOW: -0.05,
    AuditRiskLevel.INFO: 0.0,
}

# 물리 상수
AUDIT_PHYSICS_INFO = {
    AuditPhysics.FINANCIAL_HEALTH: {"half_life_days": 30, "inertia": 0.3},
    AuditPhysics.CAPITAL_RISK: {"half_life_days": 90, "inertia": 0.5},
    AuditPhysics.COMPLIANCE_IQ: {"half_life_days": 60, "inertia": 0.4},
    AuditPhysics.STAKEHOLDER: {"half_life_days": 45, "inertia": 0.4},
    AuditPhysics.CONTROL_ENV: {"half_life_days": 120, "inertia": 0.6},
    AuditPhysics.REPUTATION: {"half_life_days": 180, "inertia": 0.7},
}


# ============================================================
# 3. AUTUS AUDIT ENGINE
# ============================================================

@dataclass
class AuditMotionEvent:
    """감사 모션 이벤트"""
    timestamp: int
    physics: AuditPhysics
    motion: AuditMotion
    delta: float
    friction: float
    source_finding_id: str
    category: AuditCategory
    monetary_impact: float
    
    def to_dict(self) -> dict:
        return {
            "t": self.timestamp,
            "p": self.physics.value,
            "m": self.motion.value,
            "d": self.delta,
            "f": self.friction,
            "fid": self.source_finding_id,
            "cat": self.category.value,
            "impact": self.monetary_impact
        }


class AuditPhysicsEngine:
    """
    AUTUS 감사 물리 엔진
    
    Arbutus Findings → Physics State → Risk Dashboard
    """
    
    MS_PER_DAY = 86400 * 1000
    
    def __init__(self, data_dir: str = "./audit_data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
        # 6 Physics 상태 (1.0 = 완전 건강, 0.0 = 위험)
        self._state = [1.0] * 6
        self._last_ts = 0
        
        # 통계
        self._findings_count = {p: 0 for p in AuditPhysics}
        self._total_monetary_impact = {p: 0.0 for p in AuditPhysics}
        
        # 물리 상수
        self._lambda = [
            math.log(2) / AUDIT_PHYSICS_INFO[p]["half_life_days"]
            for p in AuditPhysics
        ]
        self._inertia = [AUDIT_PHYSICS_INFO[p]["inertia"] for p in AuditPhysics]
        
        # 이벤트 로그
        self._events: List[AuditMotionEvent] = []
        
        self._load_state()
    
    def _state_file(self) -> str:
        return os.path.join(self.data_dir, "audit_state.bin")
    
    def _save_state(self):
        data = struct.pack('<q6d', self._last_ts, *self._state)
        with open(self._state_file(), 'wb') as f:
            f.write(data)
    
    def _load_state(self):
        path = self._state_file()
        if os.path.exists(path):
            with open(path, 'rb') as f:
                data = f.read(56)
                if len(data) == 56:
                    unpacked = struct.unpack('<q6d', data)
                    self._last_ts = unpacked[0]
                    self._state = list(unpacked[1:])
    
    def _apply_decay(self, current_ts: int):
        """시간 경과에 따른 회복 (감사 상태는 시간이 지나면 개선)"""
        if self._last_ts > 0 and current_ts > self._last_ts:
            dt_days = (current_ts - self._last_ts) / self.MS_PER_DAY
            for i in range(6):
                # 1.0을 향해 회복
                recovery = (1.0 - self._state[i]) * (1 - math.exp(-self._lambda[i] * dt_days))
                self._state[i] += recovery
    
    def process_finding(self, finding: ArbutusFindings) -> Dict[str, Any]:
        """
        Arbutus Finding 처리
        
        1. Category → Physics 매핑
        2. Risk Level → Delta 계산
        3. 물리 법칙 적용
        4. 상태 업데이트
        """
        # 1. 감쇠 (회복) 적용
        self._apply_decay(finding.timestamp)
        
        # 2. Category → Physics 매핑
        physics_weights = CATEGORY_PHYSICS_MAP.get(
            finding.category,
            [(AuditPhysics.CONTROL_ENV, 1.0)]
        )
        
        # 3. Risk Level → Base Delta
        base_delta = RISK_DELTA_MAP.get(finding.risk_level, 0.0)
        
        # 4. Outlier probability로 마찰 조정 (높을수록 마찰 낮음 = 영향력 큼)
        friction = 1.0 - finding.outlier_probability
        
        # 5. 각 Physics에 영향 적용
        effects = {}
        events = []
        
        for physics, weight in physics_weights:
            # 금액 영향 반영 (log scale)
            impact_multiplier = 1.0 + math.log10(max(1, finding.monetary_impact)) * 0.1
            
            raw_delta = base_delta * weight * impact_multiplier
            effective = raw_delta * (1 - friction * 0.5) * (1 - self._inertia[physics.value])
            
            old_val = self._state[physics.value]
            new_val = max(0.0, min(1.0, old_val + effective))
            self._state[physics.value] = new_val
            
            effects[physics.name] = {
                "old": round(old_val, 4),
                "new": round(new_val, 4),
                "delta": round(effective, 4)
            }
            
            # 모션 결정
            if finding.risk_level in [AuditRiskLevel.CRITICAL, AuditRiskLevel.HIGH]:
                motion = AuditMotion.DETECT
            elif finding.risk_level == AuditRiskLevel.MEDIUM:
                motion = AuditMotion.INVESTIGATE
            else:
                motion = AuditMotion.MONITOR
            
            event = AuditMotionEvent(
                timestamp=finding.timestamp,
                physics=physics,
                motion=motion,
                delta=effective,
                friction=friction,
                source_finding_id=finding.id,
                category=finding.category,
                monetary_impact=finding.monetary_impact
            )
            events.append(event)
            self._events.append(event)
            
            # 통계 업데이트
            self._findings_count[physics] += 1
            self._total_monetary_impact[physics] += finding.monetary_impact * weight
        
        self._last_ts = finding.timestamp
        self._save_state()
        
        return {
            "success": True,
            "finding_id": finding.id,
            "category": finding.category.value,
            "risk_level": finding.risk_level.value,
            "effects": effects,
            "events_generated": len(events)
        }
    
    def process_remediation(
        self,
        physics: AuditPhysics,
        effectiveness: float,  # 0-1
        source: str = ""
    ) -> Dict[str, Any]:
        """
        시정 조치 처리 (상태 개선)
        """
        self._apply_decay(int(time.time() * 1000))
        
        # 시정 조치는 양의 delta
        delta = effectiveness * 0.2  # 최대 0.2 개선
        
        old_val = self._state[physics.value]
        new_val = min(1.0, old_val + delta)
        self._state[physics.value] = new_val
        
        event = AuditMotionEvent(
            timestamp=int(time.time() * 1000),
            physics=physics,
            motion=AuditMotion.REMEDIATE,
            delta=delta,
            friction=0.0,
            source_finding_id=source,
            category=AuditCategory.OPERATIONAL,
            monetary_impact=0.0
        )
        self._events.append(event)
        
        self._last_ts = int(time.time() * 1000)
        self._save_state()
        
        return {
            "success": True,
            "physics": physics.name,
            "old": round(old_val, 4),
            "new": round(new_val, 4),
            "delta": round(delta, 4)
        }
    
    # ─────────────────────────────────────────────────────────
    # 조회
    # ─────────────────────────────────────────────────────────
    
    def get_state(self) -> Dict[str, float]:
        """현재 상태"""
        return {p.name: round(self._state[p.value], 4) for p in AuditPhysics}
    
    def get_risk_score(self) -> float:
        """
        종합 리스크 점수 (0-100)
        
        낮을수록 좋음
        """
        avg_state = sum(self._state) / 6
        return round((1 - avg_state) * 100, 2)
    
    def get_risk_breakdown(self) -> Dict[str, Dict]:
        """리스크 분석"""
        breakdown = {}
        for p in AuditPhysics:
            state_val = self._state[p.value]
            risk_pct = (1 - state_val) * 100
            
            if risk_pct >= 50:
                level = "CRITICAL"
            elif risk_pct >= 30:
                level = "HIGH"
            elif risk_pct >= 15:
                level = "MEDIUM"
            elif risk_pct >= 5:
                level = "LOW"
            else:
                level = "HEALTHY"
            
            breakdown[p.name] = {
                "state": round(state_val, 4),
                "risk_percent": round(risk_pct, 2),
                "level": level,
                "findings_count": self._findings_count.get(p, 0),
                "monetary_impact": round(self._total_monetary_impact.get(p, 0), 2)
            }
        
        return breakdown
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """대시보드용 종합 데이터"""
        return {
            "timestamp": int(time.time() * 1000),
            "overall_risk_score": self.get_risk_score(),
            "state": self.get_state(),
            "breakdown": self.get_risk_breakdown(),
            "recent_events": [e.to_dict() for e in self._events[-20:]],
            "summary": {
                "total_findings": sum(self._findings_count.values()),
                "total_monetary_impact": round(sum(self._total_monetary_impact.values()), 2),
                "highest_risk_area": max(
                    self.get_risk_breakdown().items(),
                    key=lambda x: x[1]["risk_percent"]
                )[0] if self._findings_count else None
            }
        }


# ============================================================
# 4. ARBUTUS BRIDGE (Python 통합)
# ============================================================

class ArbutusBridge:
    """
    Arbutus Analyzer ↔ AUTUS Engine 브릿지
    
    - Arbutus export 파일 파싱
    - Smart Query 결과 변환
    - AI/ML 분석 결과 통합
    """
    
    @staticmethod
    def parse_arbutus_export(file_path: str) -> List[ArbutusFindings]:
        """
        Arbutus export 파일 파싱 (CSV/JSON)
        """
        findings = []
        
        if file_path.endswith('.json'):
            with open(file_path, 'r') as f:
                data = json.load(f)
                for item in data:
                    findings.append(ArbutusBridge._dict_to_finding(item))
        
        elif file_path.endswith('.csv'):
            import csv
            with open(file_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    findings.append(ArbutusBridge._row_to_finding(row))
        
        return findings
    
    @staticmethod
    def _dict_to_finding(data: dict) -> ArbutusFindings:
        return ArbutusFindings(
            id=data.get("id", str(time.time())),
            timestamp=data.get("timestamp", int(time.time() * 1000)),
            category=AuditCategory[data.get("category", "OPERATIONAL")],
            risk_level=AuditRiskLevel[data.get("risk_level", "MEDIUM")],
            score=float(data.get("score", 50)),
            description=data.get("description", ""),
            affected_records=int(data.get("affected_records", 0)),
            monetary_impact=float(data.get("monetary_impact", 0)),
            source_table=data.get("source_table", ""),
            query_used=data.get("query_used", ""),
            sentiment_score=float(data.get("sentiment_score", 0)),
            cluster_id=int(data.get("cluster_id", -1)),
            outlier_probability=float(data.get("outlier_probability", 0))
        )
    
    @staticmethod
    def _row_to_finding(row: dict) -> ArbutusFindings:
        return ArbutusBridge._dict_to_finding(row)
    
    @staticmethod
    def from_smart_query_result(
        query_name: str,
        results: List[dict],
        category: AuditCategory,
        risk_level: AuditRiskLevel
    ) -> List[ArbutusFindings]:
        """
        Arbutus Smart Query 결과 변환
        """
        findings = []
        for i, result in enumerate(results):
            finding = ArbutusFindings(
                id=f"{query_name}_{i}",
                timestamp=int(time.time() * 1000),
                category=category,
                risk_level=risk_level,
                score=result.get("score", 50),
                description=f"Smart Query: {query_name}",
                affected_records=len(results),
                monetary_impact=float(result.get("amount", 0)),
                source_table=result.get("table", ""),
                query_used=query_name,
                outlier_probability=float(result.get("outlier_prob", 0.5))
            )
            findings.append(finding)
        return findings


# ============================================================
# 5. 테스트
# ============================================================

def test_arbutus_autus_integration():
    """통합 테스트"""
    print("=" * 80)
    print("  Arbutus Analyzer + AUTUS Integration Test")
    print("=" * 80)
    
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        engine = AuditPhysicsEngine(tmpdir)
        
        print("\n[초기 상태 (100% 건강)]")
        state = engine.get_state()
        for name, value in state.items():
            bar = "█" * int(value * 20)
            print(f"  {name:20} {value:.4f} {bar}")
        print(f"  Overall Risk Score: {engine.get_risk_score()}")
        
        # 시뮬레이션: Arbutus Findings
        print("\n[Arbutus Findings 처리]")
        
        findings = [
            ArbutusFindings(
                id="FRD-001",
                timestamp=int(time.time() * 1000),
                category=AuditCategory.FRAUD,
                risk_level=AuditRiskLevel.CRITICAL,
                score=95,
                description="Duplicate vendor payments detected",
                affected_records=150,
                monetary_impact=250000,
                source_table="AP_PAYMENTS",
                query_used="DUPLICATE_PAYMENT_CHECK",
                outlier_probability=0.92
            ),
            ArbutusFindings(
                id="CMP-002",
                timestamp=int(time.time() * 1000),
                category=AuditCategory.COMPLIANCE,
                risk_level=AuditRiskLevel.HIGH,
                score=78,
                description="Missing approvals on high-value POs",
                affected_records=45,
                monetary_impact=180000,
                source_table="PURCHASE_ORDERS",
                query_used="APPROVAL_MISSING",
                outlier_probability=0.75
            ),
            ArbutusFindings(
                id="FIN-003",
                timestamp=int(time.time() * 1000),
                category=AuditCategory.FINANCIAL,
                risk_level=AuditRiskLevel.MEDIUM,
                score=55,
                description="Journal entries near period end",
                affected_records=23,
                monetary_impact=50000,
                source_table="GL_JOURNAL",
                query_used="PERIOD_END_ENTRIES",
                outlier_probability=0.45
            ),
            ArbutusFindings(
                id="SEC-004",
                timestamp=int(time.time() * 1000),
                category=AuditCategory.IT_SECURITY,
                risk_level=AuditRiskLevel.HIGH,
                score=82,
                description="Failed login attempts exceeded threshold",
                affected_records=320,
                monetary_impact=0,
                source_table="SECURITY_LOGS",
                query_used="FAILED_LOGIN_ANALYSIS",
                outlier_probability=0.88
            ),
        ]
        
        for finding in findings:
            result = engine.process_finding(finding)
            print(f"\n  [{finding.id}] {finding.category.value} - {finding.risk_level.value}")
            print(f"    Monetary Impact: ${finding.monetary_impact:,.0f}")
            print(f"    Effects: {list(result['effects'].keys())}")
        
        print("\n[처리 후 상태]")
        state = engine.get_state()
        for name, value in state.items():
            bar = "█" * int(value * 20)
            risk_pct = (1 - value) * 100
            print(f"  {name:20} {value:.4f} {bar} (Risk: {risk_pct:.1f}%)")
        print(f"\n  Overall Risk Score: {engine.get_risk_score()}")
        
        print("\n[리스크 분석]")
        breakdown = engine.get_risk_breakdown()
        for name, data in sorted(breakdown.items(), key=lambda x: x[1]["risk_percent"], reverse=True):
            print(f"  {name:20} Level: {data['level']:10} Risk: {data['risk_percent']:.1f}%  Impact: ${data['monetary_impact']:,.0f}")
        
        # 시정 조치 시뮬레이션
        print("\n[시정 조치: CAPITAL_RISK 80% 효과]")
        result = engine.process_remediation(AuditPhysics.CAPITAL_RISK, 0.8, "FRD-001")
        print(f"  Before: {result['old']:.4f} → After: {result['new']:.4f} (+{result['delta']:.4f})")
        
        print(f"\n  Updated Risk Score: {engine.get_risk_score()}")
        
        print("\n[대시보드 데이터]")
        dashboard = engine.get_dashboard_data()
        print(f"  Total Findings: {dashboard['summary']['total_findings']}")
        print(f"  Total Monetary Impact: ${dashboard['summary']['total_monetary_impact']:,.0f}")
        print(f"  Highest Risk Area: {dashboard['summary']['highest_risk_area']}")
        
        print("\n" + "=" * 80)
        print("  ✅ 통합 테스트 완료")
        print("=" * 80)


if __name__ == "__main__":
    test_arbutus_autus_integration()

