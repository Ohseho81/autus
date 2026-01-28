// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 Industry Configuration System
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface IndustryConfig {
  id: string;
  brandName: string;
  brandTagline: string;
  icon: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  
  terms: {
    customer: string;
    customers: string;
    customerCount: string;
    payer: string;
    payers: string;
    executor: string;
    executors: string;
    operator: string;
    owner: string;
    visit: string;
    visits: string;
    purchase: string;
    revenue: string;
    churn: string;
    churned: string;
    referral: string;
    newCustomer: string;
    consultation: string;
    session: string;
  };
  
  roles: Record<string, { label: string; icon: string }>;
  payerEqualsUser: boolean;
  
  tselWeights: {
    trust: number;
    satisfaction: number;
    engagement: number;
    loyalty: number;
  };
  
  tselFactors: Record<string, Array<{ id: string; name: string; weight: number }>>;
  
  sigmaWeights: {
    internal: number;
    voice: number;
    external: number;
  };
  
  sigmaInternal?: Record<string, { weight: number; goodThreshold: number; badThreshold: number }>;
  sigmaExternal: Record<string, { weight: number; description: string }>;
  
  voiceCategories: Array<{ id: string; name: string; keywords: string[] }>;
  
  viewPriority: Record<string, string[]>;
  mainView: Record<string, string | null>;
  
  alertFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  alertThresholds: {
    temperature: { critical: number; warning: number };
    churnProbability: { critical: number; warning: number };
    voiceUnresolved: { critical: number; warning: number };
  };
  
  customerJourney: Array<{ id: string; name: string; description: string }>;
  
  externalEvents?: Array<{
    id: string;
    name: string;
    category: string;
    sigmaImpact: number;
    affectsAll: boolean;
  }>;
  
  strategyTemplates?: Array<{
    id: string;
    name: string;
    trigger: Record<string, unknown>;
    description: string;
    expectedEffect: { temperature: number; churnReduction: number };
  }>;
  
  dataSources?: {
    internal: Array<{ id: string; name: string; auto: boolean }>;
    voice: Array<{ id: string; name: string; input: string }>;
    external: Array<{ id: string; name: string; auto: boolean }>;
  };
  
  integrations?: Array<{ id: string; name: string; category: string }>;
  
  targetMarket: {
    sizeRange: { min: number; max: number; unit: string };
    staffRange: { min: number; max: number; unit: string };
    revenueRange: { min: number; max: number; unit: string };
    pain: string;
    tamKorea: number;
  };
  
  churnSignals?: Array<{ pattern: string; name: string; weight: number }>;
}

// ═══════════════════════════════════════════════════════════════════════
// Global Constants
// ═══════════════════════════════════════════════════════════════════════

export const HUMAN_CONSTANTS = {
  RECOGNITION: { id: 'recognition', name: '인정 욕구', description: '알아봐 달라' },
  FAIRNESS: { id: 'fairness', name: '공정성 기대', description: '준 만큼 받자' },
  UNCERTAINTY_AVOIDANCE: { id: 'uncertainty', name: '불확실성 회피', description: '예측 가능하게' },
  LOSS_AVERSION: { id: 'loss_aversion', name: '손실 회피', description: '잃기 싫다' },
  SOCIAL_PROOF: { id: 'social_proof', name: '사회적 증거', description: '남들이 하면' },
  RECIPROCITY: { id: 'reciprocity', name: '호혜성', description: '받으면 갚는다' },
  CONSISTENCY: { id: 'consistency', name: '일관성', description: '한 번 선택하면' },
  EMOTIONAL_CONTAGION: { id: 'contagion', name: '감정 전이', description: '기분은 전염' },
} as const;

export const VOICE_STAGES = {
  request: { id: 'request', name: '요청', icon: '🙏', sigmaMultiplier: 1.0, urgency: 'low' },
  wish: { id: 'wish', name: '바람', icon: '💭', sigmaMultiplier: 0.9, urgency: 'medium' },
  complaint: { id: 'complaint', name: '불만', icon: '😟', sigmaMultiplier: 0.7, urgency: 'high' },
  churn_signal: { id: 'churn_signal', name: '이탈 신호', icon: '🚨', sigmaMultiplier: 0.5, urgency: 'critical' },
} as const;

