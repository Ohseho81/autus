#!/usr/bin/env python3
"""
AUTUS 2.0 Distiller Engine
==========================
Raw Data에서 7대 노이즈 지표를 증류(Distill)하여 HUD JSON 반환

7대 노이즈 지표:
1. BIAS       - 선입견: 과거 패턴에 대한 과도한 의존
2. SCARCITY   - 조사부족: 의사결정을 위한 데이터 부족
3. STAGNATION - 실행지연: 결정 후 실행까지의 지연
4. ATTACHMENT - 감정매몰: 비합리적 감정적 집착
5. FRICTION   - 자원간섭: 자원 배분의 비효율성
6. HORIZON    - 맥락근시: 단기 시야로 인한 장기 손실
7. PARADOX    - 정보마비: 과잉 정보로 인한 결정 불능

Usage:
    python3 autus_distiller.py --input "법인 부채 5억 상환 vs 신규 사업 3억 투입"
"""

import os
import sys
import json
import shutil
import hashlib
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
import re
import math

# ═══════════════════════════════════════════════════════════════════════════════
# 7대 노이즈 지표 정의
# ═══════════════════════════════════════════════════════════════════════════════

class NoiseType(Enum):
    BIAS = "BIAS"               # 선입견
    SCARCITY = "SCARCITY"       # 조사부족
    STAGNATION = "STAGNATION"   # 실행지연
    ATTACHMENT = "ATTACHMENT"   # 감정매몰
    FRICTION = "FRICTION"       # 자원간섭
    HORIZON = "HORIZON"         # 맥락근시
    PARADOX = "PARADOX"         # 정보마비

NOISE_THRESHOLDS = {
    NoiseType.BIAS: 0.7,
    NoiseType.SCARCITY: 0.6,
    NoiseType.STAGNATION: 0.5,  # 72시간 기준 정규화
    NoiseType.ATTACHMENT: 0.5,
    NoiseType.FRICTION: 0.4,
    NoiseType.HORIZON: 0.6,
    NoiseType.PARADOX: 0.5,
}

NOISE_KOREAN = {
    NoiseType.BIAS: "선입견",
    NoiseType.SCARCITY: "조사부족",
    NoiseType.STAGNATION: "실행지연",
    NoiseType.ATTACHMENT: "감정매몰",
    NoiseType.FRICTION: "자원간섭",
    NoiseType.HORIZON: "맥락근시",
    NoiseType.PARADOX: "정보마비",
}

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class NoiseIndicator:
    """단일 노이즈 지표"""
    type: str
    name_kr: str
    score: float           # 0.0 ~ 1.0
    threshold: float
    status: str            # SAFE, WARNING, DANGER
    evidence: str          # 근거
    impact_won: float      # 예상 손실 (원)
    
@dataclass
class HUDOutput:
    """HUD 스타일 출력 데이터"""
    timestamp: str
    input_hash: str
    
    # 핵심 지표
    loss_velocity: float           # 손실 속도 (원/초)
    pnr_days: int                  # Point of No Return까지 남은 일수
    mva: str                       # Minimal Viable Action
    
    # 7대 노이즈
    noise_indicators: List[NoiseIndicator]
    dominant_noise: str            # 가장 높은 노이즈
    total_noise_score: float       # 종합 노이즈 점수
    
    # 의사결정 지원
    recommended_action: str
    alternative_paths: List[str]
    risk_assessment: str
    
    # 메타데이터
    vault_path: Optional[str] = None
    model_used: str = "distiller-v2.0"

