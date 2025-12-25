#!/usr/bin/env python3
"""
ATB Master Plan - 무결성 자산 요새 시스템
=========================================
AUTUS 2.0 최상위 재무 설계 엔진

3인 연합 (파운더 ATB, 김진호, 김종호) 통합 재무 아키텍처

물리 법칙 기반: L = ∫ (P + R × S) dt

Usage:
    python3 ATB_Master_Plan.py --report full
    python3 ATB_Master_Plan.py --optimize debt-defense
    python3 ATB_Master_Plan.py --simulate jeju-2026
"""

import json
import time
import math
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS (단위: 억원)
# ═══════════════════════════════════════════════════════════════════════════════

class TransactionType(Enum):
    """거래 유형"""
    ROYALTY = "ROYALTY"           # 로열티 (매출의 2% 이하)
    RND_SHARE = "RND_SHARE"       # R&D 분담금
    SERVICE_FEE = "SERVICE_FEE"   # 시스템 운영 용역비
    IP_LICENSE = "IP_LICENSE"     # IP 라이선스
    CONSULTING = "CONSULTING"     # 컨설팅

# 국세청 안전 임계값 (부당행위계산 회피)
TAX_SAFE_LIMITS = {
    TransactionType.ROYALTY: 0.02,      # 매출의 2% 이하
    TransactionType.RND_SHARE: 0.05,    # 매출의 5% 이하
    TransactionType.SERVICE_FEE: 0.03,  # 매출의 3% 이하
    TransactionType.IP_LICENSE: 0.015,  # 매출의 1.5% 이하
    TransactionType.CONSULTING: 0.01,   # 매출의 1% 이하
}

# 억원 단위 상수
억 = 1  # 1억원 = 1


# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Entity:
    """재무 엔티티 (개인/법인)"""
    
    name: str
    entity_type: str  # "FOUNDER", "PARTNER", "CORPORATION"
    
    # 자산/부채 (억원)
    assets: float = 0
    debt: float = 0
    
    # 연간 손익 (억원)
    revenue: float = 0           # 매출
    profit: float = 0            # 순이익
    expense: float = 0           # 지출
    
    # 현금흐름
    cash_inflow: float = 0       # 월 현금 유입
    cash_outflow: float = 0      # 월 현금 유출
    
    # 부채 관련
    debt_interest_rate: float = 0.05  # 연 이자율
    debt_monthly_payment: float = 0    # 월 상환액
    
    @property
    def net_worth(self) -> float:
        """순자산"""
        return self.assets - self.debt
    
    @property
    def annual_deficit(self) -> float:
        """연간 적자 (음수면 흑자)"""
        return self.expense - self.revenue
    
    @property
    def annual_interest(self) -> float:
        """연간 이자 비용"""
        return self.debt * self.debt_interest_rate
    
    @property
    def monthly_cash_gap(self) -> float:
        """월간 현금 갭"""
        return self.cash_outflow - self.cash_inflow
    
    @property
    def debt_pressure(self) -> float:
        """부채 압력 (0~1)"""
        if self.assets == 0:
            return 1.0
        return min(self.debt / self.assets, 1.0)


@dataclass
class Transaction:
    """거래 내역"""
    
    from_entity: str
    to_entity: str
    amount: float              # 억원
    tx_type: TransactionType
    description: str
    tax_deductible: bool = True
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class OptimizedPlan:
    """최적화된 거래 계획"""
    
    total_transfer: float                    # 총 이전 금액
    transactions: List[Transaction]          # 거래 목록
    founder_debt_reduction: float            # 파운더 부채 감소
    founder_deficit_coverage: float          # 파운더 적자 커버
    tax_efficiency: float                    # 세금 효율성 (0~1)
    compliance_score: float                  # 국세청 적합성 (0~1)
    warnings: List[str] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# 3인 연합 초기화
# ═══════════════════════════════════════════════════════════════════════════════

