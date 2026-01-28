// ============================================
// AUTUS Owner Goals API
// 오너 목표 설정 및 관리
// ============================================

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  optionsResponse,
  validateRequest,
  generateUUID,
} from '../../../lib/api-utils';

// ============================================
// Types
// ============================================
interface Goal {
  id: string;
  org_id: string;
  type: GoalType;
  title: string;
  description?: string;
  target: number | string;
  current: number | string;
  unit: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  status: GoalStatus;
  progress: number;
  milestones: Milestone[];
  strategies: string[];
  assigned_to: string;
  kpis: KPI[];
  auto_track: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

type GoalType = 
  | 'revenue'        // 매출 목표
  | 'branch_expand'  // 지점 확장
  | 'margin'         // 이익률
  | 'closure'        // 효율적 폐쇄
  | 'mna'           // 인수합병
  | 'cost_reduction' // 비용 절감
  | 'student_count'  // 학생 수
  | 'custom';        // 커스텀

type GoalStatus = 
  | 'draft'
  | 'active'
  | 'on_track'
  | 'at_risk'
  | 'behind'
  | 'achieved'
  | 'cancelled';

interface Milestone {
  id: string;
  label: string;
  target: number | string;
  actual?: number | string;
  due_date: string;
  achieved: boolean;
}

interface KPI {
  id: string;
  name: string;
  formula?: string;
  target: number;
  current: number;
  weight: number; // 0-1
}

// ============================================
// Mock Data Store
// ============================================
const goalsStore: Map<string, Goal> = new Map();

// Initialize with sample goals
const initializeMockGoals = () => {
  const sampleGoals: Goal[] = [
    {
      id: 'goal-1',
      org_id: 'demo-org',
      type: 'revenue',
      title: '월매출 1.5억원 달성',
      description: '신규 등록 캠페인과 재등록 할인을 통한 매출 증대',
      target: 150000000,
      current: 127500000,
      unit: '원',
      timeframe: 'monthly',
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      status: 'on_track',
      progress: 85,
      milestones: [
        { id: 'm1', label: '1주차', target: 37500000, actual: 38000000, due_date: '2026-01-07', achieved: true },
        { id: 'm2', label: '2주차', target: 75000000, actual: 72000000, due_date: '2026-01-14', achieved: false },
        { id: 'm3', label: '3주차', target: 112500000, actual: 115000000, due_date: '2026-01-21', achieved: true },
        { id: 'm4', label: '4주차', target: 150000000, due_date: '2026-01-31', achieved: false },
      ],
      strategies: ['신규 등록 캠페인', '재등록 할인', '추천 인센티브'],
      assigned_to: 'FSD',
      kpis: [
        { id: 'kpi1', name: '신규 등록', target: 30, current: 24, weight: 0.4 },
        { id: 'kpi2', name: '재등록률', target: 85, current: 82, weight: 0.3 },
        { id: 'kpi3', name: '객단가', target: 500000, current: 480000, weight: 0.3 },
      ],
      auto_track: true,
      created_by: 'c_level',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-24T00:00:00Z',
    },
    {
      id: 'goal-2',
      org_id: 'demo-org',
      type: 'branch_expand',
      title: '분당 지역 신규 지점 개설',
      description: '분당 정자동 상권에 신규 지점 개설',
      target: 1,
      current: 0,
      unit: '개',
      timeframe: 'quarterly',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      status: 'active',
      progress: 35,
      milestones: [
        { id: 'm1', label: '부지 선정', target: 1, actual: 1, due_date: '2026-01-15', achieved: true },
        { id: 'm2', label: '계약 체결', target: 1, due_date: '2026-02-15', achieved: false },
        { id: 'm3', label: '인테리어', target: 1, due_date: '2026-03-15', achieved: false },
        { id: 'm4', label: '개원', target: 1, due_date: '2026-03-31', achieved: false },
      ],
      strategies: ['상권 분석 완료', '부동산 협상 중', '인테리어 업체 선정'],
      assigned_to: 'C-Level',
      kpis: [
        { id: 'kpi1', name: '예산 집행률', target: 100, current: 20, weight: 0.5 },
        { id: 'kpi2', name: '일정 준수율', target: 100, current: 80, weight: 0.5 },
      ],
      auto_track: false,
      created_by: 'c_level',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-24T00:00:00Z',
    },
    {
      id: 'goal-3',
      org_id: 'demo-org',
      type: 'margin',
      title: '영업이익률 25% 달성',
      description: '비용 효율화와 매출 증대를 통한 수익성 개선',
      target: 25,
      current: 21.5,
      unit: '%',
      timeframe: 'yearly',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'at_risk',
      progress: 86,
      milestones: [
        { id: 'm1', label: 'Q1', target: 22, actual: 21.5, due_date: '2026-03-31', achieved: false },
        { id: 'm2', label: 'Q2', target: 23, due_date: '2026-06-30', achieved: false },
        { id: 'm3', label: 'Q3', target: 24, due_date: '2026-09-30', achieved: false },
        { id: 'm4', label: 'Q4', target: 25, due_date: '2026-12-31', achieved: false },
      ],
      strategies: ['강사비 효율화', '시설 공유', '디지털 전환'],
      assigned_to: 'FSD',
      kpis: [
        { id: 'kpi1', name: '인건비 비율', target: 45, current: 48, weight: 0.4 },
        { id: 'kpi2', name: '임대료 비율', target: 15, current: 16, weight: 0.3 },
        { id: 'kpi3', name: '마케팅비 ROI', target: 300, current: 250, weight: 0.3 },
      ],
      auto_track: true,
      created_by: 'c_level',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-24T00:00:00Z',
    },
    {
      id: 'goal-4',
      org_id: 'demo-org',
      type: 'mna',
      title: '경쟁 학원 2개 인수',
      description: '지역 내 경쟁 학원 인수를 통한 시장 점유율 확대',
      target: 2,
      current: 1,
      unit: '건',
      timeframe: 'yearly',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'on_track',
      progress: 50,
      milestones: [
        { id: 'm1', label: '타겟 선정', target: 3, actual: 3, due_date: '2026-02-28', achieved: true },
        { id: 'm2', label: '실사 진행', target: 2, actual: 2, due_date: '2026-05-31', achieved: true },
        { id: 'm3', label: '인수 협상', target: 2, actual: 1, due_date: '2026-09-30', achieved: false },
        { id: 'm4', label: '인수 완료', target: 2, actual: 1, due_date: '2026-12-31', achieved: false },
      ],
      strategies: ['A학원 인수 완료', 'B학원 협상 중', 'C학원 백업'],
      assigned_to: 'C-Level',
      kpis: [
        { id: 'kpi1', name: '인수가 대비 가치', target: 150, current: 160, weight: 0.5 },
        { id: 'kpi2', name: '학생 이탈률', target: 10, current: 8, weight: 0.5 },
      ],
      auto_track: false,
      created_by: 'c_level',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-24T00:00:00Z',
    },
  ];

  sampleGoals.forEach(goal => goalsStore.set(goal.id, goal));
};

initializeMockGoals();

// ============================================
// Goal Progress Calculator
// ============================================
function calculateGoalProgress(goal: Goal): number {
  if (typeof goal.target === 'number' && typeof goal.current === 'number') {
    if (goal.target === 0) return 0;
    return Math.min(100, Math.round((goal.current / goal.target) * 100));
  }
  
  // Milestone-based progress for non-numeric goals
  if (goal.milestones.length > 0) {
    const achieved = goal.milestones.filter(m => m.achieved).length;
    return Math.round((achieved / goal.milestones.length) * 100);
  }
  
  return goal.progress || 0;
}

// ============================================
// Goal Status Determiner
// ============================================
function determineGoalStatus(goal: Goal): GoalStatus {
  const progress = calculateGoalProgress(goal);
  const now = new Date();
  const endDate = new Date(goal.end_date);
  const startDate = new Date(goal.start_date);
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100);

