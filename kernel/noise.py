#!/usr/bin/env python3
"""
AUTUS Core - Noise Analyzer
===========================
7대 노이즈 지표 분석
"""

from enum import Enum
from dataclasses import dataclass
from typing import Dict, List
import re

class NoiseType(Enum):
    """7대 노이즈"""
    BIAS = "BIAS"               # 선입견
    SCARCITY = "SCARCITY"       # 조사부족
    STAGNATION = "STAGNATION"   # 실행지연
    ATTACHMENT = "ATTACHMENT"   # 감정매몰
    FRICTION = "FRICTION"       # 자원간섭
    HORIZON = "HORIZON"         # 맥락근시
    PARADOX = "PARADOX"         # 정보마비


NOISE_INFO = {
    NoiseType.BIAS: {"name_kr": "선입견", "threshold": 0.7},
    NoiseType.SCARCITY: {"name_kr": "조사부족", "threshold": 0.6},
    NoiseType.STAGNATION: {"name_kr": "실행지연", "threshold": 0.5},
    NoiseType.ATTACHMENT: {"name_kr": "감정매몰", "threshold": 0.5},
    NoiseType.FRICTION: {"name_kr": "자원간섭", "threshold": 0.4},
    NoiseType.HORIZON: {"name_kr": "맥락근시", "threshold": 0.6},
    NoiseType.PARADOX: {"name_kr": "정보마비", "threshold": 0.5},
}


@dataclass
class NoiseScore:
    """노이즈 점수"""
    type: NoiseType
    score: float
    status: str  # SAFE/WARNING/DANGER
    evidence: str


class NoiseAnalyzer:
    """7대 노이즈 분석기"""
    
    KEYWORDS = {
        NoiseType.BIAS: ["항상", "늘", "당연히", "원래", "예전부터"],
        NoiseType.SCARCITY: ["모르", "불확실", "예상", "추정", "아마"],
        NoiseType.STAGNATION: ["나중에", "검토", "고려", "미루", "보류"],
        NoiseType.ATTACHMENT: ["절대", "반드시", "꼭", "포기할 수 없"],
        NoiseType.FRICTION: ["vs", "대신", "또는", "아니면", "충돌"],
        NoiseType.HORIZON: ["당장", "지금", "급해", "일단"],
        NoiseType.PARADOX: ["고민", "갈등", "선택", "결정 못"],
    }
    
    def analyze(self, text: str) -> Dict[NoiseType, NoiseScore]:
        """텍스트에서 노이즈 분석"""
        results = {}
        
        for noise_type in NoiseType:
            score = self._calculate_score(text, noise_type)
            threshold = NOISE_INFO[noise_type]["threshold"]
            
            if score >= threshold:
                status = "DANGER"
            elif score >= threshold * 0.7:
                status = "WARNING"
            else:
                status = "SAFE"
            
            results[noise_type] = NoiseScore(
                type=noise_type,
                score=round(score, 3),
                status=status,
                evidence=self._get_evidence(text, noise_type)
            )
        
        return results
    
    def _calculate_score(self, text: str, noise_type: NoiseType) -> float:
        """노이즈 점수 계산"""
        keywords = self.KEYWORDS.get(noise_type, [])
        count = sum(1 for kw in keywords if kw in text)
        base_score = min(count * 0.15, 0.6)
        
        # 숫자가 적으면 불확실성 증가
        numbers = len(re.findall(r'\d+', text))
        if numbers < 2 and noise_type in [NoiseType.SCARCITY, NoiseType.BIAS]:
            base_score += 0.2
        
        return min(base_score, 1.0)
    
    def _get_evidence(self, text: str, noise_type: NoiseType) -> str:
        """근거 추출"""
        keywords = self.KEYWORDS.get(noise_type, [])
        found = [kw for kw in keywords if kw in text]
        if found:
            return f"키워드 감지: {', '.join(found[:3])}"
        return "직접 감지 없음"
    
    def get_dominant(self, scores: Dict[NoiseType, NoiseScore]) -> NoiseType:
        """가장 높은 노이즈 반환"""
        return max(scores.items(), key=lambda x: x[1].score)[0]
    
    def get_entropy(self, scores: Dict[NoiseType, NoiseScore]) -> float:
        """종합 엔트로피 계산"""
        if not scores:
            return 0.0
        
        weights = {
            NoiseType.BIAS: 1.5,
            NoiseType.SCARCITY: 1.2,
            NoiseType.ATTACHMENT: 1.3,
            NoiseType.PARADOX: 1.4,
        }
        
        weighted_sum = sum(
            s.score * weights.get(s.type, 1.0) 
            for s in scores.values()
        )
        weight_total = sum(weights.get(t, 1.0) for t in scores.keys())
        
        return min(weighted_sum / weight_total, 1.0) if weight_total else 0.0
