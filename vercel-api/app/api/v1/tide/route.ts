// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🌊 조류 API (Tide)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import {
  randomInt,
  randomFloat,
  randomChoice,
  formatDate,
  generateUUID,
} from '@/lib/mock-data';
import type { TideData, MarketTrend } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/tide
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'market';
    
    switch (endpoint) {
      case 'market':
        return getMarketTide(searchParams);
      case 'internal':
        return getInternalTide(searchParams);
      case 'competitors':
        return getCompetitorsTide();
      case 'forecast':
        return getForecast(searchParams);
      default:
        return getMarketTide(searchParams);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Tide API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Market Tide
// ─────────────────────────────────────────────────────────────────────

function getMarketTide(params: URLSearchParams) {
  const period = params.get('period') || '6m';
  const months = period === '1y' ? 12 : period === '3m' ? 3 : 6;
  
  // 시장 데이터 (하락 추세 시뮬레이션)
  let baseValue = 100;
  const data = Array.from({ length: months }, (_, i) => {
    baseValue = baseValue * (1 + randomFloat(-0.03, 0.01));
    return {
      date: formatDate(-30 * (months - i - 1)),
      value: parseFloat(baseValue.toFixed(1)),
    };
  });
  
  const firstValue = data[0].value;
  const lastValue = data[data.length - 1].value;
  const changePercent = ((lastValue - firstValue) / firstValue) * 100;
  
  const trend: MarketTrend = changePercent > 2 ? 'rising' : changePercent < -2 ? 'falling' : 'stable';
  const trendLabel = trend === 'rising' ? '밀물' : trend === 'falling' ? '썰물' : '정체';
  
  const tideData: TideData = {
    trend,
    trendLabel,
    changePercent: parseFloat(changePercent.toFixed(1)),
    data,
    causes: [
      { factor: '출산율 감소', impact: -3.2 },
      { factor: '경기 침체', impact: -1.5 },
      { factor: '온라인 교육 확대', impact: -0.8 },
    ],
  };
  
  return successResponse(tideData, '시장 트렌드 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Internal Tide
// ─────────────────────────────────────────────────────────────────────

function getInternalTide(params: URLSearchParams) {
  const period = params.get('period') || '6m';
  const months = period === '1y' ? 12 : period === '3m' ? 3 : 6;
  
  // 내부 데이터 (상승 추세 시뮬레이션 - 시장 역행)
  let ourValue = 100;
  let marketValue = 100;
  
  const data = Array.from({ length: months }, (_, i) => {
    ourValue = ourValue * (1 + randomFloat(-0.01, 0.04));
    marketValue = marketValue * (1 + randomFloat(-0.03, 0.01));
    
    return {
      date: formatDate(-30 * (months - i - 1)),
      ourValue: parseFloat(ourValue.toFixed(1)),
      marketValue: parseFloat(marketValue.toFixed(1)),
    };
  });
  
  const ourChange = ((data[data.length - 1].ourValue - data[0].ourValue) / data[0].ourValue) * 100;
  const marketChange = ((data[data.length - 1].marketValue - data[0].marketValue) / data[0].marketValue) * 100;
  
  const trend: MarketTrend = ourChange > 2 ? 'rising' : ourChange < -2 ? 'falling' : 'stable';
  const trendLabel = ourChange > 0 && marketChange < 0 ? '역류' : trend === 'rising' ? '밀물' : trend === 'falling' ? '썰물' : '정체';
  
  // 시장 대비 상태
  const vsMarketStatus = ourChange > marketChange + 5 ? 'outperforming' : 
                         ourChange < marketChange - 5 ? 'underperforming' : 'matching';
  
  return successResponse({
    trend,
    trendLabel,
    changePercent: parseFloat(ourChange.toFixed(1)),
    vsMarket: {
      status: vsMarketStatus,
      message: `시장은 ${marketChange > 0 ? '상승' : '하락'}(${marketChange.toFixed(1)}%), 우리는 ${ourChange > 0 ? '상승' : '하락'}(${ourChange.toFixed(1)}%)`,
    },
    data,
    causes: [
      { factor: '신규 마케팅 효과', impact: 4.5, isPositive: true },
      { factor: '추천 프로그램', impact: 2.3, isPositive: true },
      { factor: '강사진 강화', impact: 1.8, isPositive: true },
    ],
  }, '내부 트렌드 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Competitors Tide
// ─────────────────────────────────────────────────────────────────────

function getCompetitorsTide() {
  const competitors = [
    {
      id: generateUUID(),
      name: 'A학원',
      trend: randomChoice<MarketTrend>(['rising', 'falling', 'stable']),
      changePercent: randomFloat(-8, 6),
      insight: '최근 프로모션으로 상승 중',
    },
    {
      id: generateUUID(),
      name: 'B학원',
      trend: 'falling' as MarketTrend,
      changePercent: randomFloat(-10, -3),
      insight: '강사 이탈로 하락',
    },
    {
      id: generateUUID(),
      name: 'C학원',
      trend: 'stable' as MarketTrend,
      changePercent: randomFloat(-2, 2),
      insight: '현상 유지 중',
    },
    {
      id: generateUUID(),
      name: 'D학원',
      trend: randomChoice<MarketTrend>(['rising', 'falling', 'stable']),
      changePercent: randomFloat(-5, 8),
      insight: '신규 오픈 후 성장',
    },
  ];
  
  return successResponse({ competitors }, '경쟁사 트렌드 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Forecast
// ─────────────────────────────────────────────────────────────────────

function getForecast(params: URLSearchParams) {
  const horizon = parseInt(params.get('horizon') || '3');
  
  let baseValue = 100;
  const forecast = Array.from({ length: horizon }, (_, i) => {
    const predicted = baseValue * (1 + randomFloat(-0.02, 0.05));
    const margin = predicted * 0.1;
    baseValue = predicted;
    
    return {
      date: formatDate(30 * (i + 1)),
      predictedValue: parseFloat(predicted.toFixed(1)),
      confidenceHigh: parseFloat((predicted + margin).toFixed(1)),
      confidenceLow: parseFloat((predicted - margin).toFixed(1)),
    };
  });
  
  const expectedTrend: MarketTrend = forecast[forecast.length - 1].predictedValue > 100 ? 'rising' : 
                                      forecast[forecast.length - 1].predictedValue < 98 ? 'falling' : 'stable';
  
  return successResponse({
    forecast,
    expectedTrend,
    confidence: randomFloat(70, 85),
  }, '트렌드 예측 조회 성공');
}
