/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔔 QR Scan Webhook Handler
 *
 * QR 스캔 시 자동 출석 체크
 * Source: qr (자동 입력)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// QR Scan Payload
interface QRScanPayload {
  qrCode: string           // ATB-{studentId}-{timestamp} 형식
  scannedAt: string        // ISO8601
  scannedBy?: string       // 스캔한 코치 ID
  serviceId?: string       // 수업 ID
  orgId?: string
  location?: {
    latitude: number
    longitude: number
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

    const payload: QRScanPayload = await req.json()
    console.log('QR Scan received:', payload.qrCode)

    const { qrCode, scannedAt, scannedBy, serviceId, orgId, location } = payload

    // QR 코드에서 학생 ID 추출 (ATB-{studentId}-{timestamp})
    const qrParts = qrCode.split('-')
    if (qrParts.length < 2 || qrParts[0] !== 'ATB') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid QR code format', code: 'INVALID_QR_FORMAT' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const studentId = qrParts[1]
    const today = new Date().toISOString().split('T')[0]
    const nowTimestamp = new Date().getTime()

    // 학생 존재 확인
    const { data: student } = await supabase
      .from('entities')
      .select('id, name')
      .eq('id', studentId)
      .eq('type', 'student')
      .single()

    if (!student) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Student not found', code: 'STUDENT_NOT_FOUND' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // 오늘 이미 출석했는지 확인
    const { data: existingAttendance } = await supabase
      .from('events')
      .select('id')
      .eq('entity_id', studentId)
      .eq('type', 'attendance')
      .gte('occurred_at', `${today}T00:00:00`)
      .lte('occurred_at', `${today}T23:59:59`)
      .single()

    if (existingAttendance) {
      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            message: 'Already checked in today',
            studentName: student.name,
            duplicate: true,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 출석 이벤트 기록
    const { error } = await supabase
      .from('events')
      .insert({
        org_id: orgId || '00000000-0000-0000-0000-000000000001',
        type: 'attendance',
        entity_id: studentId,
        service_id: serviceId,
        value: 1,
        status: 'completed',
        source: 'qr',
        confidence: 1.0,
        idempotency_key: `QR-${studentId}-${today}-${nowTimestamp}`,
        occurred_at: scannedAt || new Date().toISOString(),
      })

    if (error) throw error

    // 메타데이터 저장
    const eventResult = await supabase
      .from('events')
      .select('id')
      .eq('idempotency_key', `QR-${studentId}-${today}-${nowTimestamp}`)
      .single()

    if (eventResult.data?.id) {
      await supabase.rpc('set_metadata', {
        p_target_type: 'event',
        p_target_id: eventResult.data.id,
        p_key: 'check_in_time',
        p_value: JSON.stringify(scannedAt),
        p_source: 'qr'
      })

      if (scannedBy) {
        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: eventResult.data.id,
          p_key: 'scanned_by',
          p_value: JSON.stringify(scannedBy),
          p_source: 'qr'
        })
      }

      if (location) {
        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: eventResult.data.id,
          p_key: 'location',
          p_value: JSON.stringify(location),
          p_source: 'qr'
        })
      }
    }

    console.log(`Attendance recorded: ${student.name}`)

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          message: 'Attendance recorded',
          studentName: student.name,
          checkInTime: scannedAt,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    console.error('QR Webhook error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'QR_WEBHOOK_ERROR' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
