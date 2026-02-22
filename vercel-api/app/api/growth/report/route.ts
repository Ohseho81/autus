import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const ORG_ID = '0219d7f2-5875-4bab-b921-f8593df126b8';

/**
 * POST /api/growth/report
 * Generates a monthly growth report for a student
 * Called by monthly-report cron or manually
 * ⚠️ 절대 규칙: 백분위/랭킹/비교 수치 노출 금지
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { student_id: string; month?: string };
    const { student_id, month } = body;

    if (!student_id) {
      return NextResponse.json({ success: false, error: 'student_id required' }, { status: 400 });
    }

    const client = getSupabaseAdmin();
    const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthStart = `${targetMonth}-01T00:00:00Z`;
    const nextMonth = new Date(new Date(monthStart).setMonth(new Date(monthStart).getMonth() + 1)).toISOString();

    // Parallel queries
    const [studentRes, deltasRes, focusRes, roadmapRes, attendRes] = await Promise.all([
      client.from('students').select('id, name').eq('id', student_id).single(),
      client.from('delta_log').select('*').eq('student_id', student_id)
        .gte('created_at', monthStart).lt('created_at', nextMonth)
        .order('created_at', { ascending: true }),
      client.from('focus_words').select('word, category, created_at').eq('student_id', student_id)
        .gte('created_at', monthStart).lt('created_at', nextMonth),
      client.from('student_roadmaps').select('destination_text, next_move_text, stage')
        .eq('student_id', student_id).order('updated_at', { ascending: false }).limit(1),
      client.from('attendance_confirmations').select('final_status, session_date').eq('student_id', student_id)
        .gte('session_date', monthStart.slice(0, 10)).lt('session_date', nextMonth.slice(0, 10)),
    ]);

    const student = studentRes.data;
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const deltas = deltasRes.data || [];
    const focusWords = focusRes.data || [];
    const roadmap = roadmapRes.data?.[0];
    const attendances = attendRes.data || [];

    // Calculate monthly summary
    const totalSessions = deltas.length;
    const avgDelta = totalSessions > 0
      ? deltas.reduce((sum: number, d: { delta_value: number }) => sum + (d.delta_value || 0), 0) / totalSessions
      : 0;

    const attendCount = attendances.filter((a: { final_status: string }) => a.final_status === 'confirmed' || a.final_status === 'present').length;
    const totalScheduled = attendances.length;

    // Extract top keywords for the month
    const wordFreq: Record<string, number> = {};
    for (const fw of focusWords) {
      const w = fw.word as string;
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
    const topKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);

    // ⚠️ 단어 중심 표현 (숫자/백분위/랭킹 금지)
    let flowSummary: string;
    if (avgDelta >= 1.0) {
      flowSummary = '흐름이 매우 안정적입니다';
    } else if (avgDelta >= 0.3) {
      flowSummary = '꾸준히 접근 중입니다';
    } else if (avgDelta >= -0.3) {
      flowSummary = '안정적으로 유지되고 있습니다';
    } else {
      flowSummary = '점검이 필요한 시기입니다';
    }

    const destination = roadmap?.destination_text || '설정 전';
    const nextMove = roadmap?.next_move_text || '설정 전';
    const nextMonthFocus = topKeywords.length > 0 ? topKeywords.join(', ') : '다음 수업에서 설정 예정';

    const report = {
      student_name: student.name,
      month: targetMonth,
      summary: flowSummary,
      direction: `${destination} 방향`,
      next_focus: nextMonthFocus,
      top_keywords: topKeywords,
      sessions: totalSessions,
      closing: `우리 ${student.name}의 멋진 성장을 응원합니다.`,
    };

    // Log report generation
    await client.from('monthly_summary_sent_log').insert({
      student_id,
      org_id: ORG_ID,
      month: targetMonth,
      report_data: JSON.stringify(report),
      created_at: new Date().toISOString(),
    });

    logger.info('Growth report generated', { student_id, month: targetMonth });

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    logger.error('Growth report error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
