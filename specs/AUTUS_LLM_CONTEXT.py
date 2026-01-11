"""
═══════════════════════════════════════════════════════════════════════════════
🌌 AUTUS v2.1 - Complete System Specification for LLM
═══════════════════════════════════════════════════════════════════════════════

이 파일은 AUTUS 시스템 전체를 LLM에 전달하기 위한 통합 컨텍스트입니다.
프롬프트에 이 파일 내용을 포함시키면 LLM이 AUTUS 시스템을 완전히 이해할 수 있습니다.

사용법:
1. 이 파일 전체를 LLM 프롬프트에 붙여넣기
2. 또는 AUTUS_CONTEXT 딕셔너리를 JSON으로 변환하여 전달
3. 또는 get_llm_context() 함수로 압축된 컨텍스트 생성

═══════════════════════════════════════════════════════════════════════════════
"""

from typing import TypedDict, Literal, List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
import json

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 1: 핵심 철학 (Philosophy)
# ═══════════════════════════════════════════════════════════════════════════════

PHILOSOPHY = """
## AUTUS 핵심 철학

### 1. 존재 유지 기계 (Existence Maintenance Machine)
- 개인/조직의 **붕괴를 방지**하는 것이 목표
- 성장이 아닌 **생존**이 우선
- "위험을 측정할 수 없으면 관리할 수 없다"

### 2. 물리 법칙 기반 (Laplacian Life-Physics)
- 인생/비즈니스를 **물리 방정식**으로 모델링
- 압력(Pressure) = 붕괴 가능성의 척도
- 관성(Inertia) = 변화 저항
- 전도도(Conductivity) = 영향 전파 속도

### 3. Top-1 집중 (Single Focus)
- 동시에 **하나의 위험**에만 집중
- 가장 높은 압력의 노드를 우선 해결
- 병렬 처리보다 직렬 처리

### 4. 3단계 개입 (Trinary Response)
- 자동화(Automation): AI가 직접 실행
- 외주(Outsource): 외부 리소스에 위임
- 지시(Directive): 팀원에게 명령

### 5. 침묵 우선 (Silence First)
- 알림은 **진짜 위험**에만
- 정보 과부하 방지
- "노이즈 없는 신호"
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 2: 타입 정의 (Type Definitions)
# ═══════════════════════════════════════════════════════════════════════════════

class NodeState(str, Enum):
    """노드 상태 - 압력에 따른 3단계"""
    IGNORABLE = "IGNORABLE"       # 🟢 압력 < 0.3 (무시 가능)
    PRESSURING = "PRESSURING"     # 🟡 0.3 ≤ 압력 < 0.7 (압박 중)
    IRREVERSIBLE = "IRREVERSIBLE" # 🔴 압력 ≥ 0.7 (비가역적 위험)

class LayerId(str, Enum):
    """5개 레이어 ID"""
    L1 = "L1"  # 💰 재무
    L2 = "L2"  # ❤️ 생체
    L3 = "L3"  # ⚙️ 운영
    L4 = "L4"  # 👥 고객
    L5 = "L5"  # 🌍 외부

class MissionType(str, Enum):
    """미션 유형 - 개입 방식"""
    AUTOMATION = "자동화"  # 🤖 AI 자동 실행
    OUTSOURCE = "외주"     # 👥 외부 위임
    DIRECTIVE = "지시"     # 📋 팀원 명령

class MissionStatus(str, Enum):
    """미션 상태"""
    ACTIVE = "active"    # 진행 중
    DONE = "done"        # 완료
    IGNORED = "ignored"  # 무시됨

@dataclass
class Node:
    """36개 노드 데이터 구조"""
    id: str           # n01 ~ n36
    name: str         # 노드 이름 (예: 현금, 수면)
    icon: str         # 이모지 아이콘
    layer: LayerId    # 소속 레이어
    active: bool      # 활성화 여부
    value: float      # 현재 값
    pressure: float   # 압력 (0.0 ~ 1.0)
    state: NodeState  # 상태 (IGNORABLE/PRESSURING/IRREVERSIBLE)

@dataclass
class Layer:
    """5개 레이어 구조"""
    id: LayerId
    name: str         # 레이어 이름
    icon: str         # 레이어 아이콘
    node_ids: List[str]  # 소속 노드 ID 목록

@dataclass
class Circuit:
    """5개 회로 구조 - 노드 간 인과 관계"""
    id: str           # survival, fatigue, repeat, people, growth
    name: str         # 영문 이름
    name_kr: str      # 한글 이름
    node_ids: List[str]  # 연결된 노드 ID 목록
    value: float      # 회로 활성화 정도

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 3: 36개 노드 데이터 (36 Nodes)
# ═══════════════════════════════════════════════════════════════════════════════

NODES_36 = {
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: 💰 재무 (Financial) - 8개 노드
    # ═══════════════════════════════════════════════════════════════════════════
    "n01": {"id": "n01", "name": "현금", "icon": "💵", "layer": "L1", "unit": "원", "desc": "즉시 사용 가능한 현금"},
    "n02": {"id": "n02", "name": "수입", "icon": "📈", "layer": "L1", "unit": "원/월", "desc": "월 수입"},
    "n03": {"id": "n03", "name": "지출", "icon": "📉", "layer": "L1", "unit": "원/월", "desc": "월 지출"},
    "n04": {"id": "n04", "name": "부채", "icon": "💳", "layer": "L1", "unit": "원", "desc": "총 부채"},
    "n05": {"id": "n05", "name": "런웨이", "icon": "⏱️", "layer": "L1", "unit": "주", "desc": "현금으로 버틸 수 있는 기간"},
    "n06": {"id": "n06", "name": "예비비", "icon": "🛡️", "layer": "L1", "unit": "원", "desc": "비상 자금"},
    "n07": {"id": "n07", "name": "미수금", "icon": "📄", "layer": "L1", "unit": "원", "desc": "받을 돈"},
    "n08": {"id": "n08", "name": "마진", "icon": "💹", "layer": "L1", "unit": "%", "desc": "수익률"},

    # ═══════════════════════════════════════════════════════════════════════════
    # L2: ❤️ 생체 (Biometric) - 6개 노드
    # ═══════════════════════════════════════════════════════════════════════════
    "n09": {"id": "n09", "name": "수면", "icon": "😴", "layer": "L2", "unit": "시간", "desc": "일 평균 수면"},
    "n10": {"id": "n10", "name": "HRV", "icon": "💓", "layer": "L2", "unit": "ms", "desc": "심박변이도 (스트레스 지표)"},
    "n11": {"id": "n11", "name": "활동량", "icon": "🏃", "layer": "L2", "unit": "분/일", "desc": "일 운동 시간"},
    "n12": {"id": "n12", "name": "연속작업", "icon": "⌨️", "layer": "L2", "unit": "시간", "desc": "휴식 없이 작업한 시간"},
    "n13": {"id": "n13", "name": "휴식간격", "icon": "☕", "layer": "L2", "unit": "시간", "desc": "마지막 휴식 후 경과 시간"},
    "n14": {"id": "n14", "name": "병가", "icon": "🏥", "layer": "L2", "unit": "일/월", "desc": "월 병가 일수"},

    # ═══════════════════════════════════════════════════════════════════════════
    # L3: ⚙️ 운영 (Operations) - 8개 노드
    # ═══════════════════════════════════════════════════════════════════════════
    "n15": {"id": "n15", "name": "마감", "icon": "📅", "layer": "L3", "unit": "일", "desc": "가장 가까운 마감까지 남은 일"},
    "n16": {"id": "n16", "name": "지연", "icon": "⏰", "layer": "L3", "unit": "건", "desc": "지연된 태스크 수"},
    "n17": {"id": "n17", "name": "가동률", "icon": "⚡", "layer": "L3", "unit": "%", "desc": "리소스 활용률"},
    "n18": {"id": "n18", "name": "태스크", "icon": "📋", "layer": "L3", "unit": "건", "desc": "진행 중인 태스크 수"},
    "n19": {"id": "n19", "name": "오류율", "icon": "🐛", "layer": "L3", "unit": "%", "desc": "작업 오류 비율"},
    "n20": {"id": "n20", "name": "처리속도", "icon": "🚀", "layer": "L3", "unit": "건/일", "desc": "일 처리량"},
    "n21": {"id": "n21", "name": "재고", "icon": "📦", "layer": "L3", "unit": "일분", "desc": "재고 일수"},
    "n22": {"id": "n22", "name": "의존도", "icon": "🔗", "layer": "L3", "unit": "%", "desc": "핵심 인력/시스템 의존도"},

    # ═══════════════════════════════════════════════════════════════════════════
    # L4: 👥 고객 (Customer) - 7개 노드
    # ═══════════════════════════════════════════════════════════════════════════
    "n23": {"id": "n23", "name": "고객수", "icon": "👤", "layer": "L4", "unit": "명", "desc": "총 활성 고객"},
    "n24": {"id": "n24", "name": "이탈률", "icon": "🚪", "layer": "L4", "unit": "%/월", "desc": "월 이탈률"},
    "n25": {"id": "n25", "name": "NPS", "icon": "⭐", "layer": "L4", "unit": "점", "desc": "고객 추천 지수"},
    "n26": {"id": "n26", "name": "반복구매", "icon": "🔄", "layer": "L4", "unit": "%", "desc": "재구매율"},
    "n27": {"id": "n27", "name": "CAC", "icon": "💰", "layer": "L4", "unit": "원", "desc": "고객 획득 비용"},
    "n28": {"id": "n28", "name": "LTV", "icon": "💎", "layer": "L4", "unit": "원", "desc": "고객 생애 가치"},
    "n29": {"id": "n29", "name": "리드", "icon": "📥", "layer": "L4", "unit": "건/주", "desc": "주간 신규 리드"},

    # ═══════════════════════════════════════════════════════════════════════════
    # L5: 🌍 외부 (External) - 7개 노드
    # ═══════════════════════════════════════════════════════════════════════════
    "n30": {"id": "n30", "name": "직원", "icon": "👥", "layer": "L5", "unit": "명", "desc": "총 직원 수"},
    "n31": {"id": "n31", "name": "이직률", "icon": "🚶", "layer": "L5", "unit": "%/년", "desc": "연간 이직률"},
    "n32": {"id": "n32", "name": "경쟁자", "icon": "🎯", "layer": "L5", "unit": "개", "desc": "주요 경쟁사 수"},
    "n33": {"id": "n33", "name": "시장성장", "icon": "📊", "layer": "L5", "unit": "%/년", "desc": "시장 성장률"},
    "n34": {"id": "n34", "name": "환율", "icon": "💱", "layer": "L5", "unit": "%", "desc": "환율 변동"},
    "n35": {"id": "n35", "name": "금리", "icon": "🏦", "layer": "L5", "unit": "%", "desc": "기준 금리"},
    "n36": {"id": "n36", "name": "규제", "icon": "📜", "layer": "L5", "unit": "건", "desc": "관련 규제 변화"},
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 4: 5개 레이어 구조 (5 Layers)
# ═══════════════════════════════════════════════════════════════════════════════

LAYERS_5 = {
    "L1": {
        "id": "L1",
        "name": "재무",
        "icon": "💰",
        "color": "#FFD700",
        "node_ids": ["n01", "n02", "n03", "n04", "n05", "n06", "n07", "n08"],
        "desc": "현금 흐름과 재정 건전성"
    },
    "L2": {
        "id": "L2",
        "name": "생체",
        "icon": "❤️",
        "color": "#FF6B6B",
        "node_ids": ["n09", "n10", "n11", "n12", "n13", "n14"],
        "desc": "신체적/정신적 건강 상태"
    },
    "L3": {
        "id": "L3",
        "name": "운영",
        "icon": "⚙️",
        "color": "#4ECDC4",
        "node_ids": ["n15", "n16", "n17", "n18", "n19", "n20", "n21", "n22"],
        "desc": "업무 처리 및 생산성"
    },
    "L4": {
        "id": "L4",
        "name": "고객",
        "icon": "👥",
        "color": "#9B59B6",
        "node_ids": ["n23", "n24", "n25", "n26", "n27", "n28", "n29"],
        "desc": "고객 관계 및 매출"
    },
    "L5": {
        "id": "L5",
        "name": "외부",
        "icon": "🌍",
        "color": "#3498DB",
        "node_ids": ["n30", "n31", "n32", "n33", "n34", "n35", "n36"],
        "desc": "외부 환경 및 시장"
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 5: 5개 회로 (5 Circuits) - 노드 간 인과 관계
# ═══════════════════════════════════════════════════════════════════════════════

CIRCUITS_5 = {
    "survival": {
        "id": "survival",
        "name": "Survival Circuit",
        "name_kr": "생존 회로",
        "icon": "🛡️",
        "node_ids": ["n03", "n01", "n05"],  # 지출 → 현금 → 런웨이
        "desc": "지출이 현금을 감소시키고, 현금이 런웨이에 영향",
        "formula": "런웨이 = 현금 / 지출",
        "threshold": 0.5,  # 0.5 이상이면 위험
    },
    "fatigue": {
        "id": "fatigue",
        "name": "Fatigue Circuit",
        "name_kr": "피로 회로",
        "icon": "😵",
        "node_ids": ["n18", "n09", "n10", "n16"],  # 태스크 → 수면 → HRV → 지연
        "desc": "태스크가 수면을 줄이고, 수면 부족이 HRV와 지연에 영향",
        "formula": "피로도 = 태스크 × (1 - 수면/8) × (1 - HRV/50)",
        "threshold": 0.4,
    },
    "repeat": {
        "id": "repeat",
        "name": "Repeat Capital Circuit",
        "name_kr": "반복자본 회로",
        "icon": "🔄",
        "node_ids": ["n26", "n02", "n01"],  # 반복구매 → 수입 → 현금
        "desc": "반복구매가 수입을 늘리고, 수입이 현금을 증가",
        "formula": "반복자본 = 반복구매율 × 평균주문액 × 고객수",
        "threshold": 0.3,  # 낮을수록 위험
    },
    "people": {
        "id": "people",
        "name": "People Circuit",
        "name_kr": "인력 회로",
        "icon": "👥",
        "node_ids": ["n31", "n17", "n20"],  # 이직률 → 가동률 → 처리속도
        "desc": "이직이 가동률을 낮추고, 가동률이 처리속도에 영향",
        "formula": "인력효율 = 가동률 × (1 - 이직률/100)",
        "threshold": 0.3,
    },
    "growth": {
        "id": "growth",
        "name": "Growth Circuit",
        "name_kr": "성장 회로",
        "icon": "📈",
        "node_ids": ["n29", "n23", "n02"],  # 리드 → 고객수 → 수입
        "desc": "리드가 고객수를 늘리고, 고객수가 수입을 증가",
        "formula": "성장률 = 리드 × 전환율 × ARPU",
        "threshold": 0.2,  # 낮을수록 정체
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 6: 핵심 알고리즘 (Core Algorithms)
# ═══════════════════════════════════════════════════════════════════════════════

ALGORITHMS = """
## AUTUS 핵심 알고리즘