export const TEMPERATURE_ZONES = {
  critical: { min: 0, max: 30, color: '#DC2626', label: '위험', emoji: '🔴' },
  warning: { min: 30, max: 50, color: '#F59E0B', label: '주의', emoji: '🟡' },
  normal: { min: 50, max: 70, color: '#10B981', label: '양호', emoji: '🟢' },
  good: { min: 70, max: 85, color: '#3B82F6', label: '우수', emoji: '🔵' },
  excellent: { min: 85, max: 100, color: '#8B5CF6', label: '최상', emoji: '💜' },
} as const;

export const INDUSTRY_ROLES = {
  owner: { id: 'owner', name: 'Owner', nameKo: '소유자', icon: '👑', accessLevel: 'full' },
  operator: { id: 'operator', name: 'Operator', nameKo: '운영자', icon: '⚙️', accessLevel: 'operational' },
  executor: { id: 'executor', name: 'Executor', nameKo: '실행자', icon: '🔨', accessLevel: 'assigned' },
  payer: { id: 'payer', name: 'Payer', nameKo: '결제자', icon: '👨‍👩‍👧', accessLevel: 'self' },
  user: { id: 'user', name: 'User', nameKo: '사용자', icon: '🎯', accessLevel: 'self' },
  system: { id: 'system', name: 'System', nameKo: '시스템', icon: '🤖', accessLevel: 'read_all' },
} as const;

export const INDUSTRY_VIEWS = {
  cockpit: { id: 'cockpit', name: '조종석', icon: '🎛️', question: '전체 상황은?' },
  map: { id: 'map', name: '지도', icon: '🗺️', question: '어디서 싸우나?' },
  weather: { id: 'weather', name: '날씨', icon: '🌤️', question: '언제 비 오나?' },
  radar: { id: 'radar', name: '레이더', icon: '📡', question: '뭐가 다가오나?' },
  scoreboard: { id: 'scoreboard', name: '스코어보드', icon: '🏆', question: '몇 대 몇인가?' },
  tide: { id: 'tide', name: '조류', icon: '🌊', question: '흐름이 어디로?' },
  heartbeat: { id: 'heartbeat', name: '심전도', icon: '💓', question: '심장이 정상인가?' },
  microscope: { id: 'microscope', name: '현미경', icon: '🔬', question: '자세히 보면?' },
  network: { id: 'network', name: '네트워크', icon: '🌐', question: '누가 누구와?' },
  funnel: { id: 'funnel', name: '퍼널', icon: '📊', question: '어디서 빠지나?' },
  crystal: { id: 'crystal', name: '수정구', icon: '🔮', question: '미래는 어떻게?' },
} as const;

// ═══════════════════════════════════════════════════════════════════════
// Formulas
// ═══════════════════════════════════════════════════════════════════════

export const FORMULAS = {
  attraction: (r: number, sigma: number): number => Math.pow(r / 100, sigma) * 100,
  
  relationshipIndex: (
    t: number, s: number, e: number, l: number,
    weights = { t: 0.25, s: 0.25, e: 0.25, l: 0.25 }
  ): number => t * weights.t + s * weights.s + e * weights.e + l * weights.l,
  
  sigma: (
    internal: number, voice: number, external: number,
    weights = { internal: 0.4, voice: 0.4, external: 0.2 }
  ): number => internal * weights.internal + voice * weights.voice + external * weights.external,
  
  churnProbability: (attraction: number): number => Math.max(0, Math.min(1, 1 - (attraction / 100))),
};

// ═══════════════════════════════════════════════════════════════════════
// Academy Config (KRATON)
// ═══════════════════════════════════════════════════════════════════════

