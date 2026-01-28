// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🌤️ 날씨 API (Weather)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
  notFoundResponse,
} from '@/lib/api-utils';
import {
  generateWeatherDay,
  generateCustomerBriefs,
  randomInt,
  randomFloat,
  randomChoice,
  formatDate,
  generateUUID,
} from '@/lib/mock-data';
import type { WeatherDay, ExternalEvent } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/weather
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'forecast';
    
    switch (endpoint) {
      case 'forecast':
        return getForecast(searchParams);
      case 'events':
        return getEvents(searchParams);
      case 'event':
        return getEventDetail(searchParams);
      case 'impact':
        return getEventImpact(searchParams);
      default:
        return getForecast(searchParams);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Weather API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Forecast
// ─────────────────────────────────────────────────────────────────────

function getForecast(params: URLSearchParams) {
  const range = params.get('range') || '7d';
  const days = range === '30d' ? 30 : range === '14d' ? 14 : 7;
  
  const weatherDays: WeatherDay[] = Array.from({ length: days }, (_, i) => generateWeatherDay(i));
  
  const avgSigma = weatherDays.reduce((sum, d) => sum + d.sigma, 0) / days;
  const worstDay = weatherDays.reduce((worst, d) => d.sigma < worst.sigma ? d : worst);
  const eventCount = weatherDays.reduce((sum, d) => sum + d.events.length, 0);
  
  return successResponse({
    days: weatherDays,
    weekSummary: {
      avgSigma: parseFloat(avgSigma.toFixed(2)),
      worstDay: worstDay.date,
      eventCount,
    },
  }, '예보 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────────────

const EVENT_TEMPLATES = [
  { name: '중간고사', category: 'exam', sigmaImpact: -0.15 },
  { name: '기말고사', category: 'exam', sigmaImpact: -0.2 },
  { name: '방학 시작', category: 'season', sigmaImpact: 0.1 },
  { name: '개학', category: 'season', sigmaImpact: -0.05 },
  { name: '경쟁사 프로모션', category: 'competition', sigmaImpact: -0.15 },
  { name: '교육 정책 변경', category: 'policy', sigmaImpact: -0.1 },
];

function getEvents(params: URLSearchParams) {
  const category = params.get('category') || 'all';
  
  let events: ExternalEvent[] = EVENT_TEMPLATES.map((template, i) => ({
    id: generateUUID(),
    name: template.name,
    category: template.category,
    type: template.sigmaImpact < 0 ? 'threat' : template.sigmaImpact > 0 ? 'opportunity' : 'neutral',
    date: formatDate(randomInt(1, 30)),
    sigmaImpact: template.sigmaImpact,
    description: `${template.name} 일정입니다.`,
  }));
  
  if (category !== 'all') {
    events = events.filter(e => e.category === category);
  }
  
  return successResponse({ events }, '이벤트 목록 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Event Detail
// ─────────────────────────────────────────────────────────────────────

function getEventDetail(params: URLSearchParams) {
  const eventId = params.get('id');
  
  if (!eventId) {
    return notFoundResponse('Event');
  }
  
  const template = randomChoice(EVENT_TEMPLATES);
  const affectedCustomers = generateCustomerBriefs(randomInt(10, 30));
  
  const event = {
    id: eventId,
    name: template.name,
    category: template.category,
    type: template.sigmaImpact < 0 ? 'threat' : 'opportunity',
    date: formatDate(randomInt(1, 14)),
    sigmaImpact: template.sigmaImpact,
    description: `${template.name}이 다가오고 있습니다.`,
    affectedCustomerCount: affectedCustomers.length,
    affectedCustomers,
    suggestedActions: [
      { action: '사전 상담 실시', priority: 'high' },
      { action: '격려 메시지 발송', priority: 'medium' },
    ],
  };
  
  return successResponse(event, '이벤트 상세 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Event Impact
// ─────────────────────────────────────────────────────────────────────

function getEventImpact(params: URLSearchParams) {
  const eventId = params.get('eventId');
  
  if (!eventId) {
    return notFoundResponse('Event');
  }
  
  const template = randomChoice(EVENT_TEMPLATES);
  
  const directCustomers = generateCustomerBriefs(randomInt(5, 15));
  const indirectCustomers = generateCustomerBriefs(randomInt(10, 25));
  const safeCount = randomInt(80, 120);
  
  return successResponse({
    event: {
      id: eventId,
      name: template.name,
      category: template.category,
      type: template.sigmaImpact < 0 ? 'threat' : 'opportunity',
      date: formatDate(randomInt(1, 14)),
      sigmaImpact: template.sigmaImpact,
      description: `${template.name} 영향 분석`,
    },
    impact: {
      direct: {
        count: directCustomers.length,
        customers: directCustomers,
      },
      indirect: {
        count: indirectCustomers.length,
        customers: indirectCustomers,
      },
      safe: {
        count: safeCount,
      },
    },
    suggestedActions: [
      { action: '직격 대상 긴급 상담', targetCount: directCustomers.length, priority: 'critical' },
      { action: '간접 영향 그룹 모니터링', targetCount: indirectCustomers.length, priority: 'warning' },
    ],
  }, '이벤트 영향 분석 완료');
}