  if (goal.status === 'achieved' || goal.status === 'cancelled') {
    return goal.status;
  }

  if (progress >= 100) {
    return 'achieved';
  }

  if (progress >= expectedProgress - 5) {
    return 'on_track';
  }

  if (progress >= expectedProgress - 15) {
    return 'at_risk';
  }

  return 'behind';
}

// ============================================
// OPTIONS (CORS)
// ============================================
export async function OPTIONS() {
  return optionsResponse();
}

// ============================================
// GET - 목표 목록 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id') || 'demo-org';
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const timeframe = searchParams.get('timeframe');

    let goals = Array.from(goalsStore.values())
      .filter(g => g.org_id === orgId);

    // Apply filters
    if (type) {
      goals = goals.filter(g => g.type === type);
    }
    if (status) {
      goals = goals.filter(g => g.status === status);
    }
    if (timeframe) {
      goals = goals.filter(g => g.timeframe === timeframe);
    }

    // Update progress and status dynamically
    goals = goals.map(goal => ({
      ...goal,
      progress: calculateGoalProgress(goal),
      status: determineGoalStatus(goal),
    }));

    // Calculate summary
    const summary = {
      total: goals.length,
      achieved: goals.filter(g => g.status === 'achieved').length,
      on_track: goals.filter(g => g.status === 'on_track').length,
      at_risk: goals.filter(g => g.status === 'at_risk').length,
      behind: goals.filter(g => g.status === 'behind').length,
      avg_progress: goals.length > 0
        ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
        : 0,
    };

    return successResponse({
      goals,
      summary,
      filters: { type, status, timeframe },
    });

  } catch (error) {
    return serverErrorResponse(error, 'Goals GET');
  }
}

