/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📅 Cron: Attendance Reminder
 *
 * 매일 오후 6시 실행 - 내일 수업 있는 학생에게 출석 확인 알림톡 발송
 * 법칙 4: 이벤트 기반 - 적절한 타이밍에 수집
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Solapi API Config
const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY')
const SOLAPI_API_SECRET = Deno.env.get('SOLAPI_API_SECRET')
const SOLAPI_SENDER = Deno.env.get('SOLAPI_SENDER') || '01012345678'
const KAKAO_PFID = Deno.env.get('KAKAO_PFID') // 카카오 채널 ID

interface Student {
  id: string
  name: string
  parent_phone: string
  lesson_name: string
  lesson_time: string
}

// Solapi 알림톡 발송
async function sendAlimtalk(
  phone: string,
  templateCode: string,
  variables: Record<string, string>,
  buttons?: Array<{ type: string; name: string; url?: string }>
) {
  const timestamp = Date.now().toString()
  const signature = await generateSignature(timestamp)

  const response = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${timestamp}, salt=${timestamp}, signature=${signature}`,
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

// HMAC-SHA256 서명 생성
async function generateSignature(timestamp: string): Promise<string> {
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
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 내일 날짜 계산
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const dayOfWeek = tomorrow.getDay() // 0=일, 1=월, ...

    console.log(`Sending attendance reminders for ${tomorrowStr}`)

    // 내일 수업이 있는 학생 목록 조회
    const { data: sessions, error: sessionsError } = await supabase
      .from('atb_lesson_sessions')
      .select(`
        id,
        name,
        start_time,
        class_id
      `)
      .eq('session_date', tomorrowStr)
      .eq('status', 'SCHEDULED')

    if (sessionsError) throw sessionsError

    if (!sessions || sessions.length === 0) {
      console.log('No sessions scheduled for tomorrow')
      return new Response(
        JSON.stringify({ ok: true, data: { message: 'No sessions tomorrow', sent: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 학생별 수업 정보 수집
    const studentsToNotify: Student[] = []

    for (const session of sessions) {
      // 해당 수업의 학생 목록 (relationships 또는 별도 테이블에서)
      const { data: enrollments } = await supabase
        .from('relationships')
        .select(`
          from_id,
          entities!relationships_from_id_fkey (
            id,
            name,
            phone
          )
        `)
        .eq('to_type', 'service')
        .eq('to_id', session.class_id)
        .eq('relation_type', 'enrolled_in')
        .is('ended_at', null)

      if (enrollments) {
        for (const enrollment of enrollments) {
          const entity = (enrollment as Record<string, unknown>).entities as Record<string, unknown> | null
          if (entity) {
            // 학부모 연락처 조회 (메타데이터에서)
            const { data: parentMeta } = await supabase
              .from('metadata')
              .select('value')
              .eq('target_type', 'entity')
              .eq('target_id', entity.id)
              .eq('key', 'parent_phone')
              .single()

            const parentPhone = parentMeta?.value?.replace(/"/g, '') || entity.phone

            if (parentPhone) {
              studentsToNotify.push({
                id: entity.id,
                name: entity.name,
                parent_phone: parentPhone,
                lesson_name: session.name,
                lesson_time: session.start_time,
              })
            }
          }
        }
      }
    }

    // 중복 제거 (같은 학부모에게 여러 알림 방지)
    const uniqueParents = new Map<string, Student[]>()
    for (const student of studentsToNotify) {
      const existing = uniqueParents.get(student.parent_phone) || []
      existing.push(student)
      uniqueParents.set(student.parent_phone, existing)
    }

    let sentCount = 0
    let failCount = 0

    // 알림톡 발송
    for (const [phone, students] of uniqueParents) {
      const studentNames = students.map(s => s.name).join(', ')
      const lessonInfo = students.map(s => `${s.lesson_name} ${s.lesson_time}`).join('\n')

      try {
        const result = await sendAlimtalk(
          phone,
          'ATB_ATTENDANCE_CONFIRM',
          {
            '#{학생명}': studentNames,
            '#{수업정보}': lessonInfo,
            '#{날짜}': tomorrowStr,
          },
          [
            { type: 'WL', name: '참석', url: `${Deno.env.get('APP_URL')}/attendance/confirm?action=attend&ids=${students.map(s => s.id).join(',')}` },
            { type: 'WL', name: '결석', url: `${Deno.env.get('APP_URL')}/attendance/confirm?action=absent&ids=${students.map(s => s.id).join(',')}` },
          ]
        )

        // 발송 로그 저장
        for (const student of students) {
          await supabase.from('events').insert({
            org_id: '00000000-0000-0000-0000-000000000001',
            event_type: 'notification_sent',
            entity_id: student.id,
            value: 1,
            source: 'cron',
            status: 'completed',
            event_at: new Date().toISOString(),
          })
        }

        sentCount++
        console.log(`Sent to ${phone}: ${studentNames}`)
      } catch (error: unknown) {
        console.error(`Failed to send to ${phone}:`, error)
        failCount++
      }
    }

    console.log(`Attendance reminders sent: ${sentCount}, failed: ${failCount}`)

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          message: `Attendance reminders sent`,
          sent: sentCount,
          failed: failCount,
          date: tomorrowStr,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Cron error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), code: 'CRON_ATTENDANCE_ERROR' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
