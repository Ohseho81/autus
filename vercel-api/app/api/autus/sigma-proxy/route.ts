/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Sigma Proxy API
 * 
 * σ 프록시 지표 기반 예측 및 역산
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// 프록시 가중치
const SIGMA_PROXY_WEIGHTS = {
  responseSpeed: 0.15,
  engagementRate: 0.25,
  completionRate: 0.20,
  sentimentScore: 0.20,
  renewalHistory: 0.20,
};

// σ 프록시 예측
function predictSigmaFromProxy(indicators: {
  responseSpeed: number;
  engagementRate: number;
  completionRate: number;
  sentimentScore: number;
  renewalHistory: number;
}): number {
  const normalizedSentiment = (indicators.sentimentScore + 1) / 2;
  
  const score =
    SIGMA_PROXY_WEIGHTS.responseSpeed * indicators.responseSpeed +
    SIGMA_PROXY_WEIGHTS.engagementRate * indicators.engagementRate +
    SIGMA_PROXY_WEIGHTS.completionRate * indicators.completionRate +
    SIGMA_PROXY_WEIGHTS.sentimentScore * normalizedSentiment +
    SIGMA_PROXY_WEIGHTS.renewalHistory * indicators.renewalHistory;
  
  const sigma = (score * 2) - 1;
  return Math.round(sigma * 1000) / 1000;
}

// σ 역산
function calculateSigmaFromResults(resultValue: number, inputValue: number): number {
  if (inputValue <= 0 || inputValue === 1 || resultValue <= 0) {
    return 0;
  }
  return Math.round((Math.log(resultValue) / Math.log(inputValue)) * 1000) / 1000;
}

// 신뢰도 평가
function assessConfidence(indicators: any): {
  confidence: number;
  missing: string[];
  recommendation: string;
} {
  const missing: string[] = [];
  let dataPoints = 0;
  
  if (indicators.responseSpeed > 0) dataPoints++; else missing.push('응답속도');
  if (indicators.engagementRate > 0) dataPoints++; else missing.push('참여도');
  if (indicators.completionRate > 0) dataPoints++; else missing.push('완료율');
  if (indicators.sentimentScore !== 0) dataPoints++; else missing.push('감정분석');
  if (indicators.renewalHistory > 0) dataPoints++; else missing.push('재등록이력');
  
  const confidence = dataPoints / 5;
  
  let recommendation: string;
  if (confidence >= 0.8) {
    recommendation = 'σ 예측 신뢰도 높음';
  } else if (confidence >= 0.6) {
    recommendation = 'σ 예측 가능, 추가 데이터 권장';
  } else if (confidence >= 0.4) {
    recommendation = 'σ 예측 불확실, 수동 평가 권장';
  } else {
    recommendation = '데이터 부족, 역할 기반 기본값 사용';
  }
  
  return { confidence: Math.round(confidence * 100) / 100, missing, recommendation };
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      weights: SIGMA_PROXY_WEIGHTS,
      indicators: [
        { key: 'responseSpeed', label: '응답 속도', range: '0-1', description: '메시지/요청 응답 속도 (1=즉시)' },
        { key: 'engagementRate', label: '참여도', range: '0-1', description: '활동 참여율 (질문, 발언, 출석)' },
        { key: 'completionRate', label: '완료율', range: '0-1', description: '과제/목표 완료 비율' },
        { key: 'sentimentScore', label: '감정 점수', range: '-1~+1', description: '대화 톤/분위기 분석' },
        { key: 'renewalHistory', label: '재등록 이력', range: '0-1', description: '이전 재등록/갱신 비율' },
      ],
      formulas: {
        proxy_prediction: 'σ = Σ(w_i × indicator_i) * 2 - 1',
        reverse_calculation: 'σ = log(A) / log(T)',
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'predict': {
        const { responseSpeed, engagementRate, completionRate, sentimentScore, renewalHistory } = body;
        
        const indicators = {
          responseSpeed: responseSpeed || 0.5,
          engagementRate: engagementRate || 0.5,
          completionRate: completionRate || 0.5,
          sentimentScore: sentimentScore || 0,
          renewalHistory: renewalHistory || 0.5,
        };
        
        const sigma = predictSigmaFromProxy(indicators);
        const assessment = assessConfidence(indicators);
        
        // σ 해석
        let interpretation: string;
        if (sigma >= 0.2) interpretation = '탁월한 시너지 예상';
        else if (sigma >= 0.1) interpretation = '좋은 시너지 예상';
        else if (sigma >= 0) interpretation = '보통 수준';
        else if (sigma >= -0.1) interpretation = '주의 필요';
        else interpretation = '위험 관계';
        
        return NextResponse.json({
          success: true,
          data: {
            predicted_sigma: sigma,
            interpretation,
            confidence: assessment.confidence,
            missing_indicators: assessment.missing,
            recommendation: assessment.recommendation,
            indicators,
          },
        });
      }
      
      case 'reverse': {
        const { result_value, input_value } = body;
        
        if (!result_value || !input_value) {
          return NextResponse.json(
            { success: false, error: 'result_value and input_value required' },
            { status: 400 }
          );
        }
        
        const sigma = calculateSigmaFromResults(result_value, input_value);
        
        // σ 해석
        let interpretation: string;
        if (sigma >= 1.5) interpretation = '기하급수적 증폭 (폭발적 성장)';
        else if (sigma >= 1.2) interpretation = '높은 증폭 (좋은 성과)';
        else if (sigma >= 1.0) interpretation = '선형 성장 (기대 수준)';
        else if (sigma >= 0.8) interpretation = '수확 체감 (개선 필요)';
        else interpretation = '손실 구간 (즉시 조치 필요)';
        
        return NextResponse.json({
          success: true,
          data: {
            measured_sigma: sigma,
            interpretation,
            input_value,
            result_value,
            amplification: `${result_value} = ${input_value}^${sigma.toFixed(3)}`,
          },
        });
      }
      
      case 'compare': {
        const { predicted, measured } = body;
        
        const deviation = measured - predicted;
        const accuracy = 1 - Math.min(1, Math.abs(deviation));
        
        let assessment: string;
        if (Math.abs(deviation) < 0.1) {
          assessment = 'accurate';
        } else if (deviation < 0) {
          assessment = 'overestimate';
        } else {
          assessment = 'underestimate';
        }
        
        return NextResponse.json({
          success: true,
          data: {
            predicted,
            measured,
            deviation: Math.round(deviation * 1000) / 1000,
            accuracy: Math.round(accuracy * 100) / 100,
            assessment,
            recommendation: assessment === 'accurate' 
              ? '예측 모델 정확' 
              : assessment === 'overestimate'
                ? '예측 모델이 낙관적 - 가중치 조정 필요'
                : '예측 모델이 비관적 - 가중치 조정 필요',
          },
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
