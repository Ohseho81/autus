/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Behavior API
 * 
 * 14개 행위 기록 및 σ 기여 계산
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  optionsResponse,
} from '../../../../lib/api-utils';

// ============================================
// Types
// ============================================
type BehaviorType =
  | 'REENROLLMENT'
  | 'REFERRAL'
  | 'ADDITIONAL_CLASS'
  | 'PAID_EVENT'
  | 'VOLUNTARY_STAY'
  | 'FREE_EVENT'
  | 'CLASS_PARTICIPATION'
  | 'ATTENDANCE'
  | 'PAYMENT'
  | 'COMMUNICATION'
  | 'POSITIVE_FEEDBACK'
  | 'MERCHANDISE'
  | 'COMPLAINT'
  | 'CHURN_SIGNAL';

interface BehaviorConfig {
  tier: number;
  base: number;
  modifiers: Record<string, number>;
  range: [number, number];
  description: string;
}

// ============================================
// 행위별 σ 설정 (14개)
// ============================================
const BEHAVIOR_CONFIG: Record<BehaviorType, BehaviorConfig> = {
  // Tier 1: 결정적
  REENROLLMENT: {
    tier: 1,
    base: 0.3,
    modifiers: {
      early: 0.1,
      consecutive: 0.1,
      expansion: 0.1,
    },
    range: [-0.15, 0.6],
    description: '재등록',
  },
  REFERRAL: {
    tier: 1,
    base: 0.2,
    modifiers: {
      converted: 0.3,
      multiple: 0.1,
      retained: 0.1,
    },
    range: [0, 0.7],
    description: '소개등록',
  },
  
  // Tier 2: 확장
  ADDITIONAL_CLASS: {
    tier: 2,
    base: 0.15,
    modifiers: {
      parentInitiated: 0.15,
      converted: 0.2,
      multiSubject: 0.1,
      sibling: 0.2,
    },
    range: [0, 0.65],
    description: '추가수강',
  },
  PAID_EVENT: {
    tier: 2,
    base: 0.15,
    modifiers: {
      highValue: 0.1,
      consecutive: 0.05,
    },
    range: [0, 0.3],
    description: '유료이벤트',
  },
  
  // Tier 3: 참여
  VOLUNTARY_STAY: {
    tier: 3,
    base: 0.1,
    modifiers: {
      studyRoom: 0.1,
      extraStay: 0.05,
    },
    range: [0, 0.25],
    description: '자발적체류',
  },
  FREE_EVENT: {
    tier: 3,
    base: 0.1,
    modifiers: {
      parentAttend: 0.1,
      active: 0.05,
    },
    range: [0, 0.25],
    description: '무료이벤트',
  },
  CLASS_PARTICIPATION: {
    tier: 3,
    base: 0.05,
    modifiers: {
      questions: 0.05,
      homework: 0.05,
      interaction: 0.05,
    },
    range: [0, 0.15],
    description: '수업참여',
  },
  
  // Tier 4: 유지
  ATTENDANCE: {
    tier: 4,
    base: 0,
    modifiers: {
      perfect: 0.1,
      noUnexcused: 0.05,
      latePenalty: -0.1,
    },
    range: [-0.1, 0.15],
    description: '출결',
  },
  PAYMENT: {
    tier: 4,
    base: 0,
    modifiers: {
      early: 0.1,
      auto: 0.05,
      late: -0.15,
      discount: -0.05,
    },
    range: [-0.2, 0.15],
    description: '수납',
  },
  COMMUNICATION: {
    tier: 4,
    base: 0,
    modifiers: {
      readRate: 0.05,
      responseRate: 0.05,
      compliance: 0.05,
    },
    range: [0, 0.15],
    description: '소통반응',
  },
  
  // Tier 5: 표현
  POSITIVE_FEEDBACK: {
    tier: 5,
    base: 0.1,
    modifiers: {
      onlineReview: 0.15,
      highSatisfaction: 0.05,
    },
    range: [0, 0.3],
    description: '긍정피드백',
  },
  MERCHANDISE: {
    tier: 5,
    base: 0.05,
    modifiers: {
      sns: 0.1,
      uniform: 0.05,
    },
    range: [0, 0.2],
    description: '굿즈소지',
  },
  
  // Tier 6: 부정
  COMPLAINT: {
    tier: 6,
    base: -0.1,
    modifiers: {
      severe: -0.2,
      negativeReview: -0.3,
      teacherChange: -0.1,
    },
    range: [-0.7, 0],
    description: '불만',
  },
  CHURN_SIGNAL: {
    tier: 6,
    base: -0.2,
    modifiers: {
      attendanceDrop: -0.2,
      noResponse: -0.15,
      paymentDelay: -0.15,
      competitor: -0.3,
    },
    range: [-0.8, 0],
    description: '이탈신호',
  },
};

