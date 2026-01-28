/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 Value Compounding - Global V-Consolidation Engine
 * 
 * 한국과 필리핀의 물리적 거리를 디지털로 소멸
 * - 서로 다른 조세 체계와 비용 구조를 하나의 수식으로 통합
 * - 클락 센터 운영비(T) 절감 → 전체 자산(V) 곡선 실시간 반영
 * - CEO의 엑싯(Exit) 가치 및 재투자 여력 실시간 확인
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';


// 환율 (실시간 연동 가능)
const EXCHANGE_RATE = {
  PHP_TO_KRW: 24.5,  // 1 PHP = 24.5 KRW
  USD_TO_KRW: 1350,  // 1 USD = 1350 KRW
};

// 조세 체계
const TAX_REGIME = {
  korea: {
    corporate_tax: 0.22,      // 법인세 22%
    vat: 0.10,                // 부가세 10%
    local_tax: 0.022,         // 지방세 2.2%
  },
  philippines: {
    peza_tax: 0.05,           // PEZA 특별세 5% (vs 일반 25%)
    vat: 0.12,                // VAT 12%
    withholding: 0.15,        // 원천징수 15%
    tax_holiday_years: 4,     // 세금 면제 기간
  },
};

interface RegionData {
  region: 'korea' | 'philippines';
  revenue: number;          // 매출 (각 통화 기준)
  operating_cost: number;   // 운영비
  labor_cost: number;       // 인건비
  facility_cost: number;    // 시설비
  other_cost: number;       // 기타비용
  active_nodes: number;     // 활성 노드 수
  avg_s_index: number;      // 평균 만족도
  tenure_months: number;    // 운영 기간 (월)
  currency: 'KRW' | 'PHP';
}

interface ConsolidatedResult {
  korea: ProcessedRegion;
  philippines: ProcessedRegion;
  global: GlobalMetrics;
  exit_valuation: ExitValuation;
  reinvestment_capacity: ReinvestmentCapacity;
}

interface ProcessedRegion {
  revenue_krw: number;
  total_cost_krw: number;
  tax_burden_krw: number;
  net_profit_krw: number;
  v_index: number;
  cost_efficiency: number;
}

interface GlobalMetrics {
  total_revenue: number;
  total_cost: number;
  total_tax: number;
  consolidated_v: number;
  global_s_index: number;
  synergy_factor: number;
  compounded_v: number;
}

interface ExitValuation {
  base_multiple: number;
  adjusted_multiple: number;
  estimated_value: number;
  growth_trajectory: string;
}

