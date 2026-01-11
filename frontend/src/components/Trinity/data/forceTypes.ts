/**
 * AUTUS - 72 외부 작용 (Force Types)
 * ===================================
 * 
 * 구조: 6개 물리 노드 × 12개 작용 = 72개 Force
 * 
 * 물리 노드: BIO, CAPITAL, NETWORK, KNOWLEDGE, TIME, EMOTION
 * 작용 종류: 12가지 (증가/감소, 가속/감속, 변환/고정 등)
 */

// ═══════════════════════════════════════════════════════════════════════════
// 6개 물리 노드 정의
// ═══════════════════════════════════════════════════════════════════════════

export const PHYSICS_NODES = {
  BIO: { id: 'BIO', name: '생체', icon: '🧬', color: '#ef4444', desc: '신체적 에너지, 건강, 체력' },
  CAPITAL: { id: 'CAPITAL', name: '자본', icon: '💰', color: '#f59e0b', desc: '금전, 자산, 경제적 자원' },
  NETWORK: { id: 'NETWORK', name: '네트워크', icon: '🔗', color: '#3b82f6', desc: '인맥, 관계, 연결' },
  KNOWLEDGE: { id: 'KNOWLEDGE', name: '지식', icon: '📚', color: '#8b5cf6', desc: '정보, 기술, 노하우' },
  TIME: { id: 'TIME', name: '시간', icon: '⏰', color: '#10b981', desc: '가용 시간, 효율성' },
  EMOTION: { id: 'EMOTION', name: '감정', icon: '💜', color: '#ec4899', desc: '동기, 의지, 정서적 에너지' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 12개 작용 유형 정의
// ═══════════════════════════════════════════════════════════════════════════

export const ACTION_TYPES = {
  // 양적 변화 (Quantitative)
  INJECT: { id: 'INJECT', name: '주입', symbol: '↑+', desc: '외부에서 자원 유입', effect: +2 },
  DRAIN: { id: 'DRAIN', name: '유출', symbol: '↓-', desc: '외부로 자원 유출', effect: -2 },
  AMPLIFY: { id: 'AMPLIFY', name: '증폭', symbol: '×2', desc: '기존 자원 배가', effect: +3 },
  DECAY: { id: 'DECAY', name: '감쇠', symbol: '÷2', desc: '기존 자원 반감', effect: -3 },
  
  // 속도 변화 (Velocity)
  ACCELERATE: { id: 'ACCELERATE', name: '가속', symbol: '⚡', desc: '변화 속도 증가', effect: +1 },
  DECELERATE: { id: 'DECELERATE', name: '감속', symbol: '🐢', desc: '변화 속도 감소', effect: -1 },
  
  // 방향 변화 (Direction)
  REDIRECT: { id: 'REDIRECT', name: '전환', symbol: '↻', desc: '흐름 방향 변경', effect: 0 },
  LOCK: { id: 'LOCK', name: '고정', symbol: '🔒', desc: '현재 상태 유지', effect: 0 },
  
  // 질적 변화 (Qualitative)
  UPGRADE: { id: 'UPGRADE', name: '업그레이드', symbol: '⬆️', desc: '품질 향상', effect: +2 },
  DOWNGRADE: { id: 'DOWNGRADE', name: '다운그레이드', symbol: '⬇️', desc: '품질 하락', effect: -2 },
  
  // 구조 변화 (Structural)
  MERGE: { id: 'MERGE', name: '통합', symbol: '🔀', desc: '여러 자원 결합', effect: +1 },
  SPLIT: { id: 'SPLIT', name: '분리', symbol: '✂️', desc: '자원 분할', effect: -1 },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 72개 외부 작용 (Force) 전체 정의
// ═══════════════════════════════════════════════════════════════════════════

export interface ForceType {
  id: string;           // F01-F72
  code: string;         // BIO_INJECT
  node: string;         // BIO
  action: string;       // INJECT
  name: string;         // 생체 주입
  desc: string;         // 구체적 설명
  examples: string[];   // 실제 예시
  cost: number;         // 실행 비용 (1-10)
  duration: string;     // 효과 지속 시간
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
}

export const ALL_72_FORCES: ForceType[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // BIO (생체) × 12 작용 = F01-F12
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'F01', code: 'BIO_INJECT', node: 'BIO', action: 'INJECT',
    name: '생체 주입', desc: '외부 에너지원을 신체에 공급',
    examples: ['영양제 섭취', '수혈', '에너지 드링크', '단백질 보충'],
    cost: 2, duration: '1-7일', rarity: 'Common'
  },
  {
    id: 'F02', code: 'BIO_DRAIN', node: 'BIO', action: 'DRAIN',
    name: '생체 유출', desc: '신체 에너지 소모/손실',
    examples: ['과로', '수술', '헌혈', '극한 운동'],
    cost: 1, duration: '1-14일', rarity: 'Common'
  },
  {
    id: 'F03', code: 'BIO_AMPLIFY', node: 'BIO', action: 'AMPLIFY',
    name: '생체 증폭', desc: '신체 능력 극대화',
    examples: ['도핑', '아드레날린 러쉬', '수면 최적화', '유전자 치료'],
    cost: 8, duration: '1-30일', rarity: 'Epic'
  },
  {
    id: 'F04', code: 'BIO_DECAY', node: 'BIO', action: 'DECAY',
    name: '생체 감쇠', desc: '신체 기능 저하',
    examples: ['질병', '노화', '중독', '장기 스트레스'],
    cost: 0, duration: '30일+', rarity: 'Common'
  },
  {
    id: 'F05', code: 'BIO_ACCELERATE', node: 'BIO', action: 'ACCELERATE',
    name: '생체 가속', desc: '회복/성장 속도 증가',
    examples: ['재활 치료', '성장 호르몬', '고압산소요법', '줄기세포'],
    cost: 6, duration: '7-30일', rarity: 'Rare'
  },
  {
    id: 'F06', code: 'BIO_DECELERATE', node: 'BIO', action: 'DECELERATE',
    name: '생체 감속', desc: '신진대사/노화 지연',
    examples: ['냉동 보존', '단식', '명상', '항노화 치료'],
    cost: 7, duration: '30일+', rarity: 'Rare'
  },
  {
    id: 'F07', code: 'BIO_REDIRECT', node: 'BIO', action: 'REDIRECT',
    name: '생체 전환', desc: '신체 에너지 재배치',
    examples: ['수면 패턴 변경', '식단 전환', '운동 종목 변경', '거주지 이전'],
    cost: 3, duration: '14-60일', rarity: 'Uncommon'
  },
  {
    id: 'F08', code: 'BIO_LOCK', node: 'BIO', action: 'LOCK',
    name: '생체 고정', desc: '현재 신체 상태 유지',
    examples: ['루틴 유지', '정기 검진', '예방 접종', '보험 가입'],
    cost: 2, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F09', code: 'BIO_UPGRADE', node: 'BIO', action: 'UPGRADE',
    name: '생체 업그레이드', desc: '신체 기능 영구 향상',
    examples: ['라식 수술', '치아 임플란트', '성형', '사이보그화'],
    cost: 9, duration: '영구', rarity: 'Epic'
  },
  {
    id: 'F10', code: 'BIO_DOWNGRADE', node: 'BIO', action: 'DOWNGRADE',
    name: '생체 다운그레이드', desc: '신체 기능 영구 손상',
    examples: ['사고', '만성 질환', '장애', '중독 후유증'],
    cost: 0, duration: '영구', rarity: 'Rare'
  },
  {
    id: 'F11', code: 'BIO_MERGE', node: 'BIO', action: 'MERGE',
    name: '생체 통합', desc: '여러 신체 기능 결합',
    examples: ['멀티태스킹 훈련', '크로스핏', '통합 의학', '마인드-바디 연결'],
    cost: 5, duration: '30-90일', rarity: 'Uncommon'
  },
  {
    id: 'F12', code: 'BIO_SPLIT', node: 'BIO', action: 'SPLIT',
    name: '생체 분리', desc: '신체 기능 전문화',
    examples: ['전문 운동 훈련', '특정 감각 강화', '장기 기증', '혈장 분리'],
    cost: 4, duration: '30-90일', rarity: 'Uncommon'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPITAL (자본) × 12 작용 = F13-F24
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'F13', code: 'CAPITAL_INJECT', node: 'CAPITAL', action: 'INJECT',
    name: '자본 주입', desc: '외부 자금 유입',
    examples: ['투자 유치', '대출', '상속', '복권 당첨'],
    cost: 3, duration: '즉시', rarity: 'Uncommon'
  },
  {
    id: 'F14', code: 'CAPITAL_DRAIN', node: 'CAPITAL', action: 'DRAIN',
    name: '자본 유출', desc: '자금 외부 유출',
    examples: ['소비', '세금', '벌금', '사기 피해'],
    cost: 0, duration: '즉시', rarity: 'Common'
  },
  {
    id: 'F15', code: 'CAPITAL_AMPLIFY', node: 'CAPITAL', action: 'AMPLIFY',
    name: '자본 증폭', desc: '자산 급격한 증가',
    examples: ['대박 투자', 'IPO', '부동산 폭등', '사업 매각'],
    cost: 8, duration: '1-365일', rarity: 'Epic'
  },
  {
    id: 'F16', code: 'CAPITAL_DECAY', node: 'CAPITAL', action: 'DECAY',
    name: '자본 감쇠', desc: '자산 가치 하락',
    examples: ['인플레이션', '주가 폭락', '파산', '경기 침체'],
    cost: 0, duration: '30일+', rarity: 'Common'
  },
  {
    id: 'F17', code: 'CAPITAL_ACCELERATE', node: 'CAPITAL', action: 'ACCELERATE',
    name: '자본 가속', desc: '수익 창출 속도 증가',
    examples: ['레버리지', '자동화', '스케일업', '복리 효과'],
    cost: 6, duration: '30-365일', rarity: 'Rare'
  },
  {
    id: 'F18', code: 'CAPITAL_DECELERATE', node: 'CAPITAL', action: 'DECELERATE',
    name: '자본 감속', desc: '자금 흐름 둔화',
    examples: ['긴축', '현금 보유', '채권 투자', '안전 자산'],
    cost: 2, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F19', code: 'CAPITAL_REDIRECT', node: 'CAPITAL', action: 'REDIRECT',
    name: '자본 전환', desc: '자산 재배치',
    examples: ['포트폴리오 리밸런싱', '업종 전환', '환전', '부동산↔주식'],
    cost: 4, duration: '7-30일', rarity: 'Uncommon'
  },
  {
    id: 'F20', code: 'CAPITAL_LOCK', node: 'CAPITAL', action: 'LOCK',
    name: '자본 고정', desc: '자산 동결/보존',
    examples: ['정기 예금', '채권 만기 보유', '신탁', '락업'],
    cost: 1, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F21', code: 'CAPITAL_UPGRADE', node: 'CAPITAL', action: 'UPGRADE',
    name: '자본 업그레이드', desc: '자산 품질 향상',
    examples: ['현금→부동산', '주식→지분', '채권→주식', '저축→투자'],
    cost: 5, duration: '30-365일', rarity: 'Uncommon'
  },
  {
    id: 'F22', code: 'CAPITAL_DOWNGRADE', node: 'CAPITAL', action: 'DOWNGRADE',
    name: '자본 다운그레이드', desc: '자산 품질 하락',
    examples: ['현금화', '불량 자산화', '유동성 위기', '신용 하락'],
    cost: 0, duration: '즉시', rarity: 'Common'
  },
  {
    id: 'F23', code: 'CAPITAL_MERGE', node: 'CAPITAL', action: 'MERGE',
    name: '자본 통합', desc: '자산 결합/합병',
    examples: ['합작 투자', '펀드 가입', '공동 구매', 'M&A'],
    cost: 6, duration: '30-180일', rarity: 'Rare'
  },
  {
    id: 'F24', code: 'CAPITAL_SPLIT', node: 'CAPITAL', action: 'SPLIT',
    name: '자본 분리', desc: '자산 분할',
    examples: ['분산 투자', '회사 분할', '상속 분배', '손절'],
    cost: 3, duration: '7-30일', rarity: 'Uncommon'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK (네트워크) × 12 작용 = F25-F36
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'F25', code: 'NETWORK_INJECT', node: 'NETWORK', action: 'INJECT',
    name: '네트워크 주입', desc: '새로운 연결 유입',
    examples: ['소개팅', '네트워킹 행사', 'SNS 팔로우', '동문회 가입'],
    cost: 2, duration: '즉시', rarity: 'Common'
  },
  {
    id: 'F26', code: 'NETWORK_DRAIN', node: 'NETWORK', action: 'DRAIN',
    name: '네트워크 유출', desc: '관계 단절/손실',
    examples: ['이별', '퇴사', '이사', '절교'],
    cost: 0, duration: '즉시', rarity: 'Common'
  },
  {
    id: 'F27', code: 'NETWORK_AMPLIFY', node: 'NETWORK', action: 'AMPLIFY',
    name: '네트워크 증폭', desc: '영향력 급격한 확대',
    examples: ['바이럴', '유명인 연결', '미디어 노출', '베스트셀러'],
    cost: 8, duration: '7-90일', rarity: 'Epic'
  },
  {
    id: 'F28', code: 'NETWORK_DECAY', node: 'NETWORK', action: 'DECAY',
    name: '네트워크 감쇠', desc: '관계 약화/소원',
    examples: ['연락 두절', '신뢰 하락', '은둔', '스캔들'],
    cost: 0, duration: '30일+', rarity: 'Common'
  },
  {
    id: 'F29', code: 'NETWORK_ACCELERATE', node: 'NETWORK', action: 'ACCELERATE',
    name: '네트워크 가속', desc: '관계 발전 속도 증가',
    examples: ['집중 교류', '공동 프로젝트', '위기 극복', '여행 동행'],
    cost: 4, duration: '7-30일', rarity: 'Uncommon'
  },
  {
    id: 'F30', code: 'NETWORK_DECELERATE', node: 'NETWORK', action: 'DECELERATE',
    name: '네트워크 감속', desc: '관계 발전 지연',
    examples: ['거리 두기', '바쁨 핑계', '답장 지연', '일정 연기'],
    cost: 1, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F31', code: 'NETWORK_REDIRECT', node: 'NETWORK', action: 'REDIRECT',
    name: '네트워크 전환', desc: '관계 방향/성격 변경',
    examples: ['친구→연인', '동료→파트너', '경쟁→협력', '상하→수평'],
    cost: 5, duration: '30-90일', rarity: 'Rare'
  },
  {
    id: 'F32', code: 'NETWORK_LOCK', node: 'NETWORK', action: 'LOCK',
    name: '네트워크 고정', desc: '관계 현상 유지',
    examples: ['정기 모임', '계약 갱신', '멤버십', '구독'],
    cost: 2, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F33', code: 'NETWORK_UPGRADE', node: 'NETWORK', action: 'UPGRADE',
    name: '네트워크 업그레이드', desc: '관계 품질 향상',
    examples: ['VIP 승격', '멘토 확보', '결혼', '파트너십 체결'],
    cost: 7, duration: '영구', rarity: 'Rare'
  },
  {
    id: 'F34', code: 'NETWORK_DOWNGRADE', node: 'NETWORK', action: 'DOWNGRADE',
    name: '네트워크 다운그레이드', desc: '관계 품질 하락',
    examples: ['신뢰 상실', '배신', '이혼', '계약 해지'],
    cost: 0, duration: '영구', rarity: 'Uncommon'
  },
  {
    id: 'F35', code: 'NETWORK_MERGE', node: 'NETWORK', action: 'MERGE',
    name: '네트워크 통합', desc: '관계 네트워크 결합',
    examples: ['커뮤니티 합병', '가족 결합', '팀 통합', '동맹 형성'],
    cost: 6, duration: '30-180일', rarity: 'Rare'
  },
  {
    id: 'F36', code: 'NETWORK_SPLIT', node: 'NETWORK', action: 'SPLIT',
    name: '네트워크 분리', desc: '관계 네트워크 분할',
    examples: ['그룹 탈퇴', '독립', '분가', '사업 분리'],
    cost: 3, duration: '7-30일', rarity: 'Uncommon'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KNOWLEDGE (지식) × 12 작용 = F37-F48
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'F37', code: 'KNOWLEDGE_INJECT', node: 'KNOWLEDGE', action: 'INJECT',
    name: '지식 주입', desc: '새로운 정보 습득',
    examples: ['강의 수강', '책 읽기', '멘토링', 'AI 검색'],
    cost: 2, duration: '1-30일', rarity: 'Common'
  },
  {
    id: 'F38', code: 'KNOWLEDGE_DRAIN', node: 'KNOWLEDGE', action: 'DRAIN',
    name: '지식 유출', desc: '정보 공유/이전',
    examples: ['강의', '저술', '컨설팅', '기술 이전'],
    cost: 3, duration: '즉시', rarity: 'Common'
  },
  {
    id: 'F39', code: 'KNOWLEDGE_AMPLIFY', node: 'KNOWLEDGE', action: 'AMPLIFY',
    name: '지식 증폭', desc: '지식 급격한 확장',
    examples: ['깨달음', '패러다임 전환', '융합 학습', '몰입 학습'],
    cost: 7, duration: '7-90일', rarity: 'Epic'
  },
  {
    id: 'F40', code: 'KNOWLEDGE_DECAY', node: 'KNOWLEDGE', action: 'DECAY',
    name: '지식 감쇠', desc: '지식 노후화/망각',
    examples: ['기억 감퇴', '기술 진부화', '정보 폐기', '트렌드 변화'],
    cost: 0, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F41', code: 'KNOWLEDGE_ACCELERATE', node: 'KNOWLEDGE', action: 'ACCELERATE',
    name: '지식 가속', desc: '학습 속도 증가',
    examples: ['속독', 'AI 튜터', '집중 부트캠프', '노트 시스템'],
    cost: 5, duration: '7-30일', rarity: 'Uncommon'
  },
  {
    id: 'F42', code: 'KNOWLEDGE_DECELERATE', node: 'KNOWLEDGE', action: 'DECELERATE',
    name: '지식 감속', desc: '학습 속도 감소',
    examples: ['학습 정체', '번아웃', '방해 요소', '정보 과부하'],
    cost: 0, duration: '7-30일', rarity: 'Common'
  },
  {
    id: 'F43', code: 'KNOWLEDGE_REDIRECT', node: 'KNOWLEDGE', action: 'REDIRECT',
    name: '지식 전환', desc: '학습 방향 변경',
    examples: ['전공 변경', '커리어 피벗', '새 기술 학습', '관점 전환'],
    cost: 6, duration: '30-180일', rarity: 'Rare'
  },
  {
    id: 'F44', code: 'KNOWLEDGE_LOCK', node: 'KNOWLEDGE', action: 'LOCK',
    name: '지식 고정', desc: '지식 보존/체계화',
    examples: ['문서화', '특허 등록', '자격증 취득', '아카이빙'],
    cost: 4, duration: '영구', rarity: 'Uncommon'
  },
  {
    id: 'F45', code: 'KNOWLEDGE_UPGRADE', node: 'KNOWLEDGE', action: 'UPGRADE',
    name: '지식 업그레이드', desc: '지식 품질 향상',
    examples: ['석박사', '전문가 인증', '실전 경험', '마스터리'],
    cost: 8, duration: '180-1095일', rarity: 'Epic'
  },
  {
    id: 'F46', code: 'KNOWLEDGE_DOWNGRADE', node: 'KNOWLEDGE', action: 'DOWNGRADE',
    name: '지식 다운그레이드', desc: '지식 품질 하락',
    examples: ['잘못된 학습', '가짜 정보', '편향', '과신'],
    cost: 0, duration: '지속', rarity: 'Uncommon'
  },
  {
    id: 'F47', code: 'KNOWLEDGE_MERGE', node: 'KNOWLEDGE', action: 'MERGE',
    name: '지식 통합', desc: '지식 융합/결합',
    examples: ['학제간 연구', '크로스 러닝', '시너지 창출', '통합 솔루션'],
    cost: 6, duration: '30-90일', rarity: 'Rare'
  },
  {
    id: 'F48', code: 'KNOWLEDGE_SPLIT', node: 'KNOWLEDGE', action: 'SPLIT',
    name: '지식 분리', desc: '지식 전문화/세분화',
    examples: ['전문 분야 특화', '모듈화', '분업', '니치 영역'],
    cost: 4, duration: '30-90일', rarity: 'Uncommon'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME (시간) × 12 작용 = F49-F60
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'F49', code: 'TIME_INJECT', node: 'TIME', action: 'INJECT',
    name: '시간 주입', desc: '가용 시간 확보',
    examples: ['휴가', '퇴사', '외주 위임', '자동화'],
    cost: 5, duration: '즉시', rarity: 'Uncommon'
  },
  {
    id: 'F50', code: 'TIME_DRAIN', node: 'TIME', action: 'DRAIN',
    name: '시간 유출', desc: '시간 소모/낭비',
    examples: ['야근', '회의 지옥', 'SNS 중독', '삽질'],
    cost: 0, duration: '즉시', rarity: 'Common'
  },
  {
    id: 'F51', code: 'TIME_AMPLIFY', node: 'TIME', action: 'AMPLIFY',
    name: '시간 증폭', desc: '시간 효율 극대화',
    examples: ['풀 자동화', '팀 빌딩', '시스템 구축', '레버리지'],
    cost: 9, duration: '30-365일', rarity: 'Legendary'
  },
  {
    id: 'F52', code: 'TIME_DECAY', node: 'TIME', action: 'DECAY',
    name: '시간 감쇠', desc: '시간 효율 저하',
    examples: ['병목 현상', '관료주의', '레거시 시스템', '비효율 프로세스'],
    cost: 0, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F53', code: 'TIME_ACCELERATE', node: 'TIME', action: 'ACCELERATE',
    name: '시간 가속', desc: '작업 속도 증가',
    examples: ['데드라인', '집중 모드', '툴 업그레이드', '숙련도 향상'],
    cost: 3, duration: '1-7일', rarity: 'Common'
  },
  {
    id: 'F54', code: 'TIME_DECELERATE', node: 'TIME', action: 'DECELERATE',
    name: '시간 감속', desc: '작업 속도 감소',
    examples: ['휴식', '숙고', '품질 중시', '디테일 작업'],
    cost: 2, duration: '1-7일', rarity: 'Common'
  },
  {
    id: 'F55', code: 'TIME_REDIRECT', node: 'TIME', action: 'REDIRECT',
    name: '시간 전환', desc: '시간 배분 변경',
    examples: ['우선순위 변경', '일정 재조정', '피벗', '리소스 재배치'],
    cost: 2, duration: '즉시', rarity: 'Common'
  },
  {
    id: 'F56', code: 'TIME_LOCK', node: 'TIME', action: 'LOCK',
    name: '시간 고정', desc: '시간 블록/예약',
    examples: ['캘린더 블록', '루틴', '약속', '계약 기간'],
    cost: 1, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F57', code: 'TIME_UPGRADE', node: 'TIME', action: 'UPGRADE',
    name: '시간 업그레이드', desc: '시간 품질 향상',
    examples: ['딥워크', '플로우 상태', '최적 시간대 활용', '환경 최적화'],
    cost: 4, duration: '7-30일', rarity: 'Uncommon'
  },
  {
    id: 'F58', code: 'TIME_DOWNGRADE', node: 'TIME', action: 'DOWNGRADE',
    name: '시간 다운그레이드', desc: '시간 품질 하락',
    examples: ['멀티태스킹', '인터럽트', '컨텍스트 스위칭', '분산'],
    cost: 0, duration: '즉시', rarity: 'Common'
  },
  {
    id: 'F59', code: 'TIME_MERGE', node: 'TIME', action: 'MERGE',
    name: '시간 통합', desc: '시간 블록 결합',
    examples: ['배칭', '일괄 처리', '통합 미팅', '집중 기간'],
    cost: 3, duration: '1-7일', rarity: 'Uncommon'
  },
  {
    id: 'F60', code: 'TIME_SPLIT', node: 'TIME', action: 'SPLIT',
    name: '시간 분리', desc: '시간 블록 분할',
    examples: ['포모도로', '파트타임', '분할 근무', '인터벌'],
    cost: 2, duration: '1-7일', rarity: 'Common'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMOTION (감정) × 12 작용 = F61-F72
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'F61', code: 'EMOTION_INJECT', node: 'EMOTION', action: 'INJECT',
    name: '감정 주입', desc: '긍정적 감정 유입',
    examples: ['칭찬', '성공 경험', '사랑 고백', '인정'],
    cost: 2, duration: '1-7일', rarity: 'Common'
  },
  {
    id: 'F62', code: 'EMOTION_DRAIN', node: 'EMOTION', action: 'DRAIN',
    name: '감정 유출', desc: '감정 에너지 소모',
    examples: ['스트레스', '갈등', '실패', '거절'],
    cost: 0, duration: '1-30일', rarity: 'Common'
  },
  {
    id: 'F63', code: 'EMOTION_AMPLIFY', node: 'EMOTION', action: 'AMPLIFY',
    name: '감정 증폭', desc: '동기/열정 극대화',
    examples: ['사명 발견', '대의 참여', '깊은 연결', '영감'],
    cost: 7, duration: '30-365일', rarity: 'Epic'
  },
  {
    id: 'F64', code: 'EMOTION_DECAY', node: 'EMOTION', action: 'DECAY',
    name: '감정 감쇠', desc: '동기/의지 저하',
    examples: ['번아웃', '우울', '무력감', '권태'],
    cost: 0, duration: '30일+', rarity: 'Common'
  },
  {
    id: 'F65', code: 'EMOTION_ACCELERATE', node: 'EMOTION', action: 'ACCELERATE',
    name: '감정 가속', desc: '감정 변화 촉진',
    examples: ['카타르시스', '돌파 경험', '위기 극복', '결단'],
    cost: 5, duration: '1-7일', rarity: 'Rare'
  },
  {
    id: 'F66', code: 'EMOTION_DECELERATE', node: 'EMOTION', action: 'DECELERATE',
    name: '감정 감속', desc: '감정 변화 억제',
    examples: ['명상', '약물', '억압', '회피'],
    cost: 2, duration: '지속', rarity: 'Common'
  },
  {
    id: 'F67', code: 'EMOTION_REDIRECT', node: 'EMOTION', action: 'REDIRECT',
    name: '감정 전환', desc: '감정 방향 변경',
    examples: ['승화', '재해석', '용서', '관점 전환'],
    cost: 6, duration: '7-90일', rarity: 'Rare'
  },
  {
    id: 'F68', code: 'EMOTION_LOCK', node: 'EMOTION', action: 'LOCK',
    name: '감정 고정', desc: '감정 상태 유지',
    examples: ['루틴', '환경 유지', '관계 유지', '약물 의존'],
    cost: 3, duration: '지속', rarity: 'Uncommon'
  },
  {
    id: 'F69', code: 'EMOTION_UPGRADE', node: 'EMOTION', action: 'UPGRADE',
    name: '감정 업그레이드', desc: '감정 지능 향상',
    examples: ['EQ 훈련', '심리 치료', '자아 성장', '영성 발달'],
    cost: 8, duration: '90-365일', rarity: 'Epic'
  },
  {
    id: 'F70', code: 'EMOTION_DOWNGRADE', node: 'EMOTION', action: 'DOWNGRADE',
    name: '감정 다운그레이드', desc: '감정 조절력 하락',
    examples: ['트라우마', '중독', '정신 질환', '관계 파탄'],
    cost: 0, duration: '영구', rarity: 'Rare'
  },
  {
    id: 'F71', code: 'EMOTION_MERGE', node: 'EMOTION', action: 'MERGE',
    name: '감정 통합', desc: '감정 연결/공유',
    examples: ['공감', '팀 빌딩', '집단 경험', '유대감 형성'],
    cost: 5, duration: '7-30일', rarity: 'Uncommon'
  },
  {
    id: 'F72', code: 'EMOTION_SPLIT', node: 'EMOTION', action: 'SPLIT',
    name: '감정 분리', desc: '감정 구분/독립',
    examples: ['감정 분리', '프로페셔널리즘', '경계 설정', '객관화'],
    cost: 4, duration: '7-30일', rarity: 'Uncommon'
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════

export function getForceById(id: string): ForceType | undefined {
  return ALL_72_FORCES.find(f => f.id === id);
}

export function getForcesByNode(node: string): ForceType[] {
  return ALL_72_FORCES.filter(f => f.node === node);
}

export function getForcesByAction(action: string): ForceType[] {
  return ALL_72_FORCES.filter(f => f.action === action);
}

export function getForcesByRarity(rarity: ForceType['rarity']): ForceType[] {
  return ALL_72_FORCES.filter(f => f.rarity === rarity);
}

// 희귀도별 색상
export const FORCE_RARITY_COLORS = {
  Common: { bg: '#374151', text: '#9ca3af', glow: 'none' },
  Uncommon: { bg: '#065f46', text: '#34d399', glow: '0 0 10px #34d399' },
  Rare: { bg: '#1e3a5f', text: '#60a5fa', glow: '0 0 15px #60a5fa' },
  Epic: { bg: '#4c1d95', text: '#a78bfa', glow: '0 0 20px #a78bfa' },
  Legendary: { bg: '#78350f', text: '#fbbf24', glow: '0 0 25px #fbbf24' },
};

// 물리 노드별 Force 요약
export const FORCE_SUMMARY = Object.keys(PHYSICS_NODES).map(nodeId => ({
  node: PHYSICS_NODES[nodeId as keyof typeof PHYSICS_NODES],
  forces: getForcesByNode(nodeId),
  startId: `F${(Object.keys(PHYSICS_NODES).indexOf(nodeId) * 12) + 1}`.padStart(3, '0'),
  endId: `F${(Object.keys(PHYSICS_NODES).indexOf(nodeId) + 1) * 12}`.padStart(3, '0'),
}));
