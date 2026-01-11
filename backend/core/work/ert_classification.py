"""
═══════════════════════════════════════════════════════════════════════════════
🌍 AUTUS v2.5+ - ERT Work Classification System
═══════════════════════════════════════════════════════════════════════════════

"무슨 존재가 될지는 당신이 정한다.
 그 존재를 유지하는 일은 우리가 한다."

ERT 구조: 12 Entity × 6 Relation × 4 Time = 288 관점

처리 전략:
- DELETE (삭제): R 약하거나 T 무의미 → 존재 자체 삭제
- AUTOMATE (자동화): T(빈도) 높거나 R(교환·의존) 단순 → 시스템 대체
- PARALLELIZE (병렬화): R(협력·경쟁) 강하거나 T(기간) 긴 → 분산 처리
- HUMANIZE (인간): 창조/판단/감정 필수 → 인간만 수행
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Tuple

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

Entity = Literal[
    'CASH', 'PEOPLE', 'KNOWLEDGE', 'TIME', 'ENERGY', 'ASSET',
    'HEALTH', 'RELATION', 'MARKET', 'RISK', 'SPACE', 'DATA'
]

Relation = Literal[
    'OWN', 'DEPEND', 'EXCHANGE', 'COOPERATE', 'COMPETE', 'INFLUENCE'
]

TimeType = Literal['POINT', 'DURATION', 'FREQUENCY', 'SEQUENCE']

ERTStrategy = Literal['DELETE', 'AUTOMATE', 'PARALLELIZE', 'HUMANIZE']


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 E - ENTITY (무엇) - 12개
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EntityDef:
    """Entity 정의"""
    id: str
    name: str
    name_ko: str
    description: str
    linked_nodes: List[str]
    default_priority: float


ENTITIES: Dict[str, EntityDef] = {
    'CASH': EntityDef(
        id='CASH', name='Cash/Funds', name_ko='현금/자금',
        description='화폐, 유동성, 결제 수단',
        linked_nodes=['n01', 'n02', 'n03', 'n04'],
        default_priority=0.9,
    ),
    'PEOPLE': EntityDef(
        id='PEOPLE', name='People/Workforce', name_ko='사람/인력',
        description='팀원, 협력자, 이해관계자',
        linked_nodes=['n26', 'n27', 'n28'],
        default_priority=0.8,
    ),
    'KNOWLEDGE': EntityDef(
        id='KNOWLEDGE', name='Knowledge/Information', name_ko='지식/정보',
        description='노하우, 데이터, 인사이트',
        linked_nodes=['n17', 'n33'],
        default_priority=0.6,
    ),
    'TIME': EntityDef(
        id='TIME', name='Time/Schedule', name_ko='시간/일정',
        description='마감, 스케줄, 시간 자원',
        linked_nodes=['n15', 'n16', 'n18'],
        default_priority=0.85,
    ),
    'ENERGY': EntityDef(
        id='ENERGY', name='Energy/Stamina', name_ko='에너지/체력',
        description='인지 에너지, 신체 에너지',
        linked_nodes=['n09', 'n12', 'n13', 'n14'],
        default_priority=0.75,
    ),
    'ASSET': EntityDef(
        id='ASSET', name='Asset/Property', name_ko='자산/재산',
        description='부동산, 주식, 설비',
        linked_nodes=['n05', 'n06', 'n19'],
        default_priority=0.7,
    ),
    'HEALTH': EntityDef(
        id='HEALTH', name='Health/Wellbeing', name_ko='건강/웰빙',
        description='신체/정신 건강',
        linked_nodes=['n09', 'n10', 'n11'],
        default_priority=0.95,
    ),
    'RELATION': EntityDef(
        id='RELATION', name='Relationship/Network', name_ko='관계/네트워크',
        description='인맥, 파트너십, 신뢰',
        linked_nodes=['n26', 'n27', 'n28'],
        default_priority=0.65,
    ),
    'MARKET': EntityDef(
        id='MARKET', name='Market/Customer', name_ko='시장/고객',
        description='고객, 시장, 수요',
        linked_nodes=['n23', 'n24', 'n25', 'n29'],
        default_priority=0.8,
    ),
    'RISK': EntityDef(
        id='RISK', name='Risk/Crisis', name_ko='위험/위기',
        description='위협, 불확실성, 위기',
        linked_nodes=['n35', 'n36'],
        default_priority=0.9,
    ),
    'SPACE': EntityDef(
        id='SPACE', name='Space/Environment', name_ko='공간/환경',
        description='물리적 공간, 작업 환경',
        linked_nodes=['n19', 'n21'],
        default_priority=0.5,
    ),
    'DATA': EntityDef(
        id='DATA', name='Data/Record', name_ko='데이터/기록',
        description='기록, 문서, 로그',
        linked_nodes=['n17', 'n18', 'n20'],
        default_priority=0.4,
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 R - RELATION (어떻게) - 6개
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class RelationDef:
    """Relation 정의"""
    id: str
    name: str
    name_ko: str
    description: str
    automation_affinity: float  # 자동화 친화도 (0-1)
    parallel_affinity: float    # 병렬화 친화도 (0-1)
    delete_affinity: float      # 삭제 친화도 (0-1)


RELATIONS: Dict[str, RelationDef] = {
    'OWN': RelationDef(
        id='OWN', name='Ownership', name_ko='소유',
        description='자원을 보유/관리',
        automation_affinity=0.9,   # 소유 관리는 자동화 적합
        parallel_affinity=0.3,
        delete_affinity=0.2,
    ),
    'DEPEND': RelationDef(
        id='DEPEND', name='Dependency', name_ko='의존',
        description='다른 것에 의지',
        automation_affinity=0.8,   # 의존 관계는 자동화로 해결
        parallel_affinity=0.4,
        delete_affinity=0.5,       # 의존 제거 가능
    ),
    'EXCHANGE': RelationDef(
        id='EXCHANGE', name='Exchange', name_ko='교환',
        description='가치의 주고받음',
        automation_affinity=0.95,  # 교환은 자동화 최적
        parallel_affinity=0.6,
        delete_affinity=0.3,
    ),
    'COOPERATE': RelationDef(
        id='COOPERATE', name='Cooperation', name_ko='협력',
        description='공동 작업/협업',
        automation_affinity=0.4,   # 협력은 인간적
        parallel_affinity=0.9,     # 병렬화 최적
        delete_affinity=0.2,
    ),
    'COMPETE': RelationDef(
        id='COMPETE', name='Competition', name_ko='경쟁',
        description='자원/지위 경쟁',
        automation_affinity=0.5,
        parallel_affinity=0.7,     # 경쟁 업무 분산 가능
        delete_affinity=0.4,
    ),
    'INFLUENCE': RelationDef(
        id='INFLUENCE', name='Influence', name_ko='영향',
        description='영향력 행사/수용',
        automation_affinity=0.3,   # 영향은 인간적
        parallel_affinity=0.5,
        delete_affinity=0.6,       # 불필요 영향 삭제
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 T - TIME (언제) - 4개
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TimeDef:
    """Time 정의"""
    id: str
    name: str
    name_ko: str
    description: str
    automation_affinity: float
    parallel_affinity: float
    delete_affinity: float


TIME_TYPES: Dict[str, TimeDef] = {
    'POINT': TimeDef(
        id='POINT', name='Point in Time', name_ko='시점',
        description='특정 순간/마감',
        automation_affinity=0.7,
        parallel_affinity=0.3,
        delete_affinity=0.4,
    ),
    'DURATION': TimeDef(
        id='DURATION', name='Duration', name_ko='기간',
        description='소요 시간/지속 기간',
        automation_affinity=0.5,
        parallel_affinity=0.9,     # 기간 긴 업무는 병렬화
        delete_affinity=0.3,
    ),
    'FREQUENCY': TimeDef(
        id='FREQUENCY', name='Frequency', name_ko='빈도',
        description='반복 주기',
        automation_affinity=0.95,  # 빈도 높으면 자동화
        parallel_affinity=0.4,
        delete_affinity=0.6,       # 불필요 빈도 삭제
    ),
    'SEQUENCE': TimeDef(
        id='SEQUENCE', name='Sequence', name_ko='순서',
        description='실행 순서/워크플로우',
        automation_affinity=0.85,  # 순서는 자동화
        parallel_affinity=0.3,
        delete_affinity=0.5,
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ERT Work 데이터클래스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ERTWork:
    """ERT 업무 조합"""
    id: str
    
    # ERT 구성
    entity: Entity
    relation: Relation
    time: TimeType
    
    # 설명
    name: str
    name_ko: str
    description: str
    examples: List[str]
    
    # 전략
    strategy: ERTStrategy
    automation_score: float
    parallel_score: float
    delete_score: float
    human_score: float
    
    # 연결
    linked_nodes: List[str]
    
    # 실행
    current_tools: List[str] = field(default_factory=list)
    future_tools: List[str] = field(default_factory=list)
    automation_years: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ERT 조합별 전략 결정 함수
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_ert_strategy(
    entity: Entity,
    relation: Relation,
    time: TimeType
) -> Tuple[ERTStrategy, float, float, float, float]:
    """ERT 조합에 대한 전략 결정"""
    r = RELATIONS[relation]
    t = TIME_TYPES[time]
    
    # 점수 계산 (R과 T의 친화도 가중 평균)
    automation_score = (r.automation_affinity * 0.5 + t.automation_affinity * 0.5)
    parallel_score = (r.parallel_affinity * 0.5 + t.parallel_affinity * 0.5)
    delete_score = (r.delete_affinity * 0.5 + t.delete_affinity * 0.5)
    
    # 인간 필수 점수 (자동화/삭제 낮을수록 인간 필요)
    human_score = 1 - max(automation_score, delete_score) * 0.8
    
    # 전략 결정
    max_score = max(automation_score, parallel_score, delete_score, human_score)
    
    if delete_score == max_score and delete_score > 0.5:
        strategy = 'DELETE'
    elif automation_score == max_score and automation_score > 0.6:
        strategy = 'AUTOMATE'
    elif parallel_score == max_score and parallel_score > 0.6:
        strategy = 'PARALLELIZE'
    else:
        strategy = 'HUMANIZE'
    
    return strategy, automation_score, parallel_score, delete_score, human_score


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ERT 예시 생성
# ═══════════════════════════════════════════════════════════════════════════════

ERT_EXAMPLES: Dict[str, List[str]] = {
    # CASH 관련
    'CASH_OWN_FREQUENCY': ['월별 잔고 확인', '정기 자산 점검'],
    'CASH_EXCHANGE_FREQUENCY': ['일일 결제 처리', '정기 송금'],
    'CASH_DEPEND_POINT': ['월급날 입금 확인', '만기일 이자 수령'],
    'CASH_OWN_POINT': ['연말 재무 정산', '분기 결산'],
    'CASH_OWN_SEQUENCE': ['청구서 처리', '급여 지급', '세금 납부'],
    'CASH_EXCHANGE_SEQUENCE': ['결제 워크플로우', '정산 프로세스'],
    
    # PEOPLE 관련
    'PEOPLE_COOPERATE_DURATION': ['팀 프로젝트', '공동 개발'],
    'PEOPLE_INFLUENCE_FREQUENCY': ['주간 회의', '정기 보고'],
    'PEOPLE_COMPETE_DURATION': ['경쟁 입찰', '승진 경쟁'],
    'PEOPLE_INFLUENCE_POINT': ['투자 유치', '핵심 협상'],
    
    # TIME 관련
    'TIME_OWN_SEQUENCE': ['일정 관리', '워크플로우 정리'],
    'TIME_DEPEND_POINT': ['마감 준수', '약속 시간'],
    
    # ENERGY 관련
    'ENERGY_DEPEND_FREQUENCY': ['일일 컨디션 체크', '주간 회복 루틴'],
    'ENERGY_OWN_DURATION': ['집중 작업 세션', '딥워크 블록'],
    
    # KNOWLEDGE 관련
    'KNOWLEDGE_EXCHANGE_FREQUENCY': ['정기 학습', '뉴스레터 구독'],
    'KNOWLEDGE_OWN_SEQUENCE': ['문서화', '지식 정리'],
    'KNOWLEDGE_OWN_POINT': ['아이디어 도출', '전략 수립'],
    'KNOWLEDGE_COOPERATE_DURATION': ['공동 리서치', '팀 학습'],
    
    # MARKET 관련
    'MARKET_COMPETE_FREQUENCY': ['경쟁사 모니터링', '시장 조사'],
    'MARKET_INFLUENCE_DURATION': ['마케팅 캠페인', '브랜딩'],
    
    # RISK 관련
    'RISK_DEPEND_SEQUENCE': ['위기 대응 순서', '비상 프로토콜'],
    'RISK_INFLUENCE_POINT': ['리스크 평가', '위험 경고'],
    
    # DATA 관련
    'DATA_OWN_FREQUENCY': ['백업', '로그 관리'],
    'DATA_EXCHANGE_SEQUENCE': ['데이터 파이프라인', 'ETL 프로세스'],
    'DATA_INFLUENCE_FREQUENCY': ['일일 현황 보고', '주간 진척 공유'],
    
    # RELATION 관련
    'RELATION_COOPERATE_POINT': ['첫 미팅', '파트너십 체결'],
}


def get_ert_examples(entity: Entity, relation: Relation, time: TimeType) -> List[str]:
    """ERT 조합에 대한 예시 반환"""
    key = f'{entity}_{relation}_{time}'
    if key in ERT_EXAMPLES:
        return ERT_EXAMPLES[key]
    return [f'{ENTITIES[entity].name_ko} {RELATIONS[relation].name_ko} 업무']


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 288개 ERT 조합 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_all_ert_combinations() -> List[ERTWork]:
    """모든 288개 ERT 조합 생성"""
    combinations: List[ERTWork] = []
    
    entities = list(ENTITIES.keys())
    relations = list(RELATIONS.keys())
    times = list(TIME_TYPES.keys())
    
    idx = 0
    for entity in entities:
        for relation in relations:
            for time in times:
                idx += 1
                
                e = ENTITIES[entity]
                r = RELATIONS[relation]
                t = TIME_TYPES[time]
                
                strategy, auto, para, dele, human = calculate_ert_strategy(entity, relation, time)
                
                name = f'{e.name} × {r.name} × {t.name}'
                name_ko = f'{e.name_ko} × {r.name_ko} × {t.name_ko}'
                description = f'{e.name_ko}을(를) {r.name_ko}하는 {t.name_ko} 기반 업무'
                examples = get_ert_examples(entity, relation, time)
                
                combinations.append(ERTWork(
                    id=f'ert_{idx:03d}',
                    entity=entity,
                    relation=relation,
                    time=time,
                    name=name,
                    name_ko=name_ko,
                    description=description,
                    examples=examples,
                    strategy=strategy,
                    automation_score=auto,
                    parallel_score=para,
                    delete_score=dele,
                    human_score=human,
                    linked_nodes=e.linked_nodes,
                    automation_years=0 if auto > 0.8 else (2 if auto > 0.6 else 5),
                ))
    
    return combinations


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 주요 ERT 패턴 (핵심 업무)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class KeyPattern:
    """핵심 ERT 패턴"""
    pattern: str
    entity: Entity
    relation: Relation
    time: TimeType
    name_ko: str
    strategy: ERTStrategy
    examples: List[str]
    impact: str  # high, medium, low


KEY_ERT_PATTERNS: List[KeyPattern] = [
    # 🗑️ DELETE 패턴 (삭제)
    KeyPattern('CASH × EXCHANGE × FREQUENCY', 'CASH', 'EXCHANGE', 'FREQUENCY',
               '매일 반복 결제', 'DELETE', ['매일 잔고 확인', '일일 지출 기록'], 'high'),
    KeyPattern('DATA × OWN × FREQUENCY', 'DATA', 'OWN', 'FREQUENCY',
               '반복 데이터 관리', 'DELETE', ['매일 파일 정리', '정기 백업 (자동화)'], 'medium'),
    KeyPattern('KNOWLEDGE × INFLUENCE × FREQUENCY', 'KNOWLEDGE', 'INFLUENCE', 'FREQUENCY',
               '반복 보고/공유', 'DELETE', ['매일 현황 보고', '주간 진척 공유'], 'high'),
    
    # 🤖 AUTOMATE 패턴 (자동화)
    KeyPattern('CASH × OWN × SEQUENCE', 'CASH', 'OWN', 'SEQUENCE',
               '자금 관리 순서', 'AUTOMATE', ['청구서 처리', '급여 지급', '세금 납부'], 'high'),
    KeyPattern('TIME × DEPEND × POINT', 'TIME', 'DEPEND', 'POINT',
               '마감 의존', 'AUTOMATE', ['마감 알림', '일정 리마인더'], 'high'),
    KeyPattern('MARKET × COMPETE × FREQUENCY', 'MARKET', 'COMPETE', 'FREQUENCY',
               '경쟁 모니터링', 'AUTOMATE', ['경쟁사 분석', '가격 모니터링'], 'medium'),
    KeyPattern('RISK × DEPEND × SEQUENCE', 'RISK', 'DEPEND', 'SEQUENCE',
               '위기 대응 순서', 'AUTOMATE', ['자동 경고', '에스컬레이션'], 'high'),
    
    # 🔀 PARALLELIZE 패턴 (병렬화)
    KeyPattern('PEOPLE × COOPERATE × DURATION', 'PEOPLE', 'COOPERATE', 'DURATION',
               '장기 협업', 'PARALLELIZE', ['팀 프로젝트', '공동 개발'], 'high'),
    KeyPattern('KNOWLEDGE × COOPERATE × DURATION', 'KNOWLEDGE', 'COOPERATE', 'DURATION',
               '공동 연구', 'PARALLELIZE', ['리서치', '문서화'], 'medium'),
    KeyPattern('MARKET × INFLUENCE × DURATION', 'MARKET', 'INFLUENCE', 'DURATION',
               '장기 마케팅', 'PARALLELIZE', ['캠페인', '브랜딩'], 'medium'),
    
    # 👤 HUMANIZE 패턴 (인간 필수)
    KeyPattern('PEOPLE × INFLUENCE × POINT', 'PEOPLE', 'INFLUENCE', 'POINT',
               '중요 설득/협상', 'HUMANIZE', ['투자 유치', '핵심 협상'], 'high'),
    KeyPattern('RELATION × COOPERATE × POINT', 'RELATION', 'COOPERATE', 'POINT',
               '관계 구축', 'HUMANIZE', ['첫 미팅', '파트너십 체결'], 'high'),
    KeyPattern('KNOWLEDGE × OWN × POINT', 'KNOWLEDGE', 'OWN', 'POINT',
               '창의적 발상', 'HUMANIZE', ['아이디어 도출', '전략 수립'], 'high'),
]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통계 함수
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ERTStats:
    """ERT 통계"""
    total: int
    by_strategy: Dict[str, int]
    by_entity: Dict[str, int]
    by_relation: Dict[str, int]
    by_time: Dict[str, int]
    delete_rate: float
    automate_rate: float
    parallel_rate: float
    human_rate: float


def get_ert_stats() -> ERTStats:
    """ERT 통계 계산"""
    all_ert = generate_all_ert_combinations()
    
    by_strategy = {'DELETE': 0, 'AUTOMATE': 0, 'PARALLELIZE': 0, 'HUMANIZE': 0}
    by_entity: Dict[str, int] = {}
    by_relation: Dict[str, int] = {}
    by_time: Dict[str, int] = {}
    
    for ert in all_ert:
        by_strategy[ert.strategy] += 1
        by_entity[ert.entity] = by_entity.get(ert.entity, 0) + 1
        by_relation[ert.relation] = by_relation.get(ert.relation, 0) + 1
        by_time[ert.time] = by_time.get(ert.time, 0) + 1
    
    total = len(all_ert)
    
    return ERTStats(
        total=total,
        by_strategy=by_strategy,
        by_entity=by_entity,
        by_relation=by_relation,
        by_time=by_time,
        delete_rate=by_strategy['DELETE'] / total,
        automate_rate=by_strategy['AUTOMATE'] / total,
        parallel_rate=by_strategy['PARALLELIZE'] / total,
        human_rate=by_strategy['HUMANIZE'] / total,
    )
