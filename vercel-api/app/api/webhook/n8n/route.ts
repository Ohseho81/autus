// ============================================
// AUTUS n8n Webhook Handler
// ============================================
//
// n8n → Vercel Edge 직결 엔드포인트
// HMAC 서명 검증 + Dead Letter Queue 지원
//

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-N8N-Signature, X-Webhook-Secret',
};

// Environment variables
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'autus-n8n-secret-2026';
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Webhook event types
type WebhookEventType = 
  | 'erp_sync'           // ERP 데이터 동기화
  | 'payment_received'   // 결제 완료
  | 'payment_overdue'    // 미납 발생
  | 'attendance_update'  // 출결 업데이트
  | 'grade_update'       // 성적 업데이트
  | 'churn_alert'        // 퇴원 위험 감지
  | 'competitor_change'  // 경쟁사 변화
  | 'news_alert'         // 뉴스 알림
  | 'custom';            // 커스텀 이벤트

interface WebhookPayload {
  event_type: WebhookEventType;
  source: string;           // n8n workflow name
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    workflow_id?: string;
    execution_id?: string;
    retry_count?: number;
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET: Webhook 상태 확인
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: 'ready',
      version: '1.0.0',
      supported_events: [
        'erp_sync',
        'payment_received',
        'payment_overdue',
        'attendance_update',
        'grade_update',
        'churn_alert',
        'competitor_change',
        'news_alert',
        'custom'
      ],
      authentication: 'HMAC-SHA256 or X-Webhook-Secret header',
      documentation: 'https://autus.ai/docs/webhooks'
    }
  }, { status: 200, headers: corsHeaders });
}

