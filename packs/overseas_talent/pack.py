#!/usr/bin/env python3
"""
Overseas Talent Pack
====================
해외 인력 채용/관리 최적화
"""

import sys
sys.path.insert(0, '/Users/oseho/Desktop/autus')

from datetime import datetime
from typing import Dict, List
from dataclasses import dataclass

from autus_core.engine import BasePack, AnalysisResult, Entity


@dataclass
class TalentCost:
    """인력 비용 구조"""
    base_salary: float        # 기본급 (월, 만원)
    benefits: float           # 복리후생
    tax: float                # 세금/보험
    overhead: float           # 간접비
    total_monthly: float      # 월 총비용
    total_annual: float       # 연 총비용


class OverseasTalentPack(BasePack):
    """해외 인력 팩"""
    
    PACK_ID = "overseas_talent"
    PACK_NAME = "🌏 해외인력 Pack"
    PACK_VERSION = "1.0.0"
    
    # 국가별 비용 계수 (한국 대비)
    COUNTRY_COSTS = {
        "KR": {"salary": 1.0, "tax": 0.15, "overhead": 0.2, "name": "한국"},
        "PH": {"salary": 0.25, "tax": 0.05, "overhead": 0.1, "name": "필리핀"},
        "VN": {"salary": 0.20, "tax": 0.05, "overhead": 0.08, "name": "베트남"},
        "IN": {"salary": 0.22, "tax": 0.06, "overhead": 0.1, "name": "인도"},
        "ID": {"salary": 0.18, "tax": 0.04, "overhead": 0.08, "name": "인도네시아"},
    }
    
    # 직군별 기본급 (한국 기준, 만원/월)
    ROLE_BASE_SALARY = {
        "developer": 500,
        "designer": 400,
        "marketer": 350,
        "cs": 280,
        "admin": 250,
        "manager": 600,
    }
    
    def __init__(self):
        super().__init__()
        self.talents: List[Entity] = []
    
    def analyze(self, input_data: Dict) -> AnalysisResult:
        """인력 비용 분석"""
        
        # 입력 파싱
        current_team = input_data.get("current_team", [])
        target_country = input_data.get("target_country", "PH")
        migration_ratio = input_data.get("migration_ratio", 0.5)  # 50% 이전
        
        # 현재 비용 계산
        current_costs = self._calculate_team_cost(current_team, "KR")
        
        # 마이그레이션 후 비용 계산
        migrated_team = self._simulate_migration(current_team, target_country, migration_ratio)
        new_costs = self._calculate_mixed_team_cost(migrated_team)
        
        # 절감액
        savings = current_costs["annual"] - new_costs["annual"]
        savings_ratio = savings / current_costs["annual"] if current_costs["annual"] > 0 else 0
        
        # 리스크 점수
        risk_score = self._calculate_risk(target_country, migration_ratio)
        
        # 손실 속도 (현재 과지출)
        loss_velocity = (current_costs["monthly"] - new_costs["monthly"]) * 1e4 / 86400
        
        # 상태
        if savings_ratio >= 0.3:
            state = "STABLE"  # 30% 이상 절감 가능
        elif savings_ratio >= 0.15:
            state = "WARNING"
        else:
            state = "DANGER"  # 효과 미미
        
        return AnalysisResult(
            timestamp=datetime.now().isoformat(),
            pack_id=self.PACK_ID,
            pack_name=self.PACK_NAME,
            loss_velocity=round(loss_velocity, 2),
            pressure=current_costs["monthly"] / 100,
            entropy=risk_score,
            state=state,
            risk_score=risk_score,
            mva=self.generate_mva_from_savings(savings, target_country),
            alternatives=[
                f"베트남 이전 시 절감: ₩{self._estimate_savings(current_team, 'VN'):.0f}만/년",
                f"인도 이전 시 절감: ₩{self._estimate_savings(current_team, 'IN'):.0f}만/년",
                "하이브리드 팀 구성 검토"
            ],
            details={
                "current_cost": current_costs,
                "projected_cost": new_costs,
                "annual_savings": round(savings, 0),
                "savings_ratio": round(savings_ratio * 100, 1),
                "target_country": self.COUNTRY_COSTS[target_country]["name"],
                "migration_ratio": migration_ratio * 100,
                "team_size": len(current_team),
                "migrated_count": int(len(current_team) * migration_ratio)
            }
        )
    
    def calculate_loss(self, **kwargs) -> Dict:
        """손실 계산"""
        team = kwargs.get("team", [])
        costs = self._calculate_team_cost(team, "KR")
        
        return {
            "monthly_cost": costs["monthly"],
            "annual_cost": costs["annual"],
            "per_head": costs["per_head"]
        }
    
    def generate_mva(self, analysis: AnalysisResult) -> str:
        """MVA 생성"""
        details = analysis.details
        return f"{details['target_country']}로 {details['migration_ratio']:.0f}% 이전 시 연 ₩{details['annual_savings']:.0f}만 절감"
    
    def generate_mva_from_savings(self, savings: float, country: str) -> str:
        """절감액 기반 MVA"""
        country_name = self.COUNTRY_COSTS[country]["name"]
        if savings > 10000:
            return f"{country_name} 클락허브로 인력 이전 → 연 ₩{savings/10000:.1f}억 절감"
        else:
            return f"{country_name} 이전으로 연 ₩{savings:.0f}만 절감 가능"
    
    def _calculate_team_cost(self, team: List[Dict], country: str) -> Dict:
        """팀 비용 계산"""
        if not team:
            return {"monthly": 0, "annual": 0, "per_head": 0}
        
        total_monthly = 0
        for member in team:
            cost = self._calculate_member_cost(member, country)
            total_monthly += cost.total_monthly
        
        return {
            "monthly": round(total_monthly, 0),
            "annual": round(total_monthly * 12, 0),
            "per_head": round(total_monthly / len(team), 0) if team else 0
        }
    
    def _calculate_member_cost(self, member: Dict, country: str) -> TalentCost:
        """개인 비용 계산"""
        role = member.get("role", "developer")
        base = self.ROLE_BASE_SALARY.get(role, 400)
        
        c = self.COUNTRY_COSTS.get(country, self.COUNTRY_COSTS["KR"])
        
        salary = base * c["salary"]
        tax = salary * c["tax"]
        overhead = salary * c["overhead"]
        benefits = salary * 0.1  # 10% 복리후생
        
        total = salary + tax + overhead + benefits
        
        return TalentCost(
            base_salary=salary,
            benefits=benefits,
            tax=tax,
            overhead=overhead,
            total_monthly=total,
            total_annual=total * 12
        )
    
    def _simulate_migration(self, team: List[Dict], target: str, ratio: float) -> List[Dict]:
        """마이그레이션 시뮬레이션"""
        migrated = []
        migrate_count = int(len(team) * ratio)
        
        for i, member in enumerate(team):
            new_member = member.copy()
            if i < migrate_count:
                new_member["country"] = target
            else:
                new_member["country"] = "KR"
            migrated.append(new_member)
        
        return migrated
    
    def _calculate_mixed_team_cost(self, team: List[Dict]) -> Dict:
        """혼합 팀 비용"""
        total_monthly = 0
        for member in team:
            country = member.get("country", "KR")
            cost = self._calculate_member_cost(member, country)
            total_monthly += cost.total_monthly
        
        return {
            "monthly": round(total_monthly, 0),
            "annual": round(total_monthly * 12, 0),
            "per_head": round(total_monthly / len(team), 0) if team else 0
        }
    
    def _estimate_savings(self, team: List[Dict], country: str) -> float:
        """예상 절감액"""
        current = self._calculate_team_cost(team, "KR")
        future = self._calculate_team_cost(team, country)
        return current["annual"] - future["annual"]
    
    def _calculate_risk(self, country: str, ratio: float) -> float:
        """리스크 점수"""
        base_risk = {
            "KR": 0.1,
            "PH": 0.3,
            "VN": 0.35,
            "IN": 0.4,
            "ID": 0.35
        }.get(country, 0.5)
        
        # 이전 비율이 높을수록 리스크 증가
        return min(base_risk + (ratio * 0.2), 1.0)


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pack = OverseasTalentPack()
    
    # 테스트 팀
    test_team = [
        {"role": "developer", "name": "개발자1"},
        {"role": "developer", "name": "개발자2"},
        {"role": "developer", "name": "개발자3"},
        {"role": "designer", "name": "디자이너1"},
        {"role": "marketer", "name": "마케터1"},
        {"role": "cs", "name": "CS1"},
        {"role": "cs", "name": "CS2"},
        {"role": "admin", "name": "경영지원1"},
    ]
    
    result = pack.analyze({
        "current_team": test_team,
        "target_country": "PH",
        "migration_ratio": 0.5
    })
    
    from autus_core.hud import HUDRenderer
    HUDRenderer().render(result)
    
    print("\n📊 상세:")
    print(f"   현재 연 비용: ₩{result.details['current_cost']['annual']:,.0f}만")
    print(f"   예상 연 비용: ₩{result.details['projected_cost']['annual']:,.0f}만")
    print(f"   연간 절감액: ₩{result.details['annual_savings']:,.0f}만 ({result.details['savings_ratio']}%)")
