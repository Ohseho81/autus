#!/usr/bin/env python3
"""
AUTUS Kernel Engine v2.0
========================
18개 프로젝트를 관통하는 물리 기반 의사결정 엔진

핵심 수식:
    L = ∫ (P + R × S) dt
    
물리적 해석:
    1. Pressure(P): 시간↓ → 압력↑ (기하급수) → "미루기 = 파산"
    2. R × S: 저항 × 엔트로피 → "확인 없는 확신 = 모래바람"

Usage:
    python3 -m autus_kernel.engine --input "법인 부채 5억 상환 vs 신규 사업 3억 투입"
"""

import time
import json
import os
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple

from .physics import PhysicsConverter, PhysicsConstants, ProjectPhysics, ResistanceType
from .loss_function import LossFunction, LossResult, LossState

# ═══════════════════════════════════════════════════════════════════════════════
# KERNEL OUTPUT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class KernelOutput:
    """커널 출력 데이터"""
    
    # 메타
    timestamp: str
    input_hash: str
    
    # 물리량
    energy: float
    resistance: float
    entropy: float
    
    # 손실 분석
    loss_velocity: float      # 원/초
    loss_per_day: float       # 원/일
    loss_per_month: float     # 원/월
    pressure: float
    friction_loss: float
    
    # 상태
    state: str
    entropy_status: str
    pnr_days: float
    
    # 7대 노이즈 (Distiller 연동)
    noise_scores: Dict[str, float]
    dominant_noise: str
    
    # MVA (최소 유효 행동)
    mva: str
    alternatives: List[str]
    
    # 경고
    warnings: List[str]
    
    # 기본값 있는 필드들 (마지막에 배치)
    version: str = "2.0.0"
    vault_path: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS KERNEL
# ═══════════════════════════════════════════════════════════════════════════════

