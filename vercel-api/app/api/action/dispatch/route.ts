// =============================================================================
// AUTUS v1.0 - Card Dispatch API
// Send messages to parents via SMS/Kakao/Email
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { CardType, CardTone, CardDispatch, CardOutcome } from '@/lib/types-erp';
import { captureError } from '../../../../lib/monitoring';
import { logger } from '../../../../lib/logger';

// -----------------------------------------------------------------------------
// Clients (lazy initialization to reduce cold start)
// -----------------------------------------------------------------------------

let _anthropic: InstanceType<typeof import('@anthropic-ai/sdk').default> | null = null;
function getAnthropic() {
  if (!_anthropic) {
    const Anthropic = require('@anthropic-ai/sdk').default;
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic!;
}

// Lazy getSupabaseAdmin() getter
const getSupabase = () => getSupabaseAdmin();

// -----------------------------------------------------------------------------
// POST: Dispatch a card to parent
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student_id,
      academy_id,
      card_type = 'ATTENTION',
      tone = 'friendly',
      channel = 'kakao',
      custom_message,
    } = body;
    
    if (!student_id || !academy_id) {
      return NextResponse.json(
        { ok: false, error: 'student_id and academy_id are required' },
        { status: 400 }
      );
    }
    
    // Fetch student data
    const { data: student, error: studentError } = await getSupabase()
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
    
    // Fetch signals for context
    const { data: signals } = await getSupabase()
      .from('student_signals')
      .select('*')
      .eq('student_id', student_id)
      .eq('academy_id', academy_id)
      .single();
    
    // Generate message content
    const message = custom_message || await generateCardMessage(
      student,
      signals,
      card_type as CardType,
      tone as CardTone
    );
    
    // Create dispatch record
    const dispatch: Partial<CardDispatch> = {
      student_id,
      academy_id,
      card_type: card_type as CardType,
      tone: tone as CardTone,
      content: message,
      channel: channel as 'sms' | 'kakao' | 'email',
      recipient: student.parent_phone || student.parent_email || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    
    const { data: dispatchRecord, error: dispatchError } = await getSupabase()
      .from('card_dispatches')
      .insert(dispatch)
      .select()
      .single();
    
    if (dispatchError) {
      return NextResponse.json(
        { ok: false, error: 'Failed to create dispatch record' },
        { status: 500 }
      );
    }
    
    // Send via appropriate channel
    let sendResult;
    switch (channel) {
      case 'kakao':
        sendResult = await sendKakaoAlimtalk(student.parent_phone, message);
        break;
      case 'sms':
        sendResult = await sendSMS(student.parent_phone, message);
        break;
      case 'email':
        sendResult = await sendEmail(student.parent_email, student.name, message);
        break;
      default:
        sendResult = { success: false, error: 'Unknown channel' };
    }
    
    // Update dispatch status
    await getSupabase()
      .from('card_dispatches')
      .update({
        status: sendResult.success ? 'sent' : 'failed',
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error: sendResult.error,
      })
      .eq('id', dispatchRecord.id);
    
    return NextResponse.json({
      ok: sendResult.success,
      data: {
        dispatch_id: dispatchRecord.id,
        message,
        channel,
        recipient: dispatch.recipient,
        status: sendResult.success ? 'sent' : 'failed',
      },
      error: sendResult.error,
    });
    
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error, { context: 'action-dispatch.POST' });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// PUT: Record outcome (for self-learning)
// -----------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dispatch_id,
      student_id,
      academy_id,
      outcome,
      retention_result,
      notes,
    } = body;
    
    if (!student_id || !academy_id || !outcome) {
      return NextResponse.json(
        { ok: false, error: 'student_id, academy_id, and outcome are required' },
        { status: 400 }
      );
    }
    
    // Get dispatch info if provided
    let cardType: CardType = 'ATTENTION';
    if (dispatch_id) {
      const { data: dispatch } = await getSupabase()
        .from('card_dispatches')
        .select('card_type')
        .eq('id', dispatch_id)
        .single();
      
      if (dispatch) {
        cardType = dispatch.card_type as CardType;
      }
    }
    
    // Record outcome
    const outcomeRecord: Partial<CardOutcome> = {
      student_id,
      academy_id,
      dispatch_id,
      card_type: cardType,
      outcome,
      retention_result: retention_result ?? (outcome === 'success'),
      notes,
      recorded_at: new Date().toISOString(),
    };
    
    const { data, error } = await getSupabase()
      .from('card_outcomes')
      .insert(outcomeRecord)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'Failed to record outcome' },
        { status: 500 }
      );
    }
    
    // Update feature weights based on outcome (E 고정: Self-Learning)
    if (outcome === 'success' || outcome === 'failure') {
      await updateFeatureWeights(academy_id, cardType, outcome === 'success');
    }
    
    return NextResponse.json({
      ok: true,
      data: {
        outcome_id: data.id,
        outcome,
        retention_result: outcomeRecord.retention_result,
      },
      message: 'Outcome recorded successfully',
    });
    
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error, { context: 'action-dispatch.PUT' });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Message Generation
// -----------------------------------------------------------------------------

