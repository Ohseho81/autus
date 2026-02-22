import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enqueueMessage } from '@/lib/messaging';
import { logger } from '@/lib/logger';

const ORG_ID = '0219d7f2-5875-4bab-b921-f8593df126b8';

interface GrowthSessionBody {
  student_id: string;
  attendance: 'present' | 'absent' | 'late';
  touch_rating?: number; // 1-5
  keywords: string[];     // e.g. ['serve_form', 'stamina']
  note?: string;          // optional coach note
  coach_id?: string;
}

/**
 * POST /api/growth/session
 * Called after attendance + keyword selection by coach.
 * Calculates Δ, updates Next Move, generates parent message.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as GrowthSessionBody;
    const { student_id, attendance, touch_rating, keywords, note, coach_id } = body;

    if (!student_id || !attendance || !keywords || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'student_id, attendance, keywords required' },
        { status: 400 }
      );
    }

    const client = getSupabaseAdmin();
    const now = new Date().toISOString();

    // 1. Get student info + current roadmap
    const [studentRes, roadmapRes, prevFocusRes] = await Promise.all([
      client.from('students').select('id, name, parent_phone, parent_name').eq('id', student_id).single(),
      client.from('student_roadmaps').select('*').eq('student_id', student_id).order('updated_at', { ascending: false }).limit(1),
      client.from('focus_words').select('word').eq('student_id', student_id).eq('is_active', true).order('created_at', { ascending: false }).limit(3),
    ]);

    const student = studentRes.data;
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const roadmap = roadmapRes.data?.[0];

    // 2. Calculate Δ (delta)
    const attendanceDelta = attendance === 'present' ? 1.0 : attendance === 'late' ? 0.5 : -1.0;
    const touchDelta = touch_rating ? (touch_rating - 3) * 0.3 : 0; // normalize around 3
    const keywordDelta = keywords.length * 0.2; // more keywords = more engagement
    const totalDelta = Math.round((attendanceDelta + touchDelta + keywordDelta) * 100) / 100;

    // 3. Insert delta_log (append-only Event Ledger)
    const { error: deltaError } = await client
      .from('delta_log')
      .insert({
        student_id,
        delta_type: 'SESSION',
        delta_value: totalDelta,
        trigger_event: 'growth_session',
        metadata: JSON.stringify({
          attendance,
          touch_rating,
          keywords,
          note,
          coach_id,
        }),
        created_at: now,
      });

    if (deltaError) {
      logger.error('Failed to insert delta_log', deltaError);
      // Non-blocking: continue even if delta log fails
    }

    // 4. Update focus_words: deactivate old, insert new
    await client
      .from('focus_words')
      .update({ is_active: false })
      .eq('student_id', student_id)
      .eq('is_active', true);

    for (const keyword of keywords) {
      await client
        .from('focus_words')
        .insert({
          student_id,
          word: keyword,
          category: 'coach_selected',
          is_active: true,
          created_at: now,
        });
    }

    // 5. Update Next Move on roadmap
    const nextMoveText = generateNextMoveText(keywords, roadmap?.destination_text);

    if (roadmap) {
      await client
        .from('student_roadmaps')
        .update({
          next_move_text: nextMoveText,
          updated_at: now,
        })
        .eq('id', roadmap.id);
    }

    // 6. Generate parent message and enqueue
    if (student.parent_phone && attendance !== 'absent') {
      const parentMessage = generateParentMessage(
        student.name as string,
        keywords,
        roadmap?.destination_text as string | undefined,
        totalDelta
      );

      await enqueueMessage(
        ORG_ID,
        'PARENT',
        student_id,
        student.parent_phone as string,
        'GOAL', // template for growth update
        {
          '학생이름': student.name,
          '키워드': keywords.join(', '),
          '메시지': parentMessage,
          '다음방향': nextMoveText,
        },
        'NORMAL',
        `session:${student_id}:${now.slice(0, 10)}`
      );
    }

    // 7. Check consultation triggers
    await checkConsultationTriggers(client, student_id, totalDelta);

    logger.info('Growth session recorded', {
      student_id,
      delta: totalDelta,
      keywords,
      attendance,
    });

    return NextResponse.json({
      success: true,
      data: {
        delta: totalDelta,
        next_move: nextMoveText,
        keywords_saved: keywords.length,
        parent_notified: !!student.parent_phone && attendance !== 'absent',
      },
    });
  } catch (error) {
    logger.error('Growth session error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Generate Next Move text from keywords + Destination context
 * Uses word-centric expression (no numbers, no rankings)
 */
