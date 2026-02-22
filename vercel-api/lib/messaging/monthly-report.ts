import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { enqueueMessage } from './outbound-worker';
import { checkConsent } from './consent-handler';

export async function generateMonthlyReports(org_id: string): Promise<void> {
  logger.info('Generating monthly reports', { org_id });

  const client = getSupabaseAdmin();

  try {
    // Get all students in the organization
    const { data: students, error: studentError } = await client
      .from('students')
      .select('id, name')
      .eq('org_id', org_id);

    if (studentError) throw studentError;

    logger.info('Processing students for monthly report', { org_id, count: students?.length || 0 });

    for (const student of students || []) {
      const student_id = student.id as string;
      const student_name = student.name as string;

      // Get parent info
      const { data: parentData, error: parentError } = await client
        .from('users')
        .select('id, phone')
        .eq('student_id', student_id)
        .eq('role', 'PARENT')
        .limit(1);

      if (parentError) {
        logger.warn('Failed to get parent info', { student_id });
        continue;
      }

      if (!parentData || parentData.length === 0) {
        logger.info('No parent found for student', { student_id });
        continue;
      }

      const parent = parentData[0];
      const parent_id = parent.id as string;
      const phone = parent.phone as string;

      // Check consent before sending
      const hasConsent = await checkConsent(
        org_id,
        parent_id,
        'MARKETING'
      );

      if (!hasConsent) {
        logger.info('Skipping report - no consent', { student_id, parent_id });
        continue;
      }

      try {
        const studentData = await gatherStudentData(org_id, student_id);
        const message = formatReportMessage(student_name, studentData);

        await enqueueMessage(
          org_id,
          'PARENT',
          parent_id,
          phone,
          'MONTHLY_REPORT',
          {
            student_id,
            student_name,
            ...studentData
          },
          'NORMAL'
        );

        logger.info('Monthly report enqueued', { student_id, parent_id });
      } catch (error) {
        logger.error('Failed to generate report for student', error instanceof Error ? error : new Error(String(error)), {
          student_id,
          parent_id
        });
        // Continue with next student
      }
    }

    logger.info('Monthly report generation completed', { org_id });
  } catch (error) {
    logger.error('Failed to generate monthly reports', error instanceof Error ? error : new Error(String(error)), {
      org_id
    });
    throw error;
  }
}

export async function gatherStudentData(
  org_id: string,
  student_id: string
): Promise<Record<string, unknown>> {
  logger.info('Gathering student data', { student_id });

  const client = getSupabaseAdmin();

  try {
    // Calculate attendance rate for this month
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const { data: attendanceData, error: attendanceError } = await client
      .from('attendance')
      .select('status')
      .eq('student_id', student_id)
      .gte('attended_at', startOfMonth.toISOString());

    if (attendanceError) throw attendanceError;

    const attendance = attendanceData || [];
    const attended = attendance.filter(a => (a as Record<string, unknown>).status === 'ATTENDED').length;
    const attendanceRate = attendance.length > 0 
      ? Math.round((attended / attendance.length) * 100) 
      : 0;

    // Gather keywords/notes from this month
    const { data: notesData, error: notesError } = await client
      .from('session_notes')
      .select('keyword')
      .eq('student_id', student_id)
      .gte('created_at', startOfMonth.toISOString());

    if (notesError) throw notesError;

    const keywords = Array.from(
      new Set((notesData || []).map(n => (n as Record<string, unknown>).keyword).filter(Boolean))
    ) as string[];

    // Check growth trend (compare to last month)
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const lastMonthEndDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    
    const { data: lastMonthData, error: lastMonthError } = await client
      .from('attendance')
      .select('status')
      .eq('student_id', student_id)
      .gte('attended_at', lastMonth.toISOString())
      .lte('attended_at', lastMonthEndDate.toISOString());

    if (lastMonthError) throw lastMonthError;

    const lastMonthAttendance = lastMonthData || [];
    const lastMonthAttended = lastMonthAttendance.filter(a => (a as Record<string, unknown>).status === 'ATTENDED').length;
    const lastMonthRate = lastMonthAttendance.length > 0 
      ? Math.round((lastMonthAttended / lastMonthAttendance.length) * 100) 
      : 0;

    const growthTrend = attendanceRate >= lastMonthRate ? 'UP' : 'DOWN';
    const growthValue = Math.abs(attendanceRate - lastMonthRate);

    return {
      attendance_rate: attendanceRate,
      total_sessions: attendance.length,
      attended_sessions: attended,
      keywords: keywords.slice(0, 3),
      growth_trend: growthTrend,
      growth_value: growthValue,
      last_month_rate: lastMonthRate
    };
  } catch (error) {
    logger.error('Failed to gather student data', error instanceof Error ? error : new Error(String(error)), {
      student_id
    });
    throw error;
  }
}

export function formatReportMessage(
  student_name: string,
  data: Record<string, unknown>
): string {
  const attendanceRate = data.attendance_rate as number;
  const totalSessions = data.total_sessions as number;
  const keywords = (data.keywords as string[]).slice(0, 3).join(', ') || '학습 진행';
  const growthTrend = data.growth_trend as string;
  const growthValue = data.growth_value as number;

  const trendEmoji = growthTrend === 'UP' ? '📈' : '📉';
  const trendText = growthTrend === 'UP' 
    ? `지난달보다 ${growthValue}% 향상되었습니다`
    : `지난달보다 ${growthValue}% 감소했습니다`;

  return `${student_name} 학생의 ${new Date().toLocaleString('ko-KR', { month: 'long' })} 학습 리포트

📊 이달 학습 현황
• 출석률: ${attendanceRate}% (${totalSessions}회 중)
• 주요 학습 주제: ${keywords}
• 성장 추이: ${trendEmoji} ${trendText}

우리 ${student_name}의 멋진 성장을 응원합니다.`;
}
