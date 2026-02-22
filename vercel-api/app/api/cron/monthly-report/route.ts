import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enqueueMessage } from '@/lib/messaging';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;
const ORG_ID = '0219d7f2-5875-4bab-b921-f8593df126b8';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://autus-ai.com';

/**
 * GET /api/cron/monthly-report
 * Vercel Cron: runs on the last day of each month
 * Generates and sends monthly growth reports for all active students
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
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    logger.info('Monthly report cron started', { month: currentMonth });

    // Check if already sent this month
    const { data: alreadySent } = await client
      .from('monthly_summary_sent_log')
      .select('id')
      .eq('org_id', ORG_ID)
      .eq('month', currentMonth)
      .limit(1);

    if (alreadySent && alreadySent.length > 0) {
      logger.info('Monthly reports already sent for this month', { month: currentMonth });
      return NextResponse.json({
        success: true,
        message: 'Already sent this month',
        skipped: true,
      });
    }

    // Get all active students with parent contact
    const { data: students, error: studentsError } = await client
      .from('students')
      .select('id, name, parent_phone, parent_name, status')
      .eq('organization_id', ORG_ID)
      .in('status', ['active', 'enrolled']);

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      logger.info('No active students found');
      return NextResponse.json({ success: true, message: 'No students', processed: 0 });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        if (!student.parent_phone) continue;

        // Call growth report API internally
        const reportResponse = await fetch(`${APP_URL}/api/growth/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: student.id,
            month: currentMonth,
          }),
        });

        if (!reportResponse.ok) {
          logger.warn('Report generation failed for student', { student_id: student.id });
          errorCount++;
          continue;
        }

        const reportData = await reportResponse.json() as {
          success: boolean;
          data?: {
            summary: string;
            direction: string;
            next_focus: string;
            closing: string;
          };
        };

        if (!reportData.success || !reportData.data) {
          errorCount++;
          continue;
        }

        const report = reportData.data;

        // Enqueue monthly report Kakao message
        await enqueueMessage(
          ORG_ID,
          'PARENT',
          student.id as string,
          student.parent_phone as string,
          'MONTHLY_REPORT',
          {
            '학생이름': student.name,
            '월': currentMonth,
            '흐름요약': report.summary,
            '방향': report.direction,
            '다음집중': report.next_focus,
            '마무리': report.closing,
          },
          'LOW',
          `monthly-report:${student.id}:${currentMonth}`
        );

        sentCount++;
      } catch (err) {
        logger.error('Error processing student report', err instanceof Error ? err : new Error(String(err)), {
          student_id: student.id,
        });
        errorCount++;
      }
    }

    logger.info('Monthly report cron completed', {
      month: currentMonth,
      total_students: students.length,
      sent: sentCount,
      errors: errorCount,
    });

    return NextResponse.json({
      success: true,
      month: currentMonth,
      total: students.length,
      sent: sentCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error('Monthly report cron failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
