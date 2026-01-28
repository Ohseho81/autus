// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🏆 스코어보드 API (Scoreboard)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import {
  generateGoal,
  randomInt,
  randomFloat,
  randomChoice,
  formatDate,
  generateUUID,
} from '@/lib/mock-data';
import type { CompetitorComparison, Goal } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/score
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'competitors';
    
    switch (endpoint) {
      case 'competitors':
        return getCompetitors(searchParams);
      case 'goals':
        return getGoals();
      case 'trends':
        return getTrends(searchParams);
      default:
        return getCompetitors(searchParams);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Score API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Competitors
// ─────────────────────────────────────────────────────────────────────

function getCompetitors(params: URLSearchParams) {
  const competitorId = params.get('competitorId');
  
  const competitors = ['A학원', 'B학원', 'C학원', 'D학원'];
  const metrics = [
    { metric: 'customerCount', label: '재원수' },
    { metric: 'avgTemperature', label: '평균 온도' },
    { metric: 'churnRate', label: '이탈률' },
    { metric: 'referralRate', label: '추천률' },
    { metric: 'satisfaction', label: '만족도' },
  ];
  
  const comparisons: CompetitorComparison[] = competitors
    .filter(name => !competitorId || name.includes(competitorId))
    .map(name => {
      const metricResults = metrics.map(m => {
        const ourValue = randomFloat(60, 90);
        const theirValue = randomFloat(50, 85);
        const diff = ourValue - theirValue;
        
        return {
          metric: m.metric,
          label: m.label,
          ourValue: parseFloat(ourValue.toFixed(1)),
          theirValue: parseFloat(theirValue.toFixed(1)),
          result: diff > 2 ? 'win' : diff < -2 ? 'lose' : 'tie' as 'win' | 'lose' | 'tie',
          difference: parseFloat(diff.toFixed(1)),
        };
      });
      
      const wins = metricResults.filter(m => m.result === 'win').length;
      const losses = metricResults.filter(m => m.result === 'lose').length;
      const ties = metricResults.filter(m => m.result === 'tie').length;
      
      return {
        competitor: {
          id: generateUUID(),
          name,
        },
        metrics: metricResults,
        summary: {
          wins,
          losses,
          ties,
          overallResult: wins > losses ? 'winning' : wins < losses ? 'losing' : 'tied' as 'winning' | 'losing' | 'tied',
        },
      };
    });
  
  return successResponse({ comparisons }, '경쟁사 비교 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Goals
// ─────────────────────────────────────────────────────────────────────

function getGoals() {
  const goals: Goal[] = [
    {
      metric: 'customerCount',
      label: '재원수',
      current: randomInt(120, 140),
      target: 150,
      progress: 0,
      status: 'on_track',
      gap: 0,
      trend: 'improving',
    },
    {
      metric: 'avgTemperature',
      label: '평균 온도',
      current: randomFloat(65, 72),
      target: 75,
      progress: 0,
      status: 'at_risk',
      gap: 0,
      trend: 'stable',
    },
    {
      metric: 'churnRate',
      label: '이탈률',
      current: randomFloat(0.05, 0.08),
      target: 0.05,
      progress: 0,
      status: 'behind',
      gap: 0,
      trend: 'declining',
    },
    {
      metric: 'revenue',
      label: '월 매출',
      current: randomInt(35000000, 42000000),
      target: 45000000,
      progress: 0,
      status: 'on_track',
      gap: 0,
      trend: 'improving',
    },
  ];
  
  // 진행률 및 gap 계산
  goals.forEach(g => {
    if (g.metric === 'churnRate') {
      // 이탈률은 낮을수록 좋음
      g.progress = Math.round(((g.target / g.current) * 100));
      g.gap = g.current - g.target;
    } else {
      g.progress = Math.round((g.current / g.target) * 100);
      g.gap = g.target - g.current;
    }
    
    // 상태 재계산
    if (g.progress >= 100) g.status = 'achieved';
    else if (g.progress >= 80) g.status = 'on_track';
    else if (g.progress >= 60) g.status = 'at_risk';
    else g.status = 'behind';
  });
  
  const overallProgress = Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);
  
  return successResponse({
    goals,
    overallProgress,
  }, '목표 현황 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Trends
// ─────────────────────────────────────────────────────────────────────

function getTrends(params: URLSearchParams) {
  const period = params.get('period') || '3m';
  const months = period === '1y' ? 12 : period === '6m' ? 6 : period === '1m' ? 1 : 3;
  
  // 우리 트렌드 데이터
  const ourTrends = ['customerCount', 'avgTemperature', 'revenue'].map(metric => {
    const data = Array.from({ length: months }, (_, i) => ({
      date: formatDate(-30 * (months - i - 1)),
      value: randomFloat(60, 90),
    }));
    
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      metric,
      data,
      change: parseFloat(change.toFixed(1)),
    };
  });
  
  // 경쟁사 트렌드
  const competitorTrends = ['A학원', 'B학원', 'C학원'].map(name => ({
    competitorId: generateUUID(),
    competitorName: name,
    metric: 'customerCount',
    change: randomFloat(-5, 8),
  }));
  
  return successResponse({
    ourTrends,
    competitorTrends,
  }, '트렌드 조회 성공');
}
