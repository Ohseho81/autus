#!/usr/bin/env python3
"""
AUTUS v1.0 Kernel Engine
========================
물리 손실 함수 L = ∫(P + R×S)dt 기반 재무 최적화 엔진

Features:
- 시간 지연에 따른 세금 누수액 계산 (초 단위)
- 다채널 원가 처리 최적화
- 클락 허브 절세 시뮬레이션
"""

import json
import time
import math
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# DATA LOADER
# ═══════════════════════════════════════════════════════════════════════════════

def load_entities() -> Dict:
    """entities.json 로드"""
    data_path = Path(__file__).parent / "data" / "entities.json"
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# ═══════════════════════════════════════════════════════════════════════════════
# PHYSICS ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class LossResult:
    """손실 계산 결과"""
    loss_velocity_sec: float      # 원/초
    loss_per_day: float           # 억/일
    loss_per_month: float         # 억/월
    pressure: float               # 시간 압력
    entropy: float                # 불확실성
    friction: float               # 마찰 손실
    state: str                    # STABLE/WARNING/DANGER/CRITICAL
    pnr_days: int                 # PNR까지 남은 일수


class PhysicsEngine:
    """
    물리 손실 함수 엔진
    L = ∫(P + R×S)dt
    """
    
    def __init__(self, base_burn_rate: float = 0.01):
        self.base_burn_rate = base_burn_rate  # 일일 1%
    
    def calculate_loss(
        self,
        capital: float,           # 투입 자본 (억)
        resistance: float,        # 저항 (0~1)
        entropy: float,           # 엔트로피 (0~1)
        pnr_days: int             # PNR까지 일수
    ) -> LossResult:
        """손실 계산"""
        
        # 시간 비율 (30일 기준)
        time_ratio = max(pnr_days / 30, 0.01)
        
        # Pressure = Capital × burn_rate / time_ratio²
        pressure = capital * self.base_burn_rate / (time_ratio ** 2)
        
        # Friction = R × S × Capital × burn_rate
        friction = resistance * entropy * capital * self.base_burn_rate
        
        # Total daily loss
        daily_loss = pressure + friction
        monthly_loss = daily_loss * 30
        
        # 초당 손실 (억 → 원 변환: ×1억)
        loss_per_sec = (daily_loss * 1e8) / 86400
        
        # 상태 판정
        if daily_loss >= 1.0:  # 일 1억 이상
            state = "CRITICAL"
        elif daily_loss >= 0.3:  # 일 3천만 이상
            state = "DANGER"
        elif daily_loss >= 0.1:  # 일 1천만 이상
            state = "WARNING"
        else:
            state = "STABLE"
        
        return LossResult(
            loss_velocity_sec=round(loss_per_sec, 2),
            loss_per_day=round(daily_loss, 4),
            loss_per_month=round(monthly_loss, 2),
            pressure=round(pressure, 4),
            entropy=entropy,
            friction=round(friction, 4),
            state=state,
            pnr_days=pnr_days
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSACTION OPTIMIZER
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Transaction:
    """거래 항목"""
    tx_type: str
    amount: float
    description: str
    tax_deductible: bool = True


@dataclass
class OptimizedPlan:
    """최적화 계획"""
    total_transfer: float
    transactions: List[Transaction]
    deficit_coverage: float
    debt_reduction: float
    compliance_score: float
    tax_saved: float
    warnings: List[str]


class TransactionOptimizer:
    """다채널 원가 처리 최적화"""
    
    # 안전 한도 (매출 대비 %)
    LIMITS = {
        "ROYALTY": 0.02,
        "RND_SHARE": 0.05,
        "SERVICE_FEE": 0.03,
        "IP_LICENSE": 0.015
    }
    
    def __init__(self, source_revenue: float, source_profit: float):
        self.source_revenue = source_revenue
        self.source_profit = source_profit
    
    def optimize(
        self,
        target_amount: float,
        founder_deficit: float,
        founder_interest: float
    ) -> OptimizedPlan:
        """
        최적 거래 분배
        
        Args:
            target_amount: 목표 이전 금액
            founder_deficit: 파운더 연간 적자
            founder_interest: 파운더 연간 이자
        """
        transactions = []
        remaining = target_amount
        warnings = []
        
        # 1. 로열티 (20%)
        royalty_limit = self.source_revenue * self.LIMITS["ROYALTY"]
        royalty = min(target_amount * 0.20, royalty_limit, remaining)
        if royalty > 0:
            transactions.append(Transaction(
                tx_type="ROYALTY",
                amount=royalty,
                description="AUTUS 플랫폼 기술 로열티"
            ))
            remaining -= royalty
        
        # 2. R&D 분담금 (40%)
        rnd_limit = self.source_revenue * self.LIMITS["RND_SHARE"]
        rnd = min(target_amount * 0.40, rnd_limit, remaining)
        if rnd > 0:
            transactions.append(Transaction(
                tx_type="RND_SHARE",
                amount=rnd,
                description="공동 R&D 프로젝트 분담금"
            ))
            remaining -= rnd
        
        # 3. 용역비 (40%)
        service_limit = self.source_revenue * self.LIMITS["SERVICE_FEE"]
        service = min(target_amount * 0.40, service_limit, remaining)
        if service > 0:
            transactions.append(Transaction(
                tx_type="SERVICE_FEE",
                amount=service,
                description="시스템 운영/유지보수 용역"
            ))
            remaining -= service
        
        # 4. IP 라이선스 (잔여)
        if remaining > 0:
            ip_limit = self.source_revenue * self.LIMITS["IP_LICENSE"]
            ip = min(remaining, ip_limit)
            if ip > 0:
                transactions.append(Transaction(
                    tx_type="IP_LICENSE",
                    amount=ip,
                    description="IP 사용권 라이선스"
                ))
        
        # 합계
        total = sum(tx.amount for tx in transactions)
        
        # 적자 커버 계산
        deficit_coverage = min(total, founder_deficit)
        debt_reduction = max(0, total - deficit_coverage)
        
        # 절세액 (법인세 22%)
        tax_saved = total * 0.22
        
        # 적합성
        compliance = 1.0
        for tx in transactions:
            limit = self.source_revenue * self.LIMITS.get(tx.tx_type, 0.01)
            if tx.amount > limit:
                compliance -= 0.2
        
        if total < founder_deficit + founder_interest:
            warnings.append("⚠️ 이전액이 최소 필요액 미만")
        
        return OptimizedPlan(
            total_transfer=total,
            transactions=transactions,
            deficit_coverage=deficit_coverage,
            debt_reduction=debt_reduction,
            compliance_score=max(0, compliance),
            tax_saved=tax_saved,
            warnings=warnings
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CLARK HUB
# ═══════════════════════════════════════════════════════════════════════════════

class ClarkHub:
    """필리핀 클락 법인 (절세 허브)"""
    
    def __init__(self, config: Dict = None):
        if config is None:
            data = load_entities()
            config = data.get("clark_hub", {})
        
        self.tax_rate = config.get("tax_rate", 0.0)
        self.setup_cost = config.get("setup_cost", 0.5)
        self.annual_maintenance = config.get("annual_maintenance", 0.2)
        self.max_transfer_ratio = config.get("max_transfer_ratio", 0.15)
        self.accumulated = config.get("accumulated_capital", 0)
    
    def calculate_transfer(self, domestic_profit: float) -> Dict:
        """
        국내 이익 → 클락 이전 계산
        
        Args:
            domestic_profit: 국내 이익 (억)
        
        Returns:
            이전 계획 및 절세액
        """
        # 이전 가능 금액 (이익의 15%)
        transferable = domestic_profit * self.max_transfer_ratio
        
        # 국내 세금 (22%)
        domestic_tax = transferable * 0.22
        
        # 클락 세금 (0%)
        clark_tax = transferable * self.tax_rate
        
        # 순 절세액
        tax_saved = domestic_tax - clark_tax - self.annual_maintenance
        
        # 클락 적립액
        clark_accumulation = transferable - clark_tax
        
        return {
            "transferable": round(transferable, 2),
            "domestic_tax_avoided": round(domestic_tax, 2),
            "clark_tax": round(clark_tax, 2),
            "net_tax_saved": round(tax_saved, 2),
            "clark_accumulation": round(clark_accumulation, 2),
            "annual_cost": self.annual_maintenance
        }
    
    def simulate_5_years(self, annual_profit: float) -> List[Dict]:
        """5년 시뮬레이션"""
        results = []
        cumulative_saved = 0
        cumulative_accumulated = 0
        
        for year in range(1, 6):
            calc = self.calculate_transfer(annual_profit)
            cumulative_saved += calc["net_tax_saved"]
            cumulative_accumulated += calc["clark_accumulation"]
            
            results.append({
                "year": year,
                "transfer": calc["transferable"],
                "tax_saved": calc["net_tax_saved"],
                "accumulated": cumulative_accumulated,
                "cumulative_saved": cumulative_saved
            })
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# JEJU MILESTONE
# ═══════════════════════════════════════════════════════════════════════════════

class JejuMilestone:
    """제주 2026 마일스톤"""
    
    def __init__(self, config: Dict = None):
        if config is None:
            data = load_entities()
            config = data["entities"]["ATB_FOUNDER"]["milestones"]["jeju_2026"]
        
        self.completion_date = datetime.strptime(config["completion_date"], "%Y-%m-%d")
        self.cost = config["construction_cost"]
        self.monthly_revenue = config["monthly_revenue_addition"]
        self.depreciation_years = config["depreciation_years"]
    
    @property
    def months_remaining(self) -> int:
        """완공까지 남은 개월"""
        delta = self.completion_date - datetime.now()
        return max(0, delta.days // 30)
    
    @property
    def days_remaining(self) -> int:
        """완공까지 남은 일수"""
        delta = self.completion_date - datetime.now()
        return max(0, delta.days)
    
    @property
    def annual_depreciation(self) -> float:
        """연간 감가상각비"""
        return self.cost / self.depreciation_years
    
    @property
    def tax_savings(self) -> float:
        """연간 절세 효과"""
        return self.annual_depreciation * 0.22
    
    def cashflow_projection(self, months: int = 36) -> List[Dict]:
        """완공 후 현금흐름 예측"""
        results = []
        cumulative = 0
        
        for m in range(1, months + 1):
            # 매출 점진적 증가 (최대 150%)
            growth = min(1 + (m * 0.02), 1.5)
            monthly = self.monthly_revenue * growth
            cumulative += monthly
            
            results.append({
                "month": m,
                "revenue": round(monthly, 2),
                "cumulative": round(cumulative, 2),
                "depreciation": round(self.annual_depreciation / 12, 3),
                "net": round(monthly - self.annual_depreciation / 12, 2)
            })
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# MASTER KERNEL
# ═══════════════════════════════════════════════════════════════════════════════

class AutusKernel:
    """AUTUS v1.0 마스터 커널"""
    
    def __init__(self):
        self.data = load_entities()
        self.entities = self.data["entities"]
        
        self.physics = PhysicsEngine()
        self.clark = ClarkHub()
        self.jeju = JejuMilestone()
        
        # 엔티티 로드
        self.founder = self.entities["ATB_FOUNDER"]
        self.jinho = self.entities["KIM_JINHO"]
        self.jongho = self.entities["KIM_JONGHO"]
    
    def get_founder_status(self) -> Dict:
        """파운더 상태"""
        f = self.founder["financials"]
        return {
            "assets": f["assets"],
            "debt": f["debt"],
            "debt_ratio": round(f["debt"] / f["assets"], 2),
            "annual_deficit": abs(f["profit"]),
            "annual_interest": round(f["debt"] * f["debt_interest_rate"], 2),
            "minimum_required": abs(f["profit"]) + f["debt"] * f["debt_interest_rate"]
        }
    
    def get_jongho_capacity(self) -> Dict:
        """김종호 이전 가능 용량"""
        f = self.jongho["financials"]
        return {
            "total_revenue": f["total_revenue"],
            "total_profit": f["total_profit"],
            "available_30pct": round(f["total_profit"] * 0.30, 2),
            "available_50pct": round(f["total_profit"] * 0.50, 2),
            "corporations": self.jongho["corporations"]
        }
    
    def optimize_transfer(self, transfer_ratio: float = 0.30) -> OptimizedPlan:
        """이전 최적화"""
        jongho = self.get_jongho_capacity()
        founder = self.get_founder_status()
        
        target = jongho["total_profit"] * transfer_ratio
        
        optimizer = TransactionOptimizer(
            source_revenue=jongho["total_revenue"],
            source_profit=jongho["total_profit"]
        )
        
        return optimizer.optimize(
            target_amount=target,
            founder_deficit=founder["annual_deficit"],
            founder_interest=founder["annual_interest"]
        )
    
    def calculate_loss_velocity(self, pnr_days: int = 30) -> LossResult:
        """현재 손실 속도"""
        founder = self.get_founder_status()
        
        return self.physics.calculate_loss(
            capital=founder["debt"],
            resistance=0.7,  # 기관 협의
            entropy=0.5,     # 중간 불확실성
            pnr_days=pnr_days
        )
    
    def generate_full_report(self, transfer_ratio: float = 0.30) -> Dict:
        """전체 리포트"""
        founder = self.get_founder_status()
        jongho = self.get_jongho_capacity()
        plan = self.optimize_transfer(transfer_ratio)
        loss = self.calculate_loss_velocity()
        clark = self.clark.calculate_transfer(plan.total_transfer)
        jeju_cf = self.jeju.cashflow_projection(36)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "founder": founder,
            "jongho": jongho,
            "transfer_ratio": transfer_ratio,
            "optimized_plan": {
                "total": plan.total_transfer,
                "transactions": [
                    {"type": tx.tx_type, "amount": tx.amount, "desc": tx.description}
                    for tx in plan.transactions
                ],
                "deficit_coverage": plan.deficit_coverage,
                "debt_reduction": plan.debt_reduction,
                "compliance": plan.compliance_score,
                "tax_saved": plan.tax_saved,
                "warnings": plan.warnings
            },
            "loss_velocity": {
                "per_second": loss.loss_velocity_sec,
                "per_day": loss.loss_per_day,
                "per_month": loss.loss_per_month,
                "state": loss.state
            },
            "clark_hub": clark,
            "jeju_2026": {
                "days_remaining": self.jeju.days_remaining,
                "months_remaining": self.jeju.months_remaining,
                "monthly_revenue": self.jeju.monthly_revenue,
                "annual_depreciation": self.jeju.annual_depreciation,
                "tax_savings": self.jeju.tax_savings,
                "36_month_total": sum(cf["revenue"] for cf in jeju_cf)
            }
        }


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    kernel = AutusKernel()
    report = kernel.generate_full_report(0.30)
    print(json.dumps(report, ensure_ascii=False, indent=2))