// ============================================
// POST - 목표 생성/수정
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const validation = validateRequest(body, {
          type: { required: true, type: 'string' },
          title: { required: true, type: 'string', min: 2 },
          target: { required: true },
          start_date: { required: true, type: 'string' },
          end_date: { required: true, type: 'string' },
        });

        if (!validation.valid) {
          return errorResponse('Validation failed', 400, { errors: validation.errors });
        }

        const newGoal: Goal = {
          id: `goal-${generateUUID().substring(0, 8)}`,
          org_id: body.org_id || 'demo-org',
          type: body.type,
          title: body.title,
          description: body.description || '',
          target: body.target,
          current: body.current || 0,
          unit: body.unit || '',
          timeframe: body.timeframe || 'custom',
          start_date: body.start_date,
          end_date: body.end_date,
          status: 'active',
          progress: 0,
          milestones: body.milestones || [],
          strategies: body.strategies || [],
          assigned_to: body.assigned_to || 'FSD',
          kpis: body.kpis || [],
          auto_track: body.auto_track || false,
          created_by: body.created_by || 'c_level',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        goalsStore.set(newGoal.id, newGoal);

        return successResponse(newGoal, 'Goal created successfully');
      }

      case 'update': {
        const { goal_id, ...updates } = body;

        if (!goal_id || !goalsStore.has(goal_id)) {
          return errorResponse('Goal not found', 404);
        }

        const existing = goalsStore.get(goal_id)!;
        const updated: Goal = {
          ...existing,
          ...updates,
          id: goal_id, // Preserve ID
          updated_at: new Date().toISOString(),
        };

        // Recalculate progress and status
        updated.progress = calculateGoalProgress(updated);
        updated.status = determineGoalStatus(updated);

        goalsStore.set(goal_id, updated);

        return successResponse(updated, 'Goal updated successfully');
      }

      case 'update_progress': {
        const { goal_id, current, milestone_updates } = body;

        if (!goal_id || !goalsStore.has(goal_id)) {
          return errorResponse('Goal not found', 404);
        }

        const existing = goalsStore.get(goal_id)!;
        
        // Update current value
        if (current !== undefined) {
          existing.current = current;
        }

        // Update milestones
        if (milestone_updates && Array.isArray(milestone_updates)) {
          milestone_updates.forEach(mu => {
            const milestone = existing.milestones.find(m => m.id === mu.id);
            if (milestone) {
              if (mu.actual !== undefined) milestone.actual = mu.actual;
              if (mu.achieved !== undefined) milestone.achieved = mu.achieved;
            }
          });
        }

        existing.progress = calculateGoalProgress(existing);
        existing.status = determineGoalStatus(existing);
        existing.updated_at = new Date().toISOString();

        goalsStore.set(goal_id, existing);

        return successResponse(existing, 'Progress updated');
      }

      case 'change_status': {
        const { goal_id, new_status } = body;

        if (!goal_id || !goalsStore.has(goal_id)) {
          return errorResponse('Goal not found', 404);
        }

        const validStatuses: GoalStatus[] = ['draft', 'active', 'on_track', 'at_risk', 'behind', 'achieved', 'cancelled'];
        if (!validStatuses.includes(new_status)) {
          return errorResponse('Invalid status', 400);
        }

        const existing = goalsStore.get(goal_id)!;
        existing.status = new_status;
        existing.updated_at = new Date().toISOString();

        goalsStore.set(goal_id, existing);

        return successResponse(existing, `Status changed to ${new_status}`);
      }

      default:
        return errorResponse('Invalid action', 400);
    }

  } catch (error) {
    return serverErrorResponse(error, 'Goals POST');
  }
}

// ============================================
// DELETE - 목표 삭제
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goal_id');

    if (!goalId) {
      return errorResponse('goal_id is required', 400);
    }

    if (!goalsStore.has(goalId)) {
      return errorResponse('Goal not found', 404);
    }

    goalsStore.delete(goalId);

    return successResponse({ deleted: true, goal_id: goalId }, 'Goal deleted');

  } catch (error) {
    return serverErrorResponse(error, 'Goals DELETE');
  }
}
