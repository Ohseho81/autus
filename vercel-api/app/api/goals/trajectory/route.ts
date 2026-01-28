// ============================================
// AUTUS Goal Trajectory API
// 목표 달성 기울기 분석 및 예측
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
interface TrajectoryInput {
  goal_id: string;
  target: number;
  current: number;
  start_date: string;
  end_date: string;
  historical_data?: HistoricalPoint[];
  external_factors?: ExternalFactor[];
  consumer_signals?: ConsumerSignals;
}

interface HistoricalPoint {
  date: string;
  value: number;
}

interface ExternalFactor {
  type: string;
  impact: number; // -100 to +100 percentage impact
  confidence: number; // 0 to 1
  description: string;
}

interface ConsumerSignals {
  sigma: number; // 시너지 지수 (-1 to 1)
  inquiries: number;
  conversions: number;
  trend: 'up' | 'down' | 'stable';
  sentiment_score?: number;
}

interface TrajectoryResult {
  status: 'accelerating' | 'on_track' | 'slowing' | 'at_risk' | 'stalled';
  velocity: number; // 일일 변화량
  acceleration: number; // 변화량의 변화 (2차 미분)
  predicted_end_value: number;
  predicted_end_date: string | null;
  days_remaining: number;
  target_achievable: boolean;
  confidence: number;
  risk_factors: string[];
  recommendations: string[];
  forecast: ForecastPoint[];
}

interface ForecastPoint {
  date: string;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

// ============================================
// Trajectory Calculator
// ============================================
class TrajectoryCalculator {
  private target: number;
  private current: number;
  private startDate: Date;
  private endDate: Date;
  private historicalData: HistoricalPoint[];
  private externalFactors: ExternalFactor[];
  private consumerSignals: ConsumerSignals | null;

  constructor(input: TrajectoryInput) {
    this.target = input.target;
    this.current = input.current;
    this.startDate = new Date(input.start_date);
    this.endDate = new Date(input.end_date);
    this.historicalData = input.historical_data || [];
    this.externalFactors = input.external_factors || [];
    this.consumerSignals = input.consumer_signals || null;
  }