def create_alliance() -> Dict[str, Entity]:
    """3인 연합 엔티티 생성"""
    
    # 파운더 (ATB)
    founder = Entity(
        name="ATB_FOUNDER",
        entity_type="FOUNDER",
        assets=200 * 억,
        debt=180 * 억,
        revenue=30 * 억,
        expense=40 * 억,
        profit=-10 * 억,  # 연간 적자 10억
        cash_inflow=2.5 * 억,   # 월 2.5억
        cash_outflow=3.3 * 억,  # 월 3.3억 (적자분)
        debt_interest_rate=0.05,
        debt_monthly_payment=1.5 * 억  # 월 1.5억 상환
    )
    
    # 김진호 파트너
    partner_jinho = Entity(
        name="KIM_JINHO",
        entity_type="PARTNER",
        revenue=50 * 억,
        profit=10 * 억,
        expense=40 * 억,
        cash_inflow=4.2 * 억,
        cash_outflow=3.3 * 억
    )
    
    # 김종호 법인
    corp_jongho = Entity(
        name="KIM_JONGHO_CORP",
        entity_type="CORPORATION",
        revenue=500 * 억,
        profit=70 * 억,
        expense=430 * 억,
        cash_inflow=42 * 억,
        cash_outflow=36 * 억
    )
    
    return {
        "founder": founder,
        "jinho": partner_jinho,
        "jongho": corp_jongho
    }


# ═══════════════════════════════════════════════════════════════════════════════
# DEBT DEFENSE LOGIC
# ═══════════════════════════════════════════════════════════════════════════════

class DebtDefenseEngine:
    """부채 방어 엔진"""
    
    def __init__(self, alliance: Dict[str, Entity]):
        self.alliance = alliance
        self.founder = alliance["founder"]
        self.jongho = alliance["jongho"]
    
    def calculate_minimum_transfer(self) -> float:
        """
        파운더 부채 압력을 상쇄하기 위한 최소 이전 금액 계산
        
        필요 금액 = 연간 적자 + 연간 이자 비용
        """
        annual_deficit = self.founder.annual_deficit  # 10억
        annual_interest = self.founder.annual_interest  # 180억 × 5% = 9억
        
        minimum = annual_deficit + annual_interest
        return max(minimum, 0)
    
    def calculate_optimal_transfer(self) -> float:
        """
        최적 이전 금액 (적자 커버 + 부채 상환 가속)
        
        목표: 5년 내 부채 50% 감소
        """
        minimum = self.calculate_minimum_transfer()
        
        # 추가 상환을 위한 금액 (5년 내 90억 감소 목표 = 연 18억)
        accelerated_payment = 18 * 억
        
        # 김종호 법인의 지불 가능 한도 (순이익의 30%)
        jongho_capacity = self.jongho.profit * 0.30
        
        optimal = min(minimum + accelerated_payment, jongho_capacity)
        return optimal
    
    def calculate_safe_transfer_limit(self) -> float:
        """
        국세청 안전 한도 계산
        
        모든 채널 합계가 매출의 10% 이하
        """
        total_safe = 0
        for tx_type, rate in TAX_SAFE_LIMITS.items():
            total_safe += self.jongho.revenue * rate
        
        return total_safe


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHANNEL COSTING
# ═══════════════════════════════════════════════════════════════════════════════

class TransactionOptimizer:
    """거래 최적화 엔진 (국세청 대응)"""
    
    def __init__(self, source: Entity, target: Entity):
        self.source = source  # 김종호 법인
        self.target = target  # ATB
    
    def optimize_distribution(self, total_amount: float) -> List[Transaction]:
        """
        거래액을 다중 채널로 분산 배분
        
        배분 비율:
        - 로열티: 20% (매출 2% 한도)
        - R&D 분담금: 40% (매출 5% 한도)
        - 시스템 운영 용역비: 40% (매출 3% 한도)
        """
        transactions = []
        remaining = total_amount
        
        # 1. 로열티 (매출의 2% 한도)
        royalty_limit = self.source.revenue * TAX_SAFE_LIMITS[TransactionType.ROYALTY]
        royalty_amount = min(total_amount * 0.20, royalty_limit, remaining)
        
        if royalty_amount > 0:
            transactions.append(Transaction(
                from_entity=self.source.name,
                to_entity=self.target.name,
                amount=royalty_amount,
                tx_type=TransactionType.ROYALTY,
                description="AUTUS 플랫폼 기술 로열티 (매출의 2% 이하)"
            ))
            remaining -= royalty_amount
        
        # 2. R&D 분담금 (매출의 5% 한도)
        rnd_limit = self.source.revenue * TAX_SAFE_LIMITS[TransactionType.RND_SHARE]
        rnd_amount = min(total_amount * 0.40, rnd_limit, remaining)
        
        if rnd_amount > 0:
            transactions.append(Transaction(
                from_entity=self.source.name,
                to_entity=self.target.name,
                amount=rnd_amount,
                tx_type=TransactionType.RND_SHARE,
                description="공동 R&D 프로젝트 비용 분담금"
            ))
            remaining -= rnd_amount
        
        # 3. 시스템 운영 용역비 (매출의 3% 한도)
        service_limit = self.source.revenue * TAX_SAFE_LIMITS[TransactionType.SERVICE_FEE]
        service_amount = min(total_amount * 0.40, service_limit, remaining)
        
        if service_amount > 0:
            transactions.append(Transaction(
                from_entity=self.source.name,
                to_entity=self.target.name,
                amount=service_amount,
                tx_type=TransactionType.SERVICE_FEE,
                description="통합 시스템 운영 및 유지보수 용역"
            ))
            remaining -= service_amount
        
        # 4. 남은 금액이 있으면 IP 라이선스로
        if remaining > 0:
            ip_limit = self.source.revenue * TAX_SAFE_LIMITS[TransactionType.IP_LICENSE]
            ip_amount = min(remaining, ip_limit)
            
            if ip_amount > 0:
                transactions.append(Transaction(
                    from_entity=self.source.name,
                    to_entity=self.target.name,
                    amount=ip_amount,
                    tx_type=TransactionType.IP_LICENSE,
                    description="AUTUS IP 사용권 라이선스"
                ))
        
        return transactions
    
    def calculate_compliance_score(self, transactions: List[Transaction]) -> float:
        """국세청 적합성 점수 (0~1)"""
        if not transactions:
            return 1.0
        
        violations = 0
        for tx in transactions:
            limit = self.source.revenue * TAX_SAFE_LIMITS[tx.tx_type]
            if tx.amount > limit:
                violations += 1
        
        return 1.0 - (violations / len(transactions))