function generateNextMoveText(keywords: string[], destination?: string): string {
  const keywordStr = keywords.join(', ');

  if (!destination) {
    return `${keywordStr} 집중 연습`;
  }

  return `${destination} 방향으로 ${keywordStr} 집중`;
}

/**
 * Generate parent message - word-centric, warm, no numbers/rankings
 * ⚠️ 절대 규칙: 백분위/랭킹/비교 수치 노출 금지
 */
function generateParentMessage(
  studentName: string,
  keywords: string[],
  destination: string | undefined,
  delta: number
): string {
  const keywordStr = keywords.join(', ');

  // Momentum-based expression (no numbers)
  let momentum: string;
  if (delta >= 1.5) {
    momentum = '흐름이 아주 좋습니다';
  } else if (delta >= 0.5) {
    momentum = '꾸준히 접근 중입니다';
  } else if (delta >= 0) {
    momentum = '안정적으로 진행 중입니다';
  } else {
    momentum = '점검을 권장드립니다';
  }

  const lines = [
    `${studentName} 학생, 오늘 수업 완료되었습니다.`,
    `오늘 포커스: ${keywordStr}`,
    momentum,
  ];

  if (destination) {
    lines.push(`다음 단계까지 조금 남았습니다.`);
  }

  lines.push(`우리 ${studentName}의 멋진 성장을 응원합니다.`);

  return lines.join('\n');
}

/**
 * Check if consultation triggers should fire
 */
async function checkConsultationTriggers(
  client: ReturnType<typeof getSupabaseAdmin>,
  studentId: string,
  latestDelta: number
): Promise<void> {
  try {
    // Get recent deltas (last 4 weeks)
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentDeltas } = await client
      .from('delta_log')
      .select('delta_value, created_at')
      .eq('student_id', studentId)
      .gte('created_at', fourWeeksAgo)
      .order('created_at', { ascending: false });

    if (!recentDeltas || recentDeltas.length < 2) return;

    const deltas = recentDeltas.map((d: { delta_value: number }) => d.delta_value);

    // Trigger: 4주 연속 정체 (stagnation)
    if (deltas.length >= 4) {
      const last4 = deltas.slice(0, 4);
      const allStagnant = last4.every((d: number) => Math.abs(d) < 0.3);
      if (allStagnant) {
        await insertTrigger(client, studentId, 'STAGNATION_4W', '4주 연속 변화 미미');
        return;
      }
    }

    // Trigger: 2주 연속 하락 (decline)
    if (deltas.length >= 2) {
      const last2 = deltas.slice(0, 2);
      const bothDecline = last2.every((d: number) => d < -0.5);
      if (bothDecline) {
        await insertTrigger(client, studentId, 'DECLINE_2W', '2주 연속 하락 감지');
        return;
      }
    }

    // Trigger: 목표 근접
    if (latestDelta >= 2.0) {
      await insertTrigger(client, studentId, 'NEAR_GOAL', '목표 근접 - 다음 단계 논의 필요');
    }
  } catch (error) {
    logger.error('Consultation trigger check failed', error instanceof Error ? error : new Error(String(error)));
  }
}

async function insertTrigger(
  client: ReturnType<typeof getSupabaseAdmin>,
  studentId: string,
  triggerType: string,
  reason: string
): Promise<void> {
  // Check if unresolved trigger already exists
  const { data: existing } = await client
    .from('trigger_log')
    .select('id')
    .eq('student_id', studentId)
    .eq('trigger_type', triggerType)
    .eq('resolved', false);

  if (existing && existing.length > 0) return; // already triggered

  const { error } = await client
    .from('trigger_log')
    .insert({
      org_id: ORG_ID,
      student_id: studentId,
      trigger_type: triggerType,
      trigger_reason: reason,
      resolved: false,
      created_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Failed to insert trigger_log', error);
    return;
  }

  // Get student info for notification
  const { data: student } = await client
    .from('students')
    .select('name, parent_phone')
    .eq('id', studentId)
    .single();

  if (student?.parent_phone) {
    await enqueueMessage(
      ORG_ID,
      'PARENT',
      studentId,
      student.parent_phone as string,
      'CONSENT', // consultation suggestion template
      {
        '학생이름': student.name,
        '트리거사유': reason,
        '상담예약URL': `${process.env.NEXT_PUBLIC_APP_URL || 'https://autus-ai.com'}/onlyssam/consultation?student=${studentId}`,
      },
      'NORMAL',
      `trigger:${studentId}:${triggerType}:${new Date().toISOString().slice(0, 7)}`
    );
  }

  logger.info('Consultation trigger inserted', { studentId, triggerType, reason });
}
