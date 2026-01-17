// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Scale v2.0 정의 (K1~K10)
// ═══════════════════════════════════════════════════════════════════════════════
//
// "스케일은 '공간'이 아니라 '책임 반경'이다"
// 각 단계는 승인 주체 / 실패 시 무엇이 깨지는가로 구분
//
// ═══════════════════════════════════════════════════════════════════════════════

// K단계 타입
export type KScale = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6' | 'K7' | 'K8' | 'K9' | 'K10';

// 승인 주체 타입
export type ApprovalAuthority = 
  | 'individual'      // 개인
  | 'site_manager'    // 현장 책임자
  | 'middle_manager'  // 중간 관리자
  | 'executive'       // 경영진
  | 'board'           // 오너/이사회
  | 'legal'           // 법적 승인
  | 'multilateral'    // 다자 합의
  | 'social_consensus'// 사회적 합의
  | 'supranational'   // 초국가 자본
  | 'constitutional'; // 창시자/헌법

// 실패 비용 시간 단위
export type FailureCostTime = 
  | 'minutes' | 'hours' | 'days' | 'weeks' 
  | 'months' | 'quarters' | 'years' | 'decades' | 'generations' | 'civilization';

// ═══════════════════════════════════════════════════════════════════════════════
// Scale 정의 인터페이스
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScaleDefinition {
  id: KScale;
  level: number;
  
  // 명칭
  name: string;
  nameKo: string;
  description: string;
  
  // 책임 구조
  coreJudgment: string;       // 핵심 판단 대상
  approvalAuthority: ApprovalAuthority;
  approvalAuthorityKo: string;
  failureCostTime: FailureCostTime;
  failureCostTimeKo: string;
  
  // 시각적 표현
  color: {
    primary: string;
    secondary: string;
    glow: string;
    temperature: number;      // 색온도 (K) - 높을수록 차가움
  };
  
  // UI 제한
  ui: {
    blur: number;             // 배경 흐림 정도 (0-20px)
    drag: number;             // 드래그 저항 (1-10)
    confirmSteps: number;     // 확인 단계 수 (1-5)
    ritualRequired: boolean;  // 의식적 진입 필요 여부
    cooldown: number;         // 실행 후 대기 시간 (초)
  };
  
  // 허용 컴포넌트
  allowedComponents: string[];
  
  // 트리거 조건
  triggerConditions: string[];
  
  // 예시
  examples: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// K1~K10 완전 정의
// ═══════════════════════════════════════════════════════════════════════════════

export const SCALE_DEFINITIONS: Record<KScale, ScaleDefinition> = {
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K1: 개인 실행
  // ─────────────────────────────────────────────────────────────────────────────
  K1: {
    id: 'K1',
    level: 1,
    name: 'Individual Execution',
    nameKo: '개인 실행',
    description: '즉시 실행 가능한 개인 단위 작업',
    
    coreJudgment: '즉시 행동',
    approvalAuthority: 'individual',
    approvalAuthorityKo: '개인',
    failureCostTime: 'minutes',
    failureCostTimeKo: '분~시간',
    
    color: {
      primary: '#10B981',     // 초록
      secondary: '#34D399',
      glow: '#6EE7B7',
      temperature: 5500,      // 중립
    },
    
    ui: {
      blur: 0,
      drag: 1,
      confirmSteps: 1,
      ritualRequired: false,
      cooldown: 0,
    },
    
    allowedComponents: [
      'QuickAction',
      'TaskCard',
      'ChecklistItem',
      'TimerWidget',
      'NoteInput',
    ],
    
    triggerConditions: ['개인 작업'],
    
    examples: [
      '이메일 답장',
      '파일 저장',
      '일정 확인',
      '메모 작성',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K2: 현장 운영
  // ─────────────────────────────────────────────────────────────────────────────
  K2: {
    id: 'K2',
    level: 2,
    name: 'Site Operations',
    nameKo: '현장 운영',
    description: '동일 공간 내 조정 및 즉시 대응',
    
    coreJudgment: '동일 공간 내 조정',
    approvalAuthority: 'site_manager',
    approvalAuthorityKo: '현장 책임자',
    failureCostTime: 'hours',
    failureCostTimeKo: '시간',
    
    color: {
      primary: '#22D3EE',     // 시안
      secondary: '#67E8F9',
      glow: '#A5F3FC',
      temperature: 5800,
    },
    
    ui: {
      blur: 1,
      drag: 2,
      confirmSteps: 1,
      ritualRequired: false,
      cooldown: 0,
    },
    
    allowedComponents: [
      'QuickAction',
      'TaskCard',
      'TeamStatusBoard',
      'ResourceMeter',
      'AlertBadge',
    ],
    
    triggerConditions: ['현장 이슈', '즉시 조정 필요'],
    
    examples: [
      '현장 인력 재배치',
      '장비 점검 지시',
      '고객 즉시 대응',
      '재고 이동',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K3: 팀/부서 운영
  // ─────────────────────────────────────────────────────────────────────────────
  K3: {
    id: 'K3',
    level: 3,
    name: 'Team Operations',
    nameKo: '팀/부서 운영',
    description: '자원 배치 및 팀 단위 의사결정',
    
    coreJudgment: '자원 배치',
    approvalAuthority: 'middle_manager',
    approvalAuthorityKo: '중간 관리자',
    failureCostTime: 'days',
    failureCostTimeKo: '일',
    
    color: {
      primary: '#3B82F6',     // 파랑
      secondary: '#60A5FA',
      glow: '#93C5FD',
      temperature: 6200,
    },
    
    ui: {
      blur: 2,
      drag: 3,
      confirmSteps: 2,
      ritualRequired: false,
      cooldown: 60,
    },
    
    allowedComponents: [
      'TaskCard',
      'TeamStatusBoard',
      'ResourceAllocation',
      'GanttView',
      'BudgetWidget',
      'ApprovalFlow',
    ],
    
    triggerConditions: ['팀 리소스 변경', '일정 조정', '예산 변경'],
    
    examples: [
      '팀 일정 조정',
      '예산 재배분',
      '인력 충원 요청',
      '프로젝트 우선순위 변경',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K4: 조직 설계
  // ─────────────────────────────────────────────────────────────────────────────
  K4: {
    id: 'K4',
    level: 4,
    name: 'Organizational Design',
    nameKo: '조직 설계',
    description: '구조 및 프로세스 변경',
    
    coreJudgment: '구조·프로세스',
    approvalAuthority: 'executive',
    approvalAuthorityKo: '경영진',
    failureCostTime: 'weeks',
    failureCostTimeKo: '주',
    
    color: {
      primary: '#8B5CF6',     // 보라
      secondary: '#A78BFA',
      glow: '#C4B5FD',
      temperature: 6800,
    },
    
    ui: {
      blur: 4,
      drag: 5,
      confirmSteps: 3,
      ritualRequired: true,
      cooldown: 300,
    },
    
    allowedComponents: [
      'OrgChart',
      'ProcessFlow',
      'PolicyEditor',
      'ImpactAnalysis',
      'StakeholderMap',
      'RiskMatrix',
      'ApprovalChain',
    ],
    
    triggerConditions: ['조직 구조 변경', '프로세스 개편', '정책 변경'],
    
    examples: [
      '부서 통폐합',
      '보고 체계 변경',
      '승인 프로세스 개편',
      '직급 체계 조정',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K5: 사업/산업 선택
  // ─────────────────────────────────────────────────────────────────────────────
  K5: {
    id: 'K5',
    level: 5,
    name: 'Business Portfolio',
    nameKo: '사업/산업 선택',
    description: '포트폴리오 및 전략적 투자 결정',
    
    coreJudgment: '포트폴리오',
    approvalAuthority: 'board',
    approvalAuthorityKo: '오너/이사회',
    failureCostTime: 'months',
    failureCostTimeKo: '월',
    
    color: {
      primary: '#F59E0B',     // 앰버
      secondary: '#FBBF24',
      glow: '#FCD34D',
      temperature: 4500,      // 따뜻함
    },
    
    ui: {
      blur: 6,
      drag: 6,
      confirmSteps: 3,
      ritualRequired: true,
      cooldown: 600,
    },
    
    allowedComponents: [
      'PortfolioMatrix',
      'InvestmentDashboard',
      'ScenarioPlanner',
      'MarketAnalysis',
      'ROICalculator',
      'BoardApproval',
      'RiskHeatmap',
    ],
    
    triggerConditions: ['신규 사업/투자', 'M&A', '사업 철수'],
    
    examples: [
      '신규 시장 진출',
      '자회사 설립',
      '사업 매각',
      '대규모 투자 결정',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K6: 제도·규제 대응 (강제)
  // ─────────────────────────────────────────────────────────────────────────────
  K6: {
    id: 'K6',
    level: 6,
    name: 'Regulatory Response',
    nameKo: '제도·규제 대응',
    description: '법률, 세무, 정책 관련 의사결정',
    
    coreJudgment: '법·세무·정책',
    approvalAuthority: 'legal',
    approvalAuthorityKo: '법적 승인',
    failureCostTime: 'quarters',
    failureCostTimeKo: '분기~년',
    
    color: {
      primary: '#EF4444',     // 빨강 (경고)
      secondary: '#F87171',
      glow: '#FCA5A5',
      temperature: 3500,      // 따뜻함 (경고)
    },
    
    ui: {
      blur: 8,
      drag: 7,
      confirmSteps: 4,
      ritualRequired: true,
      cooldown: 1800,
    },
    
    allowedComponents: [
      'ComplianceChecker',
      'LegalReview',
      'TaxCalculator',
      'AuditTrail',
      'RegulatoryAlert',
      'LegalApproval',
      'DocumentVault',
    ],
    
    triggerConditions: ['계약·세무·규제', '법적 검토 필요', '컴플라이언스'],
    
    examples: [
      '세금 신고',
      '계약 체결',
      '규제 대응',
      '법적 분쟁 대응',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K7: 블록 정렬
  // ─────────────────────────────────────────────────────────────────────────────
  K7: {
    id: 'K7',
    level: 7,
    name: 'Block Alignment',
    nameKo: '블록 정렬',
    description: '국가, 시장 블록 단위 의사결정',
    
    coreJudgment: '국가·시장 블록',
    approvalAuthority: 'multilateral',
    approvalAuthorityKo: '다자 합의',
    failureCostTime: 'years',
    failureCostTimeKo: '수년',
    
    color: {
      primary: '#6366F1',     // 인디고
      secondary: '#818CF8',
      glow: '#A5B4FC',
      temperature: 7500,      // 차가움
    },
    
    ui: {
      blur: 10,
      drag: 8,
      confirmSteps: 4,
      ritualRequired: true,
      cooldown: 3600,
    },
    
    allowedComponents: [
      'GeopoliticalMap',
      'TradeFlowDiagram',
      'MultilateralApproval',
      'SanctionChecker',
      'CurrencyExposure',
      'RegionalAnalysis',
    ],
    
    triggerConditions: ['다국가/다시장', '국제 협약', '무역 정책'],
    
    examples: [
      '해외 법인 설립',
      '국제 파트너십',
      '수출입 전략',
      '환율 헤지 전략',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K8: 문명 영향
  // ─────────────────────────────────────────────────────────────────────────────
  K8: {
    id: 'K8',
    level: 8,
    name: 'Civilization Impact',
    nameKo: '문명 영향',
    description: '인류 및 환경에 영향을 미치는 결정',
    
    coreJudgment: '인류/환경',
    approvalAuthority: 'social_consensus',
    approvalAuthorityKo: '사회적 합의',
    failureCostTime: 'generations',
    failureCostTimeKo: '세대',
    
    color: {
      primary: '#EC4899',     // 핑크
      secondary: '#F472B6',
      glow: '#F9A8D4',
      temperature: 8500,      // 차가움
    },
    
    ui: {
      blur: 12,
      drag: 9,
      confirmSteps: 5,
      ritualRequired: true,
      cooldown: 7200,
    },
    
    allowedComponents: [
      'ESGDashboard',
      'CarbonFootprint',
      'EthicsReview',
      'GenerationalImpact',
      'StakeholderCouncil',
      'PublicConsultation',
    ],
    
    triggerConditions: ['ESG·인류 영향', '환경 영향', '사회적 파급'],
    
    examples: [
      'ESG 전략 수립',
      '탄소중립 선언',
      '사회공헌 프로그램',
      '윤리 정책 제정',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K9: 자본 질서
  // ─────────────────────────────────────────────────────────────────────────────
  K9: {
    id: 'K9',
    level: 9,
    name: 'Capital Order',
    nameKo: '자본 질서',
    description: '글로벌 자본 궤도에 영향을 미치는 결정',
    
    coreJudgment: '글로벌 자본 궤도',
    approvalAuthority: 'supranational',
    approvalAuthorityKo: '초국가 자본',
    failureCostTime: 'decades',
    failureCostTimeKo: '세대+',
    
    color: {
      primary: '#FFD700',     // 금색
      secondary: '#FFC107',
      glow: '#FFE082',
      temperature: 3000,      // 따뜻함 (금)
    },
    
    ui: {
      blur: 15,
      drag: 9,
      confirmSteps: 5,
      ritualRequired: true,
      cooldown: 14400,
    },
    
    allowedComponents: [
      'GlobalFlowMap',
      'SovereignWealth',
      'MacroIndicators',
      'SystemicRisk',
      'CapitalCouncil',
    ],
    
    triggerConditions: ['메가펀드/금융질서', '시스템적 리스크'],
    
    examples: [
      '국부펀드 전략',
      '글로벌 금융 정책',
      '통화 정책 대응',
      '시스템적 리스크 관리',
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // K10: 헌법/원칙 (단독)
  // ─────────────────────────────────────────────────────────────────────────────
  K10: {
    id: 'K10',
    level: 10,
    name: 'Constitutional',
    nameKo: '헌법/원칙',
    description: '불변 규칙 및 시스템 근본 변경',
    
    coreJudgment: '불변 규칙',
    approvalAuthority: 'constitutional',
    approvalAuthorityKo: '창시자/헌법',
    failureCostTime: 'civilization',
    failureCostTimeKo: '문명 단위',
    
    color: {
      primary: '#FFFFFF',     // 순백
      secondary: '#F8FAFC',
      glow: '#FFFFFF',
      temperature: 10000,     // 극한 차가움 (신성)
    },
    
    ui: {
      blur: 20,
      drag: 10,
      confirmSteps: 5,
      ritualRequired: true,
      cooldown: 86400,        // 24시간
    },
    
    allowedComponents: [
      'ConstitutionalEditor',
      'FounderApproval',
      'ImmutableLog',
      'GenesisRecord',
    ],
    
    triggerConditions: ['시스템 헌법 수정'],
    
    examples: [
      'K·I·Ω·r 공식 변경',
      '스케일 체계 수정',
      '핵심 원칙 변경',
      '시스템 근본 재설계',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 조건에 맞는 최소 K단계 반환
 */
export function getMinimumScale(conditions: {
  isPersonal?: boolean;
  isTeamResource?: boolean;
  isOrgStructure?: boolean;
  isNewBusiness?: boolean;
  isLegalRegulatory?: boolean;
  isMultinational?: boolean;
  isESG?: boolean;
  isMegaFund?: boolean;
  isConstitutional?: boolean;
}): KScale {
  if (conditions.isConstitutional) return 'K10';
  if (conditions.isMegaFund) return 'K9';
  if (conditions.isESG) return 'K8';
  if (conditions.isMultinational) return 'K7';
  if (conditions.isLegalRegulatory) return 'K6';
  if (conditions.isNewBusiness) return 'K5';
  if (conditions.isOrgStructure) return 'K4';
  if (conditions.isTeamResource) return 'K3';
  if (conditions.isPersonal) return 'K1';
  return 'K1';
}

/**
 * K단계 레벨 숫자 반환
 */
export function getScaleLevel(scale: KScale): number {
  return SCALE_DEFINITIONS[scale].level;
}

/**
 * 색온도에 따른 CSS 필터 반환
 */
export function getTemperatureFilter(scale: KScale): string {
  const temp = SCALE_DEFINITIONS[scale].color.temperature;
  // 6500K가 기준 (중립)
  if (temp < 5000) return 'sepia(0.3)';      // 따뜻함
  if (temp > 8000) return 'hue-rotate(10deg) saturate(0.8)'; // 차가움
  return 'none';
}

/**
 * 드래그 저항 계수 반환
 */
export function getDragCoefficient(scale: KScale): number {
  return SCALE_DEFINITIONS[scale].ui.drag / 10; // 0.1 ~ 1.0
}

/**
 * 확인 단계 필요 여부
 */
export function requiresMultiStepConfirm(scale: KScale): boolean {
  return SCALE_DEFINITIONS[scale].ui.confirmSteps > 1;
}

/**
 * 의식적 진입 필요 여부
 */
export function requiresRitual(scale: KScale): boolean {
  return SCALE_DEFINITIONS[scale].ui.ritualRequired;
}

export default SCALE_DEFINITIONS;
