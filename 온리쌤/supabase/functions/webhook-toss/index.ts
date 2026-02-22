/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔔 Toss Payments Webhook Handler
 *
 * 결제 완료/취소 시 자동으로 events 테이블에 기록
 * Source: webhook (자동 입력)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Toss Webhook Payload Types
interface TossPaymentWebhook {
  eventType: 'PAYMENT_STATUS_CHANGED' | 'PAYMENT_CONFIRMED' | 'PAYOUT_STATUS_CHANGED'
  createdAt: string
  data: {
    paymentKey: string
    orderId: string
    status: 'READY' | 'IN_PROGRESS' | 'WAITING_FOR_DEPOSIT' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED'
    method: string
    totalAmount: number
    suppliedAmount: number
    vat: number
    approvedAt?: string
    cancels?: Array<{
      cancelAmount: number
      cancelReason: string
      canceledAt: string
    }>
    metadata?: {
      studentId?: string
      studentName?: string
      serviceId?: string
      serviceName?: string
      orgId?: string
      paymentMonth?: string
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: TossPaymentWebhook = await req.json()
    console.log('Toss Webhook received:', payload.eventType)

    const { eventType, data, createdAt } = payload

    // 결제 완료 처리
    if (eventType === 'PAYMENT_STATUS_CHANGED' && data.status === 'DONE') {
      const { metadata } = data
      const timestamp = new Date().getTime()

      const { error } = await supabase
        .from('events')
        .upsert({
          org_id: metadata?.orgId || '00000000-0000-0000-0000-000000000001',
          type: 'payment',
          entity_id: metadata?.studentId,
          service_id: metadata?.serviceId,
          value: data.totalAmount,
          status: 'completed',
          source: 'webhook',
          confidence: 1.0,
          idempotency_key: `TOSS-${data.paymentKey}`,
          occurred_at: data.approvedAt || createdAt,
        }, {
          onConflict: 'idempotency_key'
        })

      if (error) throw error

      // 메타데이터 저장
      const eventResult = await supabase
        .from('events')
        .select('id')
        .eq('idempotency_key', `TOSS-${data.paymentKey}`)
        .single()

      if (eventResult.data?.id) {
        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: eventResult.data.id,
          p_key: 'payment_method',
          p_value: JSON.stringify(data.method),
          p_source: 'webhook'
        })

        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: eventResult.data.id,
          p_key: 'payment_key',
          p_value: JSON.stringify(data.paymentKey),
          p_source: 'webhook'
        })

        if (metadata?.paymentMonth) {
          await supabase.rpc('set_metadata', {
            p_target_type: 'event',
            p_target_id: eventResult.data.id,
            p_key: 'payment_month',
            p_value: JSON.stringify(metadata.paymentMonth),
            p_source: 'webhook'
          })
        }
      }

      console.log(`Payment recorded: ${data.totalAmount}원`)
    }

    // 결제 취소 처리
    if (eventType === 'PAYMENT_STATUS_CHANGED' &&
        (data.status === 'CANCELED' || data.status === 'PARTIAL_CANCELED')) {
      const cancelInfo = data.cancels?.[0]
      const timestamp = new Date().getTime()

      await supabase
        .from('events')
        .upsert({
          org_id: data.metadata?.orgId || '00000000-0000-0000-0000-000000000001',
          type: 'payment_cancel',
          entity_id: data.metadata?.studentId,
          service_id: data.metadata?.serviceId,
          value: -(cancelInfo?.cancelAmount || data.totalAmount),
          status: 'completed',
          source: 'webhook',
          confidence: 1.0,
          idempotency_key: `TOSS-CANCEL-${data.paymentKey}-${timestamp}`,
          occurred_at: cancelInfo?.canceledAt || createdAt,
        }, {
          onConflict: 'idempotency_key'
        })

      console.log(`Payment cancelled: ${cancelInfo?.cancelAmount}원`)
    }

    return new Response(
      JSON.stringify({ ok: true, data: {} }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    console.error('Webhook error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'TOSS_WEBHOOK_ERROR' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