# ═══════════════════════════════════════════════════════════════════════════════
# TAX-FREE REINVESTMENT PATH
# ═══════════════════════════════════════════════════════════════════════════════

class AssetDistiller:
    """자산 증류기 (원가처리 경로)"""
    
    # 해외 지주사/재단 경로
    OFFSHORE_PATHS = {
        "PH_HOLDING": {
            "name": "필리핀 지주사",
            "tax_rate": 0.0,
            "setup_cost": 0.5 * 억,
            "annual_maintenance": 0.2 * 억,
            "max_transfer_ratio": 0.15  # 이익의 15%
        },
        "RND_FOUNDATION": {
            "name": "R&D 재단",
            "tax_rate": 0.0,
            "setup_cost": 1 * 억,
            "annual_maintenance": 0.5 * 억,
            "max_transfer_ratio": 0.10  # 이익의 10%
        }
    }
    
    def simulate_reinvestment(
        self, 
        annual_profit: float,
        years: int = 5
    ) -> Dict:
        """
        원가처리 재투자 시뮬레이션
        
        경로:
        1. 국내 이익 → 해외 IP 로열티 지급
        2. 해외 지주사에서 재단 기부
        3. 재단 → 국내 R&D 프로젝트 투자
        """
        results = {
            "years": [],
            "total_saved": 0,
            "total_reinvested": 0
        }
        
        domestic_tax_rate = 0.22  # 국내 법인세 22%
        
        for year in range(1, years + 1):
            year_data = {"year": year}
            
            # 1. 필리핀 지주사 경로
            ph_transfer = annual_profit * self.OFFSHORE_PATHS["PH_HOLDING"]["max_transfer_ratio"]
            ph_tax_saved = ph_transfer * domestic_tax_rate
            
            # 2. R&D 재단 경로
            rnd_transfer = annual_profit * self.OFFSHORE_PATHS["RND_FOUNDATION"]["max_transfer_ratio"]
            rnd_tax_saved = rnd_transfer * domestic_tax_rate
            
            # 연간 유지비용 차감
            net_saved = (ph_tax_saved + rnd_tax_saved) - (
                self.OFFSHORE_PATHS["PH_HOLDING"]["annual_maintenance"] +
                self.OFFSHORE_PATHS["RND_FOUNDATION"]["annual_maintenance"]
            )
            
            year_data["ph_transfer"] = ph_transfer
            year_data["rnd_transfer"] = rnd_transfer
            year_data["tax_saved"] = net_saved
            year_data["reinvested"] = ph_transfer + rnd_transfer
            
            results["years"].append(year_data)
            results["total_saved"] += net_saved
            results["total_reinvested"] += (ph_transfer + rnd_transfer)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# JEJU MILESTONE 2026
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class JejuMilestone:
    """제주 사옥 마일스톤"""
    
    completion_date: str = "2026-06-01"
    construction_cost: float = 50 * 억
    monthly_revenue: float = 1 * 억
    depreciation_years: int = 40  # 감가상각 기간
    
    @property
    def annual_depreciation(self) -> float:
        """연간 감가상각비"""
        return self.construction_cost / self.depreciation_years
    
    @property
    def monthly_depreciation(self) -> float:
        """월간 감가상각비"""
        return self.annual_depreciation / 12
    
    @property
    def tax_savings(self) -> float:
        """연간 절세 효과 (법인세 22%)"""
        return self.annual_depreciation * 0.22
    
    def simulate_cashflow(self, months: int = 36) -> List[Dict]:
        """완공 후 현금흐름 시뮬레이션"""
        completion = datetime.strptime(self.completion_date, "%Y-%m-%d")
        results = []
        
        cumulative_revenue = 0
        cumulative_depreciation = 0
        
        for m in range(months):
            month_date = completion + timedelta(days=30 * m)
            
            # 월 매출 (점진적 증가)
            growth_factor = min(1 + (m * 0.02), 1.5)  # 최대 150%
            monthly_rev = self.monthly_revenue * growth_factor
            
            cumulative_revenue += monthly_rev
            cumulative_depreciation += self.monthly_depreciation
            
            results.append({
                "month": m + 1,
                "date": month_date.strftime("%Y-%m"),
                "monthly_revenue": round(monthly_rev, 2),
                "cumulative_revenue": round(cumulative_revenue, 2),
                "monthly_depreciation": round(self.monthly_depreciation, 2),
                "cumulative_depreciation": round(cumulative_depreciation, 2),
                "net_cashflow": round(monthly_rev - self.monthly_depreciation, 2)
            })
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# MASTER PLAN ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class ATBMasterPlan:
    """ATB 마스터 플랜 통합 엔진"""
    
    def __init__(self):
        self.alliance = create_alliance()
        self.founder = self.alliance["founder"]
        self.jongho = self.alliance["jongho"]
        
        self.debt_engine = DebtDefenseEngine(self.alliance)
        self.tx_optimizer = TransactionOptimizer(self.jongho, self.founder)
        self.asset_distiller = AssetDistiller()
        self.jeju = JejuMilestone()
    
    def generate_optimized_plan(self) -> OptimizedPlan:
        """최적화된 거래 계획 생성"""
        
        # 1. 최적 이전 금액 계산
        optimal_transfer = self.debt_engine.calculate_optimal_transfer()
        safe_limit = self.debt_engine.calculate_safe_transfer_limit()
        
        # 안전 한도 내로 제한
        final_transfer = min(optimal_transfer, safe_limit)
        
        # 2. 다중 채널 배분
        transactions = self.tx_optimizer.optimize_distribution(final_transfer)
        
        # 3. 적합성 점수
        compliance = self.tx_optimizer.calculate_compliance_score(transactions)
        
        # 4. 효과 계산
        tx_total = sum(tx.amount for tx in transactions)
        deficit_coverage = min(tx_total, self.founder.annual_deficit)
        debt_reduction = tx_total - deficit_coverage
        
        # 5. 경고 생성
        warnings = []
        if tx_total < self.debt_engine.calculate_minimum_transfer():
            warnings.append("⚠️ 이전 금액이 최소 필요액 미만")
        if compliance < 0.9:
            warnings.append("⚠️ 국세청 적합성 점수 낮음")
        
        return OptimizedPlan(
            total_transfer=tx_total,
            transactions=transactions,
            founder_debt_reduction=debt_reduction,
            founder_deficit_coverage=deficit_coverage,
            tax_efficiency=0.85,  # 추정
            compliance_score=compliance,
            warnings=warnings
        )
    
    def generate_full_report(self) -> Dict:
        """전체 리포트 생성"""
        plan = self.generate_optimized_plan()
        reinvestment = self.asset_distiller.simulate_reinvestment(
            annual_profit=self.founder.revenue + plan.total_transfer - self.founder.expense,
            years=5
        )
        jeju_cf = self.jeju.simulate_cashflow(36)
        
        # 제주 완공까지 남은 기간
        today = datetime.now()
        jeju_date = datetime.strptime(self.jeju.completion_date, "%Y-%m-%d")
        months_to_jeju = max(0, (jeju_date - today).days // 30)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "alliance_summary": {
                "founder": {
                    "name": self.founder.name,
                    "assets": self.founder.assets,
                    "debt": self.founder.debt,
                    "debt_pressure": round(self.founder.debt_pressure, 2),
                    "annual_deficit": self.founder.annual_deficit,
                    "annual_interest": self.founder.annual_interest
                },
                "jongho_corp": {
                    "name": self.jongho.name,
                    "revenue": self.jongho.revenue,
                    "profit": self.jongho.profit,
                    "available_for_transfer": self.jongho.profit * 0.3
                }
            },
            "optimized_plan": {
                "total_transfer": plan.total_transfer,
                "transactions": [
                    {
                        "type": tx.tx_type.value,
                        "amount": tx.amount,
                        "description": tx.description
                    }
                    for tx in plan.transactions
                ],
                "founder_impact": {
                    "deficit_coverage": plan.founder_deficit_coverage,
                    "debt_reduction_annual": plan.founder_debt_reduction,
                    "years_to_debt_free": round(self.founder.debt / max(plan.founder_debt_reduction, 1), 1)
                },
                "compliance_score": plan.compliance_score,
                "warnings": plan.warnings
            },
            "reinvestment_simulation": {
                "5_year_tax_saved": reinvestment["total_saved"],
                "5_year_reinvested": reinvestment["total_reinvested"],
                "paths": ["필리핀 지주사", "R&D 재단"]
            },
            "jeju_milestone": {
                "completion_date": self.jeju.completion_date,
                "months_remaining": months_to_jeju,
                "monthly_revenue": self.jeju.monthly_revenue,
                "annual_depreciation": self.jeju.annual_depreciation,
                "annual_tax_savings": self.jeju.tax_savings,
                "36_month_cumulative_revenue": sum(cf["monthly_revenue"] for cf in jeju_cf)
            }
        }


