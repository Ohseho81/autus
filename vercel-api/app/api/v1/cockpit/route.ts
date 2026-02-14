// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🎛️ 조종석 API (Cockpit)
// 실제 Supabase 데이터 연동
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  optionsResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import {
  generateCustomerBriefs,
  generateAlert,
  generateAction,
  randomInt,
  randomFloat,
  randomChoice,
  formatDateTime,
} from '@/lib/mock-data';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { CockpitSummary, Alert, Action, StatusLevel, WeatherType } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/cockpit - 조종석 전체 요약
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'summary';
    const orgId = searchParams.get('org_id') || process.env.DEFAULT_ORG_ID || '';
    
    switch (endpoint) {
      case 'summary':
        return getSummary(orgId);
      case 'alerts':
        return getAlerts(searchParams);
      case 'actions':
        return getActions(searchParams);
      default:
        return getSummary(orgId);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Cockpit API');
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Summary - 실제 DB 연동
// ─────────────────────────────────────────────────────────────────────

async function getSummary(orgId: string) {
  try {
    const supabase = getSupabaseAdmin();
    
    // 고객 온도 데이터 조회
    const { data: customers, error } = await supabase
      .from('customer_temperatures')
      .select('*')
      .eq('org_id', orgId);

    if (error || !customers || customers.length === 0) {
      console.log('Cockpit: Using mock data -', error?.message || 'No data');
      return getMockSummary();
    }

    // 실제 데이터 기반 통계 계산
    const riskCount = customers.filter(c => c.risk_score >= 0.7).length;
    const warningCount = customers.filter(c => c.risk_score >= 0.5 && c.risk_score < 0.7).length;
    const healthyCount = customers.filter(c => c.risk_score < 0.5).length;
    const avgTemperature = customers.reduce((sum, c) => sum + Number(c.temperature), 0) / customers.length;
    
    // 상태 등급 결정
    let level: StatusLevel = 'green';
    let label = '양호';
    
    if (riskCount >= 3 || avgTemperature < 50) {
      level = 'red';
      label = '위험';
    } else if (riskCount >= 1 || warningCount >= 5) {
      level = 'yellow';
      label = '주의 필요';
    }
    
    const summary: CockpitSummary = {
      status: {
        level,
        label,
        updatedAt: new Date().toISOString(),
      },
      internal: {
        customerCount: customers.length,
        avgTemperature: Math.round(avgTemperature * 100) / 100,
        riskCount,
        warningCount,
        healthyCount,
        pendingConsultations: riskCount,
        unresolvedVoices: warningCount,
        pendingTasks: riskCount + warningCount,
      },
      external: {
        sigma: Math.round((1 - (riskCount / customers.length)) * 100) / 100,
        weatherForecast: riskCount >= 3 ? 'storm' : riskCount >= 1 ? 'cloudy' : 'sunny',
        weatherLabel: riskCount >= 3 ? '위험 고객 다수' : riskCount >= 1 ? '주의 필요' : '평온',
        threatCount: riskCount,
        opportunityCount: healthyCount > 10 ? 2 : 1,
        competitionScore: `${Math.min(riskCount + 2, 5)}:${healthyCount > 10 ? 3 : 2}`,
        marketTrend: (healthyCount - riskCount) / customers.length * 0.1,
        heartbeatAlert: riskCount >= 2,
        heartbeatKeyword: riskCount >= 2 ? '이탈위험' : '안정',
      },
      alertSummary: {
        critical: riskCount,
        warning: warningCount,
        info: healthyCount,
      },
    };
    
    const response = successResponse(summary, '조종석 요약 조회 성공 (Live Data)');
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Cockpit DB error:', error);
    return getMockSummary();
  }
}

// Mock Summary (Fallback)
function getMockSummary() {
  const riskCount = randomInt(1, 5);
  const warningCount = randomInt(3, 12);
  const healthyCount = randomInt(100, 150);
  const avgTemperature = randomFloat(55, 75);
  
  let level: StatusLevel = 'green';
  let label = '양호';
  
  if (riskCount >= 3 || avgTemperature < 50) {
    level = 'red';
    label = '위험';
  } else if (riskCount >= 1 || warningCount >= 5) {
    level = 'yellow';
    label = '주의 필요';
  }
  
  const summary: CockpitSummary = {
    status: { level, label, updatedAt: formatDateTime() },
    internal: {
      customerCount: riskCount + warningCount + healthyCount,
      avgTemperature,
      riskCount,
      warningCount,
      healthyCount,
      pendingConsultations: randomInt(0, 5),
      unresolvedVoices: randomInt(0, 8),
      pendingTasks: randomInt(1, 10),
    },
    external: {
      sigma: randomFloat(0.6, 0.95),
      weatherForecast: randomChoice<WeatherType>(['sunny', 'cloudy', 'partly_cloudy', 'rainy', 'storm']),
      weatherLabel: randomChoice(['평온', '시험 주간', '방학 시작', '경쟁사 프로모션']),
      threatCount: randomInt(0, 4),
      opportunityCount: randomInt(0, 2),
      competitionScore: `${randomInt(2, 4)}:${randomInt(1, 3)}`,
      marketTrend: randomFloat(-0.1, 0.05),
      heartbeatAlert: Math.random() > 0.7,
      heartbeatKeyword: randomChoice(['사교육비', '비용', '가격', '성적']),
    },
    alertSummary: { critical: riskCount, warning: warningCount, info: randomInt(3, 8) },
  };
  
  const response = successResponse(summary, '조종석 요약 조회 (Mock)');
  response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  return response;
}

// ─────────────────────────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────────────────────────

function getAlerts(params: URLSearchParams) {
  const level = params.get('level') || 'all';
  const limit = parseInt(params.get('limit') || '10');
  
  let alerts: Alert[] = [];
  
  if (level === 'all') {
    alerts = [
      ...Array.from({ length: 2 }, () => generateAlert('critical')),
      ...Array.from({ length: 4 }, () => generateAlert('warning')),
      ...Array.from({ length: 4 }, () => generateAlert('info')),
    ];
  } else {
    alerts = Array.from({ length: limit }, () => generateAlert(level as 'critical' | 'warning' | 'info'));
  }
  
  return successResponse(
    { alerts: alerts.slice(0, limit) },
    '알림 목록 조회 성공'
  );
}

// ─────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────

function getActions(params: URLSearchParams) {
  const status = params.get('status') || 'pending';
  const limit = parseInt(params.get('limit') || '10');
  
  let actions: Action[] = Array.from({ length: limit }, (_, i) => generateAction(i + 1));
  
  if (status !== 'all') {
    actions = actions.filter(a => a.status === status);
  }
  
  const completed = actions.filter(a => a.status === 'completed').length;
  
  return successResponse(
    {
      actions,
      progress: {
        completed,
        total: actions.length,
        percentage: actions.length > 0 ? Math.round((completed / actions.length) * 100) : 0,
      },
    },
    '액션 목록 조회 성공'
  );
}
