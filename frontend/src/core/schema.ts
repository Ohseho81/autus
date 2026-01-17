// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Core Data Schema (The Soul)
// ═══════════════════════════════════════════════════════════════════════════════
//
// 모든 업무 개체(Entity)에 적용되는 핵심 스키마
// - K (Scale): 의사결정 고도 (K1~K10)
// - Ω (Irreversibility): 비가역성 (0~1)
// - F (Failure Cost): 실패 비용
// - A (Approval Authority): 승인 주체
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 기본 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * K-Scale (의사결정 고도)
 * K1: 개인 실행 → K10: 헌법/원칙
 */
export type KScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * 승인 주체 타입
 */
export type ApprovalAuthority = 
  | 'individual'       // K1: 개인
  | 'site_manager'     // K2: 현장 책임자
  | 'middle_manager'   // K3: 중간 관리자
  | 'executive'        // K4: 경영진
  | 'board'            // K5: 오너/이사회
  | 'legal'            // K6: 법적 승인
  | 'multilateral'     // K7: 다자 합의
  | 'social_consensus' // K8: 사회적 합의
  | 'supranational'    // K9: 초국가 자본
  | 'constitutional';  // K10: 창시자/헌법

/**
 * 실패 비용 단위
 */
export type FailureCostUnit = 
  | 'minutes' | 'hours' | 'days' | 'weeks' 
  | 'months' | 'quarters' | 'years' | 'decades' | 'generations';

/**
 * 실패 비용 구조
 */
export interface FailureCost {
  time: {
    value: number;
    unit: FailureCostUnit;
  };
  money?: {
    value: number;
    currency: 'KRW' | 'USD' | 'EUR';
  };
  impact?: {
    scope: 'individual' | 'team' | 'organization' | 'industry' | 'society' | 'civilization';
    description: string;
  };
}

/**
 * 비가역성 메타데이터
 */
export interface IrreversibilityMeta {
  omega: number;              // 0~1 (0: 완전 가역, 1: 완전 비가역)
  undoWindow?: number;        // Undo 가능 시간 (초)
  undoCost?: FailureCost;     // Undo 비용
  requiresRitual: boolean;    // 의식적 진입 필요 여부
  confirmSteps: number;       // 확인 단계 수 (1~5)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 핵심 Entity 인터페이스
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AUTUS Task Entity (업무 개체)
 * 모든 업무/결정/작업의 기본 단위
 */
export interface AutusTask {
  // 기본 식별
  id: string;
  name: string;
  description?: string;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTUS 핵심 속성 (K·Ω·F·A)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * K (Scale) - 의사결정 고도
   * 자동 계산되거나 명시적으로 지정
   */
  scale: {
    value: KScale;
    isAutoDetected: boolean;
    overrideReason?: string;
  };
  
  /**
   * Ω (Irreversibility) - 비가역성
   */
  irreversibility: IrreversibilityMeta;
  
  /**
   * F (Failure Cost) - 실패 비용
   */
  failureCost: FailureCost;
  