async function generateCardMessage(
  student: Record<string, unknown>,
  signals: Record<string, unknown>,
  cardType: CardType,
  tone: CardTone
): Promise<string> {
  const toneInstructions = {
    calm: '차분하고 전문적인 어조로, 학부모가 안심할 수 있도록',
    urgent: '긴급함을 전달하되, 협력적인 어조로',
    friendly: '친근하고 따뜻한 어조로, 학부모와의 신뢰 관계를 강조',
  };
  
  const cardInstructions = {
    EMERGENCY: '즉각적인 상담이 필요한 긴급 상황을 알리는 메시지',
    ATTENTION: '주의가 필요한 상황을 알리되, 해결책을 함께 제시하는 메시지',
    INSIGHT: '학생의 상태에 대한 인사이트와 예방적 조언을 담은 메시지',
    OPPORTUNITY: '학생의 성장 기회를 축하하고 격려하는 메시지',
  };
  
  const recentSignals = signals?.recent_signals;
  const signalContext = Array.isArray(recentSignals) ? recentSignals.join(', ') : '특별한 신호 없음';
  
  const prompt = `
학원 관리 시스템에서 학부모에게 보낼 메시지를 작성해주세요.

학생 정보:
- 이름: ${student.name}
- 학년: ${student.grade || '정보 없음'}
- 출석률: ${student.attendance_rate || 100}%
- 미납금: ${student.unpaid_amount?.toLocaleString() || 0}원
- 최근 신호: ${signalContext}

메시지 유형: ${cardType} (${cardInstructions[cardType]})
어조: ${tone} (${toneInstructions[tone]})

요구사항:
1. 200자 이내로 작성
2. 학부모가 즉시 이해할 수 있게
3. 구체적인 다음 액션 제시
4. 학원명은 "[학원명]"으로 표시
5. 한국어로 작성

메시지만 출력하세요.
`.trim();

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim();
    }
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'action-dispatch.generateCardMessage' });
  }
  
  // Fallback templates
  return getTemplateMessage(student, cardType, tone);
}

function getTemplateMessage(student: Record<string, unknown>, cardType: CardType, tone: CardTone): string {
  const templates = {
    EMERGENCY: {
      calm: `[학원명] 안녕하세요, ${student.name} 학생 보호자님. 최근 학습 상태에 대해 중요한 말씀 드릴 것이 있어 연락드립니다. 편하신 시간에 상담 부탁드립니다.`,
      urgent: `[학원명] ${student.name} 학생 보호자님, 긴급 상담이 필요합니다. 최근 출결 및 학습 상황에 변화가 있어 빠른 시일 내 통화 부탁드립니다.`,
      friendly: `[학원명] ${student.name} 보호자님 안녕하세요 😊 아이 상태에 대해 함께 이야기 나누고 싶어요. 통화 가능하신 시간 알려주시면 감사하겠습니다!`,
    },
    ATTENTION: {
      calm: `[학원명] ${student.name} 학생의 최근 학습 상황을 공유드리고자 합니다. 시간 되실 때 연락 부탁드립니다.`,
      urgent: `[학원명] ${student.name} 학생의 출석률이 ${student.attendance_rate || 80}%로 확인됩니다. 상담이 필요합니다.`,
      friendly: `[학원명] ${student.name} 보호자님! 아이 학습에 대해 체크포인트 공유드려요. 편하실 때 연락주세요 📚`,
    },
    INSIGHT: {
      calm: `[학원명] ${student.name} 학생의 학습 분석 결과를 공유드립니다. 더 나은 성과를 위한 제안이 있습니다.`,
      urgent: `[학원명] ${student.name} 학생의 성적 향상을 위한 맞춤 전략을 준비했습니다. 상담 권장드립니다.`,
      friendly: `[학원명] ${student.name} 학생이 더 잘할 수 있는 방법을 찾았어요! 함께 이야기해요 ✨`,
    },
    OPPORTUNITY: {
      calm: `[학원명] ${student.name} 학생의 최근 노력이 눈에 띕니다. 지속적인 관심과 격려 부탁드립니다.`,
      urgent: `[학원명] ${student.name} 학생이 성장 기회를 맞이했습니다! 함께 응원해주세요.`,
      friendly: `[학원명] ${student.name} 학생 칭찬해요! 🎉 최근 정말 잘하고 있어요. 집에서도 격려 부탁드려요!`,
    },
  };
  
  return templates[cardType]?.[tone] || templates.ATTENTION.friendly;
}

