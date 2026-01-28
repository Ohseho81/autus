/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Module Configuration
 * Core + Optional Modules 아키텍처
 * 
 * "Core는 단순하게, 확장은 선택적으로"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 플랜 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type PlanType = 'COMMUNITY' | 'PRO' | 'ENTERPRISE';

export interface PlanConfig {
  id: PlanType;
  name: string;
  nameKo: string;
  price: number; // KRW/월
  studentLimit: number | null; // null = 무제한
  features: string[];
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  COMMUNITY: {
    id: 'COMMUNITY',
    name: 'Community',
    nameKo: '커뮤니티',
    price: 0,
    studentLimit: 30,
    features: ['Core 기능', '대시보드', '학생 관리'],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    nameKo: '프로',
    price: 99000,
    studentLimit: null,
    features: ['Community 전체', '4-Node View', 'AI Assistant', '외부 연동'],
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    nameKo: '엔터프라이즈',
    price: 499000,
    studentLimit: null,
    features: ['Pro 전체', 'Advanced Analytics', '다지점 관리', '전담 지원'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 모듈 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type ModuleId = 
  | 'CORE'
  | '4_NODE_VIEW'
  | 'AI_ASSISTANT'
  | 'CHEMISTRY_ANALYSIS'
  | 'ADVANCED_ANALYTICS'
  | 'GOAL_STRATEGY'
  | 'PARENT_APP'
  | 'INTEGRATION_PACK';

export interface ModuleConfig {
  id: ModuleId;
  name: string;
  nameKo: string;
  description: string;
  isCore: boolean; // Core 모듈 여부
  minPlan: PlanType; // 최소 필요 플랜
  defaultEnabled: Record<PlanType, boolean | 'required'>; // 플랜별 기본값
  features: string[];
  recommendedWhen: string;
  dependencies: ModuleId[]; // 의존 모듈
  apiEndpoints: string[]; // 관련 API
  components: string[]; // 관련 컴포넌트
}

export const MODULE_CONFIGS: Record<ModuleId, ModuleConfig> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Core (필수)
  // ═══════════════════════════════════════════════════════════════════════════
  CORE: {
    id: 'CORE',
    name: 'Core',
    nameKo: '코어',
    description: 'A = T^σ 기반 핵심 기능. σ 계산, 위험 감지, 알림, 행위 기록',
    isCore: true,
    minPlan: 'COMMUNITY',
    defaultEnabled: {
      COMMUNITY: 'required',
      PRO: 'required',
      ENTERPRISE: 'required',
    },
    features: [
      'σ 계산 엔진 (5개 핵심 행위)',
      '위험 감지 (🔴위험/🟡주의/🟢양호)',
      '알림 시스템 (임계값, D-day, 급락)',
      '행위 기록 (Quick Tag)',
      '대시보드 + 학생 상세',
    ],
    recommendedWhen: '모든 학원 필수',
    dependencies: [],
    apiEndpoints: [
      '/api/autus/sigma-proxy',
      '/api/autus/behavior',
      '/api/risks',
      '/api/notify',
      '/api/quick-tag',
      '/api/churn',
    ],
    components: [
      'RoleDashboard',
      'QuickTagPanel',
      'RiskQueuePanel',
      'ChurnAlertPanel',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Optional Modules
  // ═══════════════════════════════════════════════════════════════════════════
  '4_NODE_VIEW': {
    id: '4_NODE_VIEW',
    name: '4-Node View',
    nameKo: '역할별 대시보드',
    description: '오너/관리자/실행자 역할 분리 대시보드',
    isCore: false,
    minPlan: 'PRO',
    defaultEnabled: {
      COMMUNITY: false,
      PRO: false, // 선택적
      ENTERPRISE: false, // 선택적
    },
    features: [
      '오너 대시보드 (목표 설정, 환경 분석)',
      '관리자 대시보드 (전략 수립, 시뮬레이션)',
      '실행자 대시보드 (소통 가이드)',
      '역할별 권한 분리',
    ],
    recommendedWhen: '사용자 3명 이상, 역할 분리 필요 시',
    dependencies: ['CORE'],
    apiEndpoints: [],
    components: [
      'DeciderView',
      'OperatorView',
      'ExecutorView',
      'ConsumerView',
    ],
  },

  AI_ASSISTANT: {
    id: 'AI_ASSISTANT',
    name: 'AI Assistant',
    nameKo: 'AI 어시스턴트',
    description: 'LLM 기반 자연어 설정, 메시지/리포트 생성',
    isCore: false,
    minPlan: 'PRO',
    defaultEnabled: {
      COMMUNITY: false,
      PRO: false, // 선택적 (LLM 과금)
      ENTERPRISE: true, // 기본 ON
    },
    features: [
      '자연어 설정 (σ 가중치, Playbook)',
      '메시지 생성 AI',
      '리포트 생성 AI',
      '전략 제안 AI',
      'Voice-to-Insight 분석',
    ],
    recommendedWhen: 'Pro 플랜, LLM 사용량 과금 동의 시',
    dependencies: ['CORE'],
    apiEndpoints: [
      '/api/brain',
      '/api/brain/v-pulse',
      '/api/neural/vectorize',
    ],
    components: [
      'AIAssistantPanel',
      'MessageGenerator',
      'ReportGenerator',
    ],
  },

  CHEMISTRY_ANALYSIS: {
    id: 'CHEMISTRY_ANALYSIS',
    name: 'Chemistry Analysis',
    nameKo: '케미스트리 분석',
    description: '학생/학부모 성향 분석, 맞춤 소통 가이드',
    isCore: false,
    minPlan: 'PRO',
    defaultEnabled: {
      COMMUNITY: false,
      PRO: false, // 선택적
      ENTERPRISE: false, // 선택적
    },
    features: [
      '학생 성향 분석',
      '학부모 소통 스타일',
      '교사-학생 매칭 점수',
      '맞춤 소통 가이드',
    ],
    recommendedWhen: '충분한 행위 데이터 축적 후 (3개월 이상)',
    dependencies: ['CORE', 'AI_ASSISTANT'],
    apiEndpoints: [],
    components: [
      'ChemistryPanel',
      'MatchingScore',
    ],
  },

  ADVANCED_ANALYTICS: {
    id: 'ADVANCED_ANALYTICS',
    name: 'Advanced Analytics',
    nameKo: '고급 분석',
    description: '14개 행위 상세 분석, 시뮬레이션, 벤치마크',
    isCore: false,
    minPlan: 'ENTERPRISE',
    defaultEnabled: {
      COMMUNITY: false,
      PRO: false,
      ENTERPRISE: false, // 선택적
    },
    features: [
      '14개 행위 상세 분석 (6 Tier)',
      '외부 데이터 연동 (8개 소스)',
      'V = (M-T)×(1+s)^t 물리 엔진',
      '시뮬레이션 엔진',
      '동업계 벤치마크',
      '고급 리포트 (PDF)',
    ],
    recommendedWhen: 'Enterprise 플랜, 데이터 연동 완료 시',
    dependencies: ['CORE', 'INTEGRATION_PACK'],
    apiEndpoints: [
      '/api/physics',
      '/api/organisms',
      '/api/time-value',
      '/api/audit/physics',
    ],
    components: [
      'PhysicsMapUnified',
      'SimulationEngine',
      'BenchmarkPanel',
    ],
  },

  GOAL_STRATEGY: {
    id: 'GOAL_STRATEGY',
    name: 'Goal & Strategy',
    nameKo: '목표 & 전략',
    description: '목표 설정, 전략 수립, 환경 분석, Monopoly',
    isCore: false,
    minPlan: 'PRO',
    defaultEnabled: {
      COMMUNITY: false,
      PRO: false, // 선택적
      ENTERPRISE: false, // 선택적
    },
    features: [
      '목표 설정 (6가지 유형)',
      '전략 수립 (6가지 영역)',
      '환경 분석 (외부/내부)',
      '3대 독점 모니터링 (Monopoly)',
      '시뮬레이션',
    ],
    recommendedWhen: '오너가 전략적 기능 요청 시',
    dependencies: ['CORE'],
    apiEndpoints: [
      '/api/goals',
      '/api/goals/auto-plan',
      '/api/goals/trajectory',
      '/api/monopoly',
    ],
    components: [
      'GoalsPage',
      'MonopolyPanel',
      'StrategyPanel',
    ],
  },

  PARENT_APP: {
    id: 'PARENT_APP',
    name: 'Parent App',
    nameKo: '학부모 앱',
    description: '학부모용 성장 그래프, 케미스트리 리포트',
    isCore: false,
    minPlan: 'PRO',
    defaultEnabled: {
      COMMUNITY: false,
      PRO: false, // 선택적
      ENTERPRISE: false, // 선택적
    },
    features: [
      '학부모용 성장 그래프',
      '케미스트리 리포트',
      '니즈 매칭 현황',
      '선생님 소통',
      'V-포인트 적립/교환',
    ],
    recommendedWhen: '학부모 직접 접근 요청 시',
    dependencies: ['CORE'],
    apiEndpoints: [
      '/api/rewards',
    ],
    components: [
      'ConsumerView',
      'RewardsPanel',
    ],
  },

  INTEGRATION_PACK: {
    id: 'INTEGRATION_PACK',
    name: 'Integration Pack',
    nameKo: '외부 연동',
    description: 'SMS, 카카오톡, 결제, 캘린더 자동 연동',
    isCore: false,
    minPlan: 'PRO',
    defaultEnabled: {
      COMMUNITY: false,
      PRO: false, // 선택적
      ENTERPRISE: true, // 기본 ON
    },
    features: [
      'SMS 출결 연동',
      '카카오톡 연동',
      '결제 PG 연동',
      '캘린더 연동',
      'ERP 동기화 (Classting, Narakhub 등)',
    ],
    recommendedWhen: '수동 입력 부담 시, Pro 플랜 이상',
    dependencies: ['CORE'],
    apiEndpoints: [
      '/api/sync/classting',
      '/api/sync/narakhub',
      '/api/sync/all',
      '/api/erp/smartfit',
      '/api/webhook/n8n',
    ],
    components: [
      'IntegrationsPage',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// σ 계산 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface SigmaConfig {
  mode: 'basic' | 'advanced';
  behaviors: SigmaBehavior[];
}

export interface SigmaBehavior {
  id: string;
  name: string;
  nameKo: string;
  tier: number;
  weight: number;
  isCore: boolean; // Core 5개 기본 행위
}

export const SIGMA_BEHAVIORS: SigmaBehavior[] = [
  // Core 5개 (기본)
  { id: 'attendance', name: 'Attendance', nameKo: '출결', tier: 4, weight: 0.20, isCore: true },
  { id: 'payment', name: 'Payment', nameKo: '수납', tier: 4, weight: 0.20, isCore: true },
  { id: 'communication', name: 'Communication Response', nameKo: '소통 반응', tier: 4, weight: 0.20, isCore: true },
  { id: 'renewal', name: 'Renewal Intent', nameKo: '재등록 의사', tier: 1, weight: 0.25, isCore: true },
  { id: 'referral', name: 'Referral', nameKo: '소개', tier: 1, weight: 0.15, isCore: true },

  // 확장 9개 (Advanced Analytics 활성화 시)
  { id: 'additional_course', name: 'Additional Course', nameKo: '추가수강', tier: 1, weight: 0.10, isCore: false },
  { id: 'paid_event', name: 'Paid Event', nameKo: '유료이벤트', tier: 2, weight: 0.08, isCore: false },
  { id: 'voluntary_stay', name: 'Voluntary Stay', nameKo: '자발체류', tier: 2, weight: 0.08, isCore: false },
  { id: 'free_event', name: 'Free Event', nameKo: '무료이벤트', tier: 3, weight: 0.06, isCore: false },
  { id: 'class_participation', name: 'Class Participation', nameKo: '수업참여', tier: 3, weight: 0.06, isCore: false },
  { id: 'positive_feedback', name: 'Positive Feedback', nameKo: '긍정피드백', tier: 5, weight: 0.04, isCore: false },
  { id: 'goods_possession', name: 'Goods Possession', nameKo: '굿즈소지', tier: 5, weight: 0.03, isCore: false },
  { id: 'complaint', name: 'Complaint', nameKo: '불만', tier: 6, weight: -0.15, isCore: false },
  { id: 'churn_signal', name: 'Churn Signal', nameKo: '이탈신호', tier: 6, weight: -0.20, isCore: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 위험 감지 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface RiskThreshold {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sigmaMin: number;
  sigmaMax: number;
  color: string;
  action: string;
}

export const RISK_THRESHOLDS: RiskThreshold[] = [
  { level: 'CRITICAL', sigmaMin: 0, sigmaMax: 0.6, color: '#FF4444', action: '즉시 1:1 상담, 원장 직접 연락' },
  { level: 'HIGH', sigmaMin: 0.6, sigmaMax: 0.8, color: '#FF8800', action: '담당 선생님 특별 케어' },
  { level: 'MEDIUM', sigmaMin: 0.8, sigmaMax: 1.1, color: '#FFD700', action: '학부모 앱 푸시 알림' },
  { level: 'LOW', sigmaMin: 1.1, sigmaMax: Infinity, color: '#00CC66', action: '모니터링' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getEnabledModules(plan: PlanType): ModuleId[] {
  return Object.values(MODULE_CONFIGS)
    .filter(m => {
      const planIndex = ['COMMUNITY', 'PRO', 'ENTERPRISE'].indexOf(plan);
      const minPlanIndex = ['COMMUNITY', 'PRO', 'ENTERPRISE'].indexOf(m.minPlan);
      return planIndex >= minPlanIndex;
    })
    .map(m => m.id);
}

export function getDefaultEnabledModules(plan: PlanType): ModuleId[] {
  return Object.values(MODULE_CONFIGS)
    .filter(m => {
      const enabled = m.defaultEnabled[plan];
      return enabled === true || enabled === 'required';
    })
    .map(m => m.id);
}

export function canEnableModule(moduleId: ModuleId, plan: PlanType): boolean {
  const module = MODULE_CONFIGS[moduleId];
  const planIndex = ['COMMUNITY', 'PRO', 'ENTERPRISE'].indexOf(plan);
  const minPlanIndex = ['COMMUNITY', 'PRO', 'ENTERPRISE'].indexOf(module.minPlan);
  return planIndex >= minPlanIndex;
}

export function getModuleDependencies(moduleId: ModuleId): ModuleId[] {
  const module = MODULE_CONFIGS[moduleId];
  const deps: ModuleId[] = [...module.dependencies];
  
  // 재귀적으로 의존성 수집
  for (const depId of module.dependencies) {
    deps.push(...getModuleDependencies(depId));
  }
  
  return [...new Set(deps)];
}

export function getSigmaBehaviors(isAdvanced: boolean): SigmaBehavior[] {
  return SIGMA_BEHAVIORS.filter(b => isAdvanced || b.isCore);
}

export function getRiskLevel(sigma: number): RiskThreshold {
  return RISK_THRESHOLDS.find(t => sigma >= t.sigmaMin && sigma < t.sigmaMax) 
    || RISK_THRESHOLDS[RISK_THRESHOLDS.length - 1];
}
