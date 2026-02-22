/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 Cron: Daily Stats & V-Index Calculation
 *
 * 매일 자정 실행 - V-Index 계산, 일일 통계, 위험 학생 감지
 * 법칙 5: 추론 우선 - AI로 자동 산출
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// V-Index 가중치 (TSEL 기반)
const V_INDEX_WEIGHTS = {
  attendance: 0.30,    // 출석률 (S: Satisfaction)
  payment: 0.25,       // 결제율 (T: Trust)
  engagement: 0.25,    // 참여도 (E: Engagement)
  loyalty: 0.20,       // 충성도 (L: Loyalty)
}

// 위험 임계값
const RISK_THRESHOLDS = {
  high: 40,
  medium: 60,
  low: 80,
}

interface StudentStats {
  id: string
  name: string
  attendance_rate: number
  payment_rate: number
  engagement_score: number
  loyalty_score: number
  v_index: number
  risk_level: 'high' | 'medium' | 'low' | 'safe'
  parent_phone?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

    console.log(`Daily stats calculation for ${todayStr}`)

    const results = {
      students_processed: 0,
      high_risk: 0,
      medium_risk: 0,
      low_risk: 0,
      safe: 0,
      alerts_sent: 0,
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 1. 모든 활성 학생 조회
    // ═══════════════════════════════════════════════════════════════════════════════

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, parent_phone, created_at')
      .eq('status', 'active')

    if (studentsError) throw studentsError

    if (!students || students.length === 0) {
      console.log('No active students')
      return new Response(
        JSON.stringify({ ok: true, data: { message: 'No active students', results } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const studentStats: StudentStats[] = []

    for (const student of students) {
      // ═══════════════════════════════════════════════════════════════════════════════
      // 2. 출석률 계산 (최근 30일)
      // ═══════════════════════════════════════════════════════════════════════════════

      const { data: attendanceEvents } = await supabase
        .from('events')
        .select('id, status')
        .eq('entity_id', student.id)
        .eq('event_type', 'attendance')
        .gte('event_at', thirtyDaysAgo)

      // 예정된 수업 수 (relationships에서 enrolled_in 기반)
      const { count: scheduledLessons } = await supabase
        .from('atb_lesson_sessions')
        .select('id', { count: 'exact' })
        .gte('session_date', thirtyDaysAgo.split('T')[0])
        .lte('session_date', todayStr)

      const attendedCount = attendanceEvents?.filter(e => e.status === 'completed').length || 0
      const expectedCount = Math.max(scheduledLessons || 8, 1) // 최소 8회 가정
      const attendanceRate = Math.min((attendedCount / expectedCount) * 100, 100)

      // ═══════════════════════════════════════════════════════════════════════════════
      // 3. 결제율 계산 (최근 90일)
      // ═══════════════════════════════════════════════════════════════════════════════

      const { data: paymentEvents } = await supabase
        .from('events')
        .select('id, status, value')
        .eq('entity_id', student.id)
        .eq('event_type', 'payment')
        .gte('event_at', ninetyDaysAgo)

      const successfulPayments = paymentEvents?.filter(e => e.status === 'completed').length || 0
      const totalPaymentAttempts = paymentEvents?.length || 1
      const paymentRate = (successfulPayments / Math.max(totalPaymentAttempts, 1)) * 100

      // ═══════════════════════════════════════════════════════════════════════════════
      // 4. 참여도 계산 (알림톡 응답률, 피드백 등)
      // ═══════════════════════════════════════════════════════════════════════════════

      const { data: engagementEvents } = await supabase
        .from('events')
        .select('id, event_type')
        .eq('entity_id', student.id)
        .in('event_type', ['feedback', 'response', 'interaction'])
        .gte('event_at', thirtyDaysAgo)

      const { data: notificationEvents } = await supabase
        .from('events')
        .select('id')
        .eq('entity_id', student.id)
        .eq('event_type', 'notification_sent')
        .gte('event_at', thirtyDaysAgo)

      const responseCount = engagementEvents?.length || 0
      const notificationCount = notificationEvents?.length || 1
      const engagementScore = Math.min((responseCount / Math.max(notificationCount, 1)) * 100, 100)

      // ═══════════════════════════════════════════════════════════════════════════════
      // 5. 충성도 계산 (수강 기간, 추천 등)
      // ═══════════════════════════════════════════════════════════════════════════════

      const enrollmentDays = Math.floor(
        (today.getTime() - new Date(student.created_at).getTime()) / (24 * 60 * 60 * 1000)
      )

      // 충성도 = 수강 기간 기반 (최대 100, 1년 이상이면 100)
      const loyaltyScore = Math.min((enrollmentDays / 365) * 100, 100)

      // ═══════════════════════════════════════════════════════════════════════════════
      // 6. V-Index 종합 계산
      // ═══════════════════════════════════════════════════════════════════════════════

      const vIndex = 
        attendanceRate * V_INDEX_WEIGHTS.attendance +
        paymentRate * V_INDEX_WEIGHTS.payment +
        engagementScore * V_INDEX_WEIGHTS.engagement +
        loyaltyScore * V_INDEX_WEIGHTS.loyalty

      // 위험 레벨 판정
      let riskLevel: 'high' | 'medium' | 'low' | 'safe'
      if (vIndex < RISK_THRESHOLDS.high) {
        riskLevel = 'high'
        results.high_risk++
      } else if (vIndex < RISK_THRESHOLDS.medium) {
        riskLevel = 'medium'
        results.medium_risk++
      } else if (vIndex < RISK_THRESHOLDS.low) {
        riskLevel = 'low'
        results.low_risk++
      } else {
        riskLevel = 'safe'
        results.safe++
      }

      studentStats.push({
        id: student.id,
        name: student.name,
        attendance_rate: Math.round(attendanceRate * 10) / 10,
        payment_rate: Math.round(paymentRate * 10) / 10,
        engagement_score: Math.round(engagementScore * 10) / 10,
        loyalty_score: Math.round(loyaltyScore * 10) / 10,
        v_index: Math.round(vIndex * 10) / 10,
        risk_level: riskLevel,
        parent_phone: student.parent_phone,
      })

      // ═══════════════════════════════════════════════════════════════════════════════
      // 7. 학생 테이블 업데이트
      // ═══════════════════════════════════════════════════════════════════════════════

      await supabase
        .from('students')
        .update({
          v_index: Math.round(vIndex * 10) / 10,
          risk_level: riskLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id)

      // entities 테이블도 업데이트 (Universal Schema)
      await supabase
        .from('entities')
        .update({
          v_index: Math.round(vIndex * 10) / 10,
          tier: riskLevel === 'safe' ? 'T3' : riskLevel === 'low' ? 'T4' : 'Ghost',
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id)

      results.students_processed++
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 8. 일일 통계 저장 (events에 기록)
    // ═══════════════════════════════════════════════════════════════════════════════

    const avgVIndex = studentStats.reduce((sum, s) => sum + s.v_index, 0) / studentStats.length

    await supabase.from('events').insert({
      org_id: '00000000-0000-0000-0000-000000000001',
      event_type: 'daily_stats',
      value: Math.round(avgVIndex * 10) / 10,
      status: 'completed',
      source: 'cron',
      event_at: new Date().toISOString(),
    })

    // 메타데이터로 상세 저장
    const statsEventResult = await supabase
      .from('events')
      .select('id')
      .eq('event_type', 'daily_stats')
      .eq('source', 'cron')
      .order('event_at', { ascending: false })
      .limit(1)
      .single()

    if (statsEventResult.data?.id) {
      await supabase.rpc('set_metadata', {
        p_target_type: 'event',
        p_target_id: statsEventResult.data.id,
        p_key: 'daily_summary',
        p_value: JSON.stringify({
          date: todayStr,
          total_students: results.students_processed,
          avg_v_index: avgVIndex,
          high_risk: results.high_risk,
          medium_risk: results.medium_risk,
          low_risk: results.low_risk,
          safe: results.safe,
        }),
        p_source: 'cron',
      })
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 9. 고위험 학생 알림 (관리자)
    // ═══════════════════════════════════════════════════════════════════════════════

    if (results.high_risk > 0) {
      const highRiskStudents = studentStats.filter(s => s.risk_level === 'high')
      
      const slackWebhook = Deno.env.get('SLACK_WEBHOOK_URL')
      if (slackWebhook) {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 고위험 학생 알림 (${todayStr})\n\n${highRiskStudents.map(s => 
              `• ${s.name}: V-Index ${s.v_index} (출석 ${s.attendance_rate}%, 결제 ${s.payment_rate}%)`
            ).join('\n')}\n\n상담이 필요합니다.`,
          }),
        })
        results.alerts_sent++
      }
    }

    console.log('Daily stats results:', results)

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          date: todayStr,
          results,
          avg_v_index: Math.round(avgVIndex * 10) / 10,
          high_risk_students: studentStats.filter(s => s.risk_level === 'high').map(s => ({
            name: s.name,
            v_index: s.v_index,
          })),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Daily stats error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), code: 'DAILY_STATS_ERROR' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