### 1. 압력 계산 (Pressure Calculation)
```python
def calculate_pressure(node, thresholds):
    # 정규화된 압력 = (현재값 - 이상값) / (위험값 - 이상값)
    ideal = thresholds[node.id]['ideal']
    danger = thresholds[node.id]['danger']
    
    if danger > ideal:  # 높을수록 위험 (예: 부채, 지출)
        pressure = (node.value - ideal) / (danger - ideal)
    else:  # 낮을수록 위험 (예: 현금, 수면)
        pressure = (ideal - node.value) / (ideal - danger)
    
    return max(0, min(1, pressure))  # 0~1 범위로 클램핑
```

### 2. 상태 결정 (State Determination)
```python
def determine_state(pressure):
    if pressure >= 0.7:
        return "IRREVERSIBLE"  # 🔴 비가역적 위험
    elif pressure >= 0.3:
        return "PRESSURING"    # 🟡 압박 중
    else:
        return "IGNORABLE"     # 🟢 무시 가능
```

### 3. Top-1 추출 (Top-1 Extraction)
```python
def get_top1_node(nodes):
    # 가장 높은 압력의 노드 반환
    active_nodes = [n for n in nodes if n.active]
    return max(active_nodes, key=lambda n: n.pressure)
```

### 4. 평형점 계산 (Equilibrium)
```python
def calculate_equilibrium(nodes):
    # 활성 노드들의 평균 압력
    active = [n for n in nodes if n.active]
    if not active:
        return 0
    return sum(n.pressure for n in active) / len(active)
```