class AutusKernel:
    """
    AUTUS 핵심 엔진
    
    모든 비즈니스 의사결정을 물리량으로 변환하여 분석
    """
    
    def __init__(
        self,
        entropy_threshold: float = 0.8,
        vault_path: str = "./vault"
    ):
        self.entropy_threshold = entropy_threshold
        self.vault_path = vault_path
        self.loss_func = LossFunction(entropy_threshold=entropy_threshold)
        self.converter = PhysicsConverter()
        
        os.makedirs(vault_path, exist_ok=True)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MAIN ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze(
        self,
        input_text: str,
        capital_won: float = None,
        resistance: float = None,
        entropy: float = None,
        pnr_days: int = None,
        context: Dict = None
    ) -> KernelOutput:
        """
        통합 분석 실행
        
        Args:
            input_text: 의사결정 상황 텍스트
            capital_won: 투입 자본 (원), None이면 텍스트에서 추출
            resistance: 저항 (0.0 ~ 1.0), None이면 자동 계산
            entropy: 엔트로피 (0.0 ~ 1.0), None이면 Distiller에서 계산
            pnr_days: PNR까지 남은 일수, None이면 기본값 30
            context: 추가 컨텍스트
        
        Returns:
            KernelOutput: 분석 결과
        """
        import hashlib
        timestamp = datetime.now().isoformat()
        input_hash = hashlib.md5(input_text.encode()).hexdigest()[:8]
        context = context or {}
        
        # ─────────────────────────────────────────────────────────────────────
        # 1. Distiller로 7대 노이즈 분석
        # ─────────────────────────────────────────────────────────────────────
        try:
            import sys
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from autus_distiller import Distiller
            
            distiller = Distiller(vault_path=self.vault_path)
            distill_result = distiller.distill(input_text, context)
            
            # 노이즈 점수 추출
            noise_scores = {
                ind.type: ind.score 
                for ind in distill_result.noise_indicators
            }
            dominant_noise = distill_result.dominant_noise
            mva = distill_result.mva
            alternatives = distill_result.alternative_paths
            vault_path = distill_result.vault_path
            
        except ImportError:
            # Distiller 없으면 기본값
            noise_scores = {}
            dominant_noise = "UNKNOWN"
            mva = "데이터 분석 필요"
            alternatives = []
            vault_path = None
        
        # ─────────────────────────────────────────────────────────────────────
        # 2. 물리량 추출/계산
        # ─────────────────────────────────────────────────────────────────────
        
        # 자본 추출
        if capital_won is None:
            capital_won = self._extract_capital(input_text)
        
        # 저항 계산
        if resistance is None:
            resistance = self._calculate_resistance(input_text, context)
        
        # 엔트로피 계산 (노이즈 기반)
        if entropy is None:
            if noise_scores:
                entropy = self.converter.noise_to_entropy(noise_scores)
            else:
                entropy = 0.5  # 기본값
        
        # PNR 기본값
        if pnr_days is None:
            pnr_days = context.get('pnr_days', 30)
        
        # 에너지 변환
        energy = self.converter.money_to_energy(capital_won)
        
        # ─────────────────────────────────────────────────────────────────────
        # 3. 손실 함수 계산
        # ─────────────────────────────────────────────────────────────────────
        pnr_timestamp = time.time() + (pnr_days * 86400)
        loss_result = self.loss_func.calculate(
            energy=energy,
            resistance=resistance,
            entropy=entropy,
            pnr_timestamp=pnr_timestamp
        )
        
        # ─────────────────────────────────────────────────────────────────────
        # 4. 결과 조합
        # ─────────────────────────────────────────────────────────────────────
        return KernelOutput(
            timestamp=timestamp,
            input_hash=input_hash,
            energy=round(energy, 4),
            resistance=round(resistance, 3),
            entropy=round(entropy, 3),
            loss_velocity=loss_result.loss_velocity,
            loss_per_day=loss_result.loss_per_day,
            loss_per_month=loss_result.loss_per_month,
            pressure=loss_result.pressure,
            friction_loss=loss_result.friction_loss,
            state=loss_result.state.value,
            entropy_status=loss_result.entropy_status,
            pnr_days=loss_result.pnr_remaining_days,
            noise_scores=noise_scores,
            dominant_noise=dominant_noise,
            mva=mva,
            alternatives=alternatives,
            warnings=loss_result.warnings,
            vault_path=vault_path
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # EXTRACTORS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _extract_capital(self, text: str) -> float:
        """텍스트에서 자본 금액 추출"""
        import re
        
        amounts = []
        
        # 억 단위
        matches = re.findall(r'(\d+(?:\.\d+)?)\s*억', text)
        for m in matches:
            amounts.append(float(m) * 1e8)
        
        # 만 단위
        matches = re.findall(r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*만', text)
        for m in matches:
            amounts.append(float(m.replace(',', '')) * 1e4)
        
        # 원 단위
        matches = re.findall(r'(\d+(?:,\d{3})*)\s*원', text)
        for m in matches:
            amounts.append(float(m.replace(',', '')))
        
        if amounts:
            return max(amounts)  # 가장 큰 금액 반환
        
        return 1e8  # 기본값 1억
    
    def _calculate_resistance(self, text: str, context: Dict) -> float:
        """텍스트와 컨텍스트로부터 저항 계산"""
        resistances = []
        
        # 텍스트 키워드 기반 저항
        keyword_resistance = {
            # 기관/규제
            "정부": 0.7, "규제": 0.6, "법인": 0.5, "기관": 0.6,
            "승인": 0.5, "허가": 0.6, "계약": 0.4, "협의": 0.5,
            # 경쟁/시장
            "경쟁": 0.5, "시장": 0.4, "경기": 0.4,
            # 내부
            "인력": 0.3, "팀": 0.2, "조직": 0.3,
            # 재무
            "부채": 0.6, "상환": 0.5, "투자": 0.4, "자금": 0.3,
        }
        
        for keyword, r in keyword_resistance.items():
            if keyword in text:
                resistances.append(r)
        
        # 컨텍스트 저항
        if context.get('is_b2b'):
            resistances.append(0.5)
        if context.get('is_b2g'):
            resistances.append(0.7)
        if context.get('has_regulation'):
            resistances.append(0.6)
        
        if resistances:
            return self.converter.resistances_to_total(resistances)
        
        return 0.4  # 기본값
    
    # ═══════════════════════════════════════════════════════════════════════════
    # QUICK METHODS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def quick_check(
        self,
        capital_억: float,
        resistance: float,
        entropy: float,
        pnr_days: int
    ) -> Dict:
        """
        빠른 손실 체크 (파라미터 직접 입력)
        
        Args:
            capital_억: 투입 자본 (억 단위)
            resistance: 저항 (0.0 ~ 1.0)
            entropy: 엔트로피 (0.0 ~ 1.0)
            pnr_days: PNR까지 남은 일수
        """
        result = self.loss_func.calculate_from_business(
            capital_won=capital_억 * 1e8,
            resistance=resistance,
            entropy=entropy,
            pnr_days=pnr_days
        )
        return result.to_dict()
    
    def simulate_scenarios(
        self,
        base_capital: float,
        base_resistance: float,
        base_entropy: float,
        pnr_range: List[int] = [7, 14, 30, 60, 90]
    ) -> List[Dict]:
        """PNR 변화에 따른 시나리오 시뮬레이션"""
        scenarios = []
        
        for pnr in pnr_range:
            result = self.quick_check(
                capital_억=base_capital / 1e8,
                resistance=base_resistance,
                entropy=base_entropy,
                pnr_days=pnr
            )
            result['pnr_days_input'] = pnr
            scenarios.append(result)
        
        return scenarios


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Kernel Engine")
    parser.add_argument("--input", "-i", required=True, help="의사결정 상황")
    parser.add_argument("--capital", "-c", type=float, help="투입 자본 (억)")
    parser.add_argument("--resistance", "-r", type=float, help="저항 (0-1)")
    parser.add_argument("--entropy", "-e", type=float, help="엔트로피 (0-1)")
    parser.add_argument("--pnr", "-p", type=int, default=30, help="PNR (일)")
    parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    args = parser.parse_args()
    
    kernel = AutusKernel()
    
    result = kernel.analyze(
        input_text=args.input,
        capital_won=args.capital * 1e8 if args.capital else None,
        resistance=args.resistance,
        entropy=args.entropy,
        pnr_days=args.pnr
    )
    
    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        # HUD 스타일 출력
        try:
            import sys
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from autus_hud import HUDRenderer
            from autus_distiller import Distiller, HUDOutput, NoiseIndicator
            
            # KernelOutput → HUDOutput 변환
            noise_indicators = [
                NoiseIndicator(
                    type=k, name_kr=k, score=v,
                    threshold=0.5, status="WARNING" if v > 0.5 else "SAFE",
                    evidence="", impact_won=result.loss_per_month * v
                )
                for k, v in result.noise_scores.items()
            ]
            
            hud = HUDOutput(
                timestamp=result.timestamp,
                input_hash=result.input_hash,
                loss_velocity=result.loss_velocity,
                pnr_days=int(result.pnr_days),
                mva=result.mva,
                noise_indicators=noise_indicators,
                dominant_noise=result.dominant_noise,
                total_noise_score=result.entropy,
                recommended_action=result.mva,
                alternative_paths=result.alternatives,
                risk_assessment=result.state,
                vault_path=result.vault_path
            )
            
            renderer = HUDRenderer()
            renderer.render(hud)
            
        except ImportError:
            # 기본 출력
            print(f"Loss Velocity: ₩{result.loss_velocity}/sec")
            print(f"State: {result.state}")
            print(f"PNR: {result.pnr_days} days")


if __name__ == "__main__":
    main()