interface ReinvestmentCapacity {
  available_cash: number;
  recommended_allocation: {
    korea_expansion: number;
    philippines_growth: number;
    technology: number;
    reserve: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { korea, philippines }: { korea: RegionData; philippines: RegionData } = await request.json();
    
    // 1. 각 지역 데이터 처리
    const koreaProcessed = processKoreaData(korea);
    const philippinesProcessed = processPhilippinesData(philippines);
    
    // 2. 글로벌 통합 메트릭 계산
    const globalMetrics = calculateGlobalMetrics(koreaProcessed, philippinesProcessed, korea, philippines);
    
    // 3. 엑싯 밸류에이션 계산
    const exitValuation = calculateExitValuation(globalMetrics);
    
    // 4. 재투자 여력 계산
    const reinvestmentCapacity = calculateReinvestmentCapacity(globalMetrics, koreaProcessed, philippinesProcessed);
    
    // 5. 결과 저장
    await saveConsolidationResult({
      korea: koreaProcessed,
      philippines: philippinesProcessed,
      global: globalMetrics,
      exit_valuation: exitValuation,
      reinvestment_capacity: reinvestmentCapacity,
    });
    
    // 6. Owner Console 업데이트 트리거
    await updateOwnerConsole(globalMetrics, exitValuation);
    
    return NextResponse.json({
      success: true,
      data: {
        korea: koreaProcessed,
        philippines: philippinesProcessed,
        global: globalMetrics,
        exit_valuation: exitValuation,
        reinvestment_capacity: reinvestmentCapacity,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('V-Consolidation Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// 한국 데이터 처리
function processKoreaData(data: RegionData): ProcessedRegion {
  const totalCost = data.operating_cost + data.labor_cost + data.facility_cost + data.other_cost;
  const grossProfit = data.revenue - totalCost;
  
  // 세금 계산
  const corporateTax = Math.max(0, grossProfit) * TAX_REGIME.korea.corporate_tax;
  const localTax = Math.max(0, grossProfit) * TAX_REGIME.korea.local_tax;
  const totalTax = corporateTax + localTax;
  
  const netProfit = grossProfit - totalTax;
  
  // V-Index 계산: V = (M - T) × (1 + s)^t
  const t = data.tenure_months / 12;
  const vIndex = (data.revenue - totalCost) * Math.pow(1 + data.avg_s_index / 100, t);
  
  return {
    revenue_krw: data.revenue,
    total_cost_krw: totalCost,
    tax_burden_krw: totalTax,
    net_profit_krw: netProfit,
    v_index: vIndex,
    cost_efficiency: data.revenue > 0 ? (data.revenue - totalCost) / data.revenue : 0,
  };
}

// 필리핀 데이터 처리 (PEZA 세금 혜택 적용)
function processPhilippinesData(data: RegionData): ProcessedRegion {
  // PHP → KRW 환산
  const revenueKrw = data.revenue * EXCHANGE_RATE.PHP_TO_KRW;
  const totalCostPhp = data.operating_cost + data.labor_cost + data.facility_cost + data.other_cost;
  const totalCostKrw = totalCostPhp * EXCHANGE_RATE.PHP_TO_KRW;
  
  const grossProfitPhp = data.revenue - totalCostPhp;
  const grossProfitKrw = grossProfitPhp * EXCHANGE_RATE.PHP_TO_KRW;
  
  // PEZA 특별세 적용 (일반 25% vs PEZA 5%)
  // Tax Holiday 기간이면 세금 면제
  let taxRate = TAX_REGIME.philippines.peza_tax;
  if (data.tenure_months <= TAX_REGIME.philippines.tax_holiday_years * 12) {
    taxRate = 0; // Tax Holiday
  }
  
  const taxBurdenPhp = Math.max(0, grossProfitPhp) * taxRate;
  const taxBurdenKrw = taxBurdenPhp * EXCHANGE_RATE.PHP_TO_KRW;
  
  const netProfitKrw = grossProfitKrw - taxBurdenKrw;
  
  // V-Index (원화 기준)
  const t = data.tenure_months / 12;
  const vIndex = (revenueKrw - totalCostKrw) * Math.pow(1 + data.avg_s_index / 100, t);
  
  return {
    revenue_krw: revenueKrw,
    total_cost_krw: totalCostKrw,
    tax_burden_krw: taxBurdenKrw,
    net_profit_krw: netProfitKrw,
    v_index: vIndex,
    cost_efficiency: revenueKrw > 0 ? (revenueKrw - totalCostKrw) / revenueKrw : 0,
  };
}

// 글로벌 통합 메트릭
function calculateGlobalMetrics(
  korea: ProcessedRegion,
  philippines: ProcessedRegion,
  koreaRaw: RegionData,
  philippinesRaw: RegionData
): GlobalMetrics {
  const totalRevenue = korea.revenue_krw + philippines.revenue_krw;
  const totalCost = korea.total_cost_krw + philippines.total_cost_krw;
  const totalTax = korea.tax_burden_krw + philippines.tax_burden_krw;
  
  // 가중 평균 s-index
  const totalNodes = koreaRaw.active_nodes + philippinesRaw.active_nodes;
  const globalSIndex = totalNodes > 0
    ? (koreaRaw.avg_s_index * koreaRaw.active_nodes + philippinesRaw.avg_s_index * philippinesRaw.active_nodes) / totalNodes
    : 0;
  
  // 시너지 팩터 (비용 효율성 차이에서 발생)
  const costSavingFromClark = korea.total_cost_krw * 0.3 - philippines.total_cost_krw * 0.5;
  const synergyFactor = costSavingFromClark > 0 ? 0.15 : 0.05;
  
  // 통합 V-Index
  const consolidatedV = korea.v_index + philippines.v_index;
  
  // 복리 증식 V: 시너지 반영
  const avgTenure = (koreaRaw.tenure_months + philippinesRaw.tenure_months) / 2;
  const compoundedV = consolidatedV * Math.pow(1 + synergyFactor, avgTenure / 12);
  
  return {
    total_revenue: totalRevenue,
    total_cost: totalCost,
    total_tax: totalTax,
    consolidated_v: consolidatedV,
    global_s_index: globalSIndex,
    synergy_factor: synergyFactor,
    compounded_v: compoundedV,
  };
}

// 엑싯 밸류에이션
function calculateExitValuation(global: GlobalMetrics): ExitValuation {
  // 기본 배수 (교육/서비스 산업 평균)
  const baseMultiple = 5;
  
  // 조정 배수 (성장성, 만족도, 시너지 반영)
  const growthPremium = global.synergy_factor * 10;
  const satisfactionPremium = (global.global_s_index - 50) / 100;
  const adjustedMultiple = baseMultiple * (1 + growthPremium + satisfactionPremium);
  
  // 추정 기업가치
  const annualizedProfit = (global.total_revenue - global.total_cost - global.total_tax) * 12;
  const estimatedValue = annualizedProfit * adjustedMultiple;
  
  // 성장 궤적 평가
  let trajectory = 'STABLE';
  if (global.synergy_factor > 0.12) trajectory = 'ACCELERATING';
  if (global.synergy_factor > 0.18) trajectory = 'HYPERGROWTH';
  if (global.synergy_factor < 0.08) trajectory = 'CAUTIOUS';
  
  return {
    base_multiple: baseMultiple,
    adjusted_multiple: adjustedMultiple,
    estimated_value: estimatedValue,
    growth_trajectory: trajectory,
  };
}

// 재투자 여력
function calculateReinvestmentCapacity(
  global: GlobalMetrics,
  korea: ProcessedRegion,
  philippines: ProcessedRegion
): ReinvestmentCapacity {
  const monthlyNetProfit = korea.net_profit_krw + philippines.net_profit_krw;
  const availableCash = monthlyNetProfit * 6; // 6개월 누적 가정
  
  // 권장 배분
  return {
    available_cash: availableCash,
    recommended_allocation: {
      korea_expansion: availableCash * 0.35,      // 한국 확장 35%
      philippines_growth: availableCash * 0.30,   // 필리핀 성장 30%
      technology: availableCash * 0.20,           // 기술 투자 20%
      reserve: availableCash * 0.15,              // 예비금 15%
    },
  };
}

// 결과 저장
async function saveConsolidationResult(result: ConsolidatedResult) {
  await getSupabaseAdmin()
    .from('global_consolidation')
    .insert({
      korea_v_index: result.korea.v_index,
      philippines_v_index: result.philippines.v_index,
      consolidated_v: result.global.consolidated_v,
      compounded_v: result.global.compounded_v,
      synergy_factor: result.global.synergy_factor,
      exit_value: result.exit_valuation.estimated_value,
      growth_trajectory: result.exit_valuation.growth_trajectory,
      reinvestment_capacity: result.reinvestment_capacity.available_cash,
      full_data: result,
      created_at: new Date().toISOString(),
    });
}

// Owner Console 업데이트
async function updateOwnerConsole(global: GlobalMetrics, exit: ExitValuation) {
  // 실시간 WebSocket 또는 Supabase Realtime으로 푸시
  await getSupabaseAdmin()
    .from('owner_console_state')
    .upsert({
      id: 'global_metrics',
      consolidated_v: global.consolidated_v,
      compounded_v: global.compounded_v,
      exit_value: exit.estimated_value,
      growth_trajectory: exit.growth_trajectory,
      updated_at: new Date().toISOString(),
    });
}

// GET: 최신 통합 데이터 조회
export async function GET() {
  const { data: latest } = await getSupabaseAdmin()
    .from('global_consolidation')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  const { data: history } = await getSupabaseAdmin()
    .from('global_consolidation')
    .select('consolidated_v, compounded_v, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  
  return NextResponse.json({
    success: true,
    service: 'Value Compounding - Global V-Consolidation Engine',
    status: 'operational',
    latest: latest || null,
    history: history || [],
    exchange_rates: EXCHANGE_RATE,
    tax_regime: TAX_REGIME,
    capabilities: [
      'Multi-Currency Consolidation',
      'PEZA Tax Optimization',
      'Real-time V-Index Calculation',
      'Exit Valuation Modeling',
      'Reinvestment Capacity Planning',
    ],
  });
}
