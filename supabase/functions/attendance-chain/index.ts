/**
 * 🏀 출석 체인 반응 Edge Function
 *
 * QR 스캔 → 출석 기록 → 알림 발송 → MoltBot Brain 연동
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AttendanceRequest {
  student_id: string
  class_id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  qr_code?: string
  coach_id?: string
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const moltbotUrl = Deno.env.get('MOLTBOT_BRAIN_URL') || 'http://localhost:3030'

    const supabase = createClient(supabaseUrl, supabaseKey)

    const body: AttendanceRequest = await req.json()
    const { student_id, class_id, status, qr_code, coach_id } = body

    console.log(`[ATTENDANCE] ${student_id} → ${status}`)

    // ============================================
    // 1. QR 코드 검증 (있는 경우)
    // ============================================
    if (qr_code) {
      const { data: qrData, error: qrError } = await supabase
        .from('atb_qr_codes')
        .select('student_id, is_active')
        .eq('code', qr_code)
        .single()

      if (qrError || !qrData?.is_active) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive QR code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (qrData.student_id !== student_id) {
        return new Response(
          JSON.stringify({ error: 'QR code does not match student' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // QR 사용 시간 업데이트
      await supabase
        .from('atb_qr_codes')
        .update({ last_used_at: new Date().toISOString() })
        .eq('code', qr_code)
    }

    // ============================================
    // 2. 출석 체크 (DB 함수 호출)
    // ============================================
    const { data: checkResult, error: checkError } = await supabase
      .rpc('fn_check_attendance', {
        p_student_id: student_id,
        p_class_id: class_id,
        p_status: status,
        p_coach_id: coach_id
      })

    if (checkError) {
      throw new Error(`Attendance check failed: ${checkError.message}`)
    }

    console.log(`[ATTENDANCE] Check result:`, checkResult)

    // ============================================
    // 3. 학부모 알림 (결석/지각 시)
    // ============================================
    let notificationResult = null
    if (checkResult.needs_notification) {
      // 학생 정보 조회
      const { data: student } = await supabase
        .from('atb_students')
        .select('name, parent_phone')
        .eq('id', student_id)
        .single()

      if (student?.parent_phone) {
        // 알림 기록 생성
        const { data: notification } = await supabase
          .from('atb_notifications')
          .insert({
            student_id,
            recipient_phone: student.parent_phone,
            type: 'attendance',
            channel: 'kakao',
            title: status === 'absent' ? '결석 알림' : '지각 알림',
            message: `${student.name} 학생이 오늘 수업에 ${status === 'absent' ? '결석' : '지각'}하였습니다.`,
            status: 'pending'
          })
          .select()
          .single()

        notificationResult = notification

        // TODO: 실제 카카오 알림톡 발송
        // await sendKakaoNotification(student.parent_phone, message)
      }
    }

    // ============================================
    // 4. MoltBot Brain 연동
    // ============================================
    let brainResult = null
    try {
      const brainResponse = await fetch(`${moltbotUrl}/api/moltbot/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id,
          lesson_slot_id: class_id,
          status,
          timestamp: new Date().toISOString()
        })
      })

      if (brainResponse.ok) {
        brainResult = await brainResponse.json()
        console.log(`[MOLTBOT] Brain response:`, brainResult)
      }
    } catch (brainError) {
      console.error(`[MOLTBOT] Brain call failed:`, brainError)
      // Brain 연동 실패해도 출석 처리는 성공
    }

    // ============================================
    // 5. 개입 필요 시 기록
    // ============================================
    if (checkResult.needs_intervention) {
      await supabase
        .from('atb_interventions')
        .insert({
          student_id,
          trigger_type: 'attendance',
          action_code: checkResult.consecutive_absent >= 3
            ? 'attendance_protect_mode'
            : 'attendance_reminder',
          rule_id: checkResult.consecutive_absent >= 3 ? 'ATT_002' : 'ATT_001',
          mode: 'auto',
          context_snapshot: checkResult
        })
    }

    // ============================================
    // 6. 출석 기록 알림 완료 표시
    // ============================================
    if (notificationResult) {
      await supabase
        .from('atb_attendance')
        .update({ parent_notified: true })
        .eq('student_id', student_id)
        .eq('class_id', class_id)
        .eq('date', new Date().toISOString().split('T')[0])
    }

    // ============================================
    // 응답
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        attendance: checkResult,
        notification: notificationResult ? 'sent' : null,
        brain: brainResult,
        message: `${status} 출석 처리 완료`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ATTENDANCE ERROR]', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
