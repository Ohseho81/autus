/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Calculate API
 * 
 * 핵심 공식: A = T^σ
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
interface CalculateInput {
  t: number;        // 물리 시간
  lambda: number;   // 노드 가치
  sigma: number;    // 시너지
}

interface MeasureSigmaInput {
  a: number;        // 가치
  t: number;        // 물리 시간
  lambda?: number;  // 노드 가치 (기본값 1)
}

interface OmegaInput {
  relationships: Array<{
    tTotal: number;
    sigma: number;
    lambdaAvg: number;
  }>;
}

// ============================================
// 핵심 계산 함수
// ============================================

/**
 * A = T^σ (T = λ × t)
 */
function calculateA(t: number, lambda: number, sigma: number): number {
  const T = lambda * t;
  if (T <= 0) return 0;
  return Math.pow(T, sigma);
}

/**
 * T = λ × t
 */
function calculateT(lambda: number, t: number): number {
  return lambda * t;
}

/**
 * σ = log(A) / log(T)
 */
function measureSigma(a: number, t: number, lambda: number = 1): number {
  const T = lambda * t;
  if (T <= 1 || a <= 0) return 1.0;
  const sigma = Math.log(a) / Math.log(T);
  return Math.max(0.5, Math.min(3.0, sigma));
}

/**
 * Ω = Σ(T^σ)
 */
function calculateOmega(
  relationships: Array<{ tTotal: number; sigma: number; lambdaAvg: number }>
): number {
  return relationships.reduce((omega, rel) => {
    const T = rel.lambdaAvg * rel.tTotal;
    const A = Math.pow(T, rel.sigma);
    return omega + A;
  }, 0);
}

/**
 * σ 등급 판정
 */
function getSigmaGrade(sigma: number): {
  grade: string;
  color: string;
  label: string;
} {
  if (sigma < 0.7) return { grade: 'critical', color: '#000000', label: '⚫ 위험' };
  if (sigma < 1.0) return { grade: 'at_risk', color: '#ef4444', label: '🔴 주의' };
  if (sigma < 1.3) return { grade: 'neutral', color: '#eab308', label: '🟡 보통' };
  if (sigma < 1.6) return { grade: 'good', color: '#22c55e', label: '🟢 양호' };
  if (sigma < 2.0) return { grade: 'loyal', color: '#3b82f6', label: '🔵 충성' };
  return { grade: 'advocate', color: '#a855f7', label: '💜 팬' };
}

// ============================================
// OPTIONS (CORS)
// ============================================
export async function OPTIONS() {
  return optionsResponse();
}

// ============================================
// POST - 가치 계산
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      // A = T^σ 계산
      case 'calculate_a': {
        const { t, lambda = 1, sigma = 1 } = body as CalculateInput;
        
        if (t === undefined) {
          return errorResponse('t (물리 시간) is required', 400);
        }
        
        const T = calculateT(lambda, t);
        const A = calculateA(t, lambda, sigma);
        const grade = getSigmaGrade(sigma);
        
        return successResponse({
          t,
          lambda,
          T,
          sigma,
          A,
          grade,
          formula: `A = T^σ = (${lambda} × ${t})^${sigma} = ${T.toFixed(2)}^${sigma} = ${A.toFixed(2)}`,
        }, 'Value calculated');
      }
      
      // σ 역산
      case 'measure_sigma': {
        const { a, t, lambda = 1 } = body as MeasureSigmaInput;
        
        if (a === undefined || t === undefined) {
          return errorResponse('a (가치) and t (물리 시간) are required', 400);
        }
        
        const sigma = measureSigma(a, t, lambda);
        const grade = getSigmaGrade(sigma);
        const T = calculateT(lambda, t);
        
        return successResponse({
          a,
          t,
          lambda,
          T,
          sigma,
          grade,
          formula: `σ = log(A) / log(T) = log(${a}) / log(${T.toFixed(2)}) = ${sigma.toFixed(4)}`,
        }, 'Sigma measured');
      }
      
      // Ω 계산
      case 'calculate_omega': {
        const { relationships } = body as OmegaInput;
        
        if (!relationships || !Array.isArray(relationships)) {
          return errorResponse('relationships array is required', 400);
        }
        
        const omega = calculateOmega(relationships);
        const avgSigma = relationships.reduce((s, r) => s + r.sigma, 0) / relationships.length;
        const avgGrade = getSigmaGrade(avgSigma);
        
        // σ 분포 계산
        const distribution = {
          critical: 0,
          at_risk: 0,
          neutral: 0,
          good: 0,
          loyal: 0,
          advocate: 0,
        };
        
        relationships.forEach(r => {
          const g = getSigmaGrade(r.sigma).grade;
          distribution[g as keyof typeof distribution]++;
        });
        
        return successResponse({
          omega,
          relationshipCount: relationships.length,
          avgSigma,
          avgGrade,
          distribution,
          formula: `Ω = Σ(T^σ) = ${omega.toFixed(2)}`,
        }, 'Omega calculated');
      }
      
      // 예측
      case 'predict': {
        const { currentA, currentSigma, tRemaining, lambda = 1 } = body;
        
        if (currentA === undefined || currentSigma === undefined || tRemaining === undefined) {
          return errorResponse('currentA, currentSigma, tRemaining are required', 400);
        }
        
        const T = lambda * tRemaining;
        const deltaA = Math.pow(T, currentSigma);
        const predictedA = currentA + deltaA;
        
        return successResponse({
          currentA,
          currentSigma,
          tRemaining,
          lambda,
          deltaA,
          predictedA,
          formula: `A_predicted = A_current + T^σ = ${currentA} + ${T}^${currentSigma} = ${predictedA.toFixed(2)}`,
        }, 'Prediction calculated');
      }
      
      default:
        return errorResponse(`Unknown action: ${action}. Valid actions: calculate_a, measure_sigma, calculate_omega, predict`, 400);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Calculate API');
  }
}

// ============================================
// GET - API 정보
// ============================================
export async function GET() {
  return successResponse({
    name: 'AUTUS Calculate API',
    version: '2.0',
    formula: 'A = T^σ (where T = λ × t)',
    actions: {
      calculate_a: {
        description: '가치(A) 계산',
        params: { t: 'number (물리 시간)', lambda: 'number (노드 가치, 기본값 1)', sigma: 'number (시너지, 기본값 1)' },
      },
      measure_sigma: {
        description: 'σ 역산',
        params: { a: 'number (가치)', t: 'number (물리 시간)', lambda: 'number (노드 가치, 기본값 1)' },
      },
      calculate_omega: {
        description: '조직 가치(Ω) 계산',
        params: { relationships: 'Array<{tTotal, sigma, lambdaAvg}>' },
      },
      predict: {
        description: '가치 예측',
        params: { currentA: 'number', currentSigma: 'number', tRemaining: 'number', lambda: 'number' },
      },
    },
    sigmaGrades: {
      critical: { range: '< 0.7', label: '⚫ 위험' },
      at_risk: { range: '0.7-1.0', label: '🔴 주의' },
      neutral: { range: '1.0-1.3', label: '🟡 보통' },
      good: { range: '1.3-1.6', label: '🟢 양호' },
      loyal: { range: '1.6-2.0', label: '🔵 충성' },
      advocate: { range: '≥ 2.0', label: '💜 팬' },
    },
    nodeLambda: {
      OWNER: 5.0,
      MANAGER: 3.0,
      STAFF: 2.0,
      STUDENT: 1.0,
      PARENT: 1.2,
      PROSPECT: 0.8,
      CHURNED: 0.5,
      EXTERNAL: 1.0,
    },
  });
}