export const academyConfig: IndustryConfig = {
  id: 'academy',
  brandName: 'KRATON',
  brandTagline: '학원 관계 관리의 새로운 기준',
  icon: '🎓',
  color: { primary: '#3B82F6', secondary: '#1D4ED8', accent: '#60A5FA' },
  
  terms: {
    customer: '학생', customers: '학생들', customerCount: '재원수',
    payer: '학부모', payers: '학부모님들',
    executor: '강사', executors: '강사진',
    operator: '관리자', owner: '원장',
    visit: '출석', visits: '출석',
    purchase: '수강', revenue: '수강료',
    churn: '퇴원', churned: '퇴원생',
    referral: '추천 입학', newCustomer: '신규 입학',
    consultation: '상담', session: '수업',
  },
  
  roles: {
    owner: { label: '원장', icon: '👑' },
    operator: { label: '관리자', icon: '⚙️' },
    executor: { label: '강사', icon: '👨‍🏫' },
    payer: { label: '학부모', icon: '👨‍👩‍👧' },
    user: { label: '학생', icon: '🎓' },
    system: { label: 'KRATON', icon: '🤖' },
  },
  
  payerEqualsUser: false,
  
  tselWeights: { trust: 0.25, satisfaction: 0.30, engagement: 0.25, loyalty: 0.20 },
  
  tselFactors: {
    trust: [
      { id: 'grade_improvement', name: '성적 향상', weight: 0.5 },
      { id: 'teacher_quality', name: '강사 수준', weight: 0.3 },
      { id: 'promise_kept', name: '약속 이행', weight: 0.2 },
    ],
    satisfaction: [
      { id: 'parent_satisfaction', name: '학부모 만족도', weight: 0.4 },
      { id: 'student_satisfaction', name: '학생 만족도', weight: 0.3 },
      { id: 'value_for_money', name: '가격 대비 가치', weight: 0.3 },
    ],
    engagement: [
      { id: 'attendance', name: '출석률', weight: 0.4 },
      { id: 'homework', name: '숙제 완료율', weight: 0.35 },
      { id: 'participation', name: '수업 참여도', weight: 0.25 },
    ],
    loyalty: [
      { id: 'renewal_intent', name: '재등록 의향', weight: 0.4 },
      { id: 'recommend_intent', name: '추천 의향', weight: 0.35 },
      { id: 'competitor_interest', name: '경쟁사 무관심', weight: 0.25 },
    ],
  },
  
  sigmaWeights: { internal: 0.40, voice: 0.40, external: 0.20 },
  
  sigmaInternal: {
    attendance: { weight: 0.35, goodThreshold: 0.9, badThreshold: 0.7 },
    homework: { weight: 0.25, goodThreshold: 0.8, badThreshold: 0.5 },
    payment: { weight: 0.25, goodThreshold: 1.0, badThreshold: 0.9 },
    participation: { weight: 0.15, goodThreshold: 0.8, badThreshold: 0.5 },
  },
  
  sigmaExternal: {
    exam: { weight: 0.25, description: '시험 일정' },
    competition: { weight: 0.25, description: '경쟁사 동향' },
    cost: { weight: 0.20, description: '비용 민감도' },
    season: { weight: 0.15, description: '방학/학기' },
    policy: { weight: 0.10, description: '교육 정책' },
    economy: { weight: 0.05, description: '경기 상황' },
  },
  
  voiceCategories: [
    { id: 'cost', name: '비용/가격', keywords: ['비싸', '가격', '할인', '분납'] },
    { id: 'quality', name: '수업 품질', keywords: ['수업', '강사', '교재', '커리큘럼'] },
    { id: 'schedule', name: '시간/일정', keywords: ['시간', '요일', '변경', '조정'] },
    { id: 'grade', name: '성적', keywords: ['성적', '점수', '향상', '효과'] },
    { id: 'homework', name: '숙제', keywords: ['숙제', '과제', '많', '양'] },
    { id: 'teacher', name: '강사', keywords: ['선생님', '강사', '담임', '상담'] },
    { id: 'facility', name: '시설', keywords: ['시설', '환경', '위치', '주차'] },
    { id: 'compare', name: '비교', keywords: ['다른', '학원', '옮기', '이전'] },
  ],
  
  viewPriority: {
    owner: ['cockpit', 'scoreboard', 'crystal', 'funnel', 'map'],
    operator: ['cockpit', 'radar', 'heartbeat', 'weather', 'microscope'],
    executor: ['microscope', 'weather', 'heartbeat', 'cockpit'],
    payer: ['microscope'],
    user: [],
  },
  
  mainView: {
    owner: 'cockpit',
    operator: 'cockpit',
    executor: 'microscope',
    payer: 'microscope',
    user: 'gamification',
  },
  
  alertFrequency: 'daily',
  
  alertThresholds: {
    temperature: { critical: 35, warning: 50 },
    churnProbability: { critical: 0.5, warning: 0.3 },
    voiceUnresolved: { critical: 3, warning: 1 },
  },
  
  customerJourney: [
    { id: 'awareness', name: '인지', description: '학원 존재 인지' },
    { id: 'interest', name: '관심', description: '문의/정보 수집' },
    { id: 'trial', name: '체험', description: '체험 수업' },
    { id: 'enrolled', name: '등록', description: '정식 등록' },
    { id: '3month', name: '3개월', description: '첫 학기 적응' },
    { id: '6month', name: '6개월', description: '중기 정착' },
    { id: '1year', name: '1년+', description: '장기 충성' },
  ],
  
  externalEvents: [
    { id: 'midterm', name: '중간고사', category: 'exam', sigmaImpact: -0.15, affectsAll: true },
    { id: 'final', name: '기말고사', category: 'exam', sigmaImpact: -0.20, affectsAll: true },
    { id: 'school_break', name: '방학', category: 'season', sigmaImpact: 0.10, affectsAll: true },
    { id: 'competitor_promo', name: '경쟁사 프로모션', category: 'competition', sigmaImpact: -0.15, affectsAll: false },
  ],
  
  strategyTemplates: [
    {
      id: 'value_reinforcement',
      name: '가치 재인식 상담',
      trigger: { category: 'cost', voiceStage: 'wish' },
      description: '비용 대비 가치를 데이터로 보여주는 상담',
      expectedEffect: { temperature: 10, churnReduction: 0.15 },
    },
    {
      id: 'grade_boost',
      name: '성적 향상 집중 케어',
      trigger: { tselLow: 'satisfaction', reason: 'grade' },
      description: '맞춤 보충 수업 및 학습 플랜 제공',
      expectedEffect: { temperature: 15, churnReduction: 0.20 },
    },
  ],
  
  integrations: [
    { id: 'classting', name: '클래스팅', category: 'erp' },
    { id: 'google_calendar', name: 'Google Calendar', category: 'calendar' },
    { id: 'kakao', name: '카카오톡', category: 'message' },
  ],
  
  targetMarket: {
    sizeRange: { min: 50, max: 300, unit: '재원' },
    staffRange: { min: 3, max: 15, unit: '강사' },
    revenueRange: { min: 300000000, max: 2000000000, unit: '원/년' },
    pain: '학생 이탈 예측 불가, 학부모 불만 감지 어려움',
    tamKorea: 72000000000,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// F&B Config (GUSTO)
// ═══════════════════════════════════════════════════════════════════════

export const fnbConfig: IndustryConfig = {
  id: 'fnb',
  brandName: 'GUSTO',
  brandTagline: '단골의 마음을 읽는 기술',
  icon: '🍽️',
  color: { primary: '#DC2626', secondary: '#991B1B', accent: '#F87171' },
  
  terms: {
    customer: '단골', customers: '단골손님', customerCount: '단골 수',
    payer: '고객', payers: '고객들',
    executor: '직원', executors: '직원들',
    operator: '매니저', owner: '대표',
    visit: '방문', visits: '방문',
    purchase: '주문', revenue: '매출',
    churn: '이탈', churned: '이탈 고객',
    referral: '소개', newCustomer: '신규 고객',
    consultation: '응대', session: '식사',
  },
  
  roles: {
    owner: { label: '대표', icon: '👑' },
    operator: { label: '매니저', icon: '⚙️' },
    executor: { label: '직원', icon: '👨‍🍳' },
    payer: { label: '고객', icon: '🍽️' },
    user: { label: '고객', icon: '🍽️' },
    system: { label: 'GUSTO', icon: '🤖' },
  },
  
  payerEqualsUser: true,
  
  tselWeights: { trust: 0.20, satisfaction: 0.35, engagement: 0.25, loyalty: 0.20 },
  
  tselFactors: {
    trust: [
      { id: 'hygiene', name: '위생/청결', weight: 0.4 },
      { id: 'quality_consistent', name: '맛 일관성', weight: 0.4 },
      { id: 'safety', name: '식품 안전', weight: 0.2 },
    ],
    satisfaction: [
      { id: 'taste', name: '맛', weight: 0.4 },
      { id: 'service', name: '서비스', weight: 0.3 },
      { id: 'value', name: '가격 대비 가치', weight: 0.3 },
    ],
    engagement: [
      { id: 'visit_frequency', name: '방문 빈도', weight: 0.5 },
      { id: 'order_variety', name: '메뉴 다양성', weight: 0.25 },
      { id: 'social_share', name: 'SNS 공유', weight: 0.25 },
    ],
    loyalty: [
      { id: 'revisit_intent', name: '재방문 의향', weight: 0.35 },
      { id: 'recommend', name: '추천 의향', weight: 0.35 },
      { id: 'price_insensitive', name: '가격 둔감', weight: 0.3 },
    ],
  },
  
  sigmaWeights: { internal: 0.35, voice: 0.35, external: 0.30 },
  
  sigmaExternal: {
    weather: { weight: 0.25, description: '날씨' },
    trend: { weight: 0.20, description: '음식 트렌드' },
    review: { weight: 0.20, description: '온라인 리뷰' },
    season: { weight: 0.15, description: '계절' },
    competition: { weight: 0.10, description: '경쟁사' },
    economy: { weight: 0.10, description: '경기' },
  },
  
  voiceCategories: [
    { id: 'taste', name: '맛', keywords: ['맛', '간', '양', '신선'] },
    { id: 'service', name: '서비스', keywords: ['직원', '응대', '느려', '빨라'] },
    { id: 'price', name: '가격', keywords: ['비싸', '가격', '값', '할인'] },
    { id: 'hygiene', name: '청결', keywords: ['청결', '위생', '더러', '깨끗'] },
    { id: 'ambiance', name: '분위기', keywords: ['분위기', '시끄러', '좁', '인테리어'] },
    { id: 'wait', name: '대기', keywords: ['대기', '기다', '줄', '예약'] },
  ],
  
  viewPriority: {
    owner: ['cockpit', 'weather', 'tide', 'scoreboard', 'funnel'],
    operator: ['cockpit', 'heartbeat', 'weather', 'radar'],
    executor: ['heartbeat', 'cockpit'],
    payer: [],
    user: [],
  },
  
  mainView: {
    owner: 'cockpit',
    operator: 'cockpit',
    executor: 'heartbeat',
    payer: null,
    user: null,
  },
  
  alertFrequency: 'realtime',
  
  alertThresholds: {
    temperature: { critical: 40, warning: 55 },
    churnProbability: { critical: 0.4, warning: 0.25 },
    voiceUnresolved: { critical: 1, warning: 0.5 },
  },
  
  customerJourney: [
    { id: 'first_visit', name: '첫 방문', description: '신규 고객' },
    { id: 'second_visit', name: '재방문', description: '2회차' },
    { id: 'regular', name: '단골', description: '월 2회+' },
    { id: 'loyal', name: '충성 단골', description: '월 4회+ or 6개월+' },
    { id: 'advocate', name: '팬', description: '추천 활동' },
  ],
  
  targetMarket: {
    sizeRange: { min: 30, max: 150, unit: '좌석' },
    staffRange: { min: 5, max: 30, unit: '직원' },
    revenueRange: { min: 400000000, max: 2400000000, unit: '원/년' },
    pain: '단골 관리 불가, 리뷰 대응 어려움, 날씨 영향 예측 불가',
    tamKorea: 120000000000,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Fitness Config (PULSE)
// ═══════════════════════════════════════════════════════════════════════

export const fitnessConfig: IndustryConfig = {
  id: 'fitness',
  brandName: 'PULSE',
  brandTagline: '회원의 심장 소리를 듣다',
  icon: '💪',
  color: { primary: '#10B981', secondary: '#059669', accent: '#34D399' },
  
  terms: {
    customer: '회원', customers: '회원들', customerCount: '회원수',
    payer: '회원', payers: '회원들',
    executor: '트레이너', executors: '트레이너들',
    operator: '매니저', owner: '대표',
    visit: '출석', visits: '출석',
    purchase: '등록', revenue: '회비',
    churn: '탈퇴', churned: '탈퇴 회원',
    referral: '소개', newCustomer: '신규 회원',
    consultation: 'PT 상담', session: '운동',
  },
  
  roles: {
    owner: { label: '대표', icon: '👑' },
    operator: { label: '매니저', icon: '⚙️' },
    executor: { label: '트레이너', icon: '🏋️' },
    payer: { label: '회원', icon: '💪' },
    user: { label: '회원', icon: '💪' },
    system: { label: 'PULSE', icon: '🤖' },
  },
  
  payerEqualsUser: true,
  
  tselWeights: { trust: 0.20, satisfaction: 0.25, engagement: 0.35, loyalty: 0.20 },
  
  tselFactors: {
    trust: [
      { id: 'trainer_quality', name: '트레이너 전문성', weight: 0.5 },
      { id: 'facility_safety', name: '시설 안전', weight: 0.3 },
      { id: 'result_delivery', name: '결과 달성', weight: 0.2 },
    ],
    satisfaction: [
      { id: 'facility', name: '시설 만족', weight: 0.35 },
      { id: 'service', name: '서비스', weight: 0.35 },
      { id: 'value', name: '가격 대비 가치', weight: 0.3 },
    ],
    engagement: [
      { id: 'attendance', name: '출석률', weight: 0.5 },
      { id: 'pt_usage', name: 'PT 이용', weight: 0.3 },
      { id: 'class_participation', name: '그룹 수업 참여', weight: 0.2 },
    ],
    loyalty: [
      { id: 'renewal', name: '재등록률', weight: 0.4 },
      { id: 'recommend', name: '추천 의향', weight: 0.35 },
      { id: 'upsell', name: 'PT/추가 구매', weight: 0.25 },
    ],
  },
  
  sigmaWeights: { internal: 0.40, voice: 0.35, external: 0.25 },
  
  sigmaExternal: {
    season: { weight: 0.30, description: '계절 (여름/겨울)' },
    competition: { weight: 0.25, description: '경쟁사' },
    trend: { weight: 0.20, description: '운동 트렌드' },
    weather: { weight: 0.15, description: '날씨' },
    economy: { weight: 0.10, description: '경기' },
  },
  
  voiceCategories: [
    { id: 'facility', name: '시설', keywords: ['기구', '청결', '샤워', '락커'] },
    { id: 'trainer', name: '트레이너', keywords: ['트레이너', 'PT', '코치', '상담'] },
    { id: 'crowded', name: '혼잡', keywords: ['사람', '붐비', '기다', '시간대'] },
    { id: 'price', name: '가격', keywords: ['비싸', '가격', '할인', '이벤트'] },
    { id: 'class', name: '그룹수업', keywords: ['수업', '요가', '필라테스', '스피닝'] },
  ],
  
  viewPriority: {
    owner: ['cockpit', 'tide', 'funnel', 'scoreboard', 'crystal'],
    operator: ['cockpit', 'heartbeat', 'microscope', 'radar'],
    executor: ['microscope', 'heartbeat', 'cockpit'],
    payer: [],
    user: [],
  },
  
  mainView: {
    owner: 'cockpit',
    operator: 'cockpit',
    executor: 'microscope',
    payer: null,
    user: null,
  },
  
  alertFrequency: 'daily',
  
  alertThresholds: {
    temperature: { critical: 35, warning: 50 },
    churnProbability: { critical: 0.5, warning: 0.3 },
    voiceUnresolved: { critical: 2, warning: 1 },
  },
  
  customerJourney: [
    { id: 'trial', name: '체험', description: '무료 체험' },
    { id: 'enrolled', name: '등록', description: '정식 등록' },
    { id: '1month', name: '1개월', description: '첫 달' },
    { id: '3month', name: '3개월', description: '습관 형성' },
    { id: 'loyal', name: '충성', description: '6개월+' },
  ],
  
  churnSignals: [
    { pattern: 'attendance_drop', name: '출석 감소', weight: 0.4 },
    { pattern: 'no_visit_7days', name: '7일 미방문', weight: 0.3 },
    { pattern: 'no_visit_14days', name: '14일 미방문', weight: 0.5 },
    { pattern: 'no_visit_30days', name: '30일 미방문', weight: 0.8 },
  ],
  
  targetMarket: {
    sizeRange: { min: 200, max: 2000, unit: '회원' },
    staffRange: { min: 5, max: 30, unit: '트레이너' },
    revenueRange: { min: 500000000, max: 3000000000, unit: '원/년' },
    pain: '이탈률 높음, 출석 패턴 분석 어려움, 재등록 예측 불가',
    tamKorea: 18000000000,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Industry Configs Export
// ═══════════════════════════════════════════════════════════════════════

export const industryConfigs: Record<string, IndustryConfig> = {
  academy: academyConfig,
  fnb: fnbConfig,
  fitness: fitnessConfig,
};

export type IndustryId = keyof typeof industryConfigs;

// ═══════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════

export function getIndustryConfig(industryId: string): IndustryConfig | undefined {
  return industryConfigs[industryId];
}

export function translateTerm(term: keyof IndustryConfig['terms'], industryId: string): string {
  return industryConfigs[industryId]?.terms?.[term] || term;
}

export function getViewPriority(industryId: string, role: string): string[] {
  return industryConfigs[industryId]?.viewPriority?.[role] || ['cockpit'];
}

export function calculateAttraction(r: number, sigma: number): number {
  return FORMULAS.attraction(r, sigma);
}

export function calculateTSEL(
  t: number, s: number, e: number, l: number,
  industryId: string
): number {
  const weights = industryConfigs[industryId]?.tselWeights || { trust: 0.25, satisfaction: 0.25, engagement: 0.25, loyalty: 0.25 };
  return FORMULAS.relationshipIndex(t, s, e, l, { t: weights.trust, s: weights.satisfaction, e: weights.engagement, l: weights.loyalty });
}

export function getTemperatureZone(temperature: number): typeof TEMPERATURE_ZONES[keyof typeof TEMPERATURE_ZONES] {
  for (const zone of Object.values(TEMPERATURE_ZONES)) {
    if (temperature >= zone.min && temperature < zone.max) {
      return zone;
    }
  }
  return TEMPERATURE_ZONES.normal;
}

// ═══════════════════════════════════════════════════════════════════════
// React Hook for Industry Config
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';

export function useIndustryConfig(initialIndustry: IndustryId = 'academy') {
  const [currentIndustry, setCurrentIndustry] = useState<IndustryId>(initialIndustry);
  
  const config = useMemo(() => industryConfigs[currentIndustry], [currentIndustry]);
  
  const switchIndustry = useCallback((industryId: IndustryId) => {
    if (industryConfigs[industryId]) {
      setCurrentIndustry(industryId);
    }
  }, []);
  
  const translate = useCallback((term: keyof IndustryConfig['terms']) => {
    return config?.terms?.[term] || term;
  }, [config]);
  
  const getViewsForRole = useCallback((role: string) => {
    return config?.viewPriority?.[role] || ['cockpit'];
  }, [config]);
  
  const getMainView = useCallback((role: string) => {
    return config?.mainView?.[role] || 'cockpit';
  }, [config]);
  
  const getTempZone = useCallback((temp: number) => {
    return getTemperatureZone(temp);
  }, []);
  
  return {
    currentIndustry,
    config,
    switchIndustry,
    translate,
    getViewsForRole,
    getMainView,
    getTempZone,
    availableIndustries: Object.keys(industryConfigs) as IndustryId[],
  };
}