  // 기본 속도 계산 (선형 회귀)
  private calculateVelocity(): number {
    if (this.historicalData.length < 2) {
      // 데이터 부족 시 전체 평균 사용
      const daysElapsed = this.getDaysElapsed();
      const startValue = this.historicalData[0]?.value || 0;
      return daysElapsed > 0 ? (this.current - startValue) / daysElapsed : 0;
    }

    // 최근 7일 데이터로 속도 계산
    const recentData = this.historicalData.slice(-7);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = recentData.length;

    recentData.forEach((point, i) => {
      sumX += i;
      sumY += point.value;
      sumXY += i * point.value;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  // 가속도 계산 (속도의 변화)
  private calculateAcceleration(): number {
    if (this.historicalData.length < 7) return 0;

    const recentWeek = this.historicalData.slice(-7);
    const previousWeek = this.historicalData.slice(-14, -7);

    if (previousWeek.length < 3) return 0;

    const recentVelocity = this.calculateVelocityForPeriod(recentWeek);
    const previousVelocity = this.calculateVelocityForPeriod(previousWeek);

    return recentVelocity - previousVelocity;
  }

  private calculateVelocityForPeriod(data: HistoricalPoint[]): number {
    if (data.length < 2) return 0;
    return (data[data.length - 1].value - data[0].value) / data.length;
  }

  // 외부 요인 영향 계산
  private calculateExternalImpact(): number {
    if (this.externalFactors.length === 0) return 0;

    return this.externalFactors.reduce((total, factor) => {
      return total + (factor.impact * factor.confidence);
    }, 0) / 100; // 백분율을 비율로 변환
  }

  // 소비자 반응 영향 계산
  private calculateConsumerImpact(): number {
    if (!this.consumerSignals) return 0;

    // 시너지 지수 기반 영향
    const sigmaImpact = this.consumerSignals.sigma * 0.1; // ±10% 영향

    // 전환율 영향
    const conversionRate = this.consumerSignals.inquiries > 0
      ? this.consumerSignals.conversions / this.consumerSignals.inquiries
      : 0;
    const conversionImpact = (conversionRate - 0.2) * 0.5; // 20% 기준

    // 트렌드 영향
    const trendImpact = this.consumerSignals.trend === 'up' ? 0.05 :
                        this.consumerSignals.trend === 'down' ? -0.05 : 0;

    return sigmaImpact + conversionImpact + trendImpact;
  }

  // 남은 일수 계산
  private getDaysRemaining(): number {
    const now = new Date();
    const diff = this.endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // 경과 일수 계산
  private getDaysElapsed(): number {
    const now = new Date();
    const diff = now.getTime() - this.startDate.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // 예상 달성값 계산
  private calculatePredictedEnd(): number {
    const baseVelocity = this.calculateVelocity();
    const daysRemaining = this.getDaysRemaining();
    const externalImpact = this.calculateExternalImpact();
    const consumerImpact = this.calculateConsumerImpact();

    // 조정된 속도 = 기본 속도 × (1 + 외부 영향 + 소비자 영향)
    const adjustedVelocity = baseVelocity * (1 + externalImpact + consumerImpact);

    return this.current + (adjustedVelocity * daysRemaining);
  }

  // 상태 결정
  private determineStatus(): 'accelerating' | 'on_track' | 'slowing' | 'at_risk' | 'stalled' {
    const velocity = this.calculateVelocity();
    const acceleration = this.calculateAcceleration();
    const predictedEnd = this.calculatePredictedEnd();
    const progress = this.current / this.target;
    const expectedProgress = this.getDaysElapsed() / 
      (this.getDaysElapsed() + this.getDaysRemaining());

    // 정체 상태 확인
    if (Math.abs(velocity) < this.target * 0.001) {
      return 'stalled';
    }

    // 목표 달성 가능성 확인
    if (predictedEnd < this.target * 0.9) {
      return 'at_risk';
    }

    // 가속/둔화 확인
    if (acceleration > 0 && predictedEnd >= this.target) {
      return 'accelerating';
    }

    if (acceleration < 0 || progress < expectedProgress * 0.9) {
      return 'slowing';
    }

    return 'on_track';
  }

  // 신뢰도 계산
  private calculateConfidence(): number {
    let confidence = 0.7; // 기본 신뢰도

    // 데이터 양에 따른 신뢰도 조정
    if (this.historicalData.length >= 14) confidence += 0.1;
    if (this.historicalData.length >= 30) confidence += 0.1;

    // 외부 요인 신뢰도 반영
    if (this.externalFactors.length > 0) {
      const avgFactorConfidence = this.externalFactors.reduce(
        (sum, f) => sum + f.confidence, 0
      ) / this.externalFactors.length;
      confidence = confidence * 0.7 + avgFactorConfidence * 0.3;
    }

    // 최근 변동성에 따른 신뢰도 조정
    if (this.historicalData.length >= 7) {
      const recentData = this.historicalData.slice(-7);
      const avgValue = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
      const variance = recentData.reduce((sum, d) => sum + Math.pow(d.value - avgValue, 2), 0) / recentData.length;
      const volatility = Math.sqrt(variance) / avgValue;
      
      if (volatility > 0.1) confidence -= 0.1;
      if (volatility > 0.2) confidence -= 0.1;
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  // 위험 요인 식별
  private identifyRiskFactors(): string[] {
    const risks: string[] = [];
    const velocity = this.calculateVelocity();
    const acceleration = this.calculateAcceleration();

    if (velocity <= 0) {
      risks.push('진행이 정체되거나 역행하고 있습니다');
    }

    if (acceleration < 0) {
      risks.push('성장 속도가 둔화되고 있습니다');
    }

    const negativeFactors = this.externalFactors.filter(f => f.impact < 0);
    negativeFactors.forEach(f => {
      risks.push(`외부 요인: ${f.description} (${f.impact}% 영향)`);
    });

    if (this.consumerSignals) {
      if (this.consumerSignals.sigma < 0.5) {
        risks.push('소비자 반응(시너지)이 낮습니다');
      }
      if (this.consumerSignals.trend === 'down') {
        risks.push('소비자 관심도가 감소하고 있습니다');
      }
    }

    return risks;
  }

  // 추천 액션 생성
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const status = this.determineStatus();
    const risks = this.identifyRiskFactors();

    if (status === 'at_risk' || status === 'stalled') {
      recommendations.push('긴급 전략 회의 개최 권장');
      recommendations.push('목표 또는 기간 재검토 필요');
    }

    if (status === 'slowing') {
      recommendations.push('실행 속도 가속을 위한 추가 자원 투입 검토');
    }

    if (this.consumerSignals && this.consumerSignals.sigma < 0.6) {
      recommendations.push('고객 만족도 개선 캠페인 실행');
    }

    if (risks.some(r => r.includes('외부 요인'))) {
      recommendations.push('외부 환경 변화에 대한 대응 전략 수립');
    }

    if (status === 'accelerating') {
      recommendations.push('현재 전략 유지 및 모범 사례 문서화');
    }

    return recommendations.slice(0, 5);
  }

  // 예측 데이터 생성
  private generateForecast(): ForecastPoint[] {
    const forecast: ForecastPoint[] = [];
    const velocity = this.calculateVelocity();
    const confidence = this.calculateConfidence();
    const daysRemaining = this.getDaysRemaining();

    for (let i = 1; i <= Math.min(daysRemaining, 14); i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const predicted = this.current + (velocity * i);
      const uncertainty = (1 - confidence) * predicted * (i / 7); // 시간이 지날수록 불확실성 증가
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(predicted),
        lower_bound: Math.round(predicted - uncertainty),
        upper_bound: Math.round(predicted + uncertainty),
      });
    }

    return forecast;
  }

  // 전체 분석 실행
  public analyze(): TrajectoryResult {
    const velocity = this.calculateVelocity();
    const acceleration = this.calculateAcceleration();
    const predictedEnd = this.calculatePredictedEnd();
    const daysRemaining = this.getDaysRemaining();
    const confidence = this.calculateConfidence();

    return {
      status: this.determineStatus(),
      velocity: Math.round(velocity),
      acceleration: Math.round(acceleration),
      predicted_end_value: Math.round(predictedEnd),
      predicted_end_date: predictedEnd >= this.target
        ? this.calculateAchievementDate()
        : null,
      days_remaining: daysRemaining,
      target_achievable: predictedEnd >= this.target * 0.95,
      confidence: Math.round(confidence * 100) / 100,
      risk_factors: this.identifyRiskFactors(),
      recommendations: this.generateRecommendations(),
      forecast: this.generateForecast(),
    };
  }

  private calculateAchievementDate(): string | null {
    const velocity = this.calculateVelocity();
    if (velocity <= 0) return null;

    const remaining = this.target - this.current;
    const daysNeeded = Math.ceil(remaining / velocity);
    const achieveDate = new Date();
    achieveDate.setDate(achieveDate.getDate() + daysNeeded);

    return achieveDate.toISOString().split('T')[0];
  }
}

// ============================================
// OPTIONS (CORS)
// ============================================
export async function OPTIONS() {
  return optionsResponse();
}

// ============================================
// GET - 목표 기울기 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goal_id');

    if (!goalId) {
      return errorResponse('goal_id is required', 400);
    }

    // Mock 데이터로 응답 (실제로는 DB에서 조회)
    const mockInput: TrajectoryInput = {
      goal_id: goalId,
      target: 150000000,
      current: 127500000,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      historical_data: generateMockHistoricalData(),
      external_factors: [
        { type: 'season', impact: 5, confidence: 0.8, description: '신학기 시즌 호조' },
        { type: 'competition', impact: -3, confidence: 0.6, description: '신규 경쟁 학원 오픈' },
      ],
      consumer_signals: {
        sigma: 0.72,
        inquiries: 45,
        conversions: 12,
        trend: 'up',
      },
    };

    const calculator = new TrajectoryCalculator(mockInput);
    const result = calculator.analyze();

    return successResponse({
      goal_id: goalId,
      ...result,
    });

  } catch (error) {
    return serverErrorResponse(error, 'Trajectory GET');
  }
}

// ============================================
// POST - 기울기 계산
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields = ['target', 'current', 'start_date', 'end_date'];
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return errorResponse(`${field} is required`, 400);
      }
    }

    const input: TrajectoryInput = {
      goal_id: body.goal_id || 'custom',
      target: body.target,
      current: body.current,
      start_date: body.start_date,
      end_date: body.end_date,
      historical_data: body.historical_data,
      external_factors: body.external_factors,
      consumer_signals: body.consumer_signals,
    };

    const calculator = new TrajectoryCalculator(input);
    const result = calculator.analyze();

    return successResponse(result);

  } catch (error) {
    return serverErrorResponse(error, 'Trajectory POST');
  }
}

// ============================================
// Helper: Mock 데이터 생성
// ============================================
function generateMockHistoricalData(): HistoricalPoint[] {
  const data: HistoricalPoint[] = [];
  let value = 95000000;

  for (let i = 0; i < 24; i++) {
    const date = new Date(2026, 0, 1 + i);
    value += 3500000 + (Math.random() - 0.3) * 2000000;
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
    });
  }

  return data;
}
