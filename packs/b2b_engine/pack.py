#!/usr/bin/env python3
"""
B2B Engine Pack
===============
B2B 거래 최적화 엔진
"""

import sys
sys.path.insert(0, '/Users/oseho/Desktop/autus')

from datetime import datetime
from typing import Dict, List
from dataclasses import dataclass

from autus_core.engine import BasePack, AnalysisResult, Entity


@dataclass
class Partner:
    """파트너 정보"""
    id: str
    name: str
    type: str               # SUPPLIER, CLIENT, AFFILIATE
    revenue: float          # 연 거래액 (억)
    margin: float           # 마진율
    risk_score: float       # 리스크 (0~1)
    relationship_months: int  # 거래 기간


@dataclass
class Deal:
    """거래 건"""
    id: str
    partner_id: str
    amount: float           # 금액 (억)
    stage: str              # LEAD, PROPOSAL, NEGOTIATION, CONTRACT, CLOSED
    probability: float      # 성사 확률
    expected_close: str     # 예상 체결일
    channel: str            # ROYALTY, RND, SERVICE, DIRECT


class B2BEnginePack(BasePack):
    """B2B 거래 최적화 팩"""
    
    PACK_ID = "b2b_engine"
    PACK_NAME = "🤝 B2B Pack"
    PACK_VERSION = "1.0.0"
    
    # 거래 단계별 가중치
    STAGE_WEIGHTS = {
        "LEAD": 0.1,
        "PROPOSAL": 0.3,
        "NEGOTIATION": 0.5,
        "CONTRACT": 0.8,
        "CLOSED": 1.0
    }
    
    # 채널별 마진율
    CHANNEL_MARGINS = {
        "ROYALTY": 0.95,      # 95% 마진
        "RND": 0.70,          # 70% 마진
        "SERVICE": 0.60,      # 60% 마진
        "DIRECT": 0.30,       # 30% 마진
    }
    
    def __init__(self):
        super().__init__()
        self.partners: Dict[str, Partner] = {}
        self.pipeline: List[Deal] = []
    
    def analyze(self, input_data: Dict) -> AnalysisResult:
        """B2B 분석"""
        
        partners = input_data.get("partners", [])
        pipeline = input_data.get("pipeline", [])
        target_revenue = input_data.get("target_revenue", 100)  # 목표 매출
        
        # 파트너 분석
        partner_analysis = self._analyze_partners(partners)
        
        # 파이프라인 분석
        pipeline_analysis = self._analyze_pipeline(pipeline)
        
        # 채널 최적화
        channel_optimization = self._optimize_channels(partners, pipeline)
        
        # 예상 매출
        expected_revenue = pipeline_analysis["weighted_value"]
        gap = target_revenue - expected_revenue
        achievement = expected_revenue / target_revenue if target_revenue > 0 else 0
        
        # 리스크
        avg_risk = partner_analysis["avg_risk"]
        concentration_risk = partner_analysis["concentration_risk"]
        risk_score = (avg_risk + concentration_risk) / 2
        
        # 손실 속도 (목표 대비 부족분)
        loss_velocity = max(0, gap * 1e8 / (365 * 86400))
        
        # 상태
        if achievement >= 0.8 and risk_score < 0.3:
            state = "STABLE"
        elif achievement >= 0.5 or risk_score < 0.5:
            state = "WARNING"
        else:
            state = "DANGER"
        
        return AnalysisResult(
            timestamp=datetime.now().isoformat(),
            pack_id=self.PACK_ID,
            pack_name=self.PACK_NAME,
            loss_velocity=round(loss_velocity, 2),
            pressure=gap if gap > 0 else 0,
            entropy=risk_score,
            state=state,
            risk_score=risk_score,
            mva=self._generate_mva(gap, channel_optimization),
            alternatives=[
                f"고마진 채널(로열티) 비중 확대 → +{channel_optimization['royalty_potential']:.1f}억",
                f"파이프라인 가속화 → {pipeline_analysis['acceleratable']}건 조기 체결 가능",
                "신규 파트너 발굴 필요" if len(partners) < 5 else "파트너 다각화 양호"
            ],
            details={
                "target_revenue": target_revenue,
                "expected_revenue": round(expected_revenue, 2),
                "achievement": round(achievement * 100, 1),
                "gap": round(gap, 2),
                "partner_count": len(partners),
                "pipeline_count": len(pipeline),
                "pipeline_value": round(pipeline_analysis["total_value"], 2),
                "weighted_value": round(pipeline_analysis["weighted_value"], 2),
                "avg_margin": round(channel_optimization["avg_margin"] * 100, 1),
                "concentration_risk": round(concentration_risk * 100, 1),
                "top_partner": partner_analysis["top_partner"],
                "channel_mix": channel_optimization["channel_mix"]
            }
        )
    
    def calculate_loss(self, **kwargs) -> Dict:
        """손실 계산"""
        target = kwargs.get("target", 0)
        actual = kwargs.get("actual", 0)
        gap = max(0, target - actual)
        return {
            "gap": gap,
            "gap_ratio": gap / target if target > 0 else 0
        }
    
    def generate_mva(self, analysis: AnalysisResult) -> str:
        """MVA 생성"""
        gap = analysis.details.get("gap", 0)
        if gap > 0:
            return f"목표 달성을 위해 추가 ₩{gap:.1f}억 확보 필요"
        return "목표 달성 궤도 - 현 전략 유지"
    
    def _generate_mva(self, gap: float, optimization: Dict) -> str:
        if gap > 10:
            return f"고마진 B2B 채널 확대로 ₩{gap:.1f}억 갭 해소"
        elif gap > 0:
            return f"파이프라인 가속화로 ₩{gap:.1f}억 조기 확보"
        else:
            return "목표 초과 달성 예상 - 마진 최적화 집중"
    
    def _analyze_partners(self, partners: List[Dict]) -> Dict:
        """파트너 분석"""
        if not partners:
            return {
                "avg_risk": 0.5,
                "concentration_risk": 1.0,
                "top_partner": None
            }
        
        total_revenue = sum(p.get("revenue", 0) for p in partners)
        avg_risk = sum(p.get("risk_score", 0.5) for p in partners) / len(partners)
        
        # 집중도 리스크 (상위 1개사 비중)
        if total_revenue > 0:
            max_revenue = max(p.get("revenue", 0) for p in partners)
            concentration = max_revenue / total_revenue
        else:
            concentration = 1.0
        
        # 상위 파트너
        top = max(partners, key=lambda p: p.get("revenue", 0))
        
        return {
            "avg_risk": avg_risk,
            "concentration_risk": concentration,
            "top_partner": top.get("name", "Unknown"),
            "total_revenue": total_revenue
        }
    
    def _analyze_pipeline(self, pipeline: List[Dict]) -> Dict:
        """파이프라인 분석"""
        if not pipeline:
            return {
                "total_value": 0,
                "weighted_value": 0,
                "acceleratable": 0
            }
        
        total = 0
        weighted = 0
        acceleratable = 0
        
        for deal in pipeline:
            amount = deal.get("amount", 0)
            stage = deal.get("stage", "LEAD")
            prob = deal.get("probability", self.STAGE_WEIGHTS.get(stage, 0.1))
            
            total += amount
            weighted += amount * prob
            
            if stage in ["PROPOSAL", "NEGOTIATION"]:
                acceleratable += 1
        
        return {
            "total_value": total,
            "weighted_value": weighted,
            "acceleratable": acceleratable
        }
    
    def _optimize_channels(self, partners: List[Dict], pipeline: List[Dict]) -> Dict:
        """채널 최적화 분석"""
        channel_mix = {ch: 0 for ch in self.CHANNEL_MARGINS.keys()}
        
        # 현재 채널 믹스 계산
        for deal in pipeline:
            channel = deal.get("channel", "DIRECT")
            amount = deal.get("amount", 0)
            if channel in channel_mix:
                channel_mix[channel] += amount
        
        total = sum(channel_mix.values())
        if total > 0:
            channel_mix = {k: v/total for k, v in channel_mix.items()}
        
        # 평균 마진
        avg_margin = sum(
            channel_mix.get(ch, 0) * margin 
            for ch, margin in self.CHANNEL_MARGINS.items()
        )
        
        # 로열티 채널 확대 잠재력
        current_royalty = channel_mix.get("ROYALTY", 0)
        royalty_potential = (0.3 - current_royalty) * total if current_royalty < 0.3 else 0
        
        return {
            "channel_mix": channel_mix,
            "avg_margin": avg_margin,
            "royalty_potential": royalty_potential
        }
    
    def add_partner(self, partner_data: Dict):
        """파트너 추가"""
        partner = Partner(
            id=partner_data.get("id", f"P{len(self.partners)+1}"),
            name=partner_data.get("name", "Unknown"),
            type=partner_data.get("type", "CLIENT"),
            revenue=partner_data.get("revenue", 0),
            margin=partner_data.get("margin", 0.3),
            risk_score=partner_data.get("risk_score", 0.5),
            relationship_months=partner_data.get("relationship_months", 0)
        )
        self.partners[partner.id] = partner
    
    def add_deal(self, deal_data: Dict):
        """거래 추가"""
        deal = Deal(
            id=deal_data.get("id", f"D{len(self.pipeline)+1}"),
            partner_id=deal_data.get("partner_id", ""),
            amount=deal_data.get("amount", 0),
            stage=deal_data.get("stage", "LEAD"),
            probability=deal_data.get("probability", 0.1),
            expected_close=deal_data.get("expected_close", ""),
            channel=deal_data.get("channel", "DIRECT")
        )
        self.pipeline.append(deal)


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pack = B2BEnginePack()
    
    # 테스트 데이터
    partners = [
        {"name": "교육법인_1", "revenue": 15, "risk_score": 0.2},
        {"name": "교육법인_2", "revenue": 12, "risk_score": 0.3},
        {"name": "교육법인_3", "revenue": 10, "risk_score": 0.25},
        {"name": "F&B파트너", "revenue": 8, "risk_score": 0.4},
    ]
    
    pipeline = [
        {"amount": 5, "stage": "CONTRACT", "channel": "ROYALTY", "probability": 0.9},
        {"amount": 8, "stage": "NEGOTIATION", "channel": "RND", "probability": 0.6},
        {"amount": 10, "stage": "PROPOSAL", "channel": "SERVICE", "probability": 0.4},
        {"amount": 3, "stage": "LEAD", "channel": "DIRECT", "probability": 0.1},
    ]
    
    result = pack.analyze({
        "partners": partners,
        "pipeline": pipeline,
        "target_revenue": 30
    })
    
    from autus_core.hud import HUDRenderer
    HUDRenderer().render(result)
    
    print("\n📊 상세:")
    print(f"   목표: ₩{result.details['target_revenue']}억")
    print(f"   예상: ₩{result.details['expected_revenue']}억 ({result.details['achievement']}%)")
    print(f"   갭: ₩{result.details['gap']}억")
    print(f"   평균 마진: {result.details['avg_margin']}%")
