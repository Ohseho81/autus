#!/usr/bin/env python3
"""
Tax Shield Pack
===============
절세 최적화 엔진
"""

import sys
sys.path.insert(0, '/Users/oseho/Desktop/autus')

from datetime import datetime
from typing import Dict, List
from dataclasses import dataclass

from autus_core.engine import BasePack, AnalysisResult, Entity


@dataclass
class TaxChannel:
    """세금 채널"""
    name: str
    type: str                # ROYALTY, RND, SERVICE, IP, DEPRECIATION
    amount: float            # 금액 (억)
    tax_rate: float          # 적용 세율
    deductible: float        # 공제액
    compliance: float        # 국세청 적합성 (0~1)


class TaxShieldPack(BasePack):
    """절세 최적화 팩"""
    
    PACK_ID = "tax_shield"
    PACK_NAME = "💰 절세 Pack"
    PACK_VERSION = "1.0.0"
    
    # 기본 세율
    TAX_RATES = {
        "corporate": 0.22,      # 법인세
        "income": 0.35,         # 소득세 (최고)
        "vat": 0.10,            # 부가세
        "withholding": 0.10,    # 원천세 (해외)
        "clark": 0.0,           # 클락 특구
    }
    
    # 채널별 안전 한도 (매출 대비)
    SAFE_LIMITS = {
        "ROYALTY": 0.02,        # 2%
        "RND": 0.05,            # 5%
        "SERVICE": 0.03,        # 3%
        "IP": 0.015,            # 1.5%
        "DEPRECIATION": 1.0,    # 무제한 (자산 범위 내)
    }
    
    # R&D 세액공제율
    RND_CREDIT = 0.25  # 25%
    
    def __init__(self):
        super().__init__()
    
    def analyze(self, input_data: Dict) -> AnalysisResult:
        """절세 분석"""
        
        revenue = input_data.get("revenue", 100)           # 매출 (억)
        profit = input_data.get("profit", 20)              # 순이익 (억)
        current_tax = input_data.get("current_tax", None)  # 현재 세금
        assets = input_data.get("assets", 0)               # 감가상각 대상 자산
        offshore_ratio = input_data.get("offshore_ratio", 0.15)  # 해외 이전율
        
        if current_tax is None:
            current_tax = profit * self.TAX_RATES["corporate"]
        
        # 최적 채널 배분
        channels = self._optimize_channels(revenue, profit, assets, offshore_ratio)
        
        # 총 절세액
        total_deductible = sum(c.deductible for c in channels)
        optimized_tax = max(0, profit - total_deductible) * self.TAX_RATES["corporate"]
        tax_saved = current_tax - optimized_tax
        savings_ratio = tax_saved / current_tax if current_tax > 0 else 0
        
        # 국세청 적합성 평균
        compliance = sum(c.compliance for c in channels) / len(channels) if channels else 1.0
        
        # 리스크
        risk_score = 1 - compliance
        
        # 손실 속도 (현재 세금 누수)
        loss_velocity = (current_tax * 1e8) / (365 * 86400)  # 연간 → 초당
        
        # 상태
        if savings_ratio >= 0.3 and compliance >= 0.9:
            state = "STABLE"
        elif savings_ratio >= 0.15 or compliance >= 0.8:
            state = "WARNING"
        else:
            state = "DANGER"
        
        return AnalysisResult(
            timestamp=datetime.now().isoformat(),
            pack_id=self.PACK_ID,
            pack_name=self.PACK_NAME,
            loss_velocity=round(loss_velocity, 2),
            pressure=current_tax,
            entropy=risk_score,
            state=state,
            risk_score=risk_score,
            mva=self._generate_mva(channels, tax_saved),
            alternatives=[
                f"클락 허브 이전율 {offshore_ratio*100+5:.0f}%로 상향",
                f"R&D 세액공제 확대 (현재 {self.RND_CREDIT*100:.0f}%)",
                "감가상각 자산 추가 검토"
            ],
            details={
                "revenue": revenue,
                "profit": profit,
                "current_tax": round(current_tax, 2),
                "optimized_tax": round(optimized_tax, 2),
                "tax_saved": round(tax_saved, 2),
                "savings_ratio": round(savings_ratio * 100, 1),
                "compliance": round(compliance * 100, 1),
                "channels": [
                    {
                        "type": c.type,
                        "amount": c.amount,
                        "deductible": c.deductible,
                        "compliance": c.compliance * 100
                    }
                    for c in channels
                ],
                "offshore_transfer": round(profit * offshore_ratio, 2)
            }
        )
    
    def calculate_loss(self, **kwargs) -> Dict:
        """세금 손실 계산"""
        profit = kwargs.get("profit", 0)
        tax = profit * self.TAX_RATES["corporate"]
        return {
            "annual_tax": tax,
            "monthly_tax": tax / 12,
            "daily_tax": tax / 365
        }
    
    def generate_mva(self, analysis: AnalysisResult) -> str:
        """MVA 생성"""
        return self._generate_mva([], analysis.details.get("tax_saved", 0))
    
    def _generate_mva(self, channels: List[TaxChannel], tax_saved: float) -> str:
        if tax_saved >= 10:
            return f"다채널 절세 전략으로 연 ₩{tax_saved:.1f}억 절감 가능"
        elif tax_saved >= 1:
            return f"원가 처리 최적화로 연 ₩{tax_saved:.1f}억 절세"
        else:
            return f"절세 채널 추가 검토 필요 (현재 절감: ₩{tax_saved*10000:.0f}만)"
    
    def _optimize_channels(
        self,
        revenue: float,
        profit: float,
        assets: float,
        offshore_ratio: float
    ) -> List[TaxChannel]:
        """채널 최적화"""
        channels = []
        
        # 1. 로열티 (매출의 2%)
        royalty = min(revenue * self.SAFE_LIMITS["ROYALTY"], profit * 0.2)
        if royalty > 0:
            channels.append(TaxChannel(
                name="기술 로열티",
                type="ROYALTY",
                amount=royalty,
                tax_rate=self.TAX_RATES["withholding"],
                deductible=royalty,
                compliance=1.0  # 한도 내
            ))
        
        # 2. R&D 분담금 (매출의 5%)
        rnd = min(revenue * self.SAFE_LIMITS["RND"], profit * 0.3)
        if rnd > 0:
            # R&D는 세액공제도 적용
            rnd_credit = rnd * self.RND_CREDIT
            channels.append(TaxChannel(
                name="R&D 분담금",
                type="RND",
                amount=rnd,
                tax_rate=0,
                deductible=rnd + rnd_credit,  # 비용 + 세액공제
                compliance=1.0
            ))
        
        # 3. 시스템 용역비 (매출의 3%)
        service = min(revenue * self.SAFE_LIMITS["SERVICE"], profit * 0.25)
        if service > 0:
            channels.append(TaxChannel(
                name="시스템 용역",
                type="SERVICE",
                amount=service,
                tax_rate=self.TAX_RATES["vat"],
                deductible=service,
                compliance=1.0
            ))
        
        # 4. 해외 이전 (클락)
        offshore = profit * offshore_ratio
        if offshore > 0:
            channels.append(TaxChannel(
                name="클락 허브 이전",
                type="OFFSHORE",
                amount=offshore,
                tax_rate=self.TAX_RATES["clark"],
                deductible=offshore * 0.8,  # 80% 인정
                compliance=0.85  # 약간의 리스크
            ))
        
        # 5. 감가상각
        if assets > 0:
            depreciation = assets / 40  # 40년 정액
            channels.append(TaxChannel(
                name="감가상각",
                type="DEPRECIATION",
                amount=depreciation,
                tax_rate=0,
                deductible=depreciation,
                compliance=1.0
            ))
        
        return channels
    
    def simulate_offshore(self, profit: float, years: int = 5) -> List[Dict]:
        """해외 이전 시뮬레이션"""
        results = []
        cumulative = 0
        
        for year in range(1, years + 1):
            transfer = profit * 0.15
            domestic_tax = transfer * self.TAX_RATES["corporate"]
            clark_tax = transfer * self.TAX_RATES["clark"]
            saved = domestic_tax - clark_tax - 0.2  # 유지비 차감
            cumulative += saved
            
            results.append({
                "year": year,
                "transfer": round(transfer, 2),
                "tax_saved": round(saved, 2),
                "cumulative": round(cumulative, 2)
            })
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pack = TaxShieldPack()
    
    result = pack.analyze({
        "revenue": 500,       # 매출 500억
        "profit": 70,         # 순이익 70억
        "assets": 50,         # 자산 50억
        "offshore_ratio": 0.15
    })
    
    from autus_core.hud import HUDRenderer
    HUDRenderer().render(result)
    
    print("\n📊 채널별 상세:")
    for ch in result.details["channels"]:
        print(f"   {ch['type']}: ₩{ch['amount']:.1f}억 → 공제 ₩{ch['deductible']:.1f}억 (적합성 {ch['compliance']:.0f}%)")
    
    print(f"\n💰 총 절세: ₩{result.details['tax_saved']:.1f}억 ({result.details['savings_ratio']:.1f}%)")
