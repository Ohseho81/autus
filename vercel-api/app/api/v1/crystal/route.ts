// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🔮 수정구 API (Crystal)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import {
  generateScenario,
  generateCustomerBriefs,
  randomInt,
  randomFloat,
  randomChoice,
  formatDate,
  formatDateTime,
  generateUUID,
} from '@/lib/mock-data';
import type { Scenario, SimulationResult, ExecutionPlan } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/crystal
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'current';
    
    switch (endpoint) {
      case 'current':
        return getCurrent();
      case 'scenarios':
        return getScenarios();
      case 'recommend':
        return getRecommend();
      default:
        return getCurrent();
    }
  } catch (error) {
    return serverErrorResponse(error, 'Crystal API');
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/crystal
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'simulate';
    const body = await request.json();
    
    switch (endpoint) {
      case 'simulate':
        return postSimulate(body);
      case 'plan':
        return postPlan(body);
      default:
        return postSimulate(body);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Crystal API POST');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Current State
// ─────────────────────────────────────────────────────────────────────

function getCurrent() {
  const customerCount = randomInt(120, 150);
  const churnRate = randomFloat(0.05, 0.10);
  const newRate = randomFloat(0.08, 0.15);
  const avgTemperature = randomFloat(60, 75);
  const revenue = randomInt(35000000, 48000000);
  
  const atRiskCustomers = generateCustomerBriefs(randomInt(5, 12))
    .filter(c => c.temperatureZone === 'critical' || c.temperatureZone === 'warning');
  
  return successResponse({
    metrics: {
      customerCount,
      churnRate,
      newRate,
      avgTemperature,
      revenue,
    },
    atRisk: {
      count: atRiskCustomers.length,
      customers: atRiskCustomers,
    },
    sigma: randomFloat(0.65, 0.90),
  }, '현재 상태 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────────────

function getScenarios() {
  const scenarios: Scenario[] = [
    {
      id: generateUUID(),
      name: '적극 방어',
      description: '경쟁사 프로모션에 대응하는 방어 전략',
      type: 'strategy',
      assumptions: [
        { variable: 'marketing_cost', change: 2000000 },
        { variable: 'consultation_count', change: 20 },
      ],
      prediction: {
        customerCount: randomInt(135, 155),
        revenue: randomInt(40000000, 50000000),
        churnRate: randomFloat(0.03, 0.06),
      },
      roi: randomFloat(2.5, 4.0),
      isRecommended: true,
      createdAt: formatDateTime(),
    },
    {
      id: generateUUID(),
      name: '현상 유지',
      description: '현재 운영 방식 유지',
      type: 'strategy',
      assumptions: [],
      prediction: {
        customerCount: randomInt(115, 130),
        revenue: randomInt(35000000, 42000000),
        churnRate: randomFloat(0.06, 0.10),
      },
      roi: 1.0,
      isRecommended: false,
      createdAt: formatDateTime(),
    },
    {
      id: generateUUID(),
      name: '공격적 확장',
      description: '신규 고객 유치 집중',
      type: 'opportunity',
      assumptions: [
        { variable: 'marketing_cost', change: 5000000 },
        { variable: 'new_staff', change: 2 },
      ],
      prediction: {
        customerCount: randomInt(150, 180),
        revenue: randomInt(48000000, 60000000),
        churnRate: randomFloat(0.07, 0.12),
      },
      roi: randomFloat(1.8, 3.2),
      isRecommended: false,
      createdAt: formatDateTime(),
    },
  ];
  
  return successResponse({ scenarios }, '시나리오 목록 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Simulate
// ─────────────────────────────────────────────────────────────────────

function postSimulate(body: {
  name?: string;
  horizon?: number;
  assumptions?: Array<{ variable: string; change: number; changeType?: string }>;
  actions?: Array<{ type: string; targetCount: number; expectedEffect: number }>;
}) {
  const horizon = body.horizon || 3;
  const name = body.name || '사용자 정의 시나리오';
  
  // 타임라인 생성
  let customerCount = randomInt(125, 140);
  let revenue = randomInt(38000000, 45000000);
  let churnRate = randomFloat(0.06, 0.09);
  
  const timeline = Array.from({ length: horizon }, (_, i) => {
    // 가정에 따른 변화 시뮬레이션
    if (body.assumptions) {
      body.assumptions.forEach(assumption => {
        if (assumption.variable === 'churnRate') {
          churnRate = Math.max(0.02, churnRate + assumption.change);
        }
      });
    }
    
    // 액션 효과
    if (body.actions) {
      body.actions.forEach(action => {
        customerCount += Math.round(action.expectedEffect * action.targetCount * 0.1);
      });
    }
    
    customerCount = Math.round(customerCount * (1 + randomFloat(-0.02, 0.04)));
    revenue = Math.round(customerCount * 300000);
    
    return {
      month: i + 1,
      customerCount,
      revenue,
      churnRate: parseFloat(churnRate.toFixed(3)),
    };
  });
  
  const finalState = timeline[timeline.length - 1];
  const initialCustomerCount = randomInt(125, 140);
  const initialRevenue = randomInt(38000000, 45000000);
  
  const investment = body.assumptions?.reduce((sum, a) => {
    if (a.variable.includes('cost')) return sum + Math.abs(a.change);
    return sum;
  }, 0) || 0;
  
  const expectedReturn = finalState.revenue - initialRevenue;
  const roi = investment > 0 ? expectedReturn / investment : 1;
  
  const result: SimulationResult = {
    scenario: {
      id: generateUUID(),
      name,
    },
    timeline,
    finalState: {
      customerCount: finalState.customerCount,
      customerChange: finalState.customerCount - initialCustomerCount,
      revenue: finalState.revenue,
      revenueChange: finalState.revenue - initialRevenue,
    },
    investment,
    expectedReturn,
    roi: parseFloat(roi.toFixed(2)),
    confidence: randomFloat(0.7, 0.88),
  };
  
  return successResponse(result, '시뮬레이션 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Recommend
// ─────────────────────────────────────────────────────────────────────

function getRecommend() {
  return successResponse({
    recommendation: {
      scenarioId: generateUUID(),
      scenarioName: '적극 방어',
      reasoning: '현재 경쟁사 프로모션 위협이 감지되어, 기존 고객 방어에 집중하는 것이 ROI가 가장 높습니다.',
      pros: [
        '기존 고객 이탈 최소화',
        '투자 대비 수익률 높음',
        '빠른 효과 기대',
      ],
      cons: [
        '신규 고객 유치 제한',
        '추가 마케팅 비용 발생',
      ],
      roi: 3.2,
      confidence: 0.82,
    },
    alternatives: [
      { scenarioId: generateUUID(), scenarioName: '현상 유지', roi: 1.0 },
      { scenarioId: generateUUID(), scenarioName: '공격적 확장', roi: 2.1 },
    ],
  }, 'AI 추천 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Plan
// ─────────────────────────────────────────────────────────────────────

function postPlan(body: { scenarioId: string }) {
  const plan: ExecutionPlan = {
    scenarioId: body.scenarioId || generateUUID(),
    scenarioName: '적극 방어',
    tasks: [
      {
        id: generateUUID(),
        title: '위험 고객 긴급 상담',
        description: '온도 40° 미만 고객 대상 학부모 상담 실시',
        priority: 'critical',
        suggestedAssignee: '김원장',
        dueDate: formatDate(3),
        expectedEffect: { temperatureChange: 15, churnReduction: 0.15 },
      },
      {
        id: generateUUID(),
        title: '가치 재인식 메시지 발송',
        description: '전체 학부모 대상 학원 성과 안내 메시지',
        priority: 'high',
        suggestedAssignee: '관리자',
        dueDate: formatDate(5),
        expectedEffect: { temperatureChange: 5 },
      },
      {
        id: generateUUID(),
        title: '경쟁사 대응 프로모션',
        description: '재등록 시 할인 혜택 안내',
        priority: 'high',
        suggestedAssignee: '마케팅',
        dueDate: formatDate(7),
        expectedEffect: { churnReduction: 0.1 },
      },
      {
        id: generateUUID(),
        title: '담임 강사 집중 케어',
        description: '위험 고객 담당 강사 1:1 피드백 강화',
        priority: 'medium',
        suggestedAssignee: '강사진',
        dueDate: formatDate(7),
        expectedEffect: { temperatureChange: 10 },
      },
    ],
    milestones: [
      { week: 1, target: '긴급 고객 상담 완료', kpi: '위험 고객 50% 온도 상승' },
      { week: 2, target: '프로모션 실행', kpi: '재등록 의향 조사 완료' },
      { week: 4, target: '효과 측정', kpi: '이탈률 30% 감소' },
    ],
  };
  
  return successResponse({
    plan,
    message: `${plan.tasks.length}개 태스크가 생성되었습니다`,
  }, '실행 계획 생성 완료');
}
