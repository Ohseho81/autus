// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🔬 현미경 API (Microscope)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
  notFoundResponse,
} from '@/lib/api-utils';
import {
  generateKoreanName,
  generateCustomerBrief,
  generateVoiceBrief,
  getTemperatureZone,
  randomInt,
  randomFloat,
  randomChoice,
  formatDate,
  formatDateTime,
  generateUUID,
} from '@/lib/mock-data';
import type { 
  CustomerDetail, 
  TSELScore, 
  SigmaBreakdown,
  TemperatureZone,
  VoiceStage,
} from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/microscope
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'customer';
    const customerId = searchParams.get('id');
    
    if (!customerId && endpoint !== 'list') {
      return notFoundResponse('Customer ID');
    }
    
    switch (endpoint) {
      case 'customer':
        return getCustomerDetail(customerId!);
      case 'tsel':
        return getTSEL(customerId!);
      case 'sigma':
        return getSigma(customerId!);
      case 'history':
        return getHistory(customerId!, searchParams);
      case 'voice':
        return getVoice(customerId!);
      case 'predict':
        return getPredict(customerId!);
      case 'recommend':
        return getRecommend(customerId!);
      default:
        return getCustomerDetail(customerId!);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Microscope API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Customer Detail
// ─────────────────────────────────────────────────────────────────────

function getCustomerDetail(customerId: string) {
  const temperature = randomInt(30, 85);
  const zone = getTemperatureZone(temperature);
  
  const customer: CustomerDetail = {
    id: customerId,
    name: generateKoreanName(),
    photo: `https://api.dicebear.com/7.x/initials/svg?seed=${customerId}`,
    grade: randomChoice(['초3', '초4', '초5', '초6', '중1', '중2', '중3']),
    class: randomChoice(['A반', 'B반', 'C반', 'D반']),
    tenure: randomInt(1, 36),
    stage: randomChoice(['등록', '3개월', '6개월', '1년+']),
    executor: {
      id: generateUUID(),
      name: generateKoreanName(),
    },
    payer: {
      id: generateUUID(),
      name: generateKoreanName(),
      phone: '010-****-' + randomInt(1000, 9999),
    },
  };
  
  const temperatureData = {
    current: temperature,
    zone,
    trend: randomChoice<'improving' | 'stable' | 'declining'>(['improving', 'stable', 'declining']),
    trendValue: randomFloat(-5, 5),
  };
  
  const churnPrediction = {
    probability: temperature < 50 ? randomFloat(0.3, 0.6) : randomFloat(0.05, 0.2),
    predictedDate: formatDate(randomInt(30, 90)),
    confidence: randomFloat(0.7, 0.9),
  };
  
  return successResponse({
    customer,
    temperature: temperatureData,
    churnPrediction,
  }, '고객 상세 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// TSEL Analysis
// ─────────────────────────────────────────────────────────────────────

function getTSEL(customerId: string) {
  const generateTSELScore = (factors: string[]): TSELScore => {
    const score = randomFloat(40, 90);
    return {
      score,
      zone: getTemperatureZone(score),
      factors: factors.map(name => ({
        id: name.toLowerCase().replace(/\s/g, '_'),
        name,
        score: randomFloat(30, 95),
        status: randomChoice<'good' | 'neutral' | 'bad'>(['good', 'neutral', 'bad']),
      })),
    };
  };
  
  const tsel = {
    trust: generateTSELScore(['성적 향상', '강사 신뢰', '약속 이행']),
    satisfaction: generateTSELScore(['학부모 만족', '학생 만족', '가격 만족']),
    engagement: generateTSELScore(['출석률', '숙제 완료율', '수업 참여도']),
    loyalty: generateTSELScore(['재등록 의향', '추천 의향', '경쟁사 무관심']),
  };
  
  // R-Index 계산
  const rIndex = (
    tsel.trust.score * 0.25 +
    tsel.satisfaction.score * 0.30 +
    tsel.engagement.score * 0.25 +
    tsel.loyalty.score * 0.20
  );
  
  return successResponse({
    tsel,
    rIndex: parseFloat(rIndex.toFixed(1)),
  }, 'TSEL 분석 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Sigma Breakdown
// ─────────────────────────────────────────────────────────────────────

function getSigma(customerId: string) {
  const sigma = randomFloat(0.5, 1.0);
  
  const breakdown: SigmaBreakdown = {
    sigma,
    sigmaLabel: sigma > 0.85 ? '좋은 환경' : sigma > 0.7 ? '보통' : '나쁜 환경',
    breakdown: {
      internal: {
        score: randomFloat(0.6, 0.95),
        weight: 0.4,
        factors: [
          { id: 'attendance', name: '출석률', value: randomFloat(0.7, 0.98), impact: 0.35 },
          { id: 'homework', name: '숙제 완료율', value: randomFloat(0.5, 0.9), impact: 0.25 },
          { id: 'payment', name: '결제 정상', value: randomFloat(0.9, 1.0), impact: 0.25 },
          { id: 'participation', name: '수업 참여', value: randomFloat(0.5, 0.9), impact: 0.15 },
        ],
      },
      voice: {
        score: randomFloat(0.5, 1.0),
        weight: 0.4,
        currentStage: randomChoice<VoiceStage>(['request', 'wish', 'complaint', 'churn_signal']),
        recentVoices: randomInt(0, 3),
      },
      external: {
        score: randomFloat(0.6, 0.95),
        weight: 0.2,
        factors: [
          { id: 'exam', name: '시험 시즌', impact: randomFloat(-0.2, 0) },
          { id: 'competition', name: '경쟁사 동향', impact: randomFloat(-0.15, 0) },
          { id: 'economy', name: '경기 상황', impact: randomFloat(-0.1, 0.05) },
        ],
      },
    },
  };
  
  return successResponse(breakdown, 'σ 요인 분해 완료');
}

// ─────────────────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────────────────

function getHistory(customerId: string, params: URLSearchParams) {
  const period = params.get('period') || '6m';
  const months = period === '1y' ? 12 : period === '3m' ? 3 : period === 'all' ? 24 : 6;
  
  let temperature = randomInt(60, 80);
  const timeline = Array.from({ length: months * 4 }, (_, i) => {
    temperature = Math.max(20, Math.min(95, temperature + randomInt(-8, 8)));
    return {
      date: formatDate(-7 * (months * 4 - i)),
      temperature,
      event: Math.random() > 0.9 ? randomChoice(['상담', '성적 변동', 'Voice']) : undefined,
    };
  });
  
  const events = [
    { date: formatDate(-90), type: 'registration', description: '신규 등록', temperatureChange: 0 },
    { date: formatDate(-60), type: 'grade_change', description: '성적 상승', temperatureChange: 8 },
    { date: formatDate(-30), type: 'voice', description: '비용 관련 문의', temperatureChange: -5 },
    { date: formatDate(-7), type: 'consultation', description: '학부모 상담', temperatureChange: 12 },
  ];
  
  return successResponse({
    timeline,
    events,
  }, '히스토리 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Voice History
// ─────────────────────────────────────────────────────────────────────

function getVoice(customerId: string) {
  const voices = Array.from({ length: randomInt(3, 8) }, () => {
    const voice = generateVoiceBrief();
    return {
      ...voice,
      customerId,
      stageIcon: voice.stage === 'request' ? '🙏' : voice.stage === 'wish' ? '💭' : voice.stage === 'complaint' ? '😟' : '🚨',
      sentiment: randomFloat(-1, 0.5),
      status: randomChoice<'pending' | 'resolved'>(['pending', 'resolved']),
      resolution: Math.random() > 0.5 ? '상담으로 해결' : undefined,
    };
  });
  
  return successResponse({ voices }, 'Voice 이력 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Predict
// ─────────────────────────────────────────────────────────────────────

function getPredict(customerId: string) {
  const baseChurn = randomFloat(0.15, 0.45);
  
  return successResponse({
    churn: {
      probability: baseChurn,
      predictedDate: formatDate(randomInt(30, 90)),
      confidence: randomFloat(0.7, 0.88),
      mainFactors: ['비용 민감', '출석률 하락', '경쟁사 인접'],
    },
    scenarios: [
      {
        scenario: 'no_action',
        predictedTemperature: randomInt(30, 45),
        predictedChurn: baseChurn,
      },
      {
        scenario: 'standard_care',
        predictedTemperature: randomInt(50, 65),
        predictedChurn: baseChurn * 0.7,
      },
      {
        scenario: 'intensive_care',
        predictedTemperature: randomInt(65, 80),
        predictedChurn: baseChurn * 0.4,
      },
    ],
  }, '예측 분석 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Recommend
// ─────────────────────────────────────────────────────────────────────

function getRecommend(customerId: string) {
  return successResponse({
    recommendation: {
      strategy: 'value_reinforcement',
      strategyName: '가치 재인식 상담',
      reasoning: '비용 민감 Voice + 경쟁사 프로모션 노출',
      tips: [
        '가격 대비 가치 데이터 제시',
        '타학원 대비 성적 향상률 강조',
        '장기 등록 시 혜택 안내',
        '강사 1:1 피드백 강조',
      ],
      expectedEffect: {
        temperatureChange: 15,
        churnReduction: 0.15,
      },
    },
    actions: [
      { type: 'consultation', label: '학부모 상담 예약', suggested: true },
      { type: 'message', label: '격려 메시지 발송', suggested: true },
      { type: 'task', label: '담임 강사 면담', suggested: false },
    ],
  }, 'AI 추천 완료');
}
