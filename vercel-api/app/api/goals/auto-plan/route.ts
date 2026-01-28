// ============================================
// AUTUS Auto-Plan Generation API
// 목표 → 계획 → 태스크 자동 생성
// ============================================

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
interface Goal {
  type: string;
  target: number;
  deadline: string;
  current?: number;
}

interface Plan {
  id: string;
  title: string;
  weight: number;
  kpi: string;
  target: number;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  estimated_hours: number;
  assignee_role: 'FSD' | 'Optimus';
}

// ============================================
// Plan Templates by Goal Type
// ============================================
const PLAN_TEMPLATES: Record<string, Array<{
  title: string;
  weight: number;
  kpi: string;
  tasks: Array<{ title: string; priority: 'high' | 'medium' | 'low'; hours: number; role: 'FSD' | 'Optimus' }>;
}>> = {
  revenue: [
    {
      title: '신규 고객 유치',
      weight: 0.40,
      kpi: '신규 등록 수',
      tasks: [
        { title: '마케팅 캠페인 기획', priority: 'high', hours: 8, role: 'FSD' },
        { title: '광고 집행', priority: 'high', hours: 20, role: 'Optimus' },
        { title: '체험 수업 진행', priority: 'medium', hours: 40, role: 'Optimus' },
        { title: '상담 및 등록', priority: 'high', hours: 30, role: 'Optimus' },
      ],
    },
    {
      title: '기존 고객 유지',
      weight: 0.35,
      kpi: '재등록률',
      tasks: [
        { title: '이탈 위험 분석', priority: 'high', hours: 4, role: 'FSD' },
        { title: '케어 프로그램 실행', priority: 'high', hours: 20, role: 'Optimus' },
        { title: '만족도 조사', priority: 'medium', hours: 8, role: 'Optimus' },
      ],
    },
    {
      title: '객단가 상승',
      weight: 0.25,
      kpi: '평균 객단가',
      tasks: [
        { title: '프리미엄 상품 기획', priority: 'medium', hours: 8, role: 'FSD' },
        { title: '업셀링 상담', priority: 'medium', hours: 16, role: 'Optimus' },
      ],
    },
  ],
  
  margin: [
    {
      title: '매출 증대',
      weight: 0.40,
      kpi: '매출 성장률',
      tasks: [
        { title: '고수익 상품 확대', priority: 'high', hours: 8, role: 'FSD' },
        { title: '저수익 상품 정리', priority: 'medium', hours: 4, role: 'FSD' },
      ],
    },
    {
      title: '인건비 효율화',
      weight: 0.35,
      kpi: '인건비 비율',
      tasks: [
        { title: '업무 자동화 도입', priority: 'high', hours: 16, role: 'FSD' },
        { title: '인력 최적화', priority: 'high', hours: 8, role: 'FSD' },
      ],
    },
    {
      title: '고정비 절감',
      weight: 0.25,
      kpi: '고정비 비율',
      tasks: [
        { title: '임대료 협상', priority: 'medium', hours: 4, role: 'FSD' },
        { title: '공용 공간 활용', priority: 'low', hours: 8, role: 'Optimus' },
      ],
    },
  ],
  
  students: [
    {
      title: '신규 유치',
      weight: 0.50,
      kpi: '신규 등록 수',
      tasks: [
        { title: '홍보 활동', priority: 'high', hours: 20, role: 'Optimus' },
        { title: '제휴 마케팅', priority: 'medium', hours: 8, role: 'FSD' },
        { title: '입소문 이벤트', priority: 'medium', hours: 12, role: 'Optimus' },
      ],
    },
    {
      title: '이탈 방지',
      weight: 0.50,
      kpi: '이탈률',
      tasks: [
        { title: 'Risk Queue 관리', priority: 'high', hours: 8, role: 'FSD' },
        { title: '학부모 소통 강화', priority: 'high', hours: 16, role: 'Optimus' },
      ],
    },
  ],
  
  retention: [
    {
      title: '이탈 조기 감지',
      weight: 0.40,
      kpi: 'Risk Score',
      tasks: [
        { title: 'AI 예측 모델 운영', priority: 'high', hours: 4, role: 'FSD' },
        { title: '주간 리스크 리뷰', priority: 'high', hours: 4, role: 'FSD' },
      ],
    },
    {
      title: '만족도 개선',
      weight: 0.35,
      kpi: 'NPS',
      tasks: [
        { title: 'Safety Mirror 발송', priority: 'high', hours: 8, role: 'Optimus' },
        { title: '불만 사항 해결', priority: 'high', hours: 16, role: 'Optimus' },
      ],
    },
    {
      title: '관계 강화',
      weight: 0.25,
      kpi: '시너지 지수',
      tasks: [
        { title: '정기 상담', priority: 'medium', hours: 12, role: 'Optimus' },
        { title: '이벤트 참여', priority: 'low', hours: 8, role: 'Optimus' },
      ],
    },
  ],
  
  branches: [
    {
      title: '부지 선정',
      weight: 0.25,
      kpi: '후보지 평가 완료',
      tasks: [
        { title: '상권 분석', priority: 'high', hours: 16, role: 'FSD' },
        { title: '부지 답사', priority: 'high', hours: 8, role: 'FSD' },
      ],
    },
    {
      title: '계약 및 인테리어',
      weight: 0.40,
      kpi: '공사 완료율',
      tasks: [
        { title: '임대 계약', priority: 'high', hours: 8, role: 'FSD' },
        { title: '인테리어 감독', priority: 'high', hours: 40, role: 'Optimus' },
        { title: '설비 구매', priority: 'medium', hours: 16, role: 'Optimus' },
      ],
    },
    {
      title: '개원 준비',
      weight: 0.35,
      kpi: '개원 완료',
      tasks: [
        { title: '인력 채용', priority: 'high', hours: 24, role: 'FSD' },
        { title: '초기 마케팅', priority: 'high', hours: 20, role: 'Optimus' },
        { title: '시스템 세팅', priority: 'medium', hours: 8, role: 'Optimus' },
      ],
    },
  ],
  
  cost: [
    {
      title: '인건비 절감',
      weight: 0.40,
      kpi: '인건비 절감액',
      tasks: [
        { title: '업무 효율화', priority: 'high', hours: 16, role: 'FSD' },
        { title: '자동화 도입', priority: 'high', hours: 24, role: 'FSD' },
      ],
    },
    {
      title: '임대료 절감',
      weight: 0.30,
      kpi: '임대료 절감액',
      tasks: [
        { title: '재계약 협상', priority: 'medium', hours: 4, role: 'FSD' },
        { title: '공간 효율화', priority: 'low', hours: 8, role: 'Optimus' },
      ],
    },
    {
      title: '운영비 절감',
      weight: 0.30,
      kpi: '운영비 절감액',
      tasks: [
        { title: '공급업체 재협상', priority: 'medium', hours: 8, role: 'FSD' },
        { title: '에너지 효율화', priority: 'low', hours: 4, role: 'Optimus' },
      ],
    },
  ],
};

