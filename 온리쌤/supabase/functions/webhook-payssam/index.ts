/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 결제선생(PaySSAM) Webhook Handler
 *
 * 결제 완료 시 자동으로 payment_invoices + events 테이블 업데이트
 * Pattern: webhook-toss/index.ts 동일 구조
 *
 * 플로우:
 * 1. SHA256 서명 검증
 * 2. payment_invoices 상태 -> 'paid'
 * 3. events 테이블 append (idempotency)
 * 4. 메타데이터 저장
 * 5. 기록선생 -- 결제 완료 -> lesson_records 지속 로그 생성
 * 6. 200 OK 반환
 *
 * NOTE: PaySSAM 파트너 등록 대기중 -- 서명 검증 로직은 파트너 API 문서 확정 후 조정 필요
 *
 * "결제가 흐르면 학생이 남고, 결제가 멈추면 학생이 떠난다."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const FUNCTION_NAME = 'webhook-payssam'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payssam-signature',
}

function log(message: string, data?: unknown) {
  console.log(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, data !== undefined ? data : '')
}

function logError(message: string, error?: unknown) {
  console.error(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, error !== undefined ? error : '')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

interface PaySSAMWebhookPayload {
  /** 이벤트 타입 */
  event_type: 'PAYMENT_COMPLETED' | 'PAYMENT_FAILED' | 'INVOICE_EXPIRED'
  /** 이벤트 발생 시각 */
  timestamp: string
  /** 페이로드 데이터 */
  data: {
    /** 결제선생 청구서 ID */
    invoice_id: string
    /** 결제 금액 */
    amount: number
    /** 결제 완료 시각 */
    paid_at?: string
    /** 결제 수단 */
    payment_method?: string
    /** 고객 전화번호 */
    customer_phone?: string
    /** 메타데이터 (발송 시 전달한 것) */
    metadata?: {
      org_id?: string
      student_id?: string
      invoice_id?: string
    }
  }
}

const VALID_EVENT_TYPES = ['PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'INVOICE_EXPIRED'] as const

// ═══════════════════════════════════════════════════════════════════════════════
// SHA256 서명 검증
// ═══════════════════════════════════════════════════════════════════════════════

async function verifySignature(
  payload: PaySSAMWebhookPayload,
  signature: string,
  apiKey: string
): Promise<boolean> {
  const { data } = payload
  const message = `${data.customer_phone || ''}${data.invoice_id}${apiKey}`

  const encoder = new TextEncoder()
  const msgBuffer = encoder.encode(message)

  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex === signature
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 핸들러
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Method validation — webhooks are POST only
  if (req.method !== 'POST') {
    log(`Rejected method: ${req.method}`)
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Content-Type validation
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      log(`Invalid content-type: ${contentType}`)
      return new Response(
        JSON.stringify({ ok: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      logError('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ ok: false, error: 'Server misconfiguration', code: 'ENV_MISSING' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paySSAMApiKey = Deno.env.get('PAYSSAM_API_KEY_PAYMENT') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse payload
    let payload: PaySSAMWebhookPayload
    try {
      payload = await req.json()
    } catch (_parseError) {
      log('Failed to parse JSON body')
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body', code: 'INVALID_JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Required field validation
    if (!payload.event_type || !VALID_EVENT_TYPES.includes(payload.event_type as typeof VALID_EVENT_TYPES[number])) {
      log(`Invalid or missing event_type: ${payload.event_type}`)
      return new Response(
        JSON.stringify({ ok: false, error: `Invalid event_type. Expected one of: ${VALID_EVENT_TYPES.join(', ')}`, code: 'INVALID_EVENT_TYPE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!payload.data || !payload.data.invoice_id) {
      log('Missing required field: data.invoice_id')
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required field: data.invoice_id', code: 'MISSING_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    log(`Webhook received: ${payload.event_type}, invoice=${payload.data.invoice_id}`)

    // 서명 검증 (헤더에 서명이 있는 경우)
    const signature = req.headers.get('x-payssam-signature')
    if (signature && paySSAMApiKey) {
      const isValid = await verifySignature(payload, signature, paySSAMApiKey)
      if (!isValid) {
        logError('Signature verification failed')
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid signature', code: 'INVALID_SIGNATURE' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
    } else if (!paySSAMApiKey) {
      // NOTE: PaySSAM 파트너 등록 대기중 — 서명 검증 스킵
      log('PAYSSAM_API_KEY_PAYMENT not configured — signature verification skipped (partner pending)')
    }

    const { event_type, data } = payload

    // ─────────────────────────────────────────────────────────────────────────
    // 결제 완료 처리
    // ─────────────────────────────────────────────────────────────────────────
    if (event_type === 'PAYMENT_COMPLETED') {
      const metadata = data.metadata || {}
      const orgId = metadata.org_id || '00000000-0000-0000-0000-000000000001'
      const studentId = metadata.student_id
      const localInvoiceId = metadata.invoice_id

      // 1. payment_invoices 상태 업데이트
      const invoiceFilter = localInvoiceId
        ? supabase.from('payment_invoices').update({
            status: 'paid',
            paid_at: data.paid_at || new Date().toISOString(),
            callback_received_at: new Date().toISOString(),
          }).eq('id', localInvoiceId).neq('status', 'paid')
        : supabase.from('payment_invoices').update({
            status: 'paid',
            paid_at: data.paid_at || new Date().toISOString(),
            callback_received_at: new Date().toISOString(),
          }).eq('payssam_invoice_id', data.invoice_id).neq('status', 'paid')

      const { error: updateError } = await invoiceFilter
      if (updateError) {
        logError('payment_invoices update failed:', updateError)
      }

      // 2. events 테이블 append (idempotency)
      const idempotencyKey = `PAYSSAM-${data.invoice_id}`
      const { error: eventError } = await supabase
        .from('events')
        .upsert({
          org_id: orgId,
          type: 'payment_payssam',
          entity_id: studentId,
          value: data.amount,
          status: 'completed',
          source: 'webhook',
          confidence: 1.0,
          idempotency_key: idempotencyKey,
          occurred_at: data.paid_at || new Date().toISOString(),
        }, {
          onConflict: 'idempotency_key'
        })

      if (eventError) {
        logError('events insert failed:', eventError)
      }

      // 3. 메타데이터 저장
      const eventResult = await supabase
        .from('events')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .single()

      if (eventResult.data?.id) {
        // 결제 수단
        if (data.payment_method) {
          await supabase.rpc('set_metadata', {
            p_target_type: 'event',
            p_target_id: eventResult.data.id,
            p_key: 'payment_method',
            p_value: JSON.stringify(data.payment_method),
            p_source: 'webhook'
          })
        }

        // 결제선생 청구서 ID
        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: eventResult.data.id,
          p_key: 'payssam_invoice_id',
          p_value: JSON.stringify(data.invoice_id),
          p_source: 'webhook'
        })
      }

      // 4. 기록선생 -- 결제 완료 -> lesson_records 지속 로그 생성
      //    "로그를 모아서 클론을 만든다"
      if (studentId) {
        const persistenceResult = await createPersistenceLog(
          supabase,
          studentId,
          orgId,
          data
        )
        log('Persistence log result:', persistenceResult)
      }

      log(`Payment completed: ${data.amount}원 (${data.invoice_id})`)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 청구서 만료 처리
    // ─────────────────────────────────────────────────────────────────────────
    if (event_type === 'INVOICE_EXPIRED') {
      const { error: overdueError } = await supabase
        .from('payment_invoices')
        .update({
          status: 'overdue',
          callback_received_at: new Date().toISOString(),
        })
        .eq('payssam_invoice_id', data.invoice_id)
        .in('status', ['sent', 'pending'])

      if (overdueError) {
        logError('Overdue update failed:', overdueError)
      }

      log(`Invoice expired: ${data.invoice_id}`)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 결제 실패 처리
    // ─────────────────────────────────────────────────────────────────────────
    if (event_type === 'PAYMENT_FAILED') {
      const { error: failError } = await supabase
        .from('payment_invoices')
        .update({
          status: 'failed',
          error_code: 'PAYMENT_FAILED',
          error_message: '결제 실패 (Webhook)',
          callback_received_at: new Date().toISOString(),
        })
        .eq('payssam_invoice_id', data.invoice_id)

      if (failError) {
        logError('Payment failure update error:', failError)
      }

      log(`Payment failed: ${data.invoice_id}`)
    }

    // 항상 200 반환 (재시도 방지)
    return new Response(
      JSON.stringify({ ok: true, data: { received: true, event_type } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Unhandled error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'INTERNAL_ERROR' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 🧬 기록선생 — 결제 완료 → lesson_records 지속(Persistence) 로그
// 5대 로그 중 "지속" — 학생이 계속 다니는지의 Truth
// ═══════════════════════════════════════════════════════════════════════════════

async function createPersistenceLog(
  supabase: SupabaseClient,
  studentId: string,
  orgId: string,
  paymentData: PaySSAMWebhookPayload['data']
): Promise<{ created: boolean; reason?: string; record_id?: string }> {
  const today = new Date().toISOString().split('T')[0]
  const dateStr = today.replace(/-/g, '')
  const dedupeKey = `RECORD-${orgId}-${studentId}-${dateStr}-persistence-${paymentData.invoice_id}`

  try {
    // 중복 체크 (같은 결제에 대해 한 번만)
    const { data: existing } = await supabase
      .from('lesson_records')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .maybeSingle()

    if (existing) {
      return { created: false, reason: 'duplicate', record_id: existing.id }
    }

    // lesson_records INSERT (지속 로그)
    const { data: record, error } = await supabase
      .from('lesson_records')
      .insert({
        student_id: studentId,
        org_id: orgId,
        lesson_date: today,
        log_type: 'persistence',
        metadata: {
          source: 'webhook_payssam',
          event_type: 'PAYMENT_COMPLETED',
          payment_amount: paymentData.amount,
          payment_method: paymentData.payment_method || 'unknown',
          payssam_invoice_id: paymentData.invoice_id,
          paid_at: paymentData.paid_at,
        },
        dedupe_key: dedupeKey,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { created: false, reason: 'duplicate_constraint' }
      }
      throw error
    }

    // IOO Trace 이벤트 로그
    await supabase.from('events').insert({
      org_id: orgId,
      type: 'lesson_record_created',
      entity_id: studentId,
      value: paymentData.amount,
      status: 'completed',
      source: 'system',
      idempotency_key: `RECORD-EVENT-PERSIST-${dedupeKey}`,
    })

    return { created: true, record_id: record?.id }
  } catch (error: unknown) {
    console.error('[기록선생] 지속 로그 실패:', error)
    return { created: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
