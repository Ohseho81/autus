/**
 * 🧠 MoltBot Brain Edge Function
 *
 * Supabase Edge에서 MoltBot Brain 서버로 프록시
 * 또는 Brain 로직 직접 실행 (서버 없을 때)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// 간소화된 Brain 로직 (Edge 내장)
// ============================================

const RULES = [
  {
    id: 'ATT_001',
    name: '연속 결석 2회 알림',
    condition: (ctx: any) => ctx.consecutive_absent >= 2,
    action: 'attendance_reminder',
    mode: 'auto'
  },
  {
    id: 'ATT_002',
    name: '연속 결석 3회 보호모드',
    condition: (ctx: any) => ctx.consecutive_absent >= 3,
    action: 'attendance_protect_mode',
    mode: 'shadow'
  },
  {
    id: 'ATT_003',
    name: '출석률 70% 미만 경고',
    condition: (ctx: any) => ctx.attendance_rate < 70,
    action: 'risk_flag',
    mode: 'auto'
  },
  {
    id: 'PAY_001',
    name: '납부 마감 3일 전 리마인더',
    condition: (ctx: any) => ctx.days_until_due <= 3 && ctx.days_until_due > 0,
    action: 'payment_reminder',
    mode: 'auto'
  },
  {
    id: 'PAY_002',
    name: '미납 7일 경과',
    condition: (ctx: any) => ctx.days_overdue >= 7,
    action: 'payment_contact',
    mode: 'shadow'
  },
  {
    id: 'RISK_001',
    name: '출석 + 참여 하락 → 이탈 경고',
    condition: (ctx: any) => ctx.attendance_rate < 80 && ctx.total_outstanding > 0,
    action: 'churn_warning',
    mode: 'auto'
  }
]

function evaluateRules(context: any) {
  const triggered = []

  for (const rule of RULES) {
    try {
      if (rule.condition(context)) {
        triggered.push({
          rule_id: rule.id,
          rule_name: rule.name,
          action: rule.action,
          mode: rule.mode,
          executed: rule.mode === 'auto'
        })
      }
    } catch (e) {
      // 규칙 평가 오류 무시
    }
  }

  return triggered
}

function calculateState(data: any) {
  const { attendance_rate, consecutive_absent, total_outstanding } = data

  if (attendance_rate >= 90 && total_outstanding === 0) return 'optimal'
  if (attendance_rate >= 80 && total_outstanding <= 100000) return 'stable'
  if (consecutive_absent >= 3 || attendance_rate < 60) return 'critical'
  if (attendance_rate < 70 || total_outstanding > 200000) return 'alert'
  return 'watch'
}

// ============================================
// 요청 핸들러
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const moltbotUrl = Deno.env.get('MOLTBOT_BRAIN_URL')

    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const path = url.pathname.replace('/moltbot-brain', '')
    const body = req.method !== 'GET' ? await req.json() : null

    console.log(`[MOLTBOT EDGE] ${req.method} ${path}`)

    // ============================================
    // 외부 Brain 서버로 프록시 (있는 경우)
    // ============================================
    if (moltbotUrl) {
      try {
        const proxyResponse = await fetch(`${moltbotUrl}/api/moltbot${path}`, {
          method: req.method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        })

        if (proxyResponse.ok) {
          const result = await proxyResponse.json()
          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (proxyError) {
        console.log(`[MOLTBOT EDGE] Proxy failed, using embedded logic`)
      }
    }

    // ============================================
    // 내장 Brain 로직 (서버 없을 때)
    // ============================================

    switch (path) {
      // ----------------------------------------
      // 대시보드
      // ----------------------------------------
      case '/dashboard':
      case '/': {
        // 위험 학생 조회
        const { data: atRiskStudents } = await supabase
          .from('atb_student_dashboard')
          .select('*')
          .or('attendance_rate.lt.70,risk_score.gt.30')
          .order('risk_score', { ascending: false })
          .limit(10)

        // 오늘 출석 현황
        const { data: todayAttendance } = await supabase
          .from('atb_today_attendance')
          .select('*')

        // 월별 결제 현황
        const currentMonth = new Date().toISOString().slice(0, 7)
        const { data: monthlyPayments } = await supabase
          .from('atb_monthly_payments')
          .select('*')
          .eq('month', currentMonth)
          .single()

        return new Response(
          JSON.stringify({
            at_risk: atRiskStudents || [],
            today_attendance: todayAttendance || [],
            monthly_payments: monthlyPayments,
            rules_count: RULES.length,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ----------------------------------------
      // 출석 처리
      // ----------------------------------------
      case '/attendance': {
        const { student_id, lesson_slot_id, status } = body

        // 학생 현재 상태 조회
        const { data: student } = await supabase
          .from('atb_student_dashboard')
          .select('*')
          .eq('id', student_id)
          .single()

        // 컨텍스트 생성
        const context = {
          student_id,
          attendance_rate: student?.attendance_rate || 100,
          consecutive_absent: status === 'absent'
            ? (student?.consecutive_absent || 0) + 1
            : 0,
          total_outstanding: student?.total_outstanding || 0
        }

        // 규칙 평가
        const triggeredRules = evaluateRules(context)

        // 상태 계산
        const newState = calculateState(context)

        // 개입 기록
        for (const rule of triggeredRules) {
          if (rule.executed) {
            await supabase
              .from('atb_interventions')
              .insert({
                student_id,
                trigger_type: 'attendance',
                action_code: rule.action,
                rule_id: rule.rule_id,
                mode: rule.mode,
                context_snapshot: context
              })
          }
        }

        return new Response(
          JSON.stringify({
            processed: true,
            student_id,
            status,
            attendance_rate: context.attendance_rate,
            consecutive_absent: context.consecutive_absent,
            triggered_rules: triggeredRules.length,
            rules: triggeredRules,
            state: newState,
            needs_attention: triggeredRules.some(r => r.executed)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ----------------------------------------
      // 결제 처리
      // ----------------------------------------
      case '/payment': {
        const { student_id, amount, payment_month, status: payStatus } = body

        // 학생 현재 상태 조회
        const { data: student } = await supabase
          .from('atb_student_dashboard')
          .select('*')
          .eq('id', student_id)
          .single()

        // 컨텍스트 생성
        const outstanding = payStatus === 'paid'
          ? Math.max(0, (student?.total_outstanding || 0) - amount)
          : (student?.total_outstanding || 0) + amount

        const context = {
          student_id,
          attendance_rate: student?.attendance_rate || 100,
          consecutive_absent: student?.consecutive_absent || 0,
          total_outstanding: outstanding,
          days_until_due: 15, // TODO: 실제 마감일 기준
          days_overdue: outstanding > 0 ? 7 : 0
        }

        // 규칙 평가
        const triggeredRules = evaluateRules(context)

        // 상태 계산
        const newState = calculateState(context)

        return new Response(
          JSON.stringify({
            processed: true,
            student_id,
            payment_status: payStatus,
            total_outstanding: outstanding,
            triggered_rules: triggeredRules.length,
            rules: triggeredRules,
            state: newState
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ----------------------------------------
      // 위험 학생 목록
      // ----------------------------------------
      case '/students/at-risk': {
        const { data: students } = await supabase
          .from('atb_student_dashboard')
          .select('*')
          .or('attendance_rate.lt.70,risk_score.gt.30')
          .order('risk_score', { ascending: false })

        return new Response(
          JSON.stringify({
            count: students?.length || 0,
            students: students || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ----------------------------------------
      // 규칙 목록
      // ----------------------------------------
      case '/rules': {
        return new Response(
          JSON.stringify({
            rules: RULES.map(r => ({
              id: r.id,
              name: r.name,
              action: r.action,
              mode: r.mode
            }))
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ----------------------------------------
      // 헬스 체크
      // ----------------------------------------
      case '/health': {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            mode: moltbotUrl ? 'proxy' : 'embedded',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Not found', path }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('[MOLTBOT EDGE ERROR]', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