// ============================================
// Auto-Plan Generator
// ============================================
function generatePlans(goal: Goal): Plan[] {
  const templates = PLAN_TEMPLATES[goal.type] || PLAN_TEMPLATES.revenue;
  
  return templates.map((template, index) => {
    const planTarget = Math.round(goal.target * template.weight);
    
    return {
      id: `plan-${goal.type}-${index}`,
      title: template.title,
      weight: template.weight,
      kpi: template.kpi,
      target: planTarget,
      tasks: template.tasks.map((task, taskIndex) => ({
        id: `task-${goal.type}-${index}-${taskIndex}`,
        title: task.title,
        priority: task.priority,
        estimated_hours: task.hours,
        assignee_role: task.role,
      })),
    };
  });
}

// ============================================
// KPI Calculator
// ============================================
function calculateKPIs(goal: Goal, plans: Plan[]) {
  const daysToDeadline = Math.ceil(
    (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  const totalHours = plans.reduce(
    (sum, plan) => sum + plan.tasks.reduce((s, t) => s + t.estimated_hours, 0),
    0
  );
  
  const requiredVelocity = (goal.target - (goal.current || 0)) / Math.max(daysToDeadline, 1);
  
  return {
    days_remaining: daysToDeadline,
    total_task_hours: totalHours,
    required_daily_velocity: requiredVelocity,
    tasks_count: plans.reduce((sum, p) => sum + p.tasks.length, 0),
    high_priority_tasks: plans.reduce(
      (sum, p) => sum + p.tasks.filter(t => t.priority === 'high').length,
      0
    ),
  };
}

// ============================================
// OPTIONS (CORS)
// ============================================
export async function OPTIONS() {
  return optionsResponse();
}

// ============================================
// POST - 자동 계획 생성
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.type || body.target === undefined || !body.deadline) {
      return errorResponse('type, target, deadline are required', 400);
    }
    
    const goal: Goal = {
      type: body.type,
      target: body.target,
      deadline: body.deadline,
      current: body.current || 0,
    };
    
    // Validate goal type
    if (!PLAN_TEMPLATES[goal.type]) {
      return errorResponse(`Unknown goal type: ${goal.type}. Valid types: ${Object.keys(PLAN_TEMPLATES).join(', ')}`, 400);
    }
    
    // Generate plans
    const plans = generatePlans(goal);
    
    // Calculate KPIs
    const kpis = calculateKPIs(goal, plans);
    
    // Summary
    const summary = {
      goal_type: goal.type,
      target: goal.target,
      deadline: goal.deadline,
      plans_count: plans.length,
      total_weight: plans.reduce((sum, p) => sum + p.weight, 0),
    };
    
    return successResponse({
      goal,
      plans,
      kpis,
      summary,
      generated_at: new Date().toISOString(),
    }, 'Plans generated successfully');
    
  } catch (error) {
    return serverErrorResponse(error, 'Auto-Plan POST');
  }
}

// ============================================
// GET - 계획 템플릿 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalType = searchParams.get('type');
    
    if (goalType) {
      const template = PLAN_TEMPLATES[goalType];
      if (!template) {
        return errorResponse(`Unknown goal type: ${goalType}`, 404);
      }
      return successResponse({
        type: goalType,
        template,
      });
    }
    
    // Return all templates
    return successResponse({
      types: Object.keys(PLAN_TEMPLATES),
      templates: PLAN_TEMPLATES,
    });
    
  } catch (error) {
    return serverErrorResponse(error, 'Auto-Plan GET');
  }
}
