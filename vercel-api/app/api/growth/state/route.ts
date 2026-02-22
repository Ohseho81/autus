import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const ORG_ID = '0219d7f2-5875-4bab-b921-f8593df126b8';

/**
 * GET /api/growth/state?student_id=xxx
 * Returns current growth state: focus_words, destination, next_move, recent delta
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const studentId = request.nextUrl.searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id required' }, { status: 400 });
    }

    const client = getSupabaseAdmin();

    // Parallel queries for all growth state data
    const [focusWordsRes, deltaRes, roadmapRes, stageRes] = await Promise.all([
      // Active focus words (keywords)
      client
        .from('focus_words')
        .select('id, word, category, is_active, created_at')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent delta log entries
      client
        .from('delta_log')
        .select('id, delta_type, delta_value, trigger_event, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Student roadmap (Destination)
      client
        .from('student_roadmaps')
        .select('id, destination_text, next_move_text, stage, updated_at')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false })
        .limit(1),

      // Stage progress
      client
        .from('stage_progress_log')
        .select('id, from_stage, to_stage, reason, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    // Student basic info
    const { data: student } = await client
      .from('students')
      .select('id, name, grade, status')
      .eq('id', studentId)
      .single();

    const focusWords = focusWordsRes.data || [];
    const deltas = deltaRes.data || [];
    const roadmap = roadmapRes.data?.[0] || null;
    const stageHistory = stageRes.data || [];

    // Calculate recent momentum
    const recentDeltas = deltas.slice(0, 4);
    const avgDelta = recentDeltas.length > 0
      ? recentDeltas.reduce((sum: number, d: { delta_value: number }) => sum + (d.delta_value || 0), 0) / recentDeltas.length
      : 0;

    const momentum = avgDelta > 0.5 ? 'rising' : avgDelta < -0.5 ? 'declining' : 'stable';

    return NextResponse.json({
      success: true,
      data: {
        student,
        destination: roadmap?.destination_text || null,
        next_move: roadmap?.next_move_text || null,
        stage: roadmap?.stage || null,
        focus_words: focusWords.map((fw: { word: string; category: string }) => ({
          word: fw.word,
          category: fw.category,
        })),
        momentum,
        avg_delta: Math.round(avgDelta * 100) / 100,
        recent_deltas: deltas.slice(0, 5),
        stage_history: stageHistory,
      },
    });
  } catch (error) {
    logger.error('Growth state error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
