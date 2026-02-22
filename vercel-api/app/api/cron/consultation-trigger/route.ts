import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enqueueMessage } from '@/lib/messaging';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;
const ORG_ID = '0219d7f2-5875-4bab-b921-f8593df126b8';

/**
 * GET /api/cron/consultation-trigger
 * Vercel Cron: runs daily
 * Checks for unresolved triggers and sends reminder notifications
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

    logger.info('Consultation trigger cron started');

    // Find unresolved triggers older than 3 days
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: unresolvedTriggers, error } = await client
      .from('trigger_log')
      .select('id, student_id, trigger_type, trigger_reason, created_at')
      .eq('org_id', ORG_ID)
      .eq('resolved', false)
      .lte('created_at', threeDaysAgo);

    if (error) throw error;

    if (!unresolvedTriggers || unresolvedTriggers.length === 0) {
      logger.info('No unresolved triggers');
      return NextResponse.json({ success: true, message: 'No triggers', processed: 0 });
    }

    let remindCount = 0;

    for (const trigger of unresolvedTriggers) {
      // Get student info
      const { data: student } = await client
        .from('students')
        .select('id, name, parent_phone')
        .eq('id', trigger.student_id)
        .single();

      if (!student?.parent_phone) continue;

      // Send reminder to teacher/director about unresolved trigger
      const { data: teachers } = await client
        .from('app_members')
        .select('user_id, role')
        .eq('org_id', ORG_ID)
        .in('role', ['teacher', 'director', 'owner']);

      // Notify via internal notification log (not Kakao - internal only)
      for (const teacher of (teachers || [])) {
        await client
          .from('notification_log')
          .insert({
            org_id: ORG_ID,
            recipient_id: teacher.user_id,
            notification_type: 'CONSULTATION_REMINDER',
            title: `상담 미처리 알림: ${student.name}`,
            body: `${trigger.trigger_reason} (${trigger.trigger_type}) - ${Math.floor((now.getTime() - new Date(trigger.created_at as string).getTime()) / (24 * 60 * 60 * 1000))}일 경과`,
            metadata: JSON.stringify({
              trigger_id: trigger.id,
              student_id: trigger.student_id,
            }),
            is_read: false,
            created_at: now.toISOString(),
          });
      }

      remindCount++;
    }

    logger.info('Consultation trigger cron completed', {
      unresolved: unresolvedTriggers.length,
      reminded: remindCount,
    });

    return NextResponse.json({
      success: true,
      unresolved: unresolvedTriggers.length,
      reminded: remindCount,
    });
  } catch (error) {
    logger.error('Consultation trigger cron failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