// -----------------------------------------------------------------------------
// Sending Functions
// -----------------------------------------------------------------------------

async function sendKakaoAlimtalk(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  // In production, integrate with Bizm API
  logger.info(`[Kakao Alimtalk] To: ${phone}, Message: ${message.substring(0, 50)}...`);
  
  // Mock success
  return { success: true };
}

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  // In production, integrate with Aligo API
  logger.info(`[SMS] To: ${phone}, Message: ${message.substring(0, 50)}...`);
  
  // Mock success
  return { success: true };
}

async function sendEmail(email: string, studentName: string, message: string): Promise<{ success: boolean; error?: string }> {
  // In production, integrate with SendGrid or similar
  logger.info(`[Email] To: ${email}, Subject: ${studentName} 학습 상황 안내`);
  
  // Mock success
  return { success: true };
}

// -----------------------------------------------------------------------------
// Self-Learning (E 고정)
// -----------------------------------------------------------------------------

const LEARNING_RATE = 0.02;
const DRIFT_CLAMP = 0.03;

async function updateFeatureWeights(
  academyId: string,
  cardType: CardType,
  success: boolean
) {
  try {
    // Get current weights
    const { data: settings } = await getSupabase()
      .from('academy_settings')
      .select('feature_weights')
      .eq('academy_id', academyId)
      .single();
    
    const weights = settings?.feature_weights || {
      attendance: 0.30,
      homework: 0.25,
      grade: 0.20,
      payment: 0.15,
      parent_engagement: 0.10,
      version: 1,
    };
    
    // Determine which features to adjust based on card type
    const featureMap: Record<CardType, string[]> = {
      EMERGENCY: ['attendance', 'homework', 'payment'],
      ATTENTION: ['attendance', 'homework'],
      INSIGHT: ['grade', 'parent_engagement'],
      OPPORTUNITY: ['grade'],
    };
    
    const featuresToAdjust = featureMap[cardType] || [];
    const adjustment = success ? LEARNING_RATE : -LEARNING_RATE;
    
    // Apply adjustment with drift clamping
    for (const feature of featuresToAdjust) {
      if (weights[feature] !== undefined) {
        const newValue = weights[feature] + adjustment;
        // Clamp to prevent drift
        weights[feature] = Math.max(0.05, Math.min(0.50, newValue));
      }
    }
    
    // Normalize to sum to 1
    const total = Object.entries(weights)
      .filter(([k]) => !['version', 'updated_at'].includes(k))
      .reduce((sum, [, v]) => sum + (v as number), 0);
    
    for (const key of Object.keys(weights)) {
      if (!['version', 'updated_at'].includes(key)) {
        weights[key] = Math.round((weights[key] / total) * 1000) / 1000;
      }
    }
    
    weights.version = (weights.version || 0) + 1;
    weights.updated_at = new Date().toISOString();
    
    // Save updated weights
    await getSupabase()
      .from('academy_settings')
      .upsert({
        academy_id: academyId,
        feature_weights: weights,
      }, { onConflict: 'academy_id' });
    
    logger.info(`[Self-Learning] Weights updated for academy ${academyId}:`, weights);
    
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'action-dispatch.updateFeatureWeights' });
  }
}
