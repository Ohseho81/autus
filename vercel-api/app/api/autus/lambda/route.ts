/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Lambda (λ) API
 * 
 * λ = λ_base × (1/R) × I × E × N
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// 역할별 기본 λ 값
const DEFAULT_LAMBDAS: Record<string, number> = {
  owner: 5.0,
  director: 3.5,
  senior_teacher: 3.0,
  teacher: 2.0,
  junior_teacher: 1.5,
  admin: 1.5,
  student: 1.0,
  parent: 1.2,
  c_level: 5.0,
  fsd: 3.5,
  optimus: 2.0,
  consumer: 1.0,
  regulatory: 2.0,
  partner: 2.5,
};

const LAMBDA_CONSTRAINTS = { min: 0.5, max: 10.0 };

// λ 계산 함수
function calculateLambda(
  role: string,
  components?: {
    replaceability?: number;
    influence?: number;
    expertise?: number;
    network_position?: number;
  }
): number {
  const baseLambda = DEFAULT_LAMBDAS[role] || 1.0;
  
  if (!components) {
    return baseLambda;
  }
  
  const {
    replaceability = 0.5,
    influence = 0.5,
    expertise = 0.5,
    network_position = 0.5,
  } = components;
  
  const rFactor = replaceability > 0 ? 1 / replaceability : 10;
  const rawLambda = rFactor * influence * expertise * network_position;
  const normalizedLambda = Math.min(
    LAMBDA_CONSTRAINTS.max,
    Math.max(LAMBDA_CONSTRAINTS.min, rawLambda * 0.5)
  );
  
  return Math.round(normalizedLambda * 100) / 100;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  
  if (role) {
    return NextResponse.json({
      role,
      lambda: DEFAULT_LAMBDAS[role] || 1.0,
      description: getDescription(role),
    });
  }
  
  return NextResponse.json({
    defaults: DEFAULT_LAMBDAS,
    constraints: LAMBDA_CONSTRAINTS,
    formula: 'λ = λ_base × (1/R) × I × E × N',
    roles: Object.entries(DEFAULT_LAMBDAS).map(([role, lambda]) => ({
      role,
      lambda,
      description: getDescription(role),
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, components } = body;
    
    if (!role) {
      return NextResponse.json(
        { success: false, error: 'role is required' },
        { status: 400 }
      );
    }
    
    const lambda = calculateLambda(role, components);
    const baseLambda = DEFAULT_LAMBDAS[role] || 1.0;
    
    return NextResponse.json({
      success: true,
      data: {
        role,
        lambda,
        lambda_base: baseLambda,
        components: components || {
          replaceability: 0.5,
          influence: 0.5,
          expertise: 0.5,
          network_position: 0.5,
        },
        interpretation: interpretLambda(lambda),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function getDescription(role: string): string {
  const descriptions: Record<string, string> = {
    owner: '원장/대표 - 대체 불가, 최대 영향력',
    director: '실장/부원장 - 낮은 대체성, 높은 영향력',
    senior_teacher: '수석 강사 - 전문성 높음',
    teacher: '일반 강사 - 중간 전문성',
    junior_teacher: '신입 강사 - 학습 중',
    admin: '행정 직원 - 대체 가능',
    student: '학생 - 기준 노드',
    parent: '학부모 - 의사결정권',
    c_level: 'C-Level - 전략적 의사결정',
    fsd: 'FSD - 실무 리더',
    optimus: 'Optimus - 실무자',
    consumer: '서비스 이용자',
    regulatory: '규제기관',
    partner: '파트너',
  };
  return descriptions[role] || '알 수 없는 역할';
}

function interpretLambda(lambda: number): {
  level: 'critical' | 'high' | 'medium' | 'standard';
  description: string;
  hourValue: string;
} {
  if (lambda >= 4.0) {
    return {
      level: 'critical',
      description: '핵심 인력 - 대체 불가',
      hourValue: `1시간 = ${lambda.toFixed(1)} STU`,
    };
  } else if (lambda >= 2.5) {
    return {
      level: 'high',
      description: '핵심 기여자',
      hourValue: `1시간 = ${lambda.toFixed(1)} STU`,
    };
  } else if (lambda >= 1.5) {
    return {
      level: 'medium',
      description: '활발한 기여자',
      hourValue: `1시간 = ${lambda.toFixed(1)} STU`,
    };
  } else {
    return {
      level: 'standard',
      description: '기준 수준',
      hourValue: `1시간 = ${lambda.toFixed(1)} STU`,
    };
  }
}
