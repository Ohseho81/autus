/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Efficiency API
 * 
 * E = A_out / A_in
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// 효율 계산
function calculateEfficiency(output: number, input: number): number {
  if (input <= 0) return 0;
  return Math.round((output / input) * 100) / 100;
}

// 효율 레벨 결정
function getEfficiencyLevel(ratio: number): {
  level: 'excellent' | 'good' | 'break_even' | 'loss';
  description: string;
  color: string;
} {
  if (ratio >= 3.0) {
    return { level: 'excellent', description: '탁월한 효율 (3x+)', color: '#22c55e' };
  } else if (ratio >= 1.5) {
    return { level: 'good', description: '좋은 효율 (1.5x+)', color: '#3b82f6' };
  } else if (ratio >= 1.0) {
    return { level: 'break_even', description: '손익분기', color: '#eab308' };
  } else {
    return { level: 'loss', description: '손실 구간', color: '#ef4444' };
  }
}

// Mock data
const MOCK_EFFICIENCY = {
  period_start: '2025-01-01',
  period_end: '2025-01-31',
  total_input_stu: 1250,
  total_input_krw: 37500000,
  total_output_stu: 3847,
  total_output_krw: 115410000,
  by_activity_type: {
    'class': { input: 800, output: 2400, efficiency: 3.0 },
    'consult': { input: 200, output: 700, efficiency: 3.5 },
    'admin': { input: 250, output: 747, efficiency: 2.99 },
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id') || 'demo';
  
  try {
    const efficiency = calculateEfficiency(
      MOCK_EFFICIENCY.total_output_stu,
      MOCK_EFFICIENCY.total_input_stu
    );
    
    const levelInfo = getEfficiencyLevel(efficiency);
    
    return NextResponse.json({
      success: true,
      data: {
        org_id: orgId,
        period: {
          start: MOCK_EFFICIENCY.period_start,
          end: MOCK_EFFICIENCY.period_end,
        },
        input: {
          stu: MOCK_EFFICIENCY.total_input_stu,
          krw: MOCK_EFFICIENCY.total_input_krw,
        },
        output: {
          stu: MOCK_EFFICIENCY.total_output_stu,
          krw: MOCK_EFFICIENCY.total_output_krw,
        },
        efficiency: {
          ratio: efficiency,
          ...levelInfo,
        },
        by_activity: MOCK_EFFICIENCY.by_activity_type,
        formula: 'E = A_out / A_in',
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, input_stu, output_stu, input_krw, output_krw } = body;
    
    switch (action) {
      case 'calculate': {
        const efficiency = calculateEfficiency(output_stu || 0, input_stu || 0);
        const levelInfo = getEfficiencyLevel(efficiency);
        
        return NextResponse.json({
          success: true,
          data: {
            efficiency_ratio: efficiency,
            ...levelInfo,
            input_stu,
            output_stu,
            input_krw,
            output_krw,
            roi_percent: Math.round((efficiency - 1) * 100),
          },
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
