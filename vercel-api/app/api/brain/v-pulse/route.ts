// =============================================================================
// AUTUS v1.0 - V-Pulse API
// Real-time Risk Calculation Engine
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  VPulseInput,
  VPulseOutput,
  RiskBand,
  CardType,
  FeatureWeights,
  DEFAULT_FEATURE_WEIGHTS,
} from '@/lib/types-erp';

// -----------------------------------------------------------------------------
// Supabase Client
// -----------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// -----------------------------------------------------------------------------
// POST: Calculate Risk for Student
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { student_id, academy_id } = body;
    
    if (!student_id || !academy_id) {
      return NextResponse.json(
        { ok: false, error: 'student_id and academy_id are required' },
        { status: 400 }
      );
    }
    
    // Fetch student data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('external_id', student_id)
      .eq('academy_id', academy_id)
      .single();
    
    if (studentError || !student) {
      return NextResponse.json(
        { ok: false, error: 'Student not found' },
        { status: 404 }
      );
    }
    
    // Fetch student signals
    const { data: signals } = await supabase
      .from('student_signals')
      .select('*')
      .eq('student_id', student_id)
      .eq('academy_id', academy_id)
      .single();
    
    // Fetch feature weights (for self-learning)
    const weights = await getFeatureWeights(academy_id);
    
    // Calculate V-Pulse
    const result = calculateVPulse(student, signals, weights);
    
    // Update student with new risk score
    await supabase
      .from('students')
      .update({
        risk_score: result.risk_score,
        risk_band: result.risk_band,
        confidence_score: result.confidence,
      })
      .eq('id', student.id);
    
    return NextResponse.json({
      ok: true,
      data: result,
    });
    
  } catch (error: any) {
    console.error('V-Pulse error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// GET: Batch calculate for all students in academy
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const academyId = req.nextUrl.searchParams.get('academy_id');
    const riskBand = req.nextUrl.searchParams.get('risk_band');
    
    if (!academyId) {
      return NextResponse.json(
        { ok: false, error: 'academy_id is required' },
        { status: 400 }
      );
    }
    
    // Fetch all students
    let query = supabase
      .from('students')
      .select('*')
      .eq('academy_id', academyId);
    
    if (riskBand) {
      query = query.eq('risk_band', riskBand);
    }
    
    const { data: students, error } = await query;
    
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    
    // Get weights
    const weights = await getFeatureWeights(academyId);
    
    // Calculate for each student
    const results: VPulseOutput[] = [];
    
    for (const student of students || []) {
      const { data: signals } = await supabase
        .from('student_signals')
        .select('*')
        .eq('student_id', student.external_id)
        .eq('academy_id', academyId)
        .single();
      
      const result = calculateVPulse(student, signals, weights);
      results.push(result);
      
      // Update student
      await supabase
        .from('students')
        .update({
          risk_score: result.risk_score,
          risk_band: result.risk_band,
          confidence_score: result.confidence,
        })
        .eq('id', student.id);
    }
    
    // Summary
    const summary = {
      total: results.length,
      critical: results.filter(r => r.risk_band === 'critical').length,
      high: results.filter(r => r.risk_band === 'high').length,
      medium: results.filter(r => r.risk_band === 'medium').length,
      low: results.filter(r => r.risk_band === 'low').length,
      avg_risk: results.reduce((a, b) => a + b.risk_score, 0) / results.length || 0,
      avg_confidence: results.reduce((a, b) => a + b.confidence, 0) / results.length || 0,
    };
    
    return NextResponse.json({
      ok: true,
      data: {
        students: results,
        summary,
      },
    });
    
  } catch (error: any) {
    console.error('V-Pulse batch error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// V-Pulse Calculation Engine
// -----------------------------------------------------------------------------

function calculateVPulse(
  student: any,
  signals: any,
  weights: FeatureWeights
): VPulseOutput {
  const detectedSignals: VPulseOutput['signals'] = [];
  let totalRisk = 0;
  let dataPoints = 0;
  
  // 1. Attendance Risk (0-100 points)
  const attendanceRate = student.attendance_rate ?? 100;
  if (attendanceRate < 100) {
    const attendanceRisk = Math.max(0, 100 - attendanceRate);
    const weightedRisk = attendanceRisk * weights.attendance * 3;
    totalRisk += weightedRisk;
    dataPoints++;
    
    if (attendanceRate < 80) {
      detectedSignals.push({
        type: 'attendance',
        severity: attendanceRate < 60 ? 'critical' : 'high',
        description: `출석률 ${attendanceRate}% (기준 80% 미만)`,
      });
    }
  }
  
  // 2. Homework Risk (0-75 points)
  const homeworkMissed = signals?.homework_missed ?? 0;
  if (homeworkMissed > 0) {
    const homeworkRisk = Math.min(75, homeworkMissed * 15);
    const weightedRisk = homeworkRisk * weights.homework * 3;
    totalRisk += weightedRisk;
    dataPoints++;
    
    if (homeworkMissed >= 2) {
      detectedSignals.push({
        type: 'homework',
        severity: homeworkMissed >= 5 ? 'critical' : homeworkMissed >= 3 ? 'high' : 'medium',
        description: `과제 미제출 ${homeworkMissed}회`,
      });
    }
  }
  
  // 3. Grade Risk (0-50 points)
  const scoreChange = student.score_change ?? signals?.recent_score_change ?? 0;
  if (scoreChange < 0) {
    const gradeRisk = Math.min(50, Math.abs(scoreChange) * 2);
    const weightedRisk = gradeRisk * weights.grade * 2.5;
    totalRisk += weightedRisk;
    dataPoints++;
    
    if (scoreChange <= -10) {
      detectedSignals.push({
        type: 'grade',
        severity: scoreChange <= -20 ? 'critical' : 'high',
        description: `성적 ${scoreChange}점 하락`,
      });
    }
  }
  
  // 4. Payment Risk (0-100 points)
  const unpaidAmount = student.unpaid_amount ?? signals?.unpaid_amount ?? 0;
  const monthlyFee = student.monthly_fee ?? 350000; // Default 35만원
  
  if (unpaidAmount > 0) {
    const monthsUnpaid = Math.min(3, unpaidAmount / monthlyFee);
    const paymentRisk = Math.min(100, monthsUnpaid * 35);
    const weightedRisk = paymentRisk * weights.payment * 3;
    totalRisk += weightedRisk;
    dataPoints++;
    
    detectedSignals.push({
      type: 'payment',
      severity: monthsUnpaid >= 2 ? 'critical' : monthsUnpaid >= 1 ? 'high' : 'medium',
      description: `미납금 ${unpaidAmount.toLocaleString()}원 (${Math.round(monthsUnpaid * 10) / 10}개월분)`,
    });
  }
  
  // 5. Parent Engagement (penalty if no recent contact)
  // Future: analyze consultation records
  
  // Calculate final risk score (0-300 scale)
  const riskScore = Math.min(300, Math.round(totalRisk));
  
  // Calculate confidence based on data completeness
  const maxDataPoints = 4;
  const dataConfidence = Math.min(1, (dataPoints + 1) / maxDataPoints);
  const signalConfidence = detectedSignals.length > 0 ? 0.8 : 0.5;
  const confidence = Math.round((dataConfidence * 0.6 + signalConfidence * 0.4) * 100) / 100;
  
  // Determine risk band
  const riskBand = getRiskBand(riskScore);
  
  // Suggest card if risk is significant
  const suggestedCard = getSuggestedCard(riskScore, riskBand, detectedSignals);
  
  return {
    student_id: student.external_id,
    academy_id: student.academy_id,
    risk_score: riskScore,
    risk_band: riskBand,
    confidence,
    signals: detectedSignals,
    suggested_card: suggestedCard,
    calculated_at: new Date().toISOString(),
  };
}

function getRiskBand(score: number): RiskBand {
  if (score >= 200) return 'critical';
  if (score >= 150) return 'high';
  if (score >= 100) return 'medium';
  return 'low';
}

function getSuggestedCard(
  riskScore: number,
  riskBand: RiskBand,
  signals: VPulseOutput['signals']
): VPulseOutput['suggested_card'] | undefined {
  if (riskScore < 80) return undefined;
  
  const hasCriticalSignal = signals.some(s => s.severity === 'critical');
  const hasHighSignal = signals.some(s => s.severity === 'high');
  const paymentSignal = signals.find(s => s.type === 'payment');
  const attendanceSignal = signals.find(s => s.type === 'attendance');
  
  if (hasCriticalSignal || riskScore >= 200) {
    return {
      type: 'EMERGENCY',
      priority: 1,
      reason: `긴급 상담 필요: ${signals[0]?.description || '복합 위험 감지'}`,
    };
  }
  
  if (hasHighSignal || riskScore >= 150) {
    return {
      type: 'ATTENTION',
      priority: 2,
      reason: paymentSignal?.description || attendanceSignal?.description || '위험 신호 감지',
    };
  }
  
  if (riskScore >= 100) {
    return {
      type: 'INSIGHT',
      priority: 3,
      reason: '예방적 관심 권장',
    };
  }
  
  return undefined;
}

async function getFeatureWeights(academyId: string): Promise<FeatureWeights> {
  try {
    const { data } = await supabase
      .from('academy_settings')
      .select('feature_weights')
      .eq('academy_id', academyId)
      .single();
    
    if (data?.feature_weights) {
      return data.feature_weights as FeatureWeights;
    }
  } catch {
    // Use defaults
  }
  
  return DEFAULT_FEATURE_WEIGHTS;
}
