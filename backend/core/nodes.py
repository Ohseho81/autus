"""
═══════════════════════════════════════════════════════════════════════════════
🌌 AUTUS v2.1 - 36 Nodes Complete Specification
═══════════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, List
from .types import NodeSpec, LayerId, DataSource

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 L1: 💰 재무 (Financial) - 8개 노드
# ═══════════════════════════════════════════════════════════════════════════════

L1_FINANCIAL_NODES: Dict[str, NodeSpec] = {
    "n01": NodeSpec(
        id="n01", name="현금", icon="💵", layer=LayerId.L1, unit="원",
        desc="즉시 사용 가능한 현금", ideal=50000000, danger=5000000,
        inverse=True, data_source=[DataSource.OAUTH, DataSource.MANUAL], collection_interval="1d"
    ),
    "n02": NodeSpec(
        id="n02", name="수입", icon="📈", layer=LayerId.L1, unit="원/월",
        desc="월 수입", ideal=10000000, danger=3000000,
        inverse=True, data_source=[DataSource.OAUTH, DataSource.MANUAL], collection_interval="1d"
    ),
    "n03": NodeSpec(
        id="n03", name="지출", icon="📉", layer=LayerId.L1, unit="원/월",
        desc="월 지출", ideal=5000000, danger=15000000,
        inverse=False, data_source=[DataSource.OAUTH, DataSource.MANUAL], collection_interval="1d"
    ),
    "n04": NodeSpec(
        id="n04", name="부채", icon="💳", layer=LayerId.L1, unit="원",
        desc="총 부채", ideal=0, danger=100000000,
        inverse=False, data_source=[DataSource.OAUTH, DataSource.MANUAL], collection_interval="1w"
    ),
    "n05": NodeSpec(
        id="n05", name="런웨이", icon="⏱️", layer=LayerId.L1, unit="주",
        desc="현금으로 버틸 수 있는 기간", ideal=24, danger=4,
        inverse=True, data_source=[DataSource.API], collection_interval="1d"
    ),
    "n06": NodeSpec(
        id="n06", name="예비비", icon="🛡️", layer=LayerId.L1, unit="원",
        desc="비상 자금", ideal=20000000, danger=1000000,
        inverse=True, data_source=[DataSource.OAUTH, DataSource.MANUAL], collection_interval="1w"
    ),
    "n07": NodeSpec(
        id="n07", name="미수금", icon="📄", layer=LayerId.L1, unit="원",
        desc="받을 돈", ideal=0, danger=20000000,
        inverse=False, data_source=[DataSource.MANUAL, DataSource.API], collection_interval="1w"
    ),
    "n08": NodeSpec(
        id="n08", name="마진", icon="💹", layer=LayerId.L1, unit="%",
        desc="수익률", ideal=30, danger=5,
        inverse=True, data_source=[DataSource.API, DataSource.MANUAL], collection_interval="1w"
    ),
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 L2: ❤️ 생체 (Biometric) - 6개 노드
# ═══════════════════════════════════════════════════════════════════════════════

L2_BIOMETRIC_NODES: Dict[str, NodeSpec] = {
    "n09": NodeSpec(
        id="n09", name="수면", icon="😴", layer=LayerId.L2, unit="시간",
        desc="일 평균 수면", ideal=8, danger=4,
        inverse=True, data_source=[DataSource.DEVICE], collection_interval="1h"
    ),
    "n10": NodeSpec(
        id="n10", name="HRV", icon="💓", layer=LayerId.L2, unit="ms",
        desc="심박변이도 (스트레스 지표)", ideal=50, danger=20,
        inverse=True, data_source=[DataSource.DEVICE], collection_interval="1h"
    ),
    "n11": NodeSpec(
        id="n11", name="활동량", icon="🏃", layer=LayerId.L2, unit="분/일",
        desc="일 운동 시간", ideal=60, danger=10,
        inverse=True, data_source=[DataSource.DEVICE], collection_interval="1h"
    ),
    "n12": NodeSpec(
        id="n12", name="연속작업", icon="⌨️", layer=LayerId.L2, unit="시간",
        desc="휴식 없이 작업한 시간", ideal=1, danger=6,
        inverse=False, data_source=[DataSource.DEVICE, DataSource.API], collection_interval="realtime"
    ),
    "n13": NodeSpec(
        id="n13", name="휴식간격", icon="☕", layer=LayerId.L2, unit="시간",
        desc="마지막 휴식 후 경과 시간", ideal=1, danger=4,
        inverse=False, data_source=[DataSource.DEVICE], collection_interval="realtime"
    ),
    "n14": NodeSpec(
        id="n14", name="병가", icon="🏥", layer=LayerId.L2, unit="일/월",
        desc="월 병가 일수", ideal=0, danger=5,
        inverse=False, data_source=[DataSource.MANUAL, DataSource.OAUTH], collection_interval="1w"
    ),
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 L3: ⚙️ 운영 (Operations) - 8개 노드
# ═══════════════════════════════════════════════════════════════════════════════

L3_OPERATIONS_NODES: Dict[str, NodeSpec] = {
    "n15": NodeSpec(
        id="n15", name="마감", icon="📅", layer=LayerId.L3, unit="일",
        desc="가장 가까운 마감까지 남은 일", ideal=14, danger=1,
        inverse=True, data_source=[DataSource.OAUTH, DataSource.API], collection_interval="15m"
    ),
    "n16": NodeSpec(
        id="n16", name="지연", icon="⏰", layer=LayerId.L3, unit="건",
        desc="지연된 태스크 수", ideal=0, danger=10,
        inverse=False, data_source=[DataSource.OAUTH, DataSource.API], collection_interval="30m"
    ),
    "n17": NodeSpec(
        id="n17", name="가동률", icon="⚡", layer=LayerId.L3, unit="%",
        desc="리소스 활용률", ideal=80, danger=40,
        inverse=True, data_source=[DataSource.API, DataSource.MANUAL], collection_interval="1d"
    ),
    "n18": NodeSpec(
        id="n18", name="태스크", icon="📋", layer=LayerId.L3, unit="건",
        desc="진행 중인 태스크 수", ideal=10, danger=50,
        inverse=False, data_source=[DataSource.OAUTH, DataSource.API], collection_interval="30m"
    ),
    "n19": NodeSpec(
        id="n19", name="오류율", icon="🐛", layer=LayerId.L3, unit="%",
        desc="작업 오류 비율", ideal=1, danger=10,
        inverse=False, data_source=[DataSource.API], collection_interval="1d"
    ),
    "n20": NodeSpec(
        id="n20", name="처리속도", icon="🚀", layer=LayerId.L3, unit="건/일",
        desc="일 처리량", ideal=20, danger=5,
        inverse=True, data_source=[DataSource.API, DataSource.OAUTH], collection_interval="1d"
    ),
    "n21": NodeSpec(
        id="n21", name="재고", icon="📦", layer=LayerId.L3, unit="일분",
        desc="재고 일수", ideal=30, danger=5,
        inverse=True, data_source=[DataSource.API, DataSource.MANUAL], collection_interval="1d"
    ),
    "n22": NodeSpec(
        id="n22", name="의존도", icon="🔗", layer=LayerId.L3, unit="%",
        desc="핵심 인력/시스템 의존도", ideal=20, danger=80,
        inverse=False, data_source=[DataSource.MANUAL], collection_interval="1w"
    ),
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 L4: 👥 고객 (Customer) - 7개 노드
# ═══════════════════════════════════════════════════════════════════════════════

L4_CUSTOMER_NODES: Dict[str, NodeSpec] = {
    "n23": NodeSpec(
        id="n23", name="고객수", icon="👤", layer=LayerId.L4, unit="명",
        desc="총 활성 고객", ideal=100, danger=10,
        inverse=True, data_source=[DataSource.API, DataSource.MANUAL], collection_interval="1d"
    ),
    "n24": NodeSpec(
        id="n24", name="이탈률", icon="🚪", layer=LayerId.L4, unit="%/월",
        desc="월 이탈률", ideal=2, danger=15,
        inverse=False, data_source=[DataSource.API], collection_interval="1w"
    ),
    "n25": NodeSpec(
        id="n25", name="NPS", icon="⭐", layer=LayerId.L4, unit="점",
        desc="고객 추천 지수", ideal=50, danger=0,
        inverse=True, data_source=[DataSource.API, DataSource.MANUAL], collection_interval="1w"
    ),
    "n26": NodeSpec(
        id="n26", name="반복구매", icon="🔄", layer=LayerId.L4, unit="%",
        desc="재구매율", ideal=40, danger=10,
        inverse=True, data_source=[DataSource.API], collection_interval="1w"
    ),
    "n27": NodeSpec(
        id="n27", name="CAC", icon="💰", layer=LayerId.L4, unit="원",
        desc="고객 획득 비용", ideal=50000, danger=200000,
        inverse=False, data_source=[DataSource.API, DataSource.MANUAL], collection_interval="1w"
    ),
    "n28": NodeSpec(
        id="n28", name="LTV", icon="💎", layer=LayerId.L4, unit="원",
        desc="고객 생애 가치", ideal=500000, danger=100000,
        inverse=True, data_source=[DataSource.API], collection_interval="1w"
    ),
    "n29": NodeSpec(
        id="n29", name="리드", icon="📥", layer=LayerId.L4, unit="건/주",
        desc="주간 신규 리드", ideal=20, danger=2,
        inverse=True, data_source=[DataSource.API, DataSource.OAUTH], collection_interval="1d"
    ),
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 L5: 🌍 외부 (External) - 7개 노드
# ═══════════════════════════════════════════════════════════════════════════════

L5_EXTERNAL_NODES: Dict[str, NodeSpec] = {
    "n30": NodeSpec(
        id="n30", name="직원", icon="👥", layer=LayerId.L5, unit="명",
        desc="총 직원 수", ideal=10, danger=1,
        inverse=True, data_source=[DataSource.MANUAL, DataSource.API], collection_interval="1w"
    ),
    "n31": NodeSpec(
        id="n31", name="이직률", icon="🚶", layer=LayerId.L5, unit="%/년",
        desc="연간 이직률", ideal=10, danger=40,
        inverse=False, data_source=[DataSource.MANUAL, DataSource.API], collection_interval="1w"
    ),
    "n32": NodeSpec(
        id="n32", name="경쟁자", icon="🎯", layer=LayerId.L5, unit="개",
        desc="주요 경쟁사 수", ideal=3, danger=20,
        inverse=False, data_source=[DataSource.MANUAL], collection_interval="1w"
    ),
    "n33": NodeSpec(
        id="n33", name="시장성장", icon="📊", layer=LayerId.L5, unit="%/년",
        desc="시장 성장률", ideal=20, danger=-10,
        inverse=True, data_source=[DataSource.API, DataSource.MANUAL], collection_interval="1w"
    ),
    "n34": NodeSpec(
        id="n34", name="환율", icon="💱", layer=LayerId.L5, unit="%",
        desc="환율 변동", ideal=0, danger=15,
        inverse=False, data_source=[DataSource.API], collection_interval="1d"
    ),
    "n35": NodeSpec(
        id="n35", name="금리", icon="🏦", layer=LayerId.L5, unit="%",
        desc="기준 금리", ideal=3, danger=8,
        inverse=False, data_source=[DataSource.API], collection_interval="1w"
    ),
    "n36": NodeSpec(
        id="n36", name="규제", icon="📜", layer=LayerId.L5, unit="건",
        desc="관련 규제 변화", ideal=0, danger=5,
        inverse=False, data_source=[DataSource.MANUAL], collection_interval="1w"
    ),
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ALL NODES
# ═══════════════════════════════════════════════════════════════════════════════

ALL_NODES: Dict[str, NodeSpec] = {
    **L1_FINANCIAL_NODES,
    **L2_BIOMETRIC_NODES,
    **L3_OPERATIONS_NODES,
    **L4_CUSTOMER_NODES,
    **L5_EXTERNAL_NODES,
}

NODE_IDS: List[str] = list(ALL_NODES.keys())
NODE_COUNT: int = len(NODE_IDS)

NODES_BY_LAYER: Dict[LayerId, List[str]] = {
    LayerId.L1: ["n01", "n02", "n03", "n04", "n05", "n06", "n07", "n08"],
    LayerId.L2: ["n09", "n10", "n11", "n12", "n13", "n14"],
    LayerId.L3: ["n15", "n16", "n17", "n18", "n19", "n20", "n21", "n22"],
    LayerId.L4: ["n23", "n24", "n25", "n26", "n27", "n28", "n29"],
    LayerId.L5: ["n30", "n31", "n32", "n33", "n34", "n35", "n36"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 DEFAULT VALUES (샘플 데이터)
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_NODE_VALUES: Dict[str, float] = {
    # L1 재무
    "n01": 30000000, "n02": 7000000, "n03": 6000000, "n04": 20000000,
    "n05": 12, "n06": 10000000, "n07": 5000000, "n08": 15,
    # L2 생체
    "n09": 6.5, "n10": 35, "n11": 30, "n12": 2, "n13": 2, "n14": 1,
    # L3 운영
    "n15": 7, "n16": 3, "n17": 60, "n18": 20, "n19": 3, "n20": 12, "n21": 15, "n22": 40,
    # L4 고객
    "n23": 50, "n24": 5, "n25": 30, "n26": 25, "n27": 100000, "n28": 300000, "n29": 10,
    # L5 외부
    "n30": 5, "n31": 20, "n32": 8, "n33": 10, "n34": 5, "n35": 4, "n36": 1,
}
