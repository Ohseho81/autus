// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 📊 퍼널 API (Funnel)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import {
  generateFunnelStages,
  generateCustomerBriefs,
  randomInt,
  randomFloat,
  randomChoice,
} from '@/lib/mock-data';
import type { FunnelStage, DropoffAnalysis } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/funnel
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'stages';
    
    switch (endpoint) {
      case 'stages':
        return getStages(searchParams);
      case 'conversion':
        return getConversion();
      case 'dropoff':
        return getDropoff(searchParams);
      case 'benchmark':
        return getBenchmark();
      default:
        return getStages(searchParams);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Funnel API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Stages
// ─────────────────────────────────────────────────────────────────────

function getStages(params: URLSearchParams) {
  const type = params.get('type') || 'acquisition';
  
  let stages: FunnelStage[];
  
  if (type === 'retention') {
    // 리텐션 퍼널
    stages = [
      { id: 'enrolled', name: '등록', count: 150, percentage: 100, conversionRate: undefined, dropoffRate: undefined },
      { id: '1month', name: '1개월', count: 142, percentage: 95, conversionRate: 95, dropoffRate: 5 },
      { id: '3month', name: '3개월', count: 128, percentage: 85, conversionRate: 90, dropoffRate: 10 },
      { id: '6month', name: '6개월', count: 108, percentage: 72, conversionRate: 84, dropoffRate: 16 },
      { id: '1year', name: '1년+', count: 85, percentage: 57, conversionRate: 79, dropoffRate: 21 },
    ];
  } else {
    // 획득 퍼널
    stages = generateFunnelStages();
  }
  
  // 병목 찾기
  let bottleneck = stages[0];
  let maxDropoff = 0;
  
  stages.forEach(stage => {
    if (stage.dropoffRate && stage.dropoffRate > maxDropoff) {
      maxDropoff = stage.dropoffRate;
      bottleneck = stage;
    }
  });
  
  const firstCount = stages[0].count;
  const lastCount = stages[stages.length - 1].count;
  const totalConversion = parseFloat(((lastCount / firstCount) * 100).toFixed(1));
  
  return successResponse({
    stages,
    summary: {
      totalConversion,
      bottleneck: bottleneck.name,
      bottleneckDropoff: bottleneck.dropoffRate || 0,
    },
  }, '퍼널 단계 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Conversion
// ─────────────────────────────────────────────────────────────────────

function getConversion() {
  const conversions = [
    { from: '인지', to: '관심', rate: 45, benchmark: 40, status: 'above', gap: 5 },
    { from: '관심', to: '체험', rate: 55, benchmark: 50, status: 'above', gap: 5 },
    { from: '체험', to: '등록', rate: 35, benchmark: 45, status: 'below', gap: -10 },
    { from: '등록', to: '3개월', rate: 85, benchmark: 80, status: 'above', gap: 5 },
    { from: '3개월', to: '6개월', rate: 78, benchmark: 75, status: 'at', gap: 3 },
    { from: '6개월', to: '1년+', rate: 72, benchmark: 70, status: 'at', gap: 2 },
  ];
  
  return successResponse({ conversions }, '전환율 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Dropoff Analysis
// ─────────────────────────────────────────────────────────────────────

function getDropoff(params: URLSearchParams) {
  const from = params.get('from') || '체험';
  const to = params.get('to') || '등록';
  
  const dropoffRate = randomFloat(25, 45);
  const totalAtFrom = randomInt(80, 120);
  const dropoffCount = Math.round(totalAtFrom * (dropoffRate / 100));
  
  const analysis: DropoffAnalysis = {
    fromStage: from,
    toStage: to,
    dropoffRate,
    dropoffCount,
    reasons: [
      { reason: '가격 부담', percentage: 35, count: Math.round(dropoffCount * 0.35) },
      { reason: '경쟁사 선택', percentage: 25, count: Math.round(dropoffCount * 0.25) },
      { reason: '시간 불일치', percentage: 20, count: Math.round(dropoffCount * 0.20) },
      { reason: '만족도 부족', percentage: 15, count: Math.round(dropoffCount * 0.15) },
      { reason: '기타', percentage: 5, count: Math.round(dropoffCount * 0.05) },
    ],
    droppedCustomers: generateCustomerBriefs(Math.min(dropoffCount, 10)),
    suggestedActions: [
      { action: '가격 할인 프로모션', expectedImprovement: 8 },
      { action: '체험 수업 강화', expectedImprovement: 5 },
      { action: '유연한 시간표 제공', expectedImprovement: 4 },
    ],
  };
  
  return successResponse(analysis, '이탈 분석 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Benchmark
// ─────────────────────────────────────────────────────────────────────

function getBenchmark() {
  const comparisons = [
    {
      metric: '체험→등록 전환율',
      ourValue: randomFloat(32, 42),
      industryAvg: 40,
      topPerformer: 55,
      percentile: randomInt(40, 60),
    },
    {
      metric: '3개월 유지율',
      ourValue: randomFloat(80, 90),
      industryAvg: 78,
      topPerformer: 92,
      percentile: randomInt(55, 75),
    },
    {
      metric: '1년 유지율',
      ourValue: randomFloat(55, 70),
      industryAvg: 55,
      topPerformer: 78,
      percentile: randomInt(50, 70),
    },
    {
      metric: '추천 전환율',
      ourValue: randomFloat(15, 25),
      industryAvg: 18,
      topPerformer: 35,
      percentile: randomInt(45, 65),
    },
  ];
  
  return successResponse({
    industry: 'academy',
    comparisons,
  }, '벤치마크 비교 완료');
}
