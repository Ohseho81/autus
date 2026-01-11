"""
═══════════════════════════════════════════════════════════════════════════════
🌌 AUTUS v2.1 - Layers, Circuits & Influence Matrix
═══════════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, List, Optional
from .types import LayerSpec, CircuitSpec, InfluenceLink, LayerId, CircuitId

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 5개 레이어 정의
# ═══════════════════════════════════════════════════════════════════════════════

LAYERS: Dict[LayerId, LayerSpec] = {
    LayerId.L1: LayerSpec(
        id=LayerId.L1, name="재무", icon="💰", color="#FFD700",
        node_ids=["n01", "n02", "n03", "n04", "n05", "n06", "n07", "n08"],
        desc="현금 흐름과 재정 건전성"
    ),
    LayerId.L2: LayerSpec(
        id=LayerId.L2, name="생체", icon="❤️", color="#FF6B6B",
        node_ids=["n09", "n10", "n11", "n12", "n13", "n14"],
        desc="신체적/정신적 건강 상태"
    ),
    LayerId.L3: LayerSpec(
        id=LayerId.L3, name="운영", icon="⚙️", color="#4ECDC4",
        node_ids=["n15", "n16", "n17", "n18", "n19", "n20", "n21", "n22"],
        desc="업무 처리 및 생산성"
    ),
    LayerId.L4: LayerSpec(
        id=LayerId.L4, name="고객", icon="👥", color="#9B59B6",
        node_ids=["n23", "n24", "n25", "n26", "n27", "n28", "n29"],
        desc="고객 관계 및 매출"
    ),
    LayerId.L5: LayerSpec(
        id=LayerId.L5, name="외부", icon="🌍", color="#3498DB",
        node_ids=["n30", "n31", "n32", "n33", "n34", "n35", "n36"],
        desc="외부 환경 및 시장"
    ),
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 5개 회로 정의
# ═══════════════════════════════════════════════════════════════════════════════

CIRCUITS: Dict[CircuitId, CircuitSpec] = {
    CircuitId.SURVIVAL: CircuitSpec(
        id=CircuitId.SURVIVAL, name="Survival Circuit", name_kr="생존 회로",
        icon="🛡️", node_ids=["n03", "n01", "n05"],
        desc="지출 → 현금 → 런웨이",
        formula="런웨이 = 현금 / 월지출", threshold=0.5
    ),
    CircuitId.FATIGUE: CircuitSpec(
        id=CircuitId.FATIGUE, name="Fatigue Circuit", name_kr="피로 회로",
        icon="😵", node_ids=["n18", "n09", "n10", "n16"],
        desc="태스크 → 수면 → HRV → 지연",
        formula="피로도 = 태스크 × (1 - 수면/8) × (1 - HRV/50)", threshold=0.4
    ),
    CircuitId.REPEAT: CircuitSpec(
        id=CircuitId.REPEAT, name="Repeat Capital Circuit", name_kr="반복자본 회로",
        icon="🔄", node_ids=["n26", "n02", "n01"],
        desc="반복구매 → 수입 → 현금",
        formula="반복자본 = 반복구매율 × ARPU × 고객수", threshold=0.3
    ),
    CircuitId.PEOPLE: CircuitSpec(
        id=CircuitId.PEOPLE, name="People Circuit", name_kr="인력 회로",
        icon="👥", node_ids=["n31", "n17", "n20"],
        desc="이직률 → 가동률 → 처리속도",
        formula="인력효율 = 가동률 × (1 - 이직률/100)", threshold=0.3
    ),
    CircuitId.GROWTH: CircuitSpec(
        id=CircuitId.GROWTH, name="Growth Circuit", name_kr="성장 회로",
        icon="📈", node_ids=["n29", "n23", "n02"],
        desc="리드 → 고객수 → 수입",
        formula="성장률 = 리드 × 전환율 × ARPU", threshold=0.2
    ),
}

CIRCUIT_IDS: List[CircuitId] = list(CIRCUITS.keys())

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 영향도 매트릭스 (47개 링크)
# ═══════════════════════════════════════════════════════════════════════════════

INFLUENCE_MATRIX: List[InfluenceLink] = [
    # 💰 재무 체인
    InfluenceLink(source="n02", target="n01", weight=0.8, desc="수입 → 현금 증가"),
    InfluenceLink(source="n03", target="n01", weight=-0.9, desc="지출 → 현금 감소"),
    InfluenceLink(source="n01", target="n05", weight=0.7, desc="현금 → 런웨이 증가"),
    InfluenceLink(source="n03", target="n05", weight=-0.8, desc="지출 → 런웨이 감소"),
    InfluenceLink(source="n04", target="n03", weight=0.3, desc="부채 → 지출 증가 (이자)"),
    InfluenceLink(source="n07", target="n01", weight=-0.2, delay=30, desc="미수금 → 현금 유동성 압박"),
    InfluenceLink(source="n06", target="n05", weight=0.4, desc="예비비 → 런웨이 완충"),
    InfluenceLink(source="n08", target="n02", weight=0.5, desc="마진 → 수입 영향"),
    
    # ❤️ 생체 체인
    InfluenceLink(source="n09", target="n10", weight=0.7, desc="수면 → HRV 개선"),
    InfluenceLink(source="n09", target="n17", weight=0.6, desc="수면 → 가동률 향상"),
    InfluenceLink(source="n10", target="n17", weight=0.5, desc="HRV → 가동률 영향"),
    InfluenceLink(source="n11", target="n09", weight=0.3, desc="활동량 → 수면 품질"),
    InfluenceLink(source="n11", target="n10", weight=0.4, desc="활동량 → HRV 개선"),
    InfluenceLink(source="n12", target="n09", weight=-0.6, desc="연속작업 → 수면 부족"),
    InfluenceLink(source="n12", target="n10", weight=-0.5, desc="연속작업 → HRV 저하"),
    InfluenceLink(source="n13", target="n12", weight=0.7, desc="휴식간격 → 연속작업 증가"),
    InfluenceLink(source="n14", target="n17", weight=-0.8, desc="병가 → 가동률 급감"),
    
    # ⚙️ 운영 체인
    InfluenceLink(source="n18", target="n16", weight=0.6, desc="태스크 과다 → 지연 증가"),
    InfluenceLink(source="n18", target="n12", weight=0.5, desc="태스크 → 연속작업 증가"),
    InfluenceLink(source="n17", target="n20", weight=0.8, desc="가동률 → 처리속도"),
    InfluenceLink(source="n16", target="n15", weight=-0.7, desc="지연 → 마감 압박"),
    InfluenceLink(source="n19", target="n16", weight=0.4, desc="오류율 → 재작업으로 지연"),
    InfluenceLink(source="n20", target="n18", weight=-0.6, desc="처리속도 → 태스크 감소"),
    InfluenceLink(source="n22", target="n17", weight=-0.5, desc="의존도 → 가동률 리스크"),
    
    # 👥 고객 체인
    InfluenceLink(source="n29", target="n23", weight=0.5, desc="리드 → 고객 증가"),
    InfluenceLink(source="n23", target="n02", weight=0.7, desc="고객수 → 수입 증가"),
    InfluenceLink(source="n24", target="n23", weight=-0.8, desc="이탈률 → 고객 감소"),
    InfluenceLink(source="n25", target="n24", weight=-0.4, desc="NPS → 이탈률 감소"),
    InfluenceLink(source="n25", target="n29", weight=0.3, desc="NPS → 추천으로 리드 증가"),
    InfluenceLink(source="n26", target="n02", weight=0.6, desc="반복구매 → 수입 안정화"),
    InfluenceLink(source="n26", target="n28", weight=0.7, desc="반복구매 → LTV 증가"),
    InfluenceLink(source="n27", target="n08", weight=-0.5, desc="CAC → 마진 압박"),
    InfluenceLink(source="n28", target="n08", weight=0.6, desc="LTV → 마진 개선"),
    
    # 🌍 외부 체인
    InfluenceLink(source="n30", target="n17", weight=0.5, desc="직원수 → 가동률 영향"),
    InfluenceLink(source="n31", target="n17", weight=-0.7, desc="이직률 → 가동률 저하"),
    InfluenceLink(source="n31", target="n20", weight=-0.6, desc="이직률 → 처리속도 저하"),
    InfluenceLink(source="n31", target="n22", weight=0.5, desc="이직률 → 의존도 증가"),
    InfluenceLink(source="n32", target="n27", weight=0.4, desc="경쟁자 → CAC 상승"),
    InfluenceLink(source="n33", target="n29", weight=0.5, desc="시장성장 → 리드 증가"),
    InfluenceLink(source="n34", target="n03", weight=0.3, desc="환율 → 비용 증가"),
    InfluenceLink(source="n35", target="n04", weight=0.4, desc="금리 → 부채 부담"),
    InfluenceLink(source="n36", target="n03", weight=0.3, desc="규제 → 비용 증가"),
    
    # 🔗 크로스 레이어 체인
    InfluenceLink(source="n10", target="n19", weight=-0.4, desc="HRV(건강) → 오류율 감소"),
    InfluenceLink(source="n09", target="n19", weight=-0.3, desc="수면 → 오류율 감소"),
    InfluenceLink(source="n16", target="n25", weight=-0.5, desc="지연 → NPS 하락"),
    InfluenceLink(source="n19", target="n25", weight=-0.6, desc="오류율 → NPS 하락"),
    InfluenceLink(source="n01", target="n30", weight=0.3, delay=90, desc="현금 → 채용 여력"),
    InfluenceLink(source="n05", target="n31", weight=-0.4, desc="런웨이 → 이직률 감소 (안정감)"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 유틸리티 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_outgoing_influences(node_id: str) -> List[InfluenceLink]:
    """특정 노드에서 나가는 영향 조회"""
    return [link for link in INFLUENCE_MATRIX if link.source == node_id]

def get_incoming_influences(node_id: str) -> List[InfluenceLink]:
    """특정 노드로 들어오는 영향 조회"""
    return [link for link in INFLUENCE_MATRIX if link.target == node_id]

def get_direct_influence(source_id: str, target_id: str) -> Optional[InfluenceLink]:
    """두 노드 간 직접 영향 조회"""
    for link in INFLUENCE_MATRIX:
        if link.source == source_id and link.target == target_id:
            return link
    return None

def get_node_influence_score(node_id: str) -> float:
    """특정 노드의 총 영향력 점수"""
    return sum(
        abs(link.weight) 
        for link in INFLUENCE_MATRIX 
        if link.source == node_id
    )

def sort_nodes_by_influence() -> List[str]:
    """영향도 기반 노드 정렬"""
    scores: Dict[str, float] = {}
    for link in INFLUENCE_MATRIX:
        scores[link.source] = scores.get(link.source, 0) + abs(link.weight)
    
    return sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
