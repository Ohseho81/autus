/**
 * 💳 결제 웹훅 Edge Function
 *
 * PortOne/토스 결제 → 검증 → DB 업데이트 → MoltBot Brain 연동
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentWebhook {
  // PortOne 웹훅 형식
  imp_uid?: string
  merchant_uid?: string
  status?: string
  // 직접 호출 형식
  student_id?: string
  amount?: number
  month?: string
  payment_method?: string
  transaction_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const moltbotUrl = Deno.env.get('MOLTBOT_BRAIN_URL') || 'http://localhost:3030'
    const portoneApiKey = Deno.env.get('PORTONE_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseKey)

    const body: PaymentWebhook = await req.json()

    console.log(`[PAYMENT] Webhook received:`, body)

    // ============================================
    // 1. PortOne 웹훅 처리 (있는 경우)
    // ============================================
    let paymentData = {
      student_id: body.student_id,
      amount: body.amount,
      month: body.month,
      payment_method: body.payment_method || 'card',
      transaction_id: body.transaction_id
    }

    if (body.imp_uid && portoneApiKey) {
      // PortOne API로 결제 검증
      const tokenResponse = await fetch('https://api.iamport.kr/users/getToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imp_key: Deno.env.get('PORTONE_IMP_KEY'),
          imp_secret: Deno.env.get('PORTONE_IMP_SECRET')
        })
      })

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.response?.access_token

      if (accessToken) {
        const paymentResponse = await fetch(`https://api.iamport.kr/payments/${body.imp_uid}`, {
          headers: { Authorization: accessToken }
        })
        const portonePayment = await paymentResponse.json()

        if (portonePayment.response?.status === 'paid') {
          // merchant_uid에서 student_id, month 추출
          // 형식: ATB-{student_id}-{month}
          const parts = body.merchant_uid?.split('-') || []
          paymentData = {
            student_id: parts[1],
            amount: portonePayment.response.amount,
            month: parts[2],
            payment_method: portonePayment.response.pay_method,
            transaction_id: body.imp_uid
          }
        } else {
          return new Response(
            JSON.stringify({ error: 'Payment not completed', status: portonePayment.response?.status }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // 필수 필드 검증
    if (!paymentData.student_id || !paymentData.amount || !paymentData.month) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: student_id, amount, month' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 2. 결제 처리 (DB 함수 호출)
    // ============================================
    const { data: payResult, error: payError } = await supabase
      .rpc('fn_process_payment', {
        p_student_id: paymentData.student_id,
        p_amount: paymentData.amount,
        p_month: paymentData.month,
        p_payment_method: paymentData.payment_method,
        p_transaction_id: paymentData.transaction_id
      })

    if (payError) {
      throw new Error(`Payment processing failed: ${payError.message}`)
    }

    console.log(`[PAYMENT] Process result:`, payResult)

    // ============================================
    // 3. QR 코드 활성화 (결제 완료 시)
    // ============================================
    // 기존 QR이 없으면 생성
    const { data: existingQR } = await supabase
      .from('atb_qr_codes')
      .select('code')
      .eq('student_id', paymentData.student_id)
      .eq('is_active', true)
      .single()

    let qrCode = existingQR?.code
    if (!qrCode) {
      const { data: newQR } = await supabase
        .rpc('fn_generate_qr_code', { p_student_id: paymentData.student_id })

      qrCode = newQR
    }

    // ============================================
    // 4. 학부모 결제 완료 알림
    // ============================================
    const { data: student } = await supabase
      .from('atb_students')
      .select('name, parent_phone')
      .eq('id', paymentData.student_id)
      .single()

    if (student?.parent_phone) {
      await supabase
        .from('atb_notifications')
        .insert({
          student_id: paymentData.student_id,
          recipient_phone: student.parent_phone,
          type: 'payment',
          channel: 'kakao',
          title: '수강료 결제 완료',
          message: `${student.name} 학생의 ${paymentData.month} 수강료 ${paymentData.amount.toLocaleString()}원이 결제되었습니다.`,
          status: 'pending'
        })
    }

    // ============================================
    // 5. MoltBot Brain 연동
    // ============================================
    let brainResult = null
    try {
      const brainResponse = await fetch(`${moltbotUrl}/api/moltbot/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: paymentData.student_id,
          amount: paymentData.amount,
          payment_month: paymentData.month,
          status: 'paid',
          transaction_id: paymentData.transaction_id
        })
      })

      if (brainResponse.ok) {
        brainResult = await brainResponse.json()
        console.log(`[MOLTBOT] Brain response:`, brainResult)
      }
    } catch (brainError) {
      console.error(`[MOLTBOT] Brain call failed:`, brainError)
    }

    // ============================================
    // 6. 포인트 적립 (결제 금액의 1%)
    // ============================================
    const pointAmount = Math.floor(paymentData.amount * 0.01)
    if (pointAmount > 0) {
      await supabase
        .from('atb_points')
        .insert({
          student_id: paymentData.student_id,
          amount: pointAmount,
          type: 'payment',
          description: `${paymentData.month} 수강료 결제 적립`
        })
    }

    // ============================================
    // 응답
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        payment: payResult,
        qr_code: qrCode,
        points_earned: pointAmount,
        brain: brainResult,
        message: '결제 처리 완료'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[PAYMENT ERROR]', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
