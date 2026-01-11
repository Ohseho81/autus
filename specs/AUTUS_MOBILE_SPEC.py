"""
═══════════════════════════════════════════════════════════════════════════════
📱 AUTUS Mobile App v2.1 - Complete Specification for LLM
═══════════════════════════════════════════════════════════════════════════════

이 파일은 AUTUS 모바일 앱의 완전한 명세를 포함합니다.
기능, 플로우, 알고리즘, 프로세스, 파이프라인, 상태 머신 등 모든 정보를 담고 있습니다.

═══════════════════════════════════════════════════════════════════════════════
"""

from typing import TypedDict, Literal, List, Dict, Optional
from dataclasses import dataclass, field
from enum import Enum
import json

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 1: 기능 리스트 (Features)
# ═══════════════════════════════════════════════════════════════════════════════

class Priority(str, Enum):
    P0 = "P0"  # 필수 (Core)
    P1 = "P1"  # 중요 (Important)
    P2 = "P2"  # 향상 (Enhancement)
    P3 = "P3"  # 미래 (Future)

@dataclass
class Feature:
    id: str
    name: str
    desc: str
    priority: Priority
    category: str

FEATURES: Dict[str, Feature] = {
    # ═══════════════════════════════════════════════════════════════════════════
    # Core Features (핵심) - P0
    # ═══════════════════════════════════════════════════════════════════════════
    "F01": Feature("F01", "노드 모니터링", "36개 노드 압력 실시간 표시", Priority.P0, "core"),
    "F02": Feature("F02", "위험 감지", "Top1 위험 노드 자동 식별", Priority.P0, "core"),
    "F03": Feature("F03", "미션 생성", "위험 대응 미션 생성", Priority.P0, "core"),
    "F04": Feature("F04", "미션 관리", "완료/무시/삭제 상태 변경", Priority.P0, "core"),
    "F05": Feature("F05", "상태 저장", "로컬 스토리지 영속성", Priority.P0, "core"),
    "F06": Feature("F06", "통계 대시보드", "평형점/안정성/위험/미션 수", Priority.P0, "core"),
    "F07": Feature("F07", "회로 모니터링", "5개 핵심 회로 상태 표시", Priority.P0, "core"),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Setup Features (설정) - P0/P1
    # ═══════════════════════════════════════════════════════════════════════════
    "F10": Feature("F10", "디바이스 권한", "카메라/마이크/위치 허용", Priority.P0, "setup"),
    "F11": Feature("F11", "웹서비스 연결", "OAuth 8개 서비스", Priority.P1, "setup"),
    "F12": Feature("F12", "전체 연결", "Atlas 방식 일괄 동의", Priority.P1, "setup"),
    "F13": Feature("F13", "데이터 소스 연결", "은행/헬스/캘린더 등", Priority.P1, "setup"),
    "F14": Feature("F14", "팀원 관리", "추가/편집/삭제", Priority.P1, "setup"),
    "F15": Feature("F15", "설정 변경", "발화제한/자율수준", Priority.P1, "setup"),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Me Features (개인화) - P0/P1
    # ═══════════════════════════════════════════════════════════════════════════
    "F20": Feature("F20", "목표 설정", "텍스트 + 기간", Priority.P1, "me"),
    "F21": Feature("F21", "노드 활성화", "36개 중 선택", Priority.P0, "me"),
    "F22": Feature("F22", "정체성 설정", "유형/단계/산업", Priority.P1, "me"),
    "F23": Feature("F23", "가치 우선순위", "드래그 순서 변경", Priority.P1, "me"),
    "F24": Feature("F24", "경계 설정", "절대안함/한계선", Priority.P1, "me"),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # UX Features (사용자 경험) - P0/P2
    # ═══════════════════════════════════════════════════════════════════════════
    "F30": Feature("F30", "햅틱 피드백", "터치 진동", Priority.P2, "ux"),
    "F31": Feature("F31", "스와이프 제스처", "탭 이동/삭제", Priority.P2, "ux"),
    "F32": Feature("F32", "Pull to Refresh", "당겨서 새로고침", Priority.P2, "ux"),
    "F33": Feature("F33", "토스트 알림", "액션 피드백", Priority.P0, "ux"),
    "F34": Feature("F34", "바텀시트 모달", "iOS 스타일", Priority.P0, "ux"),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Data Features (데이터) - P2/P3
    # ═══════════════════════════════════════════════════════════════════════════
    "F40": Feature("F40", "실시간 API 연동", "외부 데이터 수집", Priority.P3, "data"),
    "F41": Feature("F41", "데이터 시각화", "차트/그래프", Priority.P2, "data"),
    "F42": Feature("F42", "히스토리 저장", "노드 값 변화 기록", Priority.P2, "data"),
    "F43": Feature("F43", "내보내기", "JSON/CSV 다운로드", Priority.P3, "data"),
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 2: 업무 플로우 (Workflows)
# ═══════════════════════════════════════════════════════════════════════════════

WORKFLOWS = {
    "onboarding": {
        "name": "사용자 온보딩 플로우",
        "steps": [
            {"step": 1, "name": "목표 설정", "desc": "12개월 내 달성하고 싶은 목표 입력 + 기간 선택"},
            {"step": 2, "name": "정체성 선택", "desc": "유형(창업자|직장인|프리랜서|학생), 단계, 산업 선택"},
            {"step": 3, "name": "노드 활성화", "desc": "모니터링할 영역 선택 (최소 5개, 최대 36개)"},
            {"step": 4, "name": "데이터 연결", "desc": "[전체 연결] 또는 개별 선택, 나중에 하기 옵션"},
            {"step": 5, "name": "경계 설정", "desc": "절대 안 함(파산, 건강 붕괴), 한계선 설정"},
            {"step": 6, "name": "대시보드 진입", "desc": "온보딩 완료 후 Home 탭으로 이동"},
        ]
    },
    "daily_usage": {
        "name": "일일 사용 플로우",
        "steps": [
            {"step": 1, "name": "앱 실행", "desc": "자동으로 Home 탭 표시"},
            {"step": 2, "name": "Top1 확인", "desc": "최고 위험 노드 카드 표시 → 탭하여 미션 생성"},
            {"step": 3, "name": "통계 확인", "desc": "평형점, 안정성, 위험 수, 미션 수 확인"},
            {"step": 4, "name": "회로 확인", "desc": "5개 회로 상태 바 확인"},
            {"step": 5, "name": "액션 선택", "desc": "미션 생성 / 노드 상세 / 미션 관리"},
        ]
    },
    "mission_process": {
        "name": "미션 처리 플로우",
        "triggers": ["Top1 카드 탭", "노드 상세에서 '미션 생성'", "경계 위반 시 자동 생성", "AI 추천 수락"],
        "options": [
            {"type": "무시", "cost": 0, "time": 0, "effect": "압력 +5%"},
            {"type": "자동화", "cost": 0, "time": "3일", "effect": "AI 자동 실행"},
            {"type": "외주", "cost": "₩300,000", "time": "7일", "effect": "외부 위임"},
            {"type": "지시", "cost": 0, "time": "1일", "effect": "팀원 명령"},
        ]
    },
    "data_connection": {
        "name": "데이터 연결 플로우",
        "categories": [
            {"name": "디바이스", "items": ["카메라", "마이크", "위치"], "method": "브라우저 권한 팝업"},
            {"name": "웹서비스", "items": ["Google", "Microsoft", "Notion", "Slack", "GitHub", "Figma", "Linear", "은행/카드"], "method": "OAuth 일괄 동의"},
            {"name": "데이터소스", "items": ["오픈뱅킹", "Apple Health", "Google Calendar"], "method": "API 인증"},
        ]
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 3: 알고리즘 (Algorithms)
# ═══════════════════════════════════════════════════════════════════════════════

ALGORITHMS = {
    "pressure_calculation": {
        "name": "압력 계산",
        "desc": "노드 값을 0~1 범위의 압력으로 변환",
        "types": {
            "low_is_danger": "pressure = 1 - (value / threshold_max)",
            "high_is_danger": "pressure = value / threshold_max",
            "range_based": "pressure = |value - optimal| / range"
        },
        "time_weight": "adjusted_pressure = pressure * (1 + days * 0.02)",
        "code": """
def calculate_pressure(node, thresholds):
    ideal = thresholds[node.id]['ideal']
    danger = thresholds[node.id]['danger']
    
    if node.type == 'low_is_danger':
        pressure = (ideal - node.value) / (ideal - danger)
    else:
        pressure = (node.value - ideal) / (danger - ideal)
    
    return max(0, min(1, pressure))
"""
    },
    
    "state_determination": {
        "name": "상태 결정",
        "desc": "압력에 따른 3단계 상태 결정",
        "thresholds": {
            "IGNORABLE": "pressure < 0.3",
            "PRESSURING": "0.3 <= pressure < 0.7",
            "IRREVERSIBLE": "pressure >= 0.7"
        },
        "code": """
def determine_state(pressure):
    if pressure >= 0.7: return "IRREVERSIBLE"
    if pressure >= 0.3: return "PRESSURING"
    return "IGNORABLE"
"""
    },
    
    "circuit_calculation": {
        "name": "회로 계산",
        "desc": "회로 구성 노드들의 평균/가중 압력",
        "methods": {
            "simple_avg": "circuit_value = Σ(node.pressure) / node_count",
            "weighted_avg": "circuit_value = Σ(node.pressure * weight)",
            "cascade": "nodes[i].pressure += nodes[i-1].pressure * 0.1"
        }
    },
    
    "statistics": {
        "name": "통계 계산",
        "formulas": {
            "equilibrium": "Σ(active_nodes.pressure) / active_nodes.length",
            "stability": "1 - (danger_nodes.length / active_nodes.length)",
            "danger_count": "nodes.filter(n => n.state !== 'IGNORABLE').length",
            "active_missions": "missions.filter(m => m.status === 'active').length"
        }
    },
    
    "top1_selection": {
        "name": "Top1 노드 선택",
        "desc": "가장 위험한 노드 1개 선택",
        "methods": {
            "basic": "max(nodes, key=lambda n: n.pressure)",
            "weighted": "max(nodes, key=lambda n: n.pressure * state_weight[n.state])",
            "boundary_first": "boundary_violated[0] if any else sorted[0]"
        }
    },
    
    "mission_progress": {
        "name": "미션 진행률 계산",
        "desc": "시간 기반 자동 진행",
        "formula": "progress = (elapsed_days / eta_days) * 100",
        "max": 95  # 완료는 수동으로
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 4: 상태 머신 (State Machines)
# ═══════════════════════════════════════════════════════════════════════════════

STATE_MACHINES = {
    "node_state": {
        "name": "노드 상태 머신",
        "states": ["IGNORABLE", "PRESSURING", "IRREVERSIBLE"],
        "transitions": [
            {"from": "IGNORABLE", "to": "PRESSURING", "condition": "pressure >= 0.3"},
            {"from": "PRESSURING", "to": "IGNORABLE", "condition": "pressure < 0.3"},
            {"from": "PRESSURING", "to": "IRREVERSIBLE", "condition": "pressure >= 0.7"},
            {"from": "IRREVERSIBLE", "to": "PRESSURING", "condition": "pressure < 0.7 AND mission_completed"},
        ]
    },
    
    "mission_state": {
        "name": "미션 상태 머신",
        "states": ["CREATED", "ACTIVE", "DONE", "IGNORED", "EXPIRED"],
        "transitions": [
            {"from": "CREATED", "to": "ACTIVE", "condition": "auto"},
            {"from": "ACTIVE", "to": "DONE", "condition": "complete()"},
            {"from": "ACTIVE", "to": "IGNORED", "condition": "ignore()"},
            {"from": "ACTIVE", "to": "EXPIRED", "condition": "deadline passed"},
            {"from": "IGNORED", "to": "ACTIVE", "condition": "reactivate()"},
            {"from": "EXPIRED", "to": "ACTIVE", "condition": "reactivate()"},
        ],
        "actions": {
            "ACTIVE": ["complete()", "ignore()", "delete()", "updateProgress()"],
            "DONE": ["delete()", "archive()"],
            "IGNORED": ["reactivate()", "delete()"],
            "EXPIRED": ["reactivate()", "delete()"],
        }
    },
    
    "app_state": {
        "name": "앱 상태 머신",
        "states": ["LOADING", "ONBOARDING", "READY", "RUNNING", "BACKGROUND", "SYNCING"],
        "transitions": [
            {"from": "LOADING", "to": "ONBOARDING", "condition": "first_launch"},
            {"from": "LOADING", "to": "READY", "condition": "has_data"},
            {"from": "ONBOARDING", "to": "RUNNING", "condition": "complete"},
            {"from": "READY", "to": "RUNNING", "condition": "auto"},
            {"from": "RUNNING", "to": "BACKGROUND", "condition": "app_minimize"},
            {"from": "RUNNING", "to": "SYNCING", "condition": "sync_start"},
            {"from": "BACKGROUND", "to": "RUNNING", "condition": "app_resume"},
            {"from": "SYNCING", "to": "RUNNING", "condition": "sync_complete"},
        ]
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 5: 노드 상호작용 (Node Interactions)
# ═══════════════════════════════════════════════════════════════════════════════

NODE_INFLUENCE_MATRIX = {
    # 재무 체인
    "n02": [{"target": "n01", "weight": 0.8}],   # 수입 → 현금
    "n03": [{"target": "n01", "weight": -0.9}],  # 지출 → 현금
    "n01": [{"target": "n05", "weight": 0.7}],   # 현금 → 런웨이
    "n04": [{"target": "n05", "weight": -0.5}],  # 부채 → 런웨이
    
    # 건강-생산성 체인
    "n09": [                                       # 수면 →
        {"target": "n10", "weight": 0.6},         #   HRV
        {"target": "n17", "weight": 0.7}          #   가동률
    ],
    "n10": [{"target": "n19", "weight": -0.5}],  # HRV → 오류율
    "n12": [{"target": "n09", "weight": -0.6}],  # 연속작업 → 수면
    
    # 고객 체인
    "n29": [{"target": "n23", "weight": 0.5}],   # 리드 → 고객수
    "n23": [{"target": "n02", "weight": 0.7}],   # 고객수 → 수입
    "n24": [{"target": "n23", "weight": -0.8}],  # 이탈률 → 고객수
    "n25": [{"target": "n24", "weight": -0.6}],  # NPS → 이탈률
}

INFLUENCE_PROPAGATION = """
def propagate_influence(changed_node, new_value, depth=0):
    if depth > 3: return  # 깊이 제한
    
    old_value = changed_node.value
    delta = (new_value - old_value) / old_value
    
    influences = INFLUENCE_MATRIX.get(changed_node.id, [])
    
    for inf in influences:
        target = NODES[inf['target']]
        impact = delta * inf['weight']
        
        # 압력 조정
        target.pressure = clamp(target.pressure + (impact * 0.1), 0, 1)
        target.state = determine_state(target.pressure)
        
        # 2차 전파
        if abs(impact) > 0.05:
            propagate_influence(target, target.value, depth + 1)
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 6: 프로세스 (Processes)
# ═══════════════════════════════════════════════════════════════════════════════

PROCESSES = {
    "data_collection": {
        "name": "데이터 수집 프로세스",
        "stages": ["INGESTION", "TRANSFORM", "VALIDATE", "STORE", "UPDATE_UI"],
        "intervals": {
            "health": "1시간",
            "calendar": "15분",
            "financial": "1일",
            "tasks": "30분",
            "location": "실시간"
        }
    },
    
    "notification": {
        "name": "알림 프로세스",
        "triggers": [
            {"event": "IRREVERSIBLE 상태 변경", "level": "긴급", "action": "즉시 푸시 + 진동"},
            {"event": "경계 위반", "level": "경고", "action": "푸시 알림"},
            {"event": "미션 마감 임박", "level": "정보", "action": "인앱 알림"},
            {"event": "일일 리포트", "level": "일반", "action": "조용한 푸시"},
        ],
        "daily_limit": 3
    },
    
    "sync": {
        "name": "동기화 프로세스",
        "strategy": "Local-First (오프라인 우선)",
        "flow": [
            "액션 발생",
            "로컬 저장소 즉시 업데이트",
            "UI 즉시 반영",
            "백그라운드 서버 동기화 시도",
            "실패 시 재시도 큐에 추가",
            "네트워크 복구 시 재시도"
        ]
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 7: 파이프라인 (Pipelines)
# ═══════════════════════════════════════════════════════════════════════════════

PIPELINES = {
    "data": {
        "name": "데이터 파이프라인",
        "stages": {
            "INGESTION": ["API 호출", "OAuth", "Webhook", "수동 입력"],
            "PROCESSING": ["정규화", "노드 매핑", "압력 계산", "상태 결정"],
            "STORAGE": ["LocalStorage", "IndexedDB", "(Server)"],
            "PRESENTATION": ["Dashboard", "Charts", "Alerts"]
        }
    },
    
    "event": {
        "name": "이벤트 파이프라인",
        "flow": ["User Event", "Handler", "State Change", "Zustand Store"],
        "outputs": ["UI Rerender", "Local Save", "Side Effects (Haptic/Toast/Notification)"]
    },
    
    "mission": {
        "name": "미션 파이프라인",
        "lifecycle": ["CREATE", "ACTIVE", "COMPLETE/IGNORE/EXPIRE"],
        "reactivation": "IGNORED → ACTIVE 가능"
    },
    
    "auth": {
        "name": "OAuth 인증 파이프라인",
        "flow": [
            "서비스 선택",
            "OAuth URL 요청 (client_id, scope, redirect)",
            "사용자 동의",
            "콜백 (auth code 수신)",
            "토큰 교환 (code → access_token)",
            "토큰 암호화 저장",
            "데이터 수집 시작"
        ]
    },
    
    "render": {
        "name": "렌더링 파이프라인",
        "subscriptions": {
            "Home": ["nodes", "missions"],
            "Mission": ["missions"],
            "Trinity": ["nodes"],
            "Setup": ["connectors", "devices", "webServices"],
            "Me": ["settings", "nodes"]
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 8: 에러 처리 (Error Handling)
# ═══════════════════════════════════════════════════════════════════════════════

ERROR_TYPES = {
    "NETWORK_OFFLINE": {"recoverable": True, "retryable": False, "action": "오프라인 모드 전환"},
    "NETWORK_TIMEOUT": {"recoverable": True, "retryable": True, "action": "3회 재시도, 지수 백오프"},
    "API_ERROR": {"recoverable": True, "retryable": True, "action": "재시도 후 에러 표시"},
    "AUTH_EXPIRED": {"recoverable": True, "retryable": False, "action": "토큰 자동 갱신, 실패 시 재로그인"},
    "AUTH_INVALID": {"recoverable": False, "retryable": False, "action": "재로그인 요청"},
    "DATA_CORRUPT": {"recoverable": True, "retryable": False, "action": "백업에서 복원"},
    "STORAGE_FULL": {"recoverable": True, "retryable": False, "action": "오래된 데이터 정리"},
    "PERMISSION_DENIED": {"recoverable": True, "retryable": True, "action": "설정 앱으로 안내"},
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 9: 보안 (Security)
# ═══════════════════════════════════════════════════════════════════════════════

SECURITY = {
    "layers": {
        "application": ["입력 검증", "XSS 방지", "인젝션 방지"],
        "encryption": ["AES-256 (민감 데이터)", "Keychain/Keystore (키 관리)", "SSL/TLS (전송)"],
        "storage": ["로컬 스토리지 암호화", "앱 샌드박스", "자동 로그아웃"]
    },
    "data_sensitivity": {
        "highest": {"items": ["OAuth 토큰", "금융 데이터"], "method": "Keychain + AES-256"},
        "high": {"items": ["건강 데이터", "위치 데이터"], "method": "AES-256 + 최소 수집"},
        "medium": {"items": ["노드 값"], "method": "로컬 암호화"},
        "low": {"items": ["설정/선호"], "method": "일반 저장"}
    },
    "privacy_principles": [
        "로컬 우선 (Local-First): 모든 데이터 기본 로컬 저장",
        "최소 수집 (Data Minimization): 필요한 데이터만 수집",
        "투명성 (Transparency): 수집 데이터 목록 공개",
        "사용자 통제 (User Control): 언제든 삭제/내보내기 가능"
    ]
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 10: 성능 최적화 (Performance)
# ═══════════════════════════════════════════════════════════════════════════════

PERFORMANCE = {
    "rendering": {
        "memoization": "React.memo with custom comparison",
        "virtualization": "FlashList for 36+ nodes",
        "selectors": "Zustand shallow comparison",
        "batch_updates": "Multiple state changes in single dispatch"
    },
    "memory": {
        "history": {
            "7d": "메모리 유지",
            "8-30d": "로컬 스토리지",
            "30d+": "압축 후 아카이브",
            "90d+": "요약만 보관"
        },
        "caching": ["차트: 캔버스 재사용", "아이콘: 스프라이트", "비활성 탭: 언마운트"]
    },
    "network": {
        "batching": "POST /api/sync with multiple entities",
        "delta_sync": "변경된 데이터만 전송",
        "caching": {
            "api_response": "5분",
            "public_data": "1시간",
            "static_data": "24시간"
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 11: 오프라인 모드 (Offline)
# ═══════════════════════════════════════════════════════════════════════════════

OFFLINE_MODE = {
    "full_support": [
        "대시보드 조회", "노드 상세 보기",
        "미션 생성/완료/무시/삭제",
        "설정 변경", "목표/정체성/가치/경계 편집",
        "로컬 히스토리 차트"
    ],
    "limited_support": [
        "통계 계산 (마지막 동기화 데이터)",
        "노드 값 (마지막 수집 데이터)",
        "미션 진행률 (시간 기반 추정)"
    ],
    "not_supported": [
        "OAuth 인증", "외부 API 데이터 갱신",
        "푸시 알림 수신", "팀 협업 기능"
    ],
    "sync_queue": "OfflineAction[] - 온라인 복귀 시 순차 처리"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 12: API 설계 (API Design)
# ═══════════════════════════════════════════════════════════════════════════════

API_ENDPOINTS = {
    "auth": {
        "POST /auth/login": "로그인",
        "POST /auth/logout": "로그아웃",
        "POST /auth/refresh": "토큰 갱신",
        "POST /auth/oauth/{provider}": "OAuth 인증"
    },
    "nodes": {
        "GET /nodes": "전체 노드 조회",
        "GET /nodes/{id}": "노드 상세",
        "PUT /nodes/{id}": "노드 수정",
        "GET /nodes/{id}/history": "노드 히스토리"
    },
    "missions": {
        "GET /missions": "미션 목록",
        "POST /missions": "미션 생성",
        "GET /missions/{id}": "미션 상세",
        "PUT /missions/{id}": "미션 수정",
        "DELETE /missions/{id}": "미션 삭제",
        "POST /missions/{id}/complete": "미션 완료",
        "POST /missions/{id}/ignore": "미션 무시"
    },
    "sync": {
        "POST /sync": "전체 동기화",
        "POST /sync/delta": "델타 동기화"
    },
    "settings": {
        "GET /settings": "설정 조회",
        "PUT /settings": "설정 수정"
    }
}

API_RESPONSE_FORMAT = {
    "success": {
        "success": True,
        "data": "T",
        "meta": {"page": "number", "total": "number", "timestamp": "string"}
    },
    "error": {
        "success": False,
        "error": {"code": "string", "message": "string", "details": "any"}
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 13: 접근성 & 다국어 (A11y & i18n)
# ═══════════════════════════════════════════════════════════════════════════════

ACCESSIBILITY = {
    "visual": [
        "스크린 리더 지원 (VoiceOver, TalkBack)",
        "색상 대비 4.5:1 이상",
        "색상만으로 정보 전달 금지 (아이콘 병행)",
        "텍스트 크기 조절 지원 (Dynamic Type)",
        "다크모드/라이트모드"
    ],
    "auditory": ["소리 알림에 시각적 대안", "자막/텍스트 알림"],
    "motor": ["터치 영역 최소 44x44pt", "제스처 대안 (버튼)", "시간 제한 없음"],
    "cognitive": ["일관된 네비게이션", "명확한 에러 메시지", "간단한 언어 사용"]
}

I18N = {
    "phase1": ["🇰🇷 한국어 (기본)", "🇺🇸 영어"],
    "phase2": ["🇯🇵 일본어", "🇨🇳 중국어 (간체)"],
    "phase3": ["🇪🇸 스페인어", "🇩🇪 독일어", "🇫🇷 프랑스어"],
    "key_count": "200+ 번역 키"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SECTION 14: 테스트 & 배포 (Testing & Deployment)
# ═══════════════════════════════════════════════════════════════════════════════

TESTING = {
    "pyramid": {
        "unit": {"coverage": "60%", "tools": ["Jest"], "scope": "컴포넌트, 유틸"},
        "integration": {"coverage": "30%", "tools": ["React Native Testing Library"], "scope": "API, 상태관리"},
        "e2e": {"coverage": "10%", "tools": ["Detox"], "scope": "핵심 플로우"}
    }
}

DEPLOYMENT = {
    "ci_cd": {
        "stages": ["Lint + TypeCheck", "Unit Tests", "Integration Tests", "Build iOS/Android", "TestFlight/Firebase", "E2E Tests", "App Store/Play Store"]
    },
    "versioning": {
        "format": "MAJOR.MINOR.PATCH",
        "rules": {
            "MAJOR": "호환되지 않는 변경",
            "MINOR": "새 기능 추가",
            "PATCH": "버그 수정"
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 UNIFIED SPEC OBJECT
# ═══════════════════════════════════════════════════════════════════════════════

AUTUS_MOBILE_SPEC = {
    "version": "2.1",
    "features": {f.id: {"name": f.name, "desc": f.desc, "priority": f.priority.value, "category": f.category} for f in FEATURES.values()},
    "workflows": WORKFLOWS,
    "algorithms": ALGORITHMS,
    "state_machines": STATE_MACHINES,
    "node_influences": NODE_INFLUENCE_MATRIX,
    "processes": PROCESSES,
    "pipelines": PIPELINES,
    "error_handling": ERROR_TYPES,
    "security": SECURITY,
    "performance": PERFORMANCE,
    "offline": OFFLINE_MODE,
    "api": {"endpoints": API_ENDPOINTS, "response_format": API_RESPONSE_FORMAT},
    "accessibility": ACCESSIBILITY,
    "i18n": I18N,
    "testing": TESTING,
    "deployment": DEPLOYMENT,
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 LLM CONTEXT GENERATORS
# ═══════════════════════════════════════════════════════════════════════════════

def get_full_spec() -> str:
    """전체 명세 텍스트 생성"""
    lines = []
    lines.append("=" * 60)
    lines.append("📱 AUTUS Mobile App v2.1 - Complete Specification")
    lines.append("=" * 60)
    
    # 기능
    lines.append("\n## 📋 기능 리스트 (38개)")
    for cat in ["core", "setup", "me", "ux", "data"]:
        cat_features = [f for f in FEATURES.values() if f.category == cat]
        lines.append(f"\n### {cat.upper()}")
        for f in cat_features:
            lines.append(f"- [{f.priority.value}] {f.id}: {f.name} - {f.desc}")
    
    # 플로우
    lines.append("\n## 🔄 업무 플로우 (4개)")
    for wf_id, wf in WORKFLOWS.items():
        lines.append(f"\n### {wf['name']}")
        if "steps" in wf:
            for step in wf["steps"]:
                lines.append(f"  {step['step']}. {step['name']}: {step['desc']}")
    
    # 알고리즘
    lines.append("\n## 🧮 핵심 알고리즘 (6개)")
    for alg_id, alg in ALGORITHMS.items():
        lines.append(f"\n### {alg['name']}")
        lines.append(f"  {alg['desc']}")
    
    # 상태 머신
    lines.append("\n## 🔀 상태 머신 (3개)")
    for sm_id, sm in STATE_MACHINES.items():
        lines.append(f"\n### {sm['name']}")
        lines.append(f"  States: {' → '.join(sm['states'])}")
    
    # 프로세스
    lines.append("\n## ⚙️ 프로세스 (3개)")
    for proc_id, proc in PROCESSES.items():
        lines.append(f"- {proc['name']}")
    
    # 파이프라인
    lines.append("\n## 🚰 파이프라인 (5개)")
    for pipe_id, pipe in PIPELINES.items():
        lines.append(f"- {pipe['name']}")
    
    return "\n".join(lines)


def get_minimal_spec() -> str:
    """최소 명세 (토큰 절약용)"""
    return """
📱 AUTUS Mobile v2.1 Spec

기능(38): Core(7), Setup(6), Me(5), UX(5), Data(4)
플로우(4): 온보딩, 일일사용, 미션처리, 데이터연결
알고리즘(6): 압력계산, 상태결정, 회로계산, 통계, Top1선택, 미션진행
상태머신(3): 노드(IGNORABLE→PRESSURING→IRREVERSIBLE), 미션(ACTIVE→DONE/IGNORED), 앱(LOADING→RUNNING)
프로세스(3): 데이터수집, 알림, 동기화
파이프라인(5): 데이터, 이벤트, 미션, 인증, 렌더링

압력공식: 0~1 (0.3미만=IGNORABLE, 0.7이상=IRREVERSIBLE)
미션유형: 무시(-), 자동화(🤖), 외주(👥), 지시(📋)
API: /auth, /nodes, /missions, /sync, /settings
보안: AES-256, Keychain, Local-First
성능: React.memo, FlashList, Zustand shallow
""".strip()


def get_json_spec() -> str:
    """JSON 형식 명세"""
    return json.dumps(AUTUS_MOBILE_SPEC, ensure_ascii=False, indent=2, default=str)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print(get_full_spec()[:2000] + "\n...\n")
    print("=" * 60)
    print("Minimal Spec:")
    print("=" * 60)
    print(get_minimal_spec())