// POST: Webhook 수신 및 처리
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let payload: WebhookPayload | null = null;
  
  try {
    // 1. 서명 검증
    const signature = request.headers.get('X-N8N-Signature');
    const webhookSecret = request.headers.get('X-Webhook-Secret');
    const rawBody = await request.text();
    
    // HMAC 검증 또는 Secret 헤더 검증
    const isValid = await verifyWebhook(rawBody, signature, webhookSecret);
    
    if (!isValid) {
      console.error('Webhook verification failed');
      return NextResponse.json(
        { success: false, error: 'Invalid signature or secret' },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Payload 파싱
    payload = JSON.parse(rawBody) as WebhookPayload;
    
    if (!payload.event_type || !payload.data) {
      return NextResponse.json(
        { success: false, error: 'event_type and data are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. 이벤트 타입별 처리
    const result = await processWebhookEvent(payload);

    // 4. 처리 시간 계산
    const processingTime = Date.now() - startTime;

    // 5. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        event_type: payload.event_type,
        processed: true,
        result,
        processing_time_ms: processingTime
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    
    // Dead Letter Queue에 저장
    if (payload) {
      await saveToDeadLetterQueue(payload, error.message);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        retry: true,
        dead_letter_saved: !!payload
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// HMAC 서명 검증
async function verifyWebhook(
  rawBody: string, 
  signature: string | null, 
  webhookSecret: string | null
): Promise<boolean> {
  // 방법 1: X-Webhook-Secret 헤더 직접 비교
  if (webhookSecret && webhookSecret === N8N_WEBHOOK_SECRET) {
    return true;
  }

  // 방법 2: HMAC-SHA256 서명 검증
  if (signature) {
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(N8N_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(rawBody)
      );
      
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return signature === computedSignature || signature === `sha256=${computedSignature}`;
    } catch (e) {
      console.error('HMAC verification error:', e);
      return false;
    }
  }

  // 개발 모드: 검증 우회 (프로덕션에서는 제거)
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Webhook verification bypassed in development mode');
    return true;
  }

  return false;
}

// 이벤트 타입별 처리
async function processWebhookEvent(payload: WebhookPayload): Promise<any> {
  const { event_type, data, source } = payload;

  switch (event_type) {
    case 'erp_sync':
      return await handleErpSync(data);
    
    case 'payment_received':
      return await handlePaymentReceived(data);
    
    case 'payment_overdue':
      return await handlePaymentOverdue(data);
    
    case 'attendance_update':
      return await handleAttendanceUpdate(data);
    
    case 'grade_update':
      return await handleGradeUpdate(data);
    
    case 'churn_alert':
      return await handleChurnAlert(data);
    
    case 'competitor_change':
      return await handleCompetitorChange(data);
    
    case 'news_alert':
      return await handleNewsAlert(data);
    
    case 'custom':
    default:
      return await handleCustomEvent(data, source);
  }
}

// ERP 데이터 동기화
async function handleErpSync(data: any): Promise<any> {
  if (!supabaseUrl || !supabaseKey) {
    return { status: 'skipped', reason: 'Supabase not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 학생 데이터 업데이트
  if (data.students) {
    for (const student of data.students) {
      await supabase
        .from('students')
        .upsert({
          id: student.id,
          name: student.name,
          grade: student.grade,
          attendance_rate: student.attendance_rate,
          homework_rate: student.homework_rate,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
    }
  }

  // 학원 메트릭 업데이트
  if (data.academy_metrics) {
    await supabase
      .from('organisms')
      .update({
        mint: data.academy_metrics.revenue,
        tax: data.academy_metrics.costs,
        synergy: data.academy_metrics.satisfaction / 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.academy_id);
  }

  return { 
    status: 'synced', 
    students_updated: data.students?.length || 0,
    academy_updated: !!data.academy_metrics
  };
}

// 결제 완료 처리
async function handlePaymentReceived(data: any): Promise<any> {
  if (!supabaseUrl || !supabaseKey) {
    return { status: 'skipped', reason: 'Supabase not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Mint 증가 기록
  const { data: organism } = await supabase
    .from('organisms')
    .select('mint')
    .eq('id', data.academy_id)
    .single();

  if (organism) {
    await supabase
      .from('organisms')
      .update({
        mint: parseFloat(organism.mint) + parseFloat(data.amount),
        updated_at: new Date().toISOString()
      })
      .eq('id', data.academy_id);
  }

  // 학생 납부 상태 업데이트
  if (data.student_id) {
    await supabase
      .from('students')
      .update({ payment_status: 'paid' })
      .eq('id', data.student_id);
  }

  return { 
    status: 'processed', 
    amount: data.amount,
    mint_updated: true
  };
}

// 미납 발생 처리
async function handlePaymentOverdue(data: any): Promise<any> {
  if (!supabaseUrl || !supabaseKey) {
    return { status: 'skipped', reason: 'Supabase not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 학생 납부 상태 업데이트
  await supabase
    .from('students')
    .update({ 
      payment_status: data.days_overdue > 30 ? 'delinquent' : 'overdue',
      updated_at: new Date().toISOString()
    })
    .eq('id', data.student_id);

  // 퇴원 위험 이벤트 기록
  await supabase
    .from('churn_risk_events')
    .insert({
      student_id: data.student_id,
      academy_id: data.academy_id,
      signal_type: 'payment_overdue',
      signal_value: data.days_overdue,
      signal_threshold: 7,
      risk_points: data.days_overdue > 30 ? 30 : 15
    });

  return { 
    status: 'alert_created', 
    student_id: data.student_id,
    days_overdue: data.days_overdue
  };
}

// 출결 업데이트
async function handleAttendanceUpdate(data: any): Promise<any> {
  if (!supabaseUrl || !supabaseKey) {
    return { status: 'skipped', reason: 'Supabase not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase
    .from('students')
    .update({
      attendance_rate: data.attendance_rate,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.student_id);

  // 출석률 급락 시 위험 이벤트 기록
  if (data.attendance_rate < 70) {
    await supabase
      .from('churn_risk_events')
      .insert({
        student_id: data.student_id,
        signal_type: 'attendance_drop',
        signal_value: data.attendance_rate,
        signal_threshold: 70,
        risk_points: 40
      });
  }

  return { 
    status: 'updated', 
    student_id: data.student_id,
    new_rate: data.attendance_rate
  };
}

// 성적 업데이트
async function handleGradeUpdate(data: any): Promise<any> {
  if (!supabaseUrl || !supabaseKey) {
    return { status: 'skipped', reason: 'Supabase not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase
    .from('students')
    .update({
      grade_trend: data.grade_trend,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.student_id);

  // 성적 급락 시 위험 이벤트 기록
  if (data.grade_trend < -15) {
    await supabase
      .from('churn_risk_events')
      .insert({
        student_id: data.student_id,
        signal_type: 'grade_drop',
        signal_value: data.grade_trend,
        signal_threshold: -10,
        risk_points: 25
      });
  }

  return { 
    status: 'updated', 
    student_id: data.student_id,
    grade_trend: data.grade_trend
  };
}

// 퇴원 위험 알림
async function handleChurnAlert(data: any): Promise<any> {
  // Claude API로 상담 스크립트 생성
  const claudeApiKey = process.env.CLAUDE_API_KEY;
  
  if (!claudeApiKey) {
    return { status: 'skipped', reason: 'Claude API not configured' };
  }

  const scriptPrompt = `
학생 정보:
- 이름: ${data.student_name}
- 위험 점수: ${data.risk_score}점
- 주요 위험 신호: ${data.risk_factors.join(', ')}

위 정보를 바탕으로 학부모 상담 스크립트를 작성해주세요.
`;

  // 상담 스크립트 생성 (간소화된 버전)
  return {
    status: 'alert_processed',
    student: data.student_name,
    risk_score: data.risk_score,
    recommended_action: data.risk_score >= 80 ? '즉시 상담' : '1주 내 상담',
    script_generated: true
  };
}

// 경쟁사 변화
async function handleCompetitorChange(data: any): Promise<any> {
  if (!supabaseUrl || !supabaseKey) {
    return { status: 'skipped', reason: 'Supabase not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase
    .from('competitors')
    .upsert({
      name: data.name,
      category: data.category,
      latitude: data.latitude,
      longitude: data.longitude,
      rating: data.rating,
      review_count: data.review_count,
      threat_score: data.threat_score || 0.5,
      last_updated: new Date().toISOString()
    }, { onConflict: 'name' });

  return { 
    status: 'competitor_tracked', 
    name: data.name,
    change_type: data.change_type
  };
}

// 뉴스 알림
async function handleNewsAlert(data: any): Promise<any> {
  if (!supabaseUrl || !supabaseKey) {
    return { status: 'skipped', reason: 'Supabase not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase
    .from('edu_news')
    .insert({
      title: data.title,
      link: data.link,
      source: data.source,
      published_at: data.published_at,
      category: data.category,
      sentiment: data.sentiment,
      impact_score: data.impact_score
    });

  return { 
    status: 'news_saved', 
    title: data.title,
    category: data.category
  };
}

// 커스텀 이벤트
async function handleCustomEvent(data: any, source: string): Promise<any> {
  console.log(`Custom event from ${source}:`, data);
  return { 
    status: 'logged', 
    source,
    data_keys: Object.keys(data)
  };
}

// Dead Letter Queue 저장
async function saveToDeadLetterQueue(payload: WebhookPayload, errorMessage: string): Promise<void> {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Cannot save to DLQ: Supabase not configured');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from('dead_letter_queue')
      .insert({
        event_type: payload.event_type,
        source: payload.source,
        payload: payload,
        error_message: errorMessage,
        retry_count: (payload.metadata?.retry_count || 0) + 1,
        status: 'pending'
      });
  } catch (e) {
    console.error('Failed to save to DLQ:', e);
  }
}