# ═══════════════════════════════════════════════════════════════════════════════
# DISTILLER ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class Distiller:
    """7대 노이즈 증류기"""
    
    # 감정/편향 키워드
    BIAS_KEYWORDS = ["항상", "늘", "당연히", "원래", "예전부터", "전통적으로", "관례상"]
    ATTACHMENT_KEYWORDS = ["절대", "반드시", "꼭", "무조건", "포기할 수 없", "애착", "정들"]
    HORIZON_KEYWORDS = ["당장", "지금", "급해", "일단", "나중에", "언젠가"]
    PARADOX_KEYWORDS = ["고민", "갈등", "선택", "vs", "아니면", "또는", "한편"]
    
    def __init__(self, vault_path: str = "./vault"):
        self.vault_path = vault_path
        os.makedirs(vault_path, exist_ok=True)
    
    def distill(self, raw_input: str, context: Dict = None) -> HUDOutput:
        """
        Raw Input에서 7대 노이즈 지표 증류
        
        Args:
            raw_input: 분석할 텍스트 (의사결정 상황)
            context: 추가 컨텍스트 (재무 데이터 등)
        
        Returns:
            HUDOutput: HUD 스타일 분석 결과
        """
        context = context or {}
        timestamp = datetime.now().isoformat()
        input_hash = hashlib.md5(raw_input.encode()).hexdigest()[:8]
        
        # 금액 추출
        amounts = self._extract_amounts(raw_input)
        total_amount = sum(amounts) if amounts else 100_000_000  # 기본 1억
        
        # 7대 노이즈 계산
        indicators = []
        
        # 1. BIAS (선입견)
        bias_score = self._calculate_bias(raw_input)
        indicators.append(self._create_indicator(
            NoiseType.BIAS, bias_score,
            "과거 패턴/관례에 의존하는 표현 감지" if bias_score > 0.3 else "객관적 분석 기반",
            total_amount * bias_score * 0.15
        ))
        
        # 2. SCARCITY (조사부족)
        scarcity_score = self._calculate_scarcity(raw_input, context)
        indicators.append(self._create_indicator(
            NoiseType.SCARCITY, scarcity_score,
            "의사결정에 필요한 데이터 부족" if scarcity_score > 0.4 else "충분한 데이터 확보",
            total_amount * scarcity_score * 0.2
        ))
        
        # 3. STAGNATION (실행지연)
        stagnation_score = self._calculate_stagnation(raw_input, context)
        indicators.append(self._create_indicator(
            NoiseType.STAGNATION, stagnation_score,
            "결정-실행 간 지연 리스크" if stagnation_score > 0.3 else "실행 준비 완료",
            total_amount * stagnation_score * 0.1
        ))
        
        # 4. ATTACHMENT (감정매몰)
        attachment_score = self._calculate_attachment(raw_input)
        indicators.append(self._create_indicator(
            NoiseType.ATTACHMENT, attachment_score,
            "감정적 집착 표현 감지" if attachment_score > 0.3 else "합리적 판단 가능",
            total_amount * attachment_score * 0.25
        ))
        
        # 5. FRICTION (자원간섭)
        friction_score = self._calculate_friction(raw_input, amounts)
        indicators.append(self._create_indicator(
            NoiseType.FRICTION, friction_score,
            "자원 배분 충돌 감지" if friction_score > 0.3 else "자원 배분 최적화됨",
            total_amount * friction_score * 0.15
        ))
        
        # 6. HORIZON (맥락근시)
        horizon_score = self._calculate_horizon(raw_input)
        indicators.append(self._create_indicator(
            NoiseType.HORIZON, horizon_score,
            "단기 시야 편향 감지" if horizon_score > 0.4 else "장기 관점 유지",
            total_amount * horizon_score * 0.2
        ))
        
        # 7. PARADOX (정보마비)
        paradox_score = self._calculate_paradox(raw_input)
        indicators.append(self._create_indicator(
            NoiseType.PARADOX, paradox_score,
            "선택지 과잉으로 결정 지연" if paradox_score > 0.4 else "명확한 선택지 존재",
            total_amount * paradox_score * 0.1
        ))
        
        # 종합 분석
        total_noise = sum(ind.score for ind in indicators) / len(indicators)
        dominant = max(indicators, key=lambda x: x.score)
        total_impact = sum(ind.impact_won for ind in indicators)
        
        # 손실 속도 계산 (월간 손실 → 초당 손실)
        loss_velocity = total_impact / (30 * 24 * 60 * 60)
        
        # PNR 계산 (자원 소진까지 남은 일수)
        pnr_days = self._calculate_pnr(total_amount, total_impact)
        
        # MVA 생성
        mva = self._generate_mva(dominant, raw_input, amounts)
        
        # 대안 경로
        alternatives = self._generate_alternatives(raw_input, indicators)
        
        # 리스크 평가
        risk = "HIGH" if total_noise > 0.6 else ("MEDIUM" if total_noise > 0.4 else "LOW")
        
        # Raw Data를 Vault로 이동
        vault_file = self._archive_to_vault(raw_input, input_hash, timestamp)
        
        return HUDOutput(
            timestamp=timestamp,
            input_hash=input_hash,
            loss_velocity=round(loss_velocity, 2),
            pnr_days=pnr_days,
            mva=mva,
            noise_indicators=indicators,
            dominant_noise=dominant.type,
            total_noise_score=round(total_noise, 3),
            recommended_action=mva,
            alternative_paths=alternatives,
            risk_assessment=risk,
            vault_path=vault_file
        )
    
    def _extract_amounts(self, text: str) -> List[float]:
        """텍스트에서 금액 추출"""
        amounts = []
        patterns = [
            r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*억',
            r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*만',
            r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*원',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                num = float(match.replace(',', ''))
                if '억' in text[text.find(match):text.find(match)+10]:
                    amounts.append(num * 100_000_000)
                elif '만' in text[text.find(match):text.find(match)+10]:
                    amounts.append(num * 10_000)
                else:
                    amounts.append(num)
        
        return amounts if amounts else [100_000_000]
    
    def _calculate_bias(self, text: str) -> float:
        """선입견 점수 계산"""
        count = sum(1 for kw in self.BIAS_KEYWORDS if kw in text)
        base_score = min(count * 0.15, 0.6)
        
        # 숫자/데이터 언급이 적으면 편향 증가
        numbers = len(re.findall(r'\d+', text))
        if numbers < 2:
            base_score += 0.2
        
        return min(base_score, 1.0)
    
    def _calculate_scarcity(self, text: str, context: Dict) -> float:
        """조사부족 점수 계산"""
        score = 0.5  # 기본값
        
        # 숫자가 많으면 조사가 된 것
        numbers = len(re.findall(r'\d+', text))
        score -= numbers * 0.05
        
        # 컨텍스트에 데이터가 있으면 감소
        if context.get('financial_data'):
            score -= 0.2
        if context.get('market_data'):
            score -= 0.15
        
        # '모르' '불확실' '예상' 등이 있으면 증가
        uncertainty = ['모르', '불확실', '예상', '추정', '아마', '것 같']
        score += sum(0.1 for kw in uncertainty if kw in text)
        
        return max(0, min(score, 1.0))
    
    def _calculate_stagnation(self, text: str, context: Dict) -> float:
        """실행지연 점수 계산"""
        score = 0.3
        
        # 지연 키워드
        delay = ['나중에', '검토', '고려', '생각해', '미루', '보류', '대기']
        score += sum(0.1 for kw in delay if kw in text)
        
        # 컨텍스트에서 마지막 결정 시점 확인
        if context.get('last_decision_days', 0) > 30:
            score += 0.2
        
        return min(score, 1.0)
    
    def _calculate_attachment(self, text: str) -> float:
        """감정매몰 점수 계산"""
        count = sum(1 for kw in self.ATTACHMENT_KEYWORDS if kw in text)
        base_score = min(count * 0.2, 0.6)
        
        # 감정 표현
        emotions = ['싫', '좋', '원해', '바라', '희망', '두려', '걱정']
        base_score += sum(0.08 for kw in emotions if kw in text)
        
        return min(base_score, 1.0)
    
    def _calculate_friction(self, text: str, amounts: List[float]) -> float:
        """자원간섭 점수 계산"""
        score = 0.2
        
        # 금액이 여러 개면 자원 충돌 가능성
        if len(amounts) > 1:
            score += 0.15 * (len(amounts) - 1)
        
        # vs, 대신, 또는 등 대립 표현
        conflict = ['vs', '대신', '또는', '아니면', '대비', '비교']
        score += sum(0.1 for kw in conflict if kw in text.lower())
        
        return min(score, 1.0)
    
    def _calculate_horizon(self, text: str) -> float:
        """맥락근시 점수 계산"""
        count = sum(1 for kw in self.HORIZON_KEYWORDS if kw in text)
        base_score = min(count * 0.15, 0.5)
        
        # 장기 키워드가 있으면 감소
        long_term = ['장기', '미래', '5년', '10년', '전략적', '지속']
        base_score -= sum(0.1 for kw in long_term if kw in text)
        
        return max(0, min(base_score, 1.0))
    
    def _calculate_paradox(self, text: str) -> float:
        """정보마비 점수 계산"""
        count = sum(1 for kw in self.PARADOX_KEYWORDS if kw in text)
        base_score = min(count * 0.15, 0.5)
        
        # 선택지가 많으면 증가
        options = text.count(',') + text.count('또는') + text.count('vs')
        base_score += options * 0.05
        
        return min(base_score, 1.0)
    
    def _create_indicator(self, noise_type: NoiseType, score: float, 
                          evidence: str, impact: float) -> NoiseIndicator:
        """노이즈 지표 객체 생성"""
        threshold = NOISE_THRESHOLDS[noise_type]
        
        if score >= threshold:
            status = "DANGER"
        elif score >= threshold * 0.7:
            status = "WARNING"
        else:
            status = "SAFE"
        
        return NoiseIndicator(
            type=noise_type.value,
            name_kr=NOISE_KOREAN[noise_type],
            score=round(score, 3),
            threshold=threshold,
            status=status,
            evidence=evidence,
            impact_won=round(impact, 0)
        )
    
    def _calculate_pnr(self, total_amount: float, monthly_impact: float) -> int:
        """Point of No Return 계산"""
        if monthly_impact <= 0:
            return 365
        
        days = int((total_amount * 0.3) / (monthly_impact / 30))  # 30% 소진 기준
        return max(1, min(days, 365))
    
    def _generate_mva(self, dominant: NoiseIndicator, text: str, 
                      amounts: List[float]) -> str:
        """Minimal Viable Action 생성"""
        mva_templates = {
            "BIAS": "과거 데이터 3건 이상 수집 후 재분석",
            "SCARCITY": "핵심 지표 5개 정량화 후 재검토",
            "STAGNATION": "48시간 내 1차 실행 착수",
            "ATTACHMENT": "제3자 객관적 리뷰 요청",
            "FRICTION": "자원 배분 우선순위 재정렬",
            "HORIZON": "5년 시뮬레이션 실행",
            "PARADOX": "선택지를 2개로 축소 후 결정",
        }
        
        base_mva = mva_templates.get(dominant.type, "즉시 실행")
        
        # 금액 기반 구체화
        if amounts and amounts[0] >= 100_000_000:
            return f"{base_mva} (관련 금액: {amounts[0]/100_000_000:.1f}억)"
        
        return base_mva
    
    def _generate_alternatives(self, text: str, 
                               indicators: List[NoiseIndicator]) -> List[str]:
        """대안 경로 생성"""
        alternatives = []
        
        sorted_noise = sorted(indicators, key=lambda x: x.score, reverse=True)
        
        for ind in sorted_noise[:3]:
            if ind.status != "SAFE":
                if ind.type == "BIAS":
                    alternatives.append("경쟁사 벤치마크 데이터 확보")
                elif ind.type == "SCARCITY":
                    alternatives.append("외부 전문가 자문 의뢰")
                elif ind.type == "STAGNATION":
                    alternatives.append("파일럿 프로젝트로 소규모 선실행")
                elif ind.type == "ATTACHMENT":
                    alternatives.append("손절 기준점 사전 설정")
                elif ind.type == "FRICTION":
                    alternatives.append("자원 풀 분리 운영")
                elif ind.type == "HORIZON":
                    alternatives.append("장기 시나리오 3개 작성")
                elif ind.type == "PARADOX":
                    alternatives.append("의사결정 매트릭스 작성")
        
        return alternatives if alternatives else ["현재 계획 유지"]
    
    def _archive_to_vault(self, raw_input: str, hash_id: str, 
                          timestamp: str) -> str:
        """Raw Data를 Vault로 아카이브"""
        date_str = timestamp.split("T")[0]
        filename = f"{date_str}_{hash_id}.json"
        filepath = os.path.join(self.vault_path, filename)
        
        archive_data = {
            "archived_at": timestamp,
            "hash": hash_id,
            "raw_input": raw_input,
            "status": "archived"
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(archive_data, f, ensure_ascii=False, indent=2)
        
        return filepath
    
    def to_hud_json(self, output: HUDOutput) -> str:
        """HUD 스타일 JSON 변환"""
        
        def serialize(obj):
            if isinstance(obj, NoiseIndicator):
                return asdict(obj)
            return obj
        
        data = {
            "hud_version": "2.0",
            "timestamp": output.timestamp,
            "hash": output.input_hash,
            "core_metrics": {
                "loss_velocity_won_sec": output.loss_velocity,
                "pnr_days": output.pnr_days,
                "mva": output.mva,
                "risk": output.risk_assessment
            },
            "noise_analysis": {
                "dominant": output.dominant_noise,
                "total_score": output.total_noise_score,
                "indicators": [asdict(ind) for ind in output.noise_indicators]
            },
            "actions": {
                "recommended": output.recommended_action,
                "alternatives": output.alternative_paths
            },
            "vault": output.vault_path
        }
        
        return json.dumps(data, ensure_ascii=False, indent=2)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS 2.0 Distiller")
    parser.add_argument("--input", "-i", required=True, help="분석할 의사결정 상황")
    parser.add_argument("--output", "-o", help="결과 저장 경로")
    parser.add_argument("--json", action="store_true", help="JSON 형식 출력")
    
    args = parser.parse_args()
    
    distiller = Distiller()
    result = distiller.distill(args.input)
    
    if args.json:
        print(distiller.to_hud_json(result))
    else:
        # HUD 스타일 콘솔 출력은 autus_hud.py에서 처리
        from autus_hud import HUDRenderer
        renderer = HUDRenderer()
        renderer.render(result)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(distiller.to_hud_json(result))
        print(f"\n💾 Saved to: {args.output}")


if __name__ == "__main__":
    main()