### 5. 안정성 계산 (Stability)
```python
def calculate_stability(nodes):
    # 1 - (위험 노드 / 활성 노드)
    active = [n for n in nodes if n.active]
    if not active:
        return 1
    danger = [n for n in active if n.state != "IGNORABLE"]
    return 1 - (len(danger) / len(active))
```

### 6. 회로값 계산 (Circuit Value)
```python
def calculate_circuit_value(nodes, circuit):
    # 회로 구성 노드들의 평균 압력
    circuit_nodes = [nodes[id] for id in circuit.node_ids]
    return sum(n.pressure for n in circuit_nodes) / len(circuit_nodes)
```

### 7. 발화 감지 (Fire Detection)
```python
def detect_fire(node, history):
    # 압력이 임계치를 초과하고 급등 중인 경우
    if node.pressure >= 0.7:
        # 최근 3일 기울기 확인
        recent = history[-3:]
        slope = (recent[-1] - recent[0]) / 3
        if slope > 0.05:  # 일 5% 이상 상승
            return True
    return False
```

### 8. 미션 생성 (Mission Generation)
```python
def create_mission(top1_node, mission_type):
    return {
        "title": f"{top1_node.name} 개선",
        "type": mission_type,  # 자동화/외주/지시
        "node_id": top1_node.id,
        "eta": calculate_eta(top1_node, mission_type),
        "steps": generate_steps(top1_node, mission_type),
    }
```
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 7: UI 구성 (UI Structure)
# ═══════════════════════════════════════════════════════════════════════════════