  /**
   * A (Approval Authority) - 승인 주체
   */
  approval: {
    authority: ApprovalAuthority;
    authorityId?: string;           // 실제 승인자 ID
    authorityName?: string;         // 승인자 이름
    status: 'pending' | 'approved' | 'rejected' | 'escalated';
    timestamp?: Date;
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 메타데이터
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 도메인 분류
   */
  domain: 'finance' | 'hr' | 'sales' | 'operations' | 'legal' | 'it' | 'strategy' | 'service';
  
  /**
   * 연관 관계
   */
  relations?: {
    parentId?: string;
    childIds?: string[];
    dependsOn?: string[];
    blockedBy?: string[];
  };
  
  /**
   * 실행 상태
   */
  execution: {
    status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    executorId?: string;
  };
  
  /**
   * 감사 로그
   */
  auditLog: AuditLogEntry[];
  
  /**
   * 생성/수정 정보
   */
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * 감사 로그 엔트리
 */
export interface AuditLogEntry {
  timestamp: Date;
  action: 'created' | 'updated' | 'approved' | 'rejected' | 'escalated' | 'executed' | 'undone';
  actorId: string;
  actorName?: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  isIrreversible: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. K-Scale 자동 판별 규칙
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gravity Trigger 조건
 * 특정 조건 충족 시 자동으로 K-Scale 상승
 */
export interface GravityTrigger {
  id: string;
  name: string;
  condition: GravityCondition;
  targetScale: KScale;
  isForced: boolean;      // 강제 적용 여부
  description: string;
}

export type GravityCondition = 
  | { type: 'money_threshold'; value: number; currency: 'KRW' | 'USD' }
  | { type: 'time_impact'; value: number; unit: FailureCostUnit }
  | { type: 'stakeholder_count'; value: number }
  | { type: 'legal_regulatory'; keywords: string[] }
  | { type: 'cross_border'; countries: string[] }
  | { type: 'esg_impact'; categories: string[] }
  | { type: 'system_change'; scope: 'config' | 'process' | 'structure' | 'principle' };

/**
 * 기본 Gravity Trigger 규칙
 */
export const DEFAULT_GRAVITY_TRIGGERS: GravityTrigger[] = [
  {
    id: 'gt-money-1b',
    name: '10억 이상 결제',
    condition: { type: 'money_threshold', value: 1_000_000_000, currency: 'KRW' },
    targetScale: 5,
    isForced: true,
    description: '10억원 이상 금액은 이사회 승인 필요',
  },
  {
    id: 'gt-money-100m',
    name: '1억 이상 결제',
    condition: { type: 'money_threshold', value: 100_000_000, currency: 'KRW' },
    targetScale: 4,
    isForced: true,
    description: '1억원 이상 금액은 경영진 승인 필요',
  },
  {
    id: 'gt-legal',
    name: '법적/규제 관련',
    condition: { type: 'legal_regulatory', keywords: ['계약', '세금', '소송', '규제', '라이선스'] },
    targetScale: 6,
    isForced: true,
    description: '법적 검토가 필요한 결정',
  },
  {
    id: 'gt-cross-border',
    name: '다국가 관련',
    condition: { type: 'cross_border', countries: [] },
    targetScale: 7,
    isForced: false,
    description: '여러 국가에 영향을 미치는 결정',
  },
  {
    id: 'gt-esg',
    name: 'ESG 영향',
    condition: { type: 'esg_impact', categories: ['환경', '사회', '지배구조', '탄소', '인권'] },
    targetScale: 8,
    isForced: false,
    description: '환경/사회/지배구조에 영향을 미치는 결정',
  },
  {
    id: 'gt-constitutional',
    name: '시스템 원칙 변경',
    condition: { type: 'system_change', scope: 'principle' },
    targetScale: 10,
    isForced: true,
    description: 'AUTUS 핵심 원칙/헌법 변경',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4. K-Scale → 속성 매핑
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScaleConfig {
  scale: KScale;
  name: string;
  nameKo: string;
  authority: ApprovalAuthority;
  authorityKo: string;
  failureTimeUnit: FailureCostUnit;
  failureTimeKo: string;
  
  // UI 설정
  ui: {
    color: string;
    glowColor: string;
    blur: number;           // 배경 흐림 (px)
    drag: number;           // 드래그 저항 (1~10)
    confirmSteps: number;   // 확인 단계
    ritualRequired: boolean;
    cooldown: number;       // 실행 후 대기 (초)
    temperature: number;    // 색온도 (K)
  };
  
  // LOD (Level of Detail) 설정
  lod: {
    showMetrics: boolean;
    showGraph: boolean;
    showFormula: boolean;
    maxVisibleNodes: number;
    detailLevel: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  };
}

export const SCALE_CONFIGS: Record<KScale, ScaleConfig> = {
  1: {
    scale: 1,
    name: 'Individual Execution',
    nameKo: '개인 실행',
    authority: 'individual',
    authorityKo: '개인',
    failureTimeUnit: 'minutes',
    failureTimeKo: '분~시간',
    ui: {
      color: '#10B981',
      glowColor: 'rgba(16, 185, 129, 0.5)',
      blur: 0,
      drag: 1,
      confirmSteps: 1,
      ritualRequired: false,
      cooldown: 0,
      temperature: 5500,
    },
    lod: {
      showMetrics: false,
      showGraph: false,
      showFormula: false,
      maxVisibleNodes: 10,
      detailLevel: 'minimal',
    },
  },
  2: {
    scale: 2,
    name: 'Site Operations',
    nameKo: '현장 운영',
    authority: 'site_manager',
    authorityKo: '현장 책임자',
    failureTimeUnit: 'hours',
    failureTimeKo: '시간',
    ui: {
      color: '#22D3EE',
      glowColor: 'rgba(34, 211, 238, 0.5)',
      blur: 1,
      drag: 2,
      confirmSteps: 1,
      ritualRequired: false,
      cooldown: 0,
      temperature: 5800,
    },
    lod: {
      showMetrics: false,
      showGraph: false,
      showFormula: false,
      maxVisibleNodes: 20,
      detailLevel: 'minimal',
    },
  },
  3: {
    scale: 3,
    name: 'Team Operations',
    nameKo: '팀/부서 운영',
    authority: 'middle_manager',
    authorityKo: '중간 관리자',
    failureTimeUnit: 'days',
    failureTimeKo: '일',
    ui: {
      color: '#3B82F6',
      glowColor: 'rgba(59, 130, 246, 0.5)',
      blur: 2,
      drag: 3,
      confirmSteps: 2,
      ritualRequired: false,
      cooldown: 60,
      temperature: 6200,
    },
    lod: {
      showMetrics: true,
      showGraph: false,
      showFormula: false,
      maxVisibleNodes: 50,
      detailLevel: 'standard',
    },
  },
  4: {
    scale: 4,
    name: 'Organizational Design',
    nameKo: '조직 설계',
    authority: 'executive',
    authorityKo: '경영진',
    failureTimeUnit: 'weeks',
    failureTimeKo: '주',
    ui: {
      color: '#8B5CF6',
      glowColor: 'rgba(139, 92, 246, 0.5)',
      blur: 4,
      drag: 5,
      confirmSteps: 3,
      ritualRequired: true,
      cooldown: 300,
      temperature: 6800,
    },
    lod: {
      showMetrics: true,
      showGraph: true,
      showFormula: false,
      maxVisibleNodes: 100,
      detailLevel: 'standard',
    },
  },
  5: {
    scale: 5,
    name: 'Business Portfolio',
    nameKo: '사업/산업 선택',
    authority: 'board',
    authorityKo: '오너/이사회',
    failureTimeUnit: 'months',
    failureTimeKo: '월',
    ui: {
      color: '#F59E0B',
      glowColor: 'rgba(245, 158, 11, 0.5)',
      blur: 6,
      drag: 6,
      confirmSteps: 3,
      ritualRequired: true,
      cooldown: 600,
      temperature: 4500,
    },
    lod: {
      showMetrics: true,
      showGraph: true,
      showFormula: false,
      maxVisibleNodes: 200,
      detailLevel: 'detailed',
    },
  },
  6: {
    scale: 6,
    name: 'Regulatory Response',
    nameKo: '제도·규제 대응',
    authority: 'legal',
    authorityKo: '법적 승인',
    failureTimeUnit: 'quarters',
    failureTimeKo: '분기~년',
    ui: {
      color: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.5)',
      blur: 8,
      drag: 7,
      confirmSteps: 4,
      ritualRequired: true,
      cooldown: 1800,
      temperature: 3500,
    },
    lod: {
      showMetrics: true,
      showGraph: true,
      showFormula: true,
      maxVisibleNodes: 300,
      detailLevel: 'detailed',
    },
  },
  7: {
    scale: 7,
    name: 'Block Alignment',
    nameKo: '블록 정렬',
    authority: 'multilateral',
    authorityKo: '다자 합의',
    failureTimeUnit: 'years',
    failureTimeKo: '수년',
    ui: {
      color: '#6366F1',
      glowColor: 'rgba(99, 102, 241, 0.5)',
      blur: 10,
      drag: 8,
      confirmSteps: 4,
      ritualRequired: true,
      cooldown: 3600,
      temperature: 7500,
    },
    lod: {
      showMetrics: true,
      showGraph: true,
      showFormula: true,
      maxVisibleNodes: 400,
      detailLevel: 'comprehensive',
    },
  },
  8: {
    scale: 8,
    name: 'Civilization Impact',
    nameKo: '문명 영향',
    authority: 'social_consensus',
    authorityKo: '사회적 합의',
    failureTimeUnit: 'decades',
    failureTimeKo: '세대',
    ui: {
      color: '#EC4899',
      glowColor: 'rgba(236, 72, 153, 0.5)',
      blur: 12,
      drag: 9,
      confirmSteps: 5,
      ritualRequired: true,
      cooldown: 7200,
      temperature: 8500,
    },
    lod: {
      showMetrics: true,
      showGraph: true,
      showFormula: true,
      maxVisibleNodes: 500,
      detailLevel: 'comprehensive',
    },
  },
  9: {
    scale: 9,
    name: 'Capital Order',
    nameKo: '자본 질서',
    authority: 'supranational',
    authorityKo: '초국가 자본',
    failureTimeUnit: 'decades',
    failureTimeKo: '세대+',
    ui: {
      color: '#FFD700',
      glowColor: 'rgba(255, 215, 0, 0.5)',
      blur: 15,
      drag: 9,
      confirmSteps: 5,
      ritualRequired: true,
      cooldown: 14400,
      temperature: 3000,
    },
    lod: {
      showMetrics: true,
      showGraph: true,
      showFormula: true,
      maxVisibleNodes: 550,
      detailLevel: 'comprehensive',
    },
  },
  10: {
    scale: 10,
    name: 'Constitutional',
    nameKo: '헌법/원칙',
    authority: 'constitutional',
    authorityKo: '창시자/헌법',
    failureTimeUnit: 'generations',
    failureTimeKo: '문명 단위',
    ui: {
      color: '#FFFFFF',
      glowColor: 'rgba(255, 255, 255, 0.8)',
      blur: 20,
      drag: 10,
      confirmSteps: 5,
      ritualRequired: true,
      cooldown: 86400,
      temperature: 10000,
    },
    lod: {
      showMetrics: true,
      showGraph: true,
      showFormula: true,
      maxVisibleNodes: 570,
      detailLevel: 'comprehensive',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gravity Trigger 평가
 * 주어진 Task의 조건을 평가하여 최소 필요 K-Scale 반환
 */
export function evaluateGravityTriggers(
  task: Partial<AutusTask>,
  triggers: GravityTrigger[] = DEFAULT_GRAVITY_TRIGGERS
): { scale: KScale; trigger: GravityTrigger | null; reason: string } {
  let maxScale: KScale = 1;
  let matchedTrigger: GravityTrigger | null = null;
  let reason = '기본 개인 실행';
  
  for (const trigger of triggers) {
    const { condition, targetScale, isForced } = trigger;
    let matched = false;
    
    switch (condition.type) {
      case 'money_threshold':
        if (task.failureCost?.money && task.failureCost.money.value >= condition.value) {
          matched = true;
        }
        break;
      
      case 'legal_regulatory':
        if (task.domain === 'legal' || 
            condition.keywords.some(kw => 
              task.name?.includes(kw) || task.description?.includes(kw)
            )) {
          matched = true;
        }
        break;
      
      case 'system_change':
        if (condition.scope === 'principle' && task.domain === 'strategy') {
          // 추가 로직 필요
        }
        break;
      
      // 기타 조건들...
    }
    
    if (matched && targetScale > maxScale) {
      maxScale = targetScale;
      matchedTrigger = trigger;
      reason = trigger.description;
    }
  }
  
  return { scale: maxScale, trigger: matchedTrigger, reason };
}

/**
 * K-Scale에 따른 설정 반환
 */
export function getScaleConfig(scale: KScale): ScaleConfig {
  return SCALE_CONFIGS[scale];
}

/**
 * 비가역성 계산
 * K-Scale과 실패 비용을 기반으로 Omega 값 계산
 */
export function calculateIrreversibility(
  scale: KScale,
  failureCost: FailureCost
): number {
  // 기본 비가역성 (K-Scale 기반)
  const baseOmega = scale / 10;
  
  // 시간 기반 가중치
  const timeWeights: Record<FailureCostUnit, number> = {
    minutes: 0.05,
    hours: 0.1,
    days: 0.2,
    weeks: 0.3,
    months: 0.5,
    quarters: 0.6,
    years: 0.8,
    decades: 0.9,
    generations: 1.0,
  };
  
  const timeWeight = timeWeights[failureCost.time.unit] || 0.1;
  
  // 최종 Omega (0~1)
  return Math.min(1, (baseOmega * 0.6) + (timeWeight * 0.4));
}

/**
 * Task 생성 헬퍼
 */
export function createTask(
  partial: Partial<AutusTask> & { name: string; domain: AutusTask['domain'] }
): AutusTask {
  const now = new Date();
  const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Gravity Trigger 평가
  const { scale, reason } = evaluateGravityTriggers(partial);
  const config = getScaleConfig(partial.scale?.value || scale);
  
  // 기본 실패 비용
  const defaultFailureCost: FailureCost = {
    time: { value: 1, unit: config.failureTimeUnit },
  };
  
  const finalFailureCost = partial.failureCost || defaultFailureCost;
  const omega = calculateIrreversibility(scale, finalFailureCost);
  
  return {
    id,
    name: partial.name,
    description: partial.description,
    
    scale: {
      value: partial.scale?.value || scale,
      isAutoDetected: !partial.scale?.value,
      overrideReason: partial.scale?.value ? undefined : reason,
    },
    
    irreversibility: partial.irreversibility || {
      omega,
      undoWindow: config.ui.cooldown,
      requiresRitual: config.ui.ritualRequired,
      confirmSteps: config.ui.confirmSteps,
    },
    
    failureCost: finalFailureCost,
    
    approval: partial.approval || {
      authority: config.authority,
      status: 'pending',
    },
    
    domain: partial.domain,
    relations: partial.relations,
    
    execution: partial.execution || {
      status: 'draft',
    },
    
    auditLog: [{
      timestamp: now,
      action: 'created',
      actorId: partial.createdBy || 'system',
      isIrreversible: false,
    }],
    
    createdAt: now,
    updatedAt: now,
    createdBy: partial.createdBy || 'system',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  SCALE_CONFIGS,
  DEFAULT_GRAVITY_TRIGGERS,
  evaluateGravityTriggers,
  getScaleConfig,
  calculateIrreversibility,
  createTask,
};