# ═══════════════════════════════════════════════════════════════════════════════
# HUD RENDERER
# ═══════════════════════════════════════════════════════════════════════════════

class ATBHUDRenderer:
    """ATB HUD 렌더러"""
    
    # ANSI Colors
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'
    
    WIDTH = 75
    
    def render(self, report: Dict):
        """HUD 렌더링"""
        self._header()
        self._system_alert(report)
        self._optimized_transaction(report)
        self._founder_status(report)
        self._jeju_countdown(report)
        self._footer(report)
    
    def _header(self):
        print()
        print(f"{self.CYAN}╔{'═' * (self.WIDTH - 2)}╗{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}  {self.BOLD}{self.WHITE}ATB MASTER PLAN - 무결성 자산 요새{self.RESET}" + 
              " " * (self.WIDTH - 42) + f"{self.CYAN}║{self.RESET}")
        print(f"{self.CYAN}╠{'═' * (self.WIDTH - 2)}╣{self.RESET}")
    
    def _system_alert(self, report: Dict):
        founder = report["alliance_summary"]["founder"]
        pressure = founder["debt_pressure"]
        
        if pressure > 0.8:
            alert_color = self.RED
            alert_text = "CRITICAL"
        elif pressure > 0.6:
            alert_color = self.YELLOW
            alert_text = "WARNING"
        else:
            alert_color = self.GREEN
            alert_text = "STABLE"
        
        alert = f"SYSTEM ALERT: FOUNDER DEBT PRESSURE [{alert_text}] - REDUCE VIA J-CORP CASHFLOW"
        print(f"{self.CYAN}║{self.RESET}  {alert_color}{self.BOLD}{alert}{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}  {self.DIM}부채: {founder['debt']}억 / 자산: {founder['assets']}억 = 압력 {pressure:.0%}{self.RESET}")
        print(f"{self.CYAN}╠{'─' * (self.WIDTH - 2)}╣{self.RESET}")
    
    def _optimized_transaction(self, report: Dict):
        plan = report["optimized_plan"]
        total = plan["total_transfer"]
        
        print(f"{self.CYAN}║{self.RESET}  {self.GREEN}{self.BOLD}✅ OPTIMIZED TRANSACTION: ₩{total:.1f}B{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}")
        
        for tx in plan["transactions"]:
            tx_type = tx["type"]
            amount = tx["amount"]
            icon = {"ROYALTY": "📜", "RND_SHARE": "🔬", "SERVICE_FEE": "⚙️", "IP_LICENSE": "💡"}.get(tx_type, "📄")
            print(f"{self.CYAN}║{self.RESET}     {icon} {tx_type}: ₩{amount:.1f}B")
        
        print(f"{self.CYAN}║{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}  {self.DIM}국세청 적합성: {plan['compliance_score']:.0%}{self.RESET}")
        
        if plan["warnings"]:
            for w in plan["warnings"]:
                print(f"{self.CYAN}║{self.RESET}  {self.YELLOW}{w}{self.RESET}")
        
        print(f"{self.CYAN}╠{'─' * (self.WIDTH - 2)}╣{self.RESET}")
    
    def _founder_status(self, report: Dict):
        founder = report["alliance_summary"]["founder"]
        impact = report["optimized_plan"]["founder_impact"]
        
        print(f"{self.CYAN}║{self.RESET}  {self.BLUE}{self.BOLD}📊 FOUNDER IMPACT{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}     연간 적자 커버: ₩{impact['deficit_coverage']:.1f}B / ₩{abs(founder['annual_deficit']):.1f}B")
        print(f"{self.CYAN}║{self.RESET}     연간 부채 감소: ₩{impact['debt_reduction_annual']:.1f}B")
        print(f"{self.CYAN}║{self.RESET}     부채 청산 예상: {impact['years_to_debt_free']:.1f}년")
        
        print(f"{self.CYAN}╠{'─' * (self.WIDTH - 2)}╣{self.RESET}")
    
    def _jeju_countdown(self, report: Dict):
        jeju = report["jeju_milestone"]
        months = jeju["months_remaining"]
        
        # 진행바
        progress = max(0, 1 - (months / 24))  # 24개월 기준
        bar_width = 30
        filled = int(progress * bar_width)
        bar = f"[{'█' * filled}{'░' * (bar_width - filled)}]"
        
        print(f"{self.CYAN}║{self.RESET}  {self.YELLOW}{self.BOLD}🏝️ JEJU 2026 COUNTDOWN{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}     완공일: {jeju['completion_date']}")
        print(f"{self.CYAN}║{self.RESET}     남은 기간: {self.BOLD}{months}개월{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}     {bar} {progress:.0%}")
        print(f"{self.CYAN}║{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}     월 매출 유입: ₩{jeju['monthly_revenue']:.1f}B")
        print(f"{self.CYAN}║{self.RESET}     연간 감가상각: ₩{jeju['annual_depreciation']:.2f}B")
        print(f"{self.CYAN}║{self.RESET}     연간 절세 효과: ₩{jeju['annual_tax_savings']:.2f}B")
        
        print(f"{self.CYAN}╠{'─' * (self.WIDTH - 2)}╣{self.RESET}")
    
    def _footer(self, report: Dict):
        reinvest = report["reinvestment_simulation"]
        
        print(f"{self.CYAN}║{self.RESET}  {self.DIM}💰 5년 절세 누계: ₩{reinvest['5_year_tax_saved']:.1f}B{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}  {self.DIM}🔄 5년 재투자 누계: ₩{reinvest['5_year_reinvested']:.1f}B{self.RESET}")
        print(f"{self.CYAN}║{self.RESET}  {self.DIM}📍 경로: {' → '.join(reinvest['paths'])}{self.RESET}")
        
        print(f"{self.CYAN}╠{'─' * (self.WIDTH - 2)}╣{self.RESET}")
        
        ts = report["timestamp"].split("T")[1][:8]
        print(f"{self.CYAN}║{self.RESET}  {self.DIM}🕐 {ts} | AUTUS 2.0 ATB MASTER PLAN | L = ∫(P + R×S)dt{self.RESET}")
        print(f"{self.CYAN}╚{'═' * (self.WIDTH - 2)}╝{self.RESET}")
        print()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="ATB Master Plan")
    parser.add_argument("--report", choices=["full", "summary", "json"], default="full")
    parser.add_argument("--optimize", choices=["debt-defense", "tax-free", "all"])
    parser.add_argument("--simulate", choices=["jeju-2026", "reinvestment"])
    parser.add_argument("--output", "-o", help="JSON 출력 파일")
    
    args = parser.parse_args()
    
    master = ATBMasterPlan()
    
    if args.report == "json" or args.output:
        report = master.generate_full_report()
        json_output = json.dumps(report, ensure_ascii=False, indent=2)
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(json_output)
            print(f"💾 Report saved to: {args.output}")
        else:
            print(json_output)
    else:
        report = master.generate_full_report()
        renderer = ATBHUDRenderer()
        renderer.render(report)


if __name__ == "__main__":
    main()
