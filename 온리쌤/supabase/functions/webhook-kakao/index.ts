/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Kakao AlimTalk Webhook Handler (Solapi)
 *
 * 알림톡 발송 결과 자동 기록
 * Source: webhook (자동 입력)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FUNCTION_NAME = 'webhook-kakao'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function log(message: string, data?: unknown) {
  console.log(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, data !== undefined ? data : '')
}

function logError(message: string, error?: unknown) {
  console.error(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, error !== undefined ? error : '')
}

// Solapi Webhook Payload Types
interface SolapiWebhook {
  eventType: 'MESSAGE_RESULT' | 'MESSAGE_STATUS'
  timestamp: string
  data: {
    messageId: string
    groupId: string
    to: string
    from: string
    type: 'ATA' | 'CTA' | 'SMS' | 'LMS' | 'MMS'
    statusCode: string
    statusMessage: string
    customFields?: {
      entityId?: string
      entityType?: string
      orgId?: string
      templateCode?: string
      eventType?: string  // attendance_confirm, payment_reminder, etc.
    }
  }
}

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse and validate payload
    let payload: SolapiWebhook
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
    if (!payload.eventType) {
      log('Missing required field: eventType')
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required field: eventType', code: 'MISSING_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!payload.data || !payload.data.messageId) {
      log('Missing required field: data.messageId')
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required field: data.messageId', code: 'MISSING_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    log(`Webhook received: ${payload.eventType}, messageId=${payload.data.messageId}`)

    const { eventType, data, timestamp } = payload

    if (eventType === 'MESSAGE_RESULT') {
      const { customFields } = data
      const isSuccess = data.statusCode === '4000' || data.statusCode === '2000'

      // 알림 발송 결과를 events에 기록
      const { error } = await supabase
        .from('events')
        .upsert({
          org_id: customFields?.orgId || '00000000-0000-0000-0000-000000000001',
          type: 'notification',
          entity_id: customFields?.entityId,
          value: isSuccess ? 1 : 0,
          status: isSuccess ? 'completed' : 'failed',
          source: 'webhook',
          confidence: 1.0,
          idempotency_key: `KAKAO-${data.messageId}`,
          occurred_at: timestamp,
        }, {
          onConflict: 'idempotency_key'
        })

      if (error) throw error

      // 메타데이터 저장
      const eventResult = await supabase
        .from('events')
        .select('id')
        .eq('idempotency_key', `KAKAO-${data.messageId}`)
        .single()

      if (eventResult.data?.id) {
        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: eventResult.data.id,
          p_key: 'message_type',
          p_value: JSON.stringify(data.type),
          p_source: 'webhook'
        })

        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: eventResult.data.id,
          p_key: 'recipient_phone',
          p_value: JSON.stringify(data.to),
          p_source: 'webhook'
        })

        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: eventResult.data.id,
          p_key: 'status_code',
          p_value: JSON.stringify(data.statusCode),
          p_source: 'webhook'
        })

        if (customFields?.templateCode) {
          await supabase.rpc('set_metadata', {
            p_target_type: 'event',
            p_target_id: eventResult.data.id,
            p_key: 'template_code',
            p_value: JSON.stringify(customFields.templateCode),
            p_source: 'webhook'
          })
        }

        if (customFields?.eventType) {
          await supabase.rpc('set_metadata', {
            p_target_type: 'event',
            p_target_id: eventResult.data.id,
            p_key: 'notification_type',
            p_value: JSON.stringify(customFields.eventType),
            p_source: 'webhook'
          })
        }
      }

      log(`Notification ${isSuccess ? 'sent' : 'failed'}: ${data.to}`)
    } else {
      log(`Unhandled eventType: ${eventType} — acknowledged but not processed`)
    }

    return new Response(
      JSON.stringify({ ok: true, data: { received: true, eventType } }),
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