UI_STRUCTURE = {
    "app_name": "AUTUS Mobile v2.1",
    "theme": "Dark Mode",
    "primary_color": "#00d46a",  # 그린 액센트
    
    "navigation": {
        "type": "Bottom Tabs",
        "tabs": [
            {"id": "home", "name": "Home", "icon": "🏠", "desc": "Top-1 카드 + 빠른 상태"},
            {"id": "mission", "name": "Mission", "icon": "📋", "desc": "미션 관리"},
            {"id": "trinity", "name": "Trinity", "icon": "△", "desc": "36노드 시각화"},
            {"id": "setup", "name": "Setup", "icon": "⚙️", "desc": "데이터 연결 + 설정"},
            {"id": "me", "name": "Me", "icon": "👤", "desc": "정체성/목표/가치/경계"},
        ]
    },
    
    "screens": {
        "home": {
            "components": [
                "TopCard (Top-1 위험 노드)",
                "StatBox x4 (평형점, 안정성, 위험수, 미션수)",
                "CircuitBar x5 (5개 회로 상태)",
                "DangerList (위험 노드 목록)",
            ]
        },
        "mission": {
            "components": [
                "FilterTabs (활성/완료/무시)",
                "MissionCard (미션 카드 목록)",
                "MissionActions (완료/무시 버튼)",
            ]
        },
        "trinity": {
            "components": [
                "GoalCard (현재 목표)",
                "FilterTabs (활성/전체/위험)",
                "LayerSection x5 (레이어별 노드 그리드)",
                "NodeCard (개별 노드 카드)",
            ]
        },
        "setup": {
            "components": [
                "ConnectorList (데이터 연결)",
                "DeviceList (디바이스 권한)",
                "WebServiceList (웹 서비스 연결)",
            ]
        },
        "me": {
            "components": [
                "GoalEditor (목표 편집)",
                "IdentityEditor (정체성 편집)",
                "ValuesEditor (가치관 편집)",
                "BoundariesEditor (경계 편집)",
                "TeamList (팀원 관리)",
            ]
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 8: 데이터 연결 (Data Connectors)
# ═══════════════════════════════════════════════════════════════════════════════

DATA_CONNECTORS = {
    "core_connectors": [
        {"id": "bank", "name": "오픈뱅킹", "icon": "🏦", "nodes": ["n01", "n02", "n03", "n04"]},
        {"id": "health", "name": "Apple Health", "icon": "❤️", "nodes": ["n09", "n10", "n11"]},
        {"id": "calendar", "name": "Google Calendar", "icon": "📅", "nodes": ["n15", "n18"]},
    ],
    "extended_connectors": [
        {"id": "notion", "name": "Notion", "icon": "📋", "nodes": ["n18", "n20"]},
        {"id": "slack", "name": "Slack", "icon": "💬", "nodes": ["n22", "n30"]},
        {"id": "github", "name": "GitHub", "icon": "🐙", "nodes": ["n18", "n19", "n20"]},
    ],
    "devices": [
        {"id": "camera", "name": "카메라", "icon": "📷", "nodes": ["n10", "n12"]},
        {"id": "mic", "name": "마이크", "icon": "🎤", "nodes": ["n10"]},
        {"id": "location", "name": "위치", "icon": "📍", "nodes": ["n11", "n12"]},
    ]
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 9: 설정 스키마 (Settings Schema)
# ═══════════════════════════════════════════════════════════════════════════════

SETTINGS_SCHEMA = {
    "goal": {
        "type": "string",
        "desc": "주요 목표",
        "example": "12개월 내 PMF 달성"
    },
    "goal_months": {
        "type": "integer",
        "desc": "목표 기간 (월)",
        "range": [1, 60]
    },
    "identity": {
        "type": {
            "type": "string",
            "options": ["창업자", "프리랜서", "직장인", "학생", "기타"],
        },
        "stage": {
            "type": "string",
            "options": ["초기", "성장기", "안정기", "전환기"],
        },
        "industry": {
            "type": "string",
            "options": ["테크", "금융", "헬스케어", "교육", "기타"],
        }
    },
    "values": {
        "type": "array",
        "desc": "핵심 가치관 (최대 5개)",
        "default": ["생존", "성장", "건강", "가족", "자유"]
    },
    "boundaries": {
        "never": {
            "type": "array",
            "desc": "절대 넘지 않을 선",
            "default": ["파산", "건강 붕괴"]
        },
        "limits": {
            "type": "array",
            "desc": "제한선",
            "default": ["부채 5천만 이하", "수면 5시간 이상", "런웨이 4주 이상"]
        }
    },
    "daily_limit": {
        "type": "integer",
        "desc": "일 최대 알림 수",
        "range": [1, 10],
        "default": 3
    },
    "auto_level": {
        "type": "integer",
        "desc": "자동화 수준 (0=수동, 4=완전자동)",
        "range": [0, 4],
        "default": 0
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 10: 통합 컨텍스트 (Unified Context)
# ═══════════════════════════════════════════════════════════════════════════════

AUTUS_CONTEXT = {
    "version": "2.1",
    "name": "AUTUS - Operating System of Reality",
    "philosophy": PHILOSOPHY,
    "nodes": NODES_36,
    "layers": LAYERS_5,
    "circuits": CIRCUITS_5,
    "algorithms": ALGORITHMS,
    "ui": UI_STRUCTURE,
    "connectors": DATA_CONNECTORS,
    "settings": SETTINGS_SCHEMA,
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 11: LLM용 압축 컨텍스트 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_llm_context(include_philosophy: bool = True, 
                    include_algorithms: bool = True) -> str:
    """
    LLM에 전달할 압축된 컨텍스트 생성
    
    Args:
        include_philosophy: 철학 설명 포함 여부
        include_algorithms: 알고리즘 설명 포함 여부
    
    Returns:
        LLM 프롬프트에 사용할 텍스트
    """
    context_parts = []
    
    # 헤더
    context_parts.append("=" * 60)
    context_parts.append("🌌 AUTUS v2.1 System Context")
    context_parts.append("=" * 60)
    
    # 철학
    if include_philosophy:
        context_parts.append("\n## 철학\n" + PHILOSOPHY)
    
    # 노드 요약
    context_parts.append("\n## 36 노드 (5 레이어)")
    for layer_id in ["L1", "L2", "L3", "L4", "L5"]:
        layer = LAYERS_5[layer_id]
        node_list = ", ".join([
            f"{NODES_36[nid]['icon']}{NODES_36[nid]['name']}" 
            for nid in layer["node_ids"]
        ])
        context_parts.append(f"- {layer['icon']} {layer['name']}: {node_list}")
    
    # 회로 요약
    context_parts.append("\n## 5 회로")
    for circuit_id, circuit in CIRCUITS_5.items():
        nodes_str = " → ".join([NODES_36[nid]['name'] for nid in circuit['node_ids']])
        context_parts.append(f"- {circuit['icon']} {circuit['name_kr']}: {nodes_str}")
    
    # 알고리즘
    if include_algorithms:
        context_parts.append("\n" + ALGORITHMS)
    
    # UI 요약
    context_parts.append("\n## UI 탭")
    for tab in UI_STRUCTURE["navigation"]["tabs"]:
        context_parts.append(f"- {tab['icon']} {tab['name']}: {tab['desc']}")
    
    return "\n".join(context_parts)

def get_json_context() -> str:
    """JSON 형식의 전체 컨텍스트 반환"""
    return json.dumps(AUTUS_CONTEXT, ensure_ascii=False, indent=2)

def get_minimal_context() -> str:
    """최소 컨텍스트 (토큰 절약용)"""
    return f"""
AUTUS v2.1 - 붕괴 방지 시스템

36노드 (5레이어):
L1💰재무: 현금,수입,지출,부채,런웨이,예비비,미수금,마진
L2❤️생체: 수면,HRV,활동량,연속작업,휴식간격,병가
L3⚙️운영: 마감,지연,가동률,태스크,오류율,처리속도,재고,의존도
L4👥고객: 고객수,이탈률,NPS,반복구매,CAC,LTV,리드
L5🌍외부: 직원,이직률,경쟁자,시장성장,환율,금리,규제

5회로:
생존: 지출→현금→런웨이
피로: 태스크→수면→HRV→지연
반복자본: 반복구매→수입→현금
인력: 이직률→가동률→처리속도
성장: 리드→고객수→수입

핵심: Top-1 압력 노드에 집중, 3단계 개입(자동화/외주/지시)
상태: IGNORABLE(<0.3) | PRESSURING(0.3-0.7) | IRREVERSIBLE(≥0.7)
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 PART 12: 사용 예시
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("AUTUS LLM Context Generator")
    print("=" * 60)
    
    # 1. 전체 컨텍스트 출력
    print("\n[1] Full Context:")
    print(get_llm_context()[:500] + "...")
    
    # 2. JSON 컨텍스트 출력
    print("\n[2] JSON Context (first 500 chars):")
    print(get_json_context()[:500] + "...")
    
    # 3. 최소 컨텍스트 출력
    print("\n[3] Minimal Context:")
    print(get_minimal_context())
    
    print("\n" + "=" * 60)
    print("이 파일을 LLM 프롬프트에 포함하거나,")
    print("get_llm_context() 또는 get_minimal_context() 사용")
    print("=" * 60)
