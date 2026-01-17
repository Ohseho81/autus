"""
A3: Gap Analysis Engine
========================
SMB 사장 보고용 Gap 분석 + 라우팅 결정

- Option A (현행) vs Option B (AUTUS 제안) 비교
- Threshold 초과시 BOSS_REPORT, 이하시 AUTO_EXECUTE
- Proof Pack Payload 자동 생성
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class GapThresholds:
    """
    Boss Rule Thresholds (SMB default)
    - price_gap_ratio: (internal - standard) / standard
    - lead_time_gap_ratio: (internal - standard) / standard
    - risk_gap_level: internal_risk_level - standard_risk_level
    """
    price_gap_ratio: float = 0.10      # 10% 이상 비싸면 사장 보고
    lead_time_gap_ratio: float = 0.20  # 20% 이상 느리면 사장 보고
    risk_gap_level: int = 1            # 위험도 1단계 이상 높으면 사장 보고


@dataclass
class GapInput:
    """Gap 분석 입력 데이터"""
    org_id: str
    org_name: str
    task_name: str
    motion_type: str = "M08"  # 기본: 구매

    # Option A: Current Rule (Human / Internal vendor)
    option_a_who: str = ""
    option_a_invest_label: str = ""
    option_a_result_label: str = ""
    option_a_price_krw: float = 0
    option_a_lead_time_days: float = 0
    option_a_risk_level: int = 2

    # Option B: AUTUS Proposal (Global Standard)
    option_b_who: str = "AUTUS Agent"
    option_b_invest_label: str = ""
    option_b_result_label: str = ""
    option_b_price_krw: float = 0
    option_b_lead_time_days: float = 0
    option_b_risk_level: int = 1

    # Reference metadata (감사/추적용)
    reference_source: str = "GLOBAL_STANDARD_DB"
    reference_version: str = "v1.0"
    confidence: float = 0.85  # 0~1


@dataclass
class GapOutput:
    """Gap 분석 결과"""
    decision: str  # "AUTO_EXECUTE" | "BOSS_REPORT"
    reason: str
    gap_price_ratio: float
    gap_lead_time_ratio: float
    gap_risk_level: int
    saved_amount_krw: float
    price_gap_percent: float
    proof_pack_payload: Dict[str, Any]


class GapAnalysisEngine:
    """
    A3: Gap Analysis Engine
    
    SMB 조직의 의사결정을 자동화하거나 사장 보고로 라우팅
    """
    
    def __init__(self, thresholds: Optional[GapThresholds] = None):
        self.thresholds = thresholds or GapThresholds()

    @staticmethod
    def _safe_ratio(numerator: float, denominator: float) -> float:
        if denominator == 0:
            return 0.0
        return numerator / denominator

    def analyze(self, gi: GapInput, timestamp: Optional[str] = None) -> GapOutput:
        """
        Gap 분석 실행
        
        Returns:
            GapOutput with decision and proof_pack_payload
        """
        ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Gap 계산
        # Price gap: (A - B) / B (양수 = A가 더 비쌈)
        gap_price_ratio = self._safe_ratio(
            (gi.option_a_price_krw - gi.option_b_price_krw), 
            gi.option_b_price_krw
        )
        price_gap_percent = gap_price_ratio * 100.0

        # Lead time gap: (A - B) / B (양수 = A가 더 느림)
        gap_lead_time_ratio = self._safe_ratio(
            (gi.option_a_lead_time_days - gi.option_b_lead_time_days), 
            gi.option_b_lead_time_days
        )

        # Risk gap: A - B
        gap_risk_level = int(gi.option_a_risk_level) - int(gi.option_b_risk_level)

        # 절감액
        saved_amount_krw = max(0.0, gi.option_a_price_krw - gi.option_b_price_krw)

        # 2. 라우팅 결정 (SMB 규칙)
        decision = "AUTO_EXECUTE"
        reasons = []

        if gap_price_ratio >= self.thresholds.price_gap_ratio:
            decision = "BOSS_REPORT"
            reasons.append(f"가격 {gap_price_ratio:.1%} 초과 (기준: {self.thresholds.price_gap_ratio:.0%})")

        if gap_lead_time_ratio >= self.thresholds.lead_time_gap_ratio:
            decision = "BOSS_REPORT"
            reasons.append(f"소요시간 {gap_lead_time_ratio:.1%} 초과")

        if gap_risk_level >= self.thresholds.risk_gap_level:
            decision = "BOSS_REPORT"
            reasons.append(f"위험도 {gap_risk_level}단계 초과")

        reason = " | ".join(reasons) if reasons else "기준 이내 - 자동 승인"

        # 3. A2 Proof Pack Payload 생성
        proof_payload: Dict[str, Any] = {
            "org_id": gi.org_id,
            "org_name": gi.org_name,
            "task_name": gi.task_name,
            "motion_type": gi.motion_type,
            "timestamp": ts,
            "summary": {
                "who": [gi.option_a_who, gi.option_b_who],
                "invest": [gi.option_a_invest_label, gi.option_b_invest_label],
                "result": [gi.option_a_result_label, gi.option_b_result_label],
            },
            "gap_data": {
                "decision": decision,
                "reason": reason,
                "price_gap_percent": round(price_gap_percent, 1),
                "saved_amount": f"{saved_amount_krw:,.0f} KRW",
                "saved_amount_krw": saved_amount_krw,
                "gap_price_ratio": round(gap_price_ratio, 4),
                "gap_lead_time_ratio": round(gap_lead_time_ratio, 4),
                "gap_risk_level": gap_risk_level,
            },
            "reference": {
                "source": gi.reference_source,
                "version": gi.reference_version,
                "confidence": gi.confidence,
            },
        }

        return GapOutput(
            decision=decision,
            reason=reason,
            gap_price_ratio=gap_price_ratio,
            gap_lead_time_ratio=gap_lead_time_ratio,
            gap_risk_level=gap_risk_level,
            saved_amount_krw=saved_amount_krw,
            price_gap_percent=price_gap_percent,
            proof_pack_payload=proof_payload,
        )


# Singleton
gap_engine = GapAnalysisEngine()


# -----------------------------
# Test
# -----------------------------
if __name__ == "__main__":
    gi = GapInput(
        org_id="SMB_001",
        org_name="NextGen Startups",
        task_name="Design Team Figma 구독 갱신",
        motion_type="M08",
        
        option_a_who="김팀장 (직접 처리)",
        option_a_invest_label="55,000원 (2일 소요)",
        option_a_result_label="단순 갱신",
        option_a_price_krw=5_000_000,
        option_a_lead_time_days=2.0,
        option_a_risk_level=3,
        
        option_b_who="AUTUS Agent #99",
        option_b_invest_label="500원 (즉시)",
        option_b_result_label="글로벌 최적가 + ROI 리포트",
        option_b_price_krw=800_000,
        option_b_lead_time_days=0.0,
        option_b_risk_level=1,
        
        reference_source="GLOBAL_SAAS_INDEX",
        reference_version="2026-01",
        confidence=0.92,
    )

    out = gap_engine.analyze(gi)
    print(f"[A3] Decision: {out.decision}")
    print(f"[A3] Reason: {out.reason}")
    print(f"[A3] Price Gap: {out.price_gap_percent:.1f}%")
    print(f"[A3] Saved: {out.saved_amount_krw:,.0f} KRW")
