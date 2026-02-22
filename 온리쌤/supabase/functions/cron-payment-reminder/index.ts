/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 Cron: Payment Reminder
 *
 * 매일 오전 10시 실행 - D-7 결제 예정 알림 + D-day 자동 청구
 * 법칙 4: 이벤트 기반 - 적절한 타이밍에 수집
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Toss Payments Config
const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY')
const TOSS_API_URL = 'https://api.tosspayments.com/v1'

// Solapi Config
const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY')
const SOLAPI_API_SECRET = Deno.env.get('SOLAPI_API_SECRET')
const SOLAPI_SENDER = Deno.env.get('SOLAPI_SENDER')
const KAKAO_PFID = Deno.env.get('KAKAO_PFID')

interface PaymentDue {
  student_id: string
  student_name: string
  parent_phone: string
  amount: number
  due_date: string
  billing_key?: string
  package_name: string
}

// 토스 빌링 결제 실행
async function executeBilling(billingKey: string, orderId: string, amount: number, customerName: string) {
  const response = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey: orderId.split('-')[0],
      amount,
      orderId,
      orderName: `온리쌤 수업료 - ${customerName}`,
    }),
  })

  return response.json()
}

// 알림톡 발송
async function sendAlimtalk(
  phone: string,
  templateCode: string,
  variables: Record<string, string>,
  buttons?: Array<{ type: string; name: string; url?: string }>
) {
  const timestamp = Date.now().toString()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SOLAPI_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(timestamp + timestamp)
  )
  const signatureStr = btoa(String.fromCharCode(...new Uint8Array(signature)))

  const response = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${timestamp}, salt=${timestamp}, signature=${signatureStr}`,
    },
    body: JSON.stringify({
      message: {
        to: phone,
        from: SOLAPI_SENDER,
        kakaoOptions: {
          pfId: KAKAO_PFID,
          templateId: templateCode,
          variables,
          buttons,
        },
      },
    }),
  })

  return response.json()
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
    const d7Date = new Date(today)
    d7Date.setDate(d7Date.getDate() + 7)
    const d7Str = d7Date.toISOString().split('T')[0]

    console.log(`Payment reminders for ${todayStr}, D-7: ${d7Str}`)

    const results = {
      d7_reminders: 0,
      auto_payments: 0,
      payment_success: 0,
      payment_failed: 0,
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 1. D-7 결제 예정 알림
    // ═══════════════════════════════════════════════════════════════════════════════

    // 수업권 만료 7일 전인 학생 조회
    const { data: expiringCredits } = await supabase
      .from('student_lesson_credits')
      .select(`
        id,
        student_id,
        expires_at,
        remaining_lessons,
        students (
          id,
          name,
          parent_phone
        ),
        lesson_packages (
          name,
          price
        )
      `)
      .eq('status', 'active')
      .gte('expires_at', todayStr)
      .lte('expires_at', d7Str)

    if (expiringCredits && expiringCredits.length > 0) {
      for (const credit of expiringCredits) {
        const student = (credit as Record<string, unknown>).students as Record<string, unknown> | null
        const pkg = (credit as Record<string, unknown>).lesson_packages as Record<string, unknown> | null

        if (student?.parent_phone) {
          try {
            await sendAlimtalk(
              student.parent_phone,
              'ATB_PAYMENT_REMIND',
              {
                '#{학생명}': student.name,
                '#{수업권}': pkg?.name || '수업권',
                '#{잔여횟수}': String(credit.remaining_lessons || 0),
                '#{만료일}': credit.expires_at?.split('T')[0] || '',
                '#{금액}': pkg?.price?.toLocaleString() || '0',
              },
              [
                { type: 'WL', name: '확인', url: `${Deno.env.get('APP_URL')}/payment/confirm?studentId=${student.id}` },
                { type: 'WL', name: '카드변경', url: `${Deno.env.get('APP_URL')}/payment/card?studentId=${student.id}` },
              ]
            )

            results.d7_reminders++
            console.log(`D-7 reminder sent: ${student.name}`)
          } catch (error: unknown) {
            console.error(`D-7 reminder failed for ${student.name}:`, error)
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 2. D-day 자동 결제 (빌링키가 있는 경우)
    // ═══════════════════════════════════════════════════════════════════════════════

    // 오늘 만료되는 수업권 중 빌링키가 있는 학생
    const { data: todayExpiring } = await supabase
      .from('student_lesson_credits')
      .select(`
        id,
        student_id,
        students (
          id,
          name,
          parent_phone,
          parent_id
        ),
        lesson_packages (
          id,
          name,
          price,
          lesson_count,
          validity_days
        )
      `)
      .eq('status', 'active')
      .lte('expires_at', `${todayStr}T23:59:59`)
      .gte('expires_at', `${todayStr}T00:00:00`)

    if (todayExpiring && todayExpiring.length > 0) {
      for (const credit of todayExpiring) {
        const student = (credit as Record<string, unknown>).students as Record<string, unknown> | null
        const pkg = (credit as Record<string, unknown>).lesson_packages as Record<string, unknown> | null

        if (!student || !pkg) continue

        // 빌링키 조회
        const { data: billingKey } = await supabase
          .from('billing_keys')
          .select('billing_key')
          .eq('parent_id', student.parent_id)
          .eq('is_active', true)
          .single()

        if (billingKey?.billing_key) {
          results.auto_payments++
          const orderId = `ATB-${student.id}-${Date.now()}`

          try {
            const paymentResult = await executeBilling(
              billingKey.billing_key,
              orderId,
              pkg.price,
              student.name
            )

            if (paymentResult.status === 'DONE') {
              // 결제 성공 → 새 수업권 생성
              const newExpiry = new Date()
              newExpiry.setDate(newExpiry.getDate() + (pkg.validity_days || 30))

              await supabase.from('student_lesson_credits').insert({
                student_id: student.id,
                package_id: pkg.id,
                total_lessons: pkg.lesson_count,
                used_lessons: 0,
                expires_at: newExpiry.toISOString(),
                status: 'active',
              })

              // 기존 수업권 만료 처리
              await supabase
                .from('student_lesson_credits')
                .update({ status: 'expired' })
                .eq('id', credit.id)

              // 결제 완료 알림톡
              await sendAlimtalk(
                student.parent_phone,
                'ATB_PAYMENT_SUCCESS',
                {
                  '#{학생명}': student.name,
                  '#{수업권}': pkg.name,
                  '#{금액}': pkg.price.toLocaleString(),
                  '#{결제일}': todayStr,
                }
              )

              results.payment_success++
              console.log(`Auto payment success: ${student.name} - ${pkg.price}원`)
            } else {
              throw new Error(paymentResult.message || 'Payment failed')
            }
          } catch (error: unknown) {
            // 결제 실패 알림톡
            await sendAlimtalk(
              student.parent_phone,
              'ATB_PAYMENT_FAIL',
              {
                '#{학생명}': student.name,
                '#{수업권}': pkg.name,
                '#{사유}': '카드 결제 실패',
              },
              [
                { type: 'WL', name: '재시도', url: `${Deno.env.get('APP_URL')}/payment/retry?studentId=${student.id}` },
                { type: 'WL', name: '문의', url: `${Deno.env.get('APP_URL')}/contact` },
              ]
            )

            results.payment_failed++
            console.error(`Auto payment failed: ${student.name}`, error)
          }
        } else {
          // 빌링키 없음 → 결제 요청 알림톡
          if (student.parent_phone) {
            await sendAlimtalk(
              student.parent_phone,
              'ATB_LESSON_COUNT',
              {
                '#{학생명}': student.name,
                '#{잔여횟수}': '0',
                '#{수업권}': pkg.name,
              },
              [
                { type: 'WL', name: '충전', url: `${Deno.env.get('APP_URL')}/payment/new?studentId=${student.id}` },
                { type: 'WL', name: '문의', url: `${Deno.env.get('APP_URL')}/contact` },
              ]
            )
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 3. 미납 알림 (3회 이상 결제 실패)
    // ═══════════════════════════════════════════════════════════════════════════════

    const { data: overduePayments } = await supabase
      .from('payment_records')
      .select(`
        id,
        student_id,
        amount,
        error_message,
        students (
          name,
          parent_phone
        )
      `)
      .eq('status', 'ABORTED')
      .gte('created_at', new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // 관리자 알림 (Slack/푸시)
    if (overduePayments && overduePayments.length > 0) {
      const slackWebhook = Deno.env.get('SLACK_WEBHOOK_URL')
      if (slackWebhook) {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ 결제 실패 알림\n${overduePayments.length}건의 결제 실패가 있습니다.\n${overduePayments.map((p: Record<string, unknown>) => `- ${(p.students as Record<string, unknown> | null)?.name}: ${(p.amount as number | undefined)?.toLocaleString()}원`).join('\n')}`,
          }),
        })
      }
    }

    console.log('Payment cron results:', results)

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          results,
          date: todayStr,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Payment cron error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), code: 'PAYMENT_REMINDER_ERROR' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