// ============================================
// σ 기여 계산
// ============================================
function calculateSigmaContribution(
  behaviorType: BehaviorType,
  modifiers: Record<string, boolean | number> = {}
): { sigma: number; breakdown: Record<string, number> } {
  const config = BEHAVIOR_CONFIG[behaviorType];
  let sigma = config.base;
  const breakdown: Record<string, number> = { base: config.base };
  
  for (const [key, value] of Object.entries(modifiers)) {
    const modifier = config.modifiers[key];
    if (modifier !== undefined) {
      let contribution = 0;
      if (typeof value === 'boolean' && value) {
        contribution = modifier;
      } else if (typeof value === 'number') {
        contribution = modifier * value;
      }
      sigma += contribution;
      breakdown[key] = contribution;
    }
  }
  
  const [min, max] = config.range;
  const clampedSigma = Math.max(min, Math.min(max, sigma));
  
  return { sigma: clampedSigma, breakdown };
}

// In-memory store (실제 환경에서는 DB 사용)
const behaviorsStore: Array<{
  id: string;
  nodeId: string;
  behaviorType: BehaviorType;
  tier: number;
  sigmaContribution: number;
  modifiers: Record<string, boolean | number>;
  metadata?: Record<string, unknown>;
  recordedAt: string;
}> = [];

// ============================================
// OPTIONS
// ============================================
export async function OPTIONS() {
  return optionsResponse();
}

// ============================================
// POST - 행위 기록
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, behaviorType, modifiers = {}, metadata } = body;
    
    // Validation
    if (!nodeId) {
      return errorResponse('nodeId is required', 400);
    }
    if (!behaviorType || !BEHAVIOR_CONFIG[behaviorType as BehaviorType]) {
      return errorResponse(`Invalid behaviorType: ${behaviorType}`, 400);
    }
    
    // Calculate σ contribution
    const { sigma, breakdown } = calculateSigmaContribution(
      behaviorType as BehaviorType,
      modifiers
    );
    
    const config = BEHAVIOR_CONFIG[behaviorType as BehaviorType];
    
    // Create record
    const behavior = {
      id: `beh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      behaviorType: behaviorType as BehaviorType,
      tier: config.tier,
      sigmaContribution: sigma,
      modifiers,
      metadata,
      recordedAt: new Date().toISOString(),
    };
    
    behaviorsStore.push(behavior);
    
    return successResponse({
      behavior,
      calculation: {
        breakdown,
        range: config.range,
        description: config.description,
      },
    }, 'Behavior recorded');
    
  } catch (error) {
    return serverErrorResponse(error, 'Behavior POST');
  }
}

// ============================================
// GET - 행위 목록 / 설정 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const type = searchParams.get('type');
    const tier = searchParams.get('tier');
    
    // 특정 행위 타입 설정 조회
    if (type && BEHAVIOR_CONFIG[type as BehaviorType]) {
      const config = BEHAVIOR_CONFIG[type as BehaviorType];
      return successResponse({
        type,
        ...config,
      });
    }
    
    // 노드별 행위 기록 조회
    if (nodeId) {
      let filtered = behaviorsStore.filter(b => b.nodeId === nodeId);
      if (tier) {
        filtered = filtered.filter(b => b.tier === parseInt(tier));
      }
      
      const totalSigma = filtered.reduce((sum, b) => sum + b.sigmaContribution, 0);
      
      return successResponse({
        nodeId,
        behaviors: filtered,
        totalSigma,
        count: filtered.length,
      });
    }
    
    // 전체 설정 반환
    const tierSummary = {
      tier1_decisive: { behaviors: ['REENROLLMENT', 'REFERRAL'], maxSigma: 1.3 },
      tier2_expansion: { behaviors: ['ADDITIONAL_CLASS', 'PAID_EVENT'], maxSigma: 0.95 },
      tier3_engagement: { behaviors: ['VOLUNTARY_STAY', 'FREE_EVENT', 'CLASS_PARTICIPATION'], maxSigma: 0.65 },
      tier4_retention: { behaviors: ['ATTENDANCE', 'PAYMENT', 'COMMUNICATION'], maxSigma: 0.45 },
      tier5_expression: { behaviors: ['POSITIVE_FEEDBACK', 'MERCHANDISE'], maxSigma: 0.5 },
      tier6_warning: { behaviors: ['COMPLAINT', 'CHURN_SIGNAL'], maxSigma: -1.5 },
    };
    
    return successResponse({
      behaviors: Object.entries(BEHAVIOR_CONFIG).map(([type, config]) => ({
        type,
        ...config,
      })),
      tierSummary,
      totalRange: { min: -1.5, max: 3.85 },
      realisticRange: { min: 0.5, max: 2.5 },
    });
    
  } catch (error) {
    return serverErrorResponse(error, 'Behavior GET');
  }
}

// ============================================
// DELETE - 행위 기록 삭제
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const behaviorId = searchParams.get('id');
    
    if (!behaviorId) {
      return errorResponse('id is required', 400);
    }
    
    const index = behaviorsStore.findIndex(b => b.id === behaviorId);
    if (index === -1) {
      return errorResponse('Behavior not found', 404);
    }
    
    const deleted = behaviorsStore.splice(index, 1)[0];
    
    return successResponse({
      deleted,
    }, 'Behavior deleted');
    
  } catch (error) {
    return serverErrorResponse(error, 'Behavior DELETE');
  }
}
