/**
 * AUTUS - 72 업무 타입 (Work Types)
 * ==================================
 * 
 * 구조: 6개 물리 노드 × 12개 업무 유형 = 72개 Work
 * 
 * 물리 노드: BIO, CAPITAL, NETWORK, KNOWLEDGE, TIME, EMOTION
 * 업무 유형: 12가지 (각 물리 노드에 영향을 미치는 업무)
 * 
 * Money Flow Cube: Node(72) × Motion(72) × Work(72) = 373,248 경우의 수
 */

// ═══════════════════════════════════════════════════════════════════════════
// 6개 업무 도메인 (물리 노드 기반)
// ═══════════════════════════════════════════════════════════════════════════

export const WORK_DOMAINS = {
  BIO: { id: 'BIO', name: '생체 업무', icon: '🧬', color: '#ef4444', desc: '신체/건강/체력에 영향을 미치는 일' },
  CAPITAL: { id: 'CAPITAL', name: '자본 업무', icon: '💰', color: '#f59e0b', desc: '금전/자산/재무에 영향을 미치는 일' },
  NETWORK: { id: 'NETWORK', name: '네트워크 업무', icon: '🔗', color: '#3b82f6', desc: '관계/연결/협업에 영향을 미치는 일' },
  KNOWLEDGE: { id: 'KNOWLEDGE', name: '지식 업무', icon: '📚', color: '#8b5cf6', desc: '정보/학습/기술에 영향을 미치는 일' },
  TIME: { id: 'TIME', name: '시간 업무', icon: '⏰', color: '#10b981', desc: '효율/운영/관리에 영향을 미치는 일' },
  EMOTION: { id: 'EMOTION', name: '감정 업무', icon: '💜', color: '#ec4899', desc: '동기/문화/관계에 영향을 미치는 일' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 12개 업무 유형 (공통 패턴)
// ═══════════════════════════════════════════════════════════════════════════

export const WORK_PATTERNS = {
  // 생산 계열 (Create)
  CREATE: { id: 'CREATE', name: '생성', desc: '새로운 것을 만드는 업무' },
  BUILD: { id: 'BUILD', name: '구축', desc: '시스템/구조를 세우는 업무' },
  DEVELOP: { id: 'DEVELOP', name: '개발', desc: '기존 것을 발전시키는 업무' },
  
  // 운영 계열 (Operate)
  MAINTAIN: { id: 'MAINTAIN', name: '유지', desc: '현상을 유지하는 업무' },
  OPTIMIZE: { id: 'OPTIMIZE', name: '최적화', desc: '효율을 높이는 업무' },
  MONITOR: { id: 'MONITOR', name: '모니터링', desc: '상태를 관찰하는 업무' },
  
  // 확장 계열 (Expand)
  ACQUIRE: { id: 'ACQUIRE', name: '획득', desc: '새로운 것을 얻는 업무' },
  CONNECT: { id: 'CONNECT', name: '연결', desc: '관계를 맺는 업무' },
  DISTRIBUTE: { id: 'DISTRIBUTE', name: '배분', desc: '자원을 나누는 업무' },
  
  // 보호 계열 (Protect)
  PROTECT: { id: 'PROTECT', name: '보호', desc: '위험으로부터 지키는 업무' },
  RECOVER: { id: 'RECOVER', name: '복구', desc: '손상을 회복하는 업무' },
  TRANSFORM: { id: 'TRANSFORM', name: '전환', desc: '형태를 바꾸는 업무' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 72개 업무 타입 전체 정의
// ═══════════════════════════════════════════════════════════════════════════

export interface WorkType {
  id: string;           // W01-W72
  code: string;         // BIO_CREATE
  domain: string;       // BIO
  pattern: string;      // CREATE
  name: string;         // 건강 생성
  desc: string;         // 구체적 설명
  examples: string[];   // 실제 예시
  inputNodes: string[]; // 필요한 물리 노드
  outputNode: string;   // 영향받는 물리 노드
  difficulty: 1 | 2 | 3 | 4 | 5;  // 난이도
  timeRequired: string; // 소요 시간
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'once';
}

export const ALL_72_WORKS: WorkType[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // BIO (생체) × 12 업무 = W01-W12
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'W01', code: 'BIO_CREATE', domain: 'BIO', pattern: 'CREATE',
    name: '건강 습관 형성', desc: '새로운 건강 습관을 만드는 업무',
    examples: ['운동 루틴 시작', '식단 계획 수립', '수면 패턴 설정', '명상 습관화'],
    inputNodes: ['TIME', 'KNOWLEDGE'], outputNode: 'BIO',
    difficulty: 3, timeRequired: '30-90일', frequency: 'daily'
  },
  {
    id: 'W02', code: 'BIO_BUILD', domain: 'BIO', pattern: 'BUILD',
    name: '체력 구축', desc: '신체 능력을 체계적으로 키우는 업무',
    examples: ['근력 운동 프로그램', '지구력 훈련', '유연성 향상', '스포츠 기술 습득'],
    inputNodes: ['TIME', 'EMOTION'], outputNode: 'BIO',
    difficulty: 4, timeRequired: '3-12개월', frequency: 'daily'
  },
  {
    id: 'W03', code: 'BIO_DEVELOP', domain: 'BIO', pattern: 'DEVELOP',
    name: '건강 개선', desc: '기존 건강 상태를 발전시키는 업무',
    examples: ['체중 관리', '혈압 개선', '면역력 강화', '체성분 최적화'],
    inputNodes: ['KNOWLEDGE', 'CAPITAL'], outputNode: 'BIO',
    difficulty: 3, timeRequired: '1-6개월', frequency: 'weekly'
  },
  {
    id: 'W04', code: 'BIO_MAINTAIN', domain: 'BIO', pattern: 'MAINTAIN',
    name: '건강 유지', desc: '현재 건강 상태를 유지하는 업무',
    examples: ['정기 검진', '예방 접종', '루틴 운동', '균형 식단'],
    inputNodes: ['TIME'], outputNode: 'BIO',
    difficulty: 2, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W05', code: 'BIO_OPTIMIZE', domain: 'BIO', pattern: 'OPTIMIZE',
    name: '신체 최적화', desc: '신체 효율을 극대화하는 업무',
    examples: ['수면 최적화', '영양 보충', '회복 루틴', '바이오해킹'],
    inputNodes: ['KNOWLEDGE', 'CAPITAL'], outputNode: 'BIO',
    difficulty: 4, timeRequired: '1-3개월', frequency: 'weekly'
  },
  {
    id: 'W06', code: 'BIO_MONITOR', domain: 'BIO', pattern: 'MONITOR',
    name: '건강 모니터링', desc: '신체 상태를 관찰하는 업무',
    examples: ['건강 데이터 추적', '증상 기록', '체중 측정', '활동량 체크'],
    inputNodes: ['TIME'], outputNode: 'BIO',
    difficulty: 1, timeRequired: '5-10분', frequency: 'daily'
  },
  {
    id: 'W07', code: 'BIO_ACQUIRE', domain: 'BIO', pattern: 'ACQUIRE',
    name: '건강 자원 획득', desc: '건강에 필요한 자원을 얻는 업무',
    examples: ['건강식품 구매', '운동 장비 구입', '건강 보험 가입', '의료 서비스 확보'],
    inputNodes: ['CAPITAL', 'NETWORK'], outputNode: 'BIO',
    difficulty: 2, timeRequired: '1-7일', frequency: 'monthly'
  },
  {
    id: 'W08', code: 'BIO_CONNECT', domain: 'BIO', pattern: 'CONNECT',
    name: '건강 네트워크 연결', desc: '건강 관련 사람/자원과 연결하는 업무',
    examples: ['의사 상담', '트레이너 연결', '건강 커뮤니티 가입', '운동 파트너 찾기'],
    inputNodes: ['NETWORK'], outputNode: 'BIO',
    difficulty: 2, timeRequired: '1-14일', frequency: 'monthly'
  },
  {
    id: 'W09', code: 'BIO_DISTRIBUTE', domain: 'BIO', pattern: 'DISTRIBUTE',
    name: '건강 에너지 배분', desc: '신체 에너지를 적절히 분배하는 업무',
    examples: ['휴식 스케줄링', '체력 안배', '에너지 관리', '활동 밸런싱'],
    inputNodes: ['TIME', 'KNOWLEDGE'], outputNode: 'BIO',
    difficulty: 3, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W10', code: 'BIO_PROTECT', domain: 'BIO', pattern: 'PROTECT',
    name: '건강 보호', desc: '건강을 위협으로부터 지키는 업무',
    examples: ['질병 예방', '부상 방지', '스트레스 관리', '유해 환경 회피'],
    inputNodes: ['KNOWLEDGE', 'CAPITAL'], outputNode: 'BIO',
    difficulty: 2, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W11', code: 'BIO_RECOVER', domain: 'BIO', pattern: 'RECOVER',
    name: '건강 회복', desc: '손상된 건강을 복구하는 업무',
    examples: ['병 치료', '부상 재활', '번아웃 회복', '중독 극복'],
    inputNodes: ['TIME', 'CAPITAL', 'NETWORK'], outputNode: 'BIO',
    difficulty: 4, timeRequired: '1주-1년', frequency: 'daily'
  },
  {
    id: 'W12', code: 'BIO_TRANSFORM', domain: 'BIO', pattern: 'TRANSFORM',
    name: '신체 변환', desc: '신체 상태를 근본적으로 바꾸는 업무',
    examples: ['체형 변화', '생활 패턴 전환', '수술/시술', '장기 요법'],
    inputNodes: ['CAPITAL', 'TIME', 'EMOTION'], outputNode: 'BIO',
    difficulty: 5, timeRequired: '3개월-2년', frequency: 'once'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPITAL (자본) × 12 업무 = W13-W24
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'W13', code: 'CAPITAL_CREATE', domain: 'CAPITAL', pattern: 'CREATE',
    name: '수익 창출', desc: '새로운 수입원을 만드는 업무',
    examples: ['사업 시작', '부업 개시', '투자 수익 실현', '자산 수익화'],
    inputNodes: ['KNOWLEDGE', 'TIME', 'NETWORK'], outputNode: 'CAPITAL',
    difficulty: 4, timeRequired: '1-12개월', frequency: 'monthly'
  },
  {
    id: 'W14', code: 'CAPITAL_BUILD', domain: 'CAPITAL', pattern: 'BUILD',
    name: '자산 구축', desc: '자산 포트폴리오를 구축하는 업무',
    examples: ['저축 시스템 구축', '투자 포트폴리오', '부동산 취득', '사업 자산화'],
    inputNodes: ['KNOWLEDGE', 'CAPITAL'], outputNode: 'CAPITAL',
    difficulty: 4, timeRequired: '1-10년', frequency: 'monthly'
  },
  {
    id: 'W15', code: 'CAPITAL_DEVELOP', domain: 'CAPITAL', pattern: 'DEVELOP',
    name: '자산 성장', desc: '기존 자산을 증식시키는 업무',
    examples: ['투자 수익률 향상', '사업 확장', '급여 인상 협상', '자산 가치 상승'],
    inputNodes: ['KNOWLEDGE', 'TIME'], outputNode: 'CAPITAL',
    difficulty: 3, timeRequired: '지속', frequency: 'quarterly'
  },
  {
    id: 'W16', code: 'CAPITAL_MAINTAIN', domain: 'CAPITAL', pattern: 'MAINTAIN',
    name: '자산 유지', desc: '현재 자산을 유지하는 업무',
    examples: ['예산 관리', '지출 통제', '자산 보전', '현금 흐름 유지'],
    inputNodes: ['TIME'], outputNode: 'CAPITAL',
    difficulty: 2, timeRequired: '지속', frequency: 'weekly'
  },
  {
    id: 'W17', code: 'CAPITAL_OPTIMIZE', domain: 'CAPITAL', pattern: 'OPTIMIZE',
    name: '재무 최적화', desc: '재무 효율을 극대화하는 업무',
    examples: ['세금 최적화', '비용 절감', '수익률 개선', '현금 흐름 최적화'],
    inputNodes: ['KNOWLEDGE', 'TIME'], outputNode: 'CAPITAL',
    difficulty: 4, timeRequired: '1-3개월', frequency: 'quarterly'
  },
  {
    id: 'W18', code: 'CAPITAL_MONITOR', domain: 'CAPITAL', pattern: 'MONITOR',
    name: '재무 모니터링', desc: '재무 상태를 관찰하는 업무',
    examples: ['가계부 작성', '투자 추적', '자산 현황 파악', '지출 분석'],
    inputNodes: ['TIME'], outputNode: 'CAPITAL',
    difficulty: 1, timeRequired: '10-30분', frequency: 'weekly'
  },
  {
    id: 'W19', code: 'CAPITAL_ACQUIRE', domain: 'CAPITAL', pattern: 'ACQUIRE',
    name: '자금 조달', desc: '필요한 자금을 확보하는 업무',
    examples: ['대출', '투자 유치', '보조금 신청', '크라우드펀딩'],
    inputNodes: ['NETWORK', 'KNOWLEDGE'], outputNode: 'CAPITAL',
    difficulty: 4, timeRequired: '1주-6개월', frequency: 'yearly'
  },
  {
    id: 'W20', code: 'CAPITAL_CONNECT', domain: 'CAPITAL', pattern: 'CONNECT',
    name: '금융 네트워크 연결', desc: '금융 관련 사람/기관과 연결하는 업무',
    examples: ['은행 상담', '투자자 미팅', '회계사 연결', '금융 파트너십'],
    inputNodes: ['NETWORK'], outputNode: 'CAPITAL',
    difficulty: 3, timeRequired: '1-30일', frequency: 'quarterly'
  },
  {
    id: 'W21', code: 'CAPITAL_DISTRIBUTE', domain: 'CAPITAL', pattern: 'DISTRIBUTE',
    name: '자금 배분', desc: '자금을 적절히 분배하는 업무',
    examples: ['예산 할당', '투자 분산', '급여 지급', '배당금 분배'],
    inputNodes: ['KNOWLEDGE'], outputNode: 'CAPITAL',
    difficulty: 3, timeRequired: '1-7일', frequency: 'monthly'
  },
  {
    id: 'W22', code: 'CAPITAL_PROTECT', domain: 'CAPITAL', pattern: 'PROTECT',
    name: '자산 보호', desc: '자산을 위험으로부터 지키는 업무',
    examples: ['보험 가입', '리스크 헤징', '자산 보전', '법적 보호'],
    inputNodes: ['KNOWLEDGE', 'CAPITAL'], outputNode: 'CAPITAL',
    difficulty: 3, timeRequired: '1-30일', frequency: 'yearly'
  },
  {
    id: 'W23', code: 'CAPITAL_RECOVER', domain: 'CAPITAL', pattern: 'RECOVER',
    name: '재무 회복', desc: '손실된 자산을 복구하는 업무',
    examples: ['빚 상환', '손실 회복', '신용 회복', '파산 극복'],
    inputNodes: ['TIME', 'EMOTION'], outputNode: 'CAPITAL',
    difficulty: 5, timeRequired: '1-10년', frequency: 'monthly'
  },
  {
    id: 'W24', code: 'CAPITAL_TRANSFORM', domain: 'CAPITAL', pattern: 'TRANSFORM',
    name: '자산 전환', desc: '자산 형태를 근본적으로 바꾸는 업무',
    examples: ['현금화', '사업 매각', '투자 청산', '자산 재배치'],
    inputNodes: ['KNOWLEDGE', 'NETWORK'], outputNode: 'CAPITAL',
    difficulty: 4, timeRequired: '1주-1년', frequency: 'yearly'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK (네트워크) × 12 업무 = W25-W36
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'W25', code: 'NETWORK_CREATE', domain: 'NETWORK', pattern: 'CREATE',
    name: '관계 형성', desc: '새로운 관계를 만드는 업무',
    examples: ['네트워킹', '소개 받기', '커뮤니티 가입', '파트너십 제안'],
    inputNodes: ['TIME', 'EMOTION'], outputNode: 'NETWORK',
    difficulty: 2, timeRequired: '1일-1개월', frequency: 'weekly'
  },
  {
    id: 'W26', code: 'NETWORK_BUILD', domain: 'NETWORK', pattern: 'BUILD',
    name: '인맥 구축', desc: '체계적인 인맥 네트워크를 구축하는 업무',
    examples: ['업계 네트워크', '동문 네트워크', '전문가 그룹', '커뮤니티 빌딩'],
    inputNodes: ['TIME', 'KNOWLEDGE'], outputNode: 'NETWORK',
    difficulty: 4, timeRequired: '1-5년', frequency: 'monthly'
  },
  {
    id: 'W27', code: 'NETWORK_DEVELOP', domain: 'NETWORK', pattern: 'DEVELOP',
    name: '관계 발전', desc: '기존 관계를 발전시키는 업무',
    examples: ['관계 심화', '신뢰 구축', '협력 강화', '멘토링'],
    inputNodes: ['TIME', 'EMOTION'], outputNode: 'NETWORK',
    difficulty: 3, timeRequired: '지속', frequency: 'weekly'
  },
  {
    id: 'W28', code: 'NETWORK_MAINTAIN', domain: 'NETWORK', pattern: 'MAINTAIN',
    name: '관계 유지', desc: '현재 관계를 유지하는 업무',
    examples: ['정기 연락', '안부 인사', '모임 참석', '기념일 챙기기'],
    inputNodes: ['TIME'], outputNode: 'NETWORK',
    difficulty: 2, timeRequired: '지속', frequency: 'weekly'
  },
  {
    id: 'W29', code: 'NETWORK_OPTIMIZE', domain: 'NETWORK', pattern: 'OPTIMIZE',
    name: '네트워크 최적화', desc: '네트워크 효율을 극대화하는 업무',
    examples: ['핵심 관계 집중', '인맥 정리', '네트워크 구조화', 'CRM 활용'],
    inputNodes: ['KNOWLEDGE', 'TIME'], outputNode: 'NETWORK',
    difficulty: 3, timeRequired: '1-3개월', frequency: 'quarterly'
  },
  {
    id: 'W30', code: 'NETWORK_MONITOR', domain: 'NETWORK', pattern: 'MONITOR',
    name: '관계 모니터링', desc: '관계 상태를 관찰하는 업무',
    examples: ['관계 건강도 체크', '피드백 수집', '만족도 파악', '이슈 감지'],
    inputNodes: ['TIME'], outputNode: 'NETWORK',
    difficulty: 2, timeRequired: '10-30분', frequency: 'weekly'
  },
  {
    id: 'W31', code: 'NETWORK_ACQUIRE', domain: 'NETWORK', pattern: 'ACQUIRE',
    name: '핵심 인맥 확보', desc: '중요한 인맥을 확보하는 업무',
    examples: ['키맨 연결', 'VIP 확보', '전문가 섭외', '인플루언서 연결'],
    inputNodes: ['NETWORK', 'CAPITAL'], outputNode: 'NETWORK',
    difficulty: 4, timeRequired: '1주-6개월', frequency: 'quarterly'
  },
  {
    id: 'W32', code: 'NETWORK_CONNECT', domain: 'NETWORK', pattern: 'CONNECT',
    name: '네트워크 연결', desc: '서로 다른 네트워크를 연결하는 업무',
    examples: ['소개팅', '비즈니스 매칭', '커뮤니티 연결', '협업 주선'],
    inputNodes: ['NETWORK'], outputNode: 'NETWORK',
    difficulty: 3, timeRequired: '1-14일', frequency: 'monthly'
  },
  {
    id: 'W33', code: 'NETWORK_DISTRIBUTE', domain: 'NETWORK', pattern: 'DISTRIBUTE',
    name: '관계 자원 배분', desc: '관계 에너지를 적절히 분배하는 업무',
    examples: ['시간 배분', '관심 배분', '우선순위 설정', '에너지 관리'],
    inputNodes: ['TIME', 'EMOTION'], outputNode: 'NETWORK',
    difficulty: 3, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W34', code: 'NETWORK_PROTECT', domain: 'NETWORK', pattern: 'PROTECT',
    name: '관계 보호', desc: '관계를 위협으로부터 지키는 업무',
    examples: ['갈등 예방', '오해 해소', '경계 설정', '관계 방어'],
    inputNodes: ['EMOTION', 'KNOWLEDGE'], outputNode: 'NETWORK',
    difficulty: 3, timeRequired: '1일-1개월', frequency: 'monthly'
  },
  {
    id: 'W35', code: 'NETWORK_RECOVER', domain: 'NETWORK', pattern: 'RECOVER',
    name: '관계 회복', desc: '손상된 관계를 복구하는 업무',
    examples: ['화해', '신뢰 회복', '재연결', '관계 리빌딩'],
    inputNodes: ['EMOTION', 'TIME'], outputNode: 'NETWORK',
    difficulty: 4, timeRequired: '1주-1년', frequency: 'monthly'
  },
  {
    id: 'W36', code: 'NETWORK_TRANSFORM', domain: 'NETWORK', pattern: 'TRANSFORM',
    name: '관계 전환', desc: '관계 성격을 근본적으로 바꾸는 업무',
    examples: ['친구→파트너', '경쟁→협력', '상하→수평', '개인→조직'],
    inputNodes: ['EMOTION', 'KNOWLEDGE'], outputNode: 'NETWORK',
    difficulty: 4, timeRequired: '1-12개월', frequency: 'yearly'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KNOWLEDGE (지식) × 12 업무 = W37-W48
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'W37', code: 'KNOWLEDGE_CREATE', domain: 'KNOWLEDGE', pattern: 'CREATE',
    name: '지식 창출', desc: '새로운 지식을 만드는 업무',
    examples: ['연구', '실험', '논문 작성', '인사이트 도출'],
    inputNodes: ['TIME', 'KNOWLEDGE'], outputNode: 'KNOWLEDGE',
    difficulty: 5, timeRequired: '1개월-수년', frequency: 'monthly'
  },
  {
    id: 'W38', code: 'KNOWLEDGE_BUILD', domain: 'KNOWLEDGE', pattern: 'BUILD',
    name: '지식 체계 구축', desc: '체계적인 지식 구조를 구축하는 업무',
    examples: ['커리큘럼 설계', '지식 베이스', '전문성 트리', '학습 경로'],
    inputNodes: ['TIME', 'KNOWLEDGE'], outputNode: 'KNOWLEDGE',
    difficulty: 4, timeRequired: '3-12개월', frequency: 'quarterly'
  },
  {
    id: 'W39', code: 'KNOWLEDGE_DEVELOP', domain: 'KNOWLEDGE', pattern: 'DEVELOP',
    name: '역량 개발', desc: '기존 역량을 발전시키는 업무',
    examples: ['스킬업', '심화 학습', '실전 경험', '전문화'],
    inputNodes: ['TIME', 'EMOTION'], outputNode: 'KNOWLEDGE',
    difficulty: 3, timeRequired: '지속', frequency: 'weekly'
  },
  {
    id: 'W40', code: 'KNOWLEDGE_MAINTAIN', domain: 'KNOWLEDGE', pattern: 'MAINTAIN',
    name: '지식 유지', desc: '현재 지식을 유지하는 업무',
    examples: ['복습', '실습', '최신 정보 업데이트', '기술 유지'],
    inputNodes: ['TIME'], outputNode: 'KNOWLEDGE',
    difficulty: 2, timeRequired: '지속', frequency: 'weekly'
  },
  {
    id: 'W41', code: 'KNOWLEDGE_OPTIMIZE', domain: 'KNOWLEDGE', pattern: 'OPTIMIZE',
    name: '학습 최적화', desc: '학습 효율을 극대화하는 업무',
    examples: ['학습법 개선', '노트 시스템', '기억 기법', 'AI 활용'],
    inputNodes: ['KNOWLEDGE', 'TIME'], outputNode: 'KNOWLEDGE',
    difficulty: 3, timeRequired: '1-3개월', frequency: 'monthly'
  },
  {
    id: 'W42', code: 'KNOWLEDGE_MONITOR', domain: 'KNOWLEDGE', pattern: 'MONITOR',
    name: '역량 모니터링', desc: '역량 상태를 관찰하는 업무',
    examples: ['스킬 평가', '지식 테스트', '피드백 수집', '격차 분석'],
    inputNodes: ['TIME'], outputNode: 'KNOWLEDGE',
    difficulty: 2, timeRequired: '30분-2시간', frequency: 'monthly'
  },
  {
    id: 'W43', code: 'KNOWLEDGE_ACQUIRE', domain: 'KNOWLEDGE', pattern: 'ACQUIRE',
    name: '지식 획득', desc: '필요한 지식을 얻는 업무',
    examples: ['강의 수강', '책 읽기', '멘토링', '자격증 취득'],
    inputNodes: ['TIME', 'CAPITAL'], outputNode: 'KNOWLEDGE',
    difficulty: 3, timeRequired: '1일-1년', frequency: 'weekly'
  },
  {
    id: 'W44', code: 'KNOWLEDGE_CONNECT', domain: 'KNOWLEDGE', pattern: 'CONNECT',
    name: '지식 네트워크 연결', desc: '지식 관련 사람/자원과 연결하는 업무',
    examples: ['전문가 상담', '학습 커뮤니티', '연구 협력', '지식 공유'],
    inputNodes: ['NETWORK'], outputNode: 'KNOWLEDGE',
    difficulty: 2, timeRequired: '1-30일', frequency: 'monthly'
  },
  {
    id: 'W45', code: 'KNOWLEDGE_DISTRIBUTE', domain: 'KNOWLEDGE', pattern: 'DISTRIBUTE',
    name: '지식 배분', desc: '지식을 적절히 분배하는 업무',
    examples: ['강의', '저술', '멘토링', '지식 이전'],
    inputNodes: ['TIME', 'KNOWLEDGE'], outputNode: 'KNOWLEDGE',
    difficulty: 3, timeRequired: '1시간-6개월', frequency: 'weekly'
  },
  {
    id: 'W46', code: 'KNOWLEDGE_PROTECT', domain: 'KNOWLEDGE', pattern: 'PROTECT',
    name: '지식 보호', desc: '지식을 위협으로부터 지키는 업무',
    examples: ['특허 등록', '저작권 보호', '비밀 유지', '백업'],
    inputNodes: ['CAPITAL', 'KNOWLEDGE'], outputNode: 'KNOWLEDGE',
    difficulty: 3, timeRequired: '1주-6개월', frequency: 'yearly'
  },
  {
    id: 'W47', code: 'KNOWLEDGE_RECOVER', domain: 'KNOWLEDGE', pattern: 'RECOVER',
    name: '지식 복구', desc: '손실된 지식을 복구하는 업무',
    examples: ['재학습', '기억 회복', '스킬 리마인드', '역량 재건'],
    inputNodes: ['TIME', 'EMOTION'], outputNode: 'KNOWLEDGE',
    difficulty: 3, timeRequired: '1주-6개월', frequency: 'monthly'
  },
  {
    id: 'W48', code: 'KNOWLEDGE_TRANSFORM', domain: 'KNOWLEDGE', pattern: 'TRANSFORM',
    name: '역량 전환', desc: '역량을 근본적으로 바꾸는 업무',
    examples: ['커리어 피벗', '전공 변경', '기술 전환', '패러다임 전환'],
    inputNodes: ['TIME', 'EMOTION', 'CAPITAL'], outputNode: 'KNOWLEDGE',
    difficulty: 5, timeRequired: '6개월-3년', frequency: 'yearly'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME (시간) × 12 업무 = W49-W60
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'W49', code: 'TIME_CREATE', domain: 'TIME', pattern: 'CREATE',
    name: '시간 창출', desc: '가용 시간을 만드는 업무',
    examples: ['자동화', '위임', '아웃소싱', '효율화로 시간 확보'],
    inputNodes: ['CAPITAL', 'KNOWLEDGE'], outputNode: 'TIME',
    difficulty: 4, timeRequired: '1주-3개월', frequency: 'monthly'
  },
  {
    id: 'W50', code: 'TIME_BUILD', domain: 'TIME', pattern: 'BUILD',
    name: '시간 시스템 구축', desc: '체계적인 시간 관리 시스템을 구축하는 업무',
    examples: ['루틴 설계', '프로세스 구축', '시스템화', '자동화 파이프라인'],
    inputNodes: ['KNOWLEDGE', 'TIME'], outputNode: 'TIME',
    difficulty: 4, timeRequired: '1-6개월', frequency: 'quarterly'
  },
  {
    id: 'W51', code: 'TIME_DEVELOP', domain: 'TIME', pattern: 'DEVELOP',
    name: '시간 효율 개선', desc: '시간 사용 효율을 발전시키는 업무',
    examples: ['생산성 향상', '프로세스 개선', '병목 제거', '속도 향상'],
    inputNodes: ['KNOWLEDGE'], outputNode: 'TIME',
    difficulty: 3, timeRequired: '지속', frequency: 'weekly'
  },
  {
    id: 'W52', code: 'TIME_MAINTAIN', domain: 'TIME', pattern: 'MAINTAIN',
    name: '시간 관리 유지', desc: '현재 시간 관리를 유지하는 업무',
    examples: ['일정 준수', '루틴 유지', '타임블록 지키기', '데드라인 관리'],
    inputNodes: ['EMOTION'], outputNode: 'TIME',
    difficulty: 2, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W53', code: 'TIME_OPTIMIZE', domain: 'TIME', pattern: 'OPTIMIZE',
    name: '시간 최적화', desc: '시간 효율을 극대화하는 업무',
    examples: ['배칭', '딥워크', '에너지 매핑', '최적 시간대 활용'],
    inputNodes: ['KNOWLEDGE', 'BIO'], outputNode: 'TIME',
    difficulty: 4, timeRequired: '1-3개월', frequency: 'monthly'
  },
  {
    id: 'W54', code: 'TIME_MONITOR', domain: 'TIME', pattern: 'MONITOR',
    name: '시간 모니터링', desc: '시간 사용을 관찰하는 업무',
    examples: ['시간 추적', '활동 기록', '생산성 측정', '시간 감사'],
    inputNodes: ['TIME'], outputNode: 'TIME',
    difficulty: 1, timeRequired: '5-15분', frequency: 'daily'
  },
  {
    id: 'W55', code: 'TIME_ACQUIRE', domain: 'TIME', pattern: 'ACQUIRE',
    name: '시간 자원 확보', desc: '시간 관련 자원을 확보하는 업무',
    examples: ['도구 도입', '팀 확충', '외부 지원', '시스템 구매'],
    inputNodes: ['CAPITAL'], outputNode: 'TIME',
    difficulty: 3, timeRequired: '1-30일', frequency: 'quarterly'
  },
  {
    id: 'W56', code: 'TIME_CONNECT', domain: 'TIME', pattern: 'CONNECT',
    name: '시간 네트워크 연결', desc: '시간 관련 사람/자원과 연결하는 업무',
    examples: ['어시스턴트 고용', '전문가 위임', '파트너 연결', '협업 체계'],
    inputNodes: ['NETWORK', 'CAPITAL'], outputNode: 'TIME',
    difficulty: 3, timeRequired: '1-30일', frequency: 'quarterly'
  },
  {
    id: 'W57', code: 'TIME_DISTRIBUTE', domain: 'TIME', pattern: 'DISTRIBUTE',
    name: '시간 배분', desc: '시간을 적절히 분배하는 업무',
    examples: ['우선순위 설정', '일정 계획', '리소스 배분', '균형 맞추기'],
    inputNodes: ['KNOWLEDGE'], outputNode: 'TIME',
    difficulty: 3, timeRequired: '30분-2시간', frequency: 'weekly'
  },
  {
    id: 'W58', code: 'TIME_PROTECT', domain: 'TIME', pattern: 'PROTECT',
    name: '시간 보호', desc: '시간을 낭비로부터 지키는 업무',
    examples: ['방해 차단', '경계 설정', '노 라고 하기', '미팅 최소화'],
    inputNodes: ['EMOTION', 'KNOWLEDGE'], outputNode: 'TIME',
    difficulty: 3, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W59', code: 'TIME_RECOVER', domain: 'TIME', pattern: 'RECOVER',
    name: '시간 회복', desc: '낭비된 시간을 복구하는 업무',
    examples: ['지연 만회', '백로그 처리', '밀린 일 정리', '리셋'],
    inputNodes: ['BIO', 'EMOTION'], outputNode: 'TIME',
    difficulty: 3, timeRequired: '1일-1주', frequency: 'weekly'
  },
  {
    id: 'W60', code: 'TIME_TRANSFORM', domain: 'TIME', pattern: 'TRANSFORM',
    name: '시간 구조 전환', desc: '시간 사용 패턴을 근본적으로 바꾸는 업무',
    examples: ['라이프스타일 변경', '근무 형태 전환', '삶의 재설계', '시스템 교체'],
    inputNodes: ['EMOTION', 'KNOWLEDGE', 'CAPITAL'], outputNode: 'TIME',
    difficulty: 5, timeRequired: '1-6개월', frequency: 'yearly'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMOTION (감정) × 12 업무 = W61-W72
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'W61', code: 'EMOTION_CREATE', domain: 'EMOTION', pattern: 'CREATE',
    name: '동기 생성', desc: '새로운 동기/의지를 만드는 업무',
    examples: ['목표 설정', '비전 수립', '영감 얻기', '의미 발견'],
    inputNodes: ['KNOWLEDGE', 'NETWORK'], outputNode: 'EMOTION',
    difficulty: 3, timeRequired: '1일-1개월', frequency: 'monthly'
  },
  {
    id: 'W62', code: 'EMOTION_BUILD', domain: 'EMOTION', pattern: 'BUILD',
    name: '마인드셋 구축', desc: '체계적인 정신적 기반을 구축하는 업무',
    examples: ['습관 형성', '가치관 정립', '신념 체계', '정체성 구축'],
    inputNodes: ['KNOWLEDGE', 'TIME'], outputNode: 'EMOTION',
    difficulty: 4, timeRequired: '3-12개월', frequency: 'monthly'
  },
  {
    id: 'W63', code: 'EMOTION_DEVELOP', domain: 'EMOTION', pattern: 'DEVELOP',
    name: '정서 발전', desc: '정서적 역량을 발전시키는 업무',
    examples: ['EQ 향상', '공감력 개발', '감정 조절', '정신력 강화'],
    inputNodes: ['TIME', 'NETWORK'], outputNode: 'EMOTION',
    difficulty: 4, timeRequired: '지속', frequency: 'weekly'
  },
  {
    id: 'W64', code: 'EMOTION_MAINTAIN', domain: 'EMOTION', pattern: 'MAINTAIN',
    name: '정서 유지', desc: '현재 정서 상태를 유지하는 업무',
    examples: ['루틴 유지', '긍정 유지', '균형 유지', '안정 유지'],
    inputNodes: ['BIO', 'NETWORK'], outputNode: 'EMOTION',
    difficulty: 2, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W65', code: 'EMOTION_OPTIMIZE', domain: 'EMOTION', pattern: 'OPTIMIZE',
    name: '정서 최적화', desc: '정서적 효율을 극대화하는 업무',
    examples: ['에너지 관리', '플로우 상태', '최적 각성', '피크 퍼포먼스'],
    inputNodes: ['KNOWLEDGE', 'BIO'], outputNode: 'EMOTION',
    difficulty: 4, timeRequired: '1-3개월', frequency: 'weekly'
  },
  {
    id: 'W66', code: 'EMOTION_MONITOR', domain: 'EMOTION', pattern: 'MONITOR',
    name: '정서 모니터링', desc: '정서 상태를 관찰하는 업무',
    examples: ['감정 일기', '무드 트래킹', '스트레스 체크', '자기 관찰'],
    inputNodes: ['TIME'], outputNode: 'EMOTION',
    difficulty: 2, timeRequired: '5-15분', frequency: 'daily'
  },
  {
    id: 'W67', code: 'EMOTION_ACQUIRE', domain: 'EMOTION', pattern: 'ACQUIRE',
    name: '정서 자원 확보', desc: '정서적 자원을 확보하는 업무',
    examples: ['지지 체계 확보', '코칭 받기', '테라피', '영감 원천 확보'],
    inputNodes: ['NETWORK', 'CAPITAL'], outputNode: 'EMOTION',
    difficulty: 3, timeRequired: '1주-3개월', frequency: 'quarterly'
  },
  {
    id: 'W68', code: 'EMOTION_CONNECT', domain: 'EMOTION', pattern: 'CONNECT',
    name: '정서적 연결', desc: '정서적으로 연결하는 업무',
    examples: ['친밀감 형성', '공감 연결', '유대감 구축', '정서 교류'],
    inputNodes: ['NETWORK', 'TIME'], outputNode: 'EMOTION',
    difficulty: 3, timeRequired: '지속', frequency: 'weekly'
  },
  {
    id: 'W69', code: 'EMOTION_DISTRIBUTE', domain: 'EMOTION', pattern: 'DISTRIBUTE',
    name: '감정 배분', desc: '감정 에너지를 적절히 분배하는 업무',
    examples: ['에너지 배분', '관심 분배', '감정 노동 관리', '균형 맞추기'],
    inputNodes: ['KNOWLEDGE', 'TIME'], outputNode: 'EMOTION',
    difficulty: 3, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W70', code: 'EMOTION_PROTECT', domain: 'EMOTION', pattern: 'PROTECT',
    name: '정서 보호', desc: '정서를 위협으로부터 지키는 업무',
    examples: ['경계 설정', '유해 관계 차단', '스트레스 방어', '감정 보호'],
    inputNodes: ['KNOWLEDGE', 'NETWORK'], outputNode: 'EMOTION',
    difficulty: 3, timeRequired: '지속', frequency: 'daily'
  },
  {
    id: 'W71', code: 'EMOTION_RECOVER', domain: 'EMOTION', pattern: 'RECOVER',
    name: '정서 회복', desc: '손상된 정서를 복구하는 업무',
    examples: ['번아웃 회복', '트라우마 치유', '우울 극복', '관계 상처 치유'],
    inputNodes: ['TIME', 'NETWORK', 'CAPITAL'], outputNode: 'EMOTION',
    difficulty: 5, timeRequired: '1개월-수년', frequency: 'weekly'
  },
  {
    id: 'W72', code: 'EMOTION_TRANSFORM', domain: 'EMOTION', pattern: 'TRANSFORM',
    name: '정서 전환', desc: '정서 상태를 근본적으로 바꾸는 업무',
    examples: ['마인드셋 변화', '가치관 전환', '삶의 재정립', '영적 성장'],
    inputNodes: ['TIME', 'KNOWLEDGE', 'NETWORK'], outputNode: 'EMOTION',
    difficulty: 5, timeRequired: '6개월-수년', frequency: 'yearly'
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════

export function getWorkById(id: string): WorkType | undefined {
  return ALL_72_WORKS.find(w => w.id === id);
}

export function getWorksByDomain(domain: string): WorkType[] {
  return ALL_72_WORKS.filter(w => w.domain === domain);
}

export function getWorksByPattern(pattern: string): WorkType[] {
  return ALL_72_WORKS.filter(w => w.pattern === pattern);
}

export function getWorksByFrequency(frequency: WorkType['frequency']): WorkType[] {
  return ALL_72_WORKS.filter(w => w.frequency === frequency);
}

export function getWorksByDifficulty(difficulty: number): WorkType[] {
  return ALL_72_WORKS.filter(w => w.difficulty === difficulty);
}

// 업무 도메인별 요약
export const WORK_SUMMARY = Object.keys(WORK_DOMAINS).map(domainId => ({
  domain: WORK_DOMAINS[domainId as keyof typeof WORK_DOMAINS],
  works: getWorksByDomain(domainId),
  startId: `W${(Object.keys(WORK_DOMAINS).indexOf(domainId) * 12) + 1}`.padStart(3, '0'),
  endId: `W${(Object.keys(WORK_DOMAINS).indexOf(domainId) + 1) * 12}`.padStart(3, '0'),
}));

// ═══════════════════════════════════════════════════════════════════════════
// Money Flow Cube 계산
// ═══════════════════════════════════════════════════════════════════════════

export interface MoneyFlowResult {
  node: string;      // 노드 타입 (T01-L24)
  motion: string;    // 모션 타입 (F01-F72)
  work: string;      // 업무 타입 (W01-W72)
  
  // 결과
  output: {
    primaryEffect: number;     // -100 ~ +100
    affectedNodes: string[];   // 영향받는 물리 노드
    successRate: number;       // 0-100%
    timeToResult: string;      // 예상 소요 시간
  };
  
  // 분석
  synergy: number;             // 시너지 점수 (0-100)
  friction: number;            // 마찰 점수 (0-100)
  recommendation: string;      // 추천 메시지
}

/**
 * 72×72×72 Money Flow 계산
 * 
 * "어떤 타입의 사람(node)이, 어떤 힘(motion)을 받아, 어떤 업무(work)를 수행할 때의 결과"
 */
export function calculateMoneyFlow(
  nodeId: string,
  motionId: string,
  workId: string
): MoneyFlowResult {
  const work = getWorkById(workId);
  
  if (!work) {
    throw new Error(`Invalid work ID: ${workId}`);
  }
  
  // 기본 계산 로직 (실제로는 더 복잡한 공식 필요)
  const nodeCategory = nodeId.charAt(0);
  const motionIndex = parseInt(motionId.replace('F', ''));
  const workIndex = parseInt(workId.replace('W', ''));
  
  // 시너지: 물리 노드 매칭도
  const motionNode = Math.floor((motionIndex - 1) / 12); // 0-5
  const workNode = Math.floor((workIndex - 1) / 12);     // 0-5
  const nodeMatch = motionNode === workNode ? 30 : 0;
  
  // 카테고리 적합도
  const categoryBonus = 
    (nodeCategory === 'T' && work.domain === 'CAPITAL') ? 20 :
    (nodeCategory === 'B' && ['NETWORK', 'TIME'].includes(work.domain)) ? 20 :
    (nodeCategory === 'L' && ['TIME', 'KNOWLEDGE'].includes(work.domain)) ? 20 : 0;
  
  const synergy = Math.min(50 + nodeMatch + categoryBonus, 100);
  const friction = Math.max(100 - synergy - 20, 0);
  
  // 결과 계산
  const primaryEffect = Math.round((synergy - friction) * (1 - work.difficulty * 0.1));
  const successRate = Math.min(Math.max(synergy - work.difficulty * 5, 20), 95);
  
  return {
    node: nodeId,
    motion: motionId,
    work: workId,
    output: {
      primaryEffect,
      affectedNodes: [work.outputNode, ...work.inputNodes.slice(0, 2)],
      successRate,
      timeToResult: work.timeRequired
    },
    synergy,
    friction,
    recommendation: synergy >= 70 
      ? '✅ 최적의 조합입니다' 
      : synergy >= 50 
        ? '⚠️ 보통의 효율입니다' 
        : '❌ 비효율적 조합입니다'
  };
}

// 총 조합 수
export const TOTAL_COMBINATIONS = 72 * 72 * 72; // 373,248
