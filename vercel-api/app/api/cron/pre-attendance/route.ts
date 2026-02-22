import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enqueueMessage } from '@/lib/messaging';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const CRON_SECRET = process.env.CRON_SECRET;
const ORG_ID = '0219d7f2-5875-4bab-b921-f8593df126b8';
const LOOKAHEAD_HOURS = 2;

interface ScheduleRow {
  id: string;
  title: string;
  start_time: string;
  day_of_week: number;
  student_id: string | null;
  organization_id: string;
}

interface StudentRow {
  id: string;
  name: string;
  parent_phone: string | null;
  parent_name: string | null;
}

/**
 * GET /api/cron/pre-attendance
 * Vercel Cron: runs every 30 minutes
 * Finds classes starting in ~2 hours, sends pre-attendance confirmation to parents
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const cronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');

    if (!cronHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSupabaseAdmin();
    const now = new Date();
    const todayDow = now.getDay(); // 0=Sun, 1=Mon...

    // Target time window: 1.5h ~ 2.5h from now (to handle 30min cron interval)
    const windowStart = new Date(now.getTime() + 90 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 150 * 60 * 1000);
    const startTimeStr = windowStart.toTimeString().slice(0, 5); // HH:MM
    const endTimeStr = windowEnd.toTimeString().slice(0, 5);

    logger.info('Pre-attendance cron started', {
      today_dow: todayDow,
      window: `${startTimeStr} ~ ${endTimeStr}`,
    });

    // 1. Find schedules for today in the time window
    const { data: schedules, error: schedError } = await client
      .from('schedules')
      .select('id, title, start_time, day_of_week, student_id, organization_id')
      .eq('day_of_week', todayDow)
      .eq('is_active', true)
      .eq('organization_id', ORG_ID)
      .gte('start_time', startTimeStr)
      .lte('start_time', endTimeStr);

    if (schedError) throw schedError;

    if (!schedules || schedules.length === 0) {
      logger.info('No schedules found in window');
      return NextResponse.json({ success: true, message: 'No upcoming classes', processed: 0 });
    }

    logger.info('Found schedules', { count: schedules.length });

    let sentCount = 0;

    for (const schedule of schedules as ScheduleRow[]) {
      // 2. Get student info
      // If schedule has student_id, use it. Otherwise, get all students enrolled in this class.
      let students: StudentRow[] = [];

      if (schedule.student_id) {
        const { data: student } = await client
          .from('students')
          .select('id, name, parent_phone, parent_name')
          .eq('id', schedule.student_id)
          .single();

        if (student) students = [student as StudentRow];
      } else {
        // Get students via enrollments or attendance records for this schedule
        const { data: enrolled } = await client
          .from('attendance')
          .select('student_id')
          .eq('schedule_id', schedule.id)
          .eq('org_id', ORG_ID);

        if (enrolled && enrolled.length > 0) {
          const studentIds = Array.from(new Set(enrolled.map((e: { student_id: string }) => e.student_id)));
          const { data: studentData } = await client
            .from('students')
            .select('id, name, parent_phone, parent_name')
            .in('id', studentIds);

          if (studentData) students = studentData as StudentRow[];
        }
      }

      for (const student of students) {
        if (!student.parent_phone) {
          logger.warn('No parent phone for student', { student_id: student.id });
          continue;
        }

        // 3. Check if confirmation already exists today
        const todayStr = now.toISOString().slice(0, 10);
        const { data: existing } = await client
          .from('attendance_confirmations')
          .select('id')
          .eq('student_id', student.id)
          .eq('session_date', todayStr);

        if (existing && existing.length > 0) {
          logger.info('Confirmation already exists', { student_id: student.id, date: todayStr });
          continue;
        }

        // 4. Get current focus word (Next Move keyword)
        const { data: focusWord } = await client
          .from('focus_words')
          .select('word')
          .eq('student_id', student.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        const keyword = focusWord?.[0]?.word || '';

        // 5. Create attendance_confirmation record
        const responseToken = randomUUID();
        const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

        const { error: insertError } = await client
          .from('attendance_confirmations')
          .insert({
            org_id: ORG_ID,
            student_id: student.id,
            session_date: todayStr,
            response_token: responseToken,
            token_expires_at: tokenExpiresAt.toISOString(),
            final_status: 'pending',
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          });

        if (insertError) {
          logger.error('Failed to create confirmation', insertError);
          continue;
        }

        // 6. Enqueue Kakao message
        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://autus-ai.com'}/api/kakao/callback`;

        await enqueueMessage(
          ORG_ID,
          'PARENT',
          student.id,
          student.parent_phone,
          'ATTEND',
          {
            '학생이름': student.name,
            '수업명': schedule.title,
            '수업시간': schedule.start_time,
            '키워드': keyword,
            '출석확인URL': `${callbackUrl}?token=${responseToken}&action=attend`,
            '결석알림URL': `${callbackUrl}?token=${responseToken}&action=absent`,
          },
          'NORMAL',
          `pre-attend:${student.id}:${todayStr}`
        );

        sentCount++;
        logger.info('Pre-attendance message enqueued', {
          student_id: student.id,
          student_name: student.name,
          schedule_title: schedule.title,
        });
      }
    }

    logger.info('Pre-attendance cron completed', { sent_count: sentCount });

    return NextResponse.json({
      success: true,
      message: `Pre-attendance sent for ${sentCount} students`,
      processed: sentCount,
    });
  } catch (error) {
    logger.error('Pre-attendance cron failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
