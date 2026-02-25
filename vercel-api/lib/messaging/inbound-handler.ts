import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { InboundCallback } from './types';

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** P1: 사전 출석 학부모 응답 → atb_attendance 동기화 */
async function syncToAtbAttendance(
  client: ReturnType<typeof getSupabaseAdmin>,
  studentId: string,
  sessionDate: string,
  status: 'present' | 'absent'
): Promise<void> {
  try {
    const dow = new Date(sessionDate).getDay();
    const { data: classes } = await client
      .from('atb_classes')
      .select('id')
      .eq('day_of_week', dow)
      .eq('is_active', true);

    const classIds = (classes || []).map((c: { id: string }) => c.id);
    if (classIds.length === 0) return;

    const { data: enrollments } = await client
      .from('atb_enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .in('class_id', classIds);

    const targetClassIds = (enrollments || []).map((e: { class_id: string }) => e.class_id);

    for (const classId of targetClassIds) {
      const { error } = await client.from('atb_attendance').upsert(
        {
          student_id: studentId,
          class_id: classId,
          date: sessionDate,
          status,
          check_in_time: status === 'present' ? new Date().toISOString() : null,
        },
        { onConflict: 'student_id,class_id,date' }
      );
      if (error) {
        logger.warn('atb_attendance sync failed', { studentId, classId, error: String(error) });
      } else {
        logger.info('atb_attendance synced', { studentId, classId, status });
      }
    }
  } catch (e) {
    logger.warn('syncToAtbAttendance error', { studentId, sessionDate, error: String(e) });
  }
}

export async function handleInboundCallback(callback: InboundCallback): Promise<void> {
  logger.info('Handling inbound callback', {
    message_id: callback.message_id,
    response_type: callback.response_type,
    timestamp: callback.timestamp
  });

  const client = getSupabaseAdmin();

  // Check for duplicates within 5-minute window
  const fiveMinutesAgo = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const { data: existing } = await client
    .from('inbound_callbacks')
    .select('id')
    .eq('message_id', callback.message_id)
    .gte('timestamp', fiveMinutesAgo);

  if (existing && existing.length > 0) {
    logger.warn('Duplicate callback detected, skipping', { message_id: callback.message_id });
    return;
  }

  try {
    // Insert into inbound_callbacks
    const { error: insertError } = await client
      .from('inbound_callbacks')
      .insert({
        message_id: callback.message_id,
        response_type: callback.response_type,
        button_key: callback.button_key || null,
        user_phone: callback.user_phone || null,
        timestamp: callback.timestamp,
        raw_payload: callback.raw_payload || null
      });

    if (insertError) throw insertError;

    // Route by response type
    switch (callback.response_type) {
      case 'ATTEND':
        await handleAttendanceResponse(callback);
        break;
      case 'ABSENT':
        await handleAbsenceResponse(callback);
        break;
      case 'CONSENT':
        await handleConsentResponse(callback);
        break;
      case 'SIGNATURE':
        await handleSignatureResponse(callback);
        break;
      case 'NONE':
        logger.info('No-op response received', { message_id: callback.message_id });
        break;
    }

    logger.info('Inbound callback processed', { message_id: callback.message_id });
  } catch (error) {
    logger.error('Failed to handle inbound callback', error instanceof Error ? error : new Error(String(error)), {
      message_id: callback.message_id
    });
    throw error;
  }
}

async function handleAttendanceResponse(callback: InboundCallback): Promise<void> {
  logger.info('Handling attendance response', { message_id: callback.message_id });

  const client = getSupabaseAdmin();

  try {
    const { data: updated } = await client
      .from('attendance_confirmations')
      .upsert({
        message_id: callback.message_id,
        status: 'ATTENDED',
        confirmed_at: callback.timestamp
      }, {
        onConflict: 'message_id'
      })
      .select('student_id, session_date')
      .limit(1)
      .single();

    if (updated?.student_id && updated?.session_date) {
      await syncToAtbAttendance(client, updated.student_id, String(updated.session_date).slice(0, 10), 'present');
    }
    logger.info('Attendance recorded', { message_id: callback.message_id });
  } catch (error) {
    logger.error('Failed to record attendance', error instanceof Error ? error : new Error(String(error)), {
      message_id: callback.message_id
    });
    throw error;
  }
}

async function handleAbsenceResponse(callback: InboundCallback): Promise<void> {
  logger.info('Handling absence response', { message_id: callback.message_id });

  const client = getSupabaseAdmin();

  try {
    const { data: updated } = await client
      .from('attendance_confirmations')
      .upsert({
        message_id: callback.message_id,
        status: 'ABSENT',
        confirmed_at: callback.timestamp
      }, {
        onConflict: 'message_id'
      })
      .select('student_id, session_date')
      .limit(1)
      .single();

    if (updated?.student_id && updated?.session_date) {
      await syncToAtbAttendance(client, updated.student_id, String(updated.session_date).slice(0, 10), 'absent');
    }
    logger.info('Absence recorded', { message_id: callback.message_id });
  } catch (error) {
    logger.error('Failed to record absence', error instanceof Error ? error : new Error(String(error)), {
      message_id: callback.message_id
    });
    throw error;
  }
}

/**
 * P1: pre-attendance 토큰 기반 응답 처리 (GET /api/kakao/callback?token=xxx&action=attend|absent)
 */
export async function handleTokenAttendanceResponse(token: string, action: 'attend' | 'absent'): Promise<{ student_id?: string; session_date?: string } | null> {
  const client = getSupabaseAdmin();
  const status = action === 'attend' ? 'ATTENDED' : 'ABSENT';

  const { data: row } = await client
    .from('attendance_confirmations')
    .select('id, student_id, session_date')
    .eq('response_token', token)
    .maybeSingle();

  if (!row?.student_id || !row?.session_date) {
    logger.warn('Token attendance: no confirmation found', { token });
    return null;
  }

  const { error } = await client
    .from('attendance_confirmations')
    .update({ status, confirmed_at: new Date().toISOString() })
    .eq('id', row.id);

  if (error) {
    logger.error('Token attendance update failed', { token, error: String(error) });
    return null;
  }

  const sessionDate = String(row.session_date).slice(0, 10);
  await syncToAtbAttendance(client, row.student_id, sessionDate, action === 'attend' ? 'present' : 'absent');
  logger.info('Token attendance synced', { student_id: row.student_id, action });
  return { student_id: row.student_id, session_date: sessionDate };
}

async function handleConsentResponse(callback: InboundCallback): Promise<void> {
  logger.info('Handling consent response', { message_id: callback.message_id });

  const client = getSupabaseAdmin();

  try {
    // Lookup tenant_id and recipient from original outbox message
    const { data: outboxMsg } = await client
      .from('message_outbox')
      .select('tenant_id, recipient_id')
      .eq('id', callback.message_id)
      .limit(1);

    const org_id = outboxMsg?.[0]?.tenant_id || null;
    const parent_id = outboxMsg?.[0]?.recipient_id || callback.user_phone || null;

    // Deactivate existing active consent of same type before inserting
    if (org_id && parent_id) {
      await client
        .from('consent_records')
        .update({ is_active: false })
        .eq('org_id', org_id)
        .eq('parent_id', parent_id)
        .eq('consent_type', 'SERVICE_TERMS')
        .eq('is_active', true);
    }

    const { error } = await client
      .from('consent_records')
      .insert({
        org_id,
        parent_id,
        student_id: null,
        consent_type: 'SERVICE_TERMS',
        consent_version: '1.0',
        consented_at: callback.timestamp,
        channel: 'KAKAO',
        is_active: true
      });

    if (error) throw error;
    logger.info('Consent recorded', { message_id: callback.message_id, org_id });
  } catch (error) {
    logger.error('Failed to record consent', error instanceof Error ? error : new Error(String(error)), {
      message_id: callback.message_id
    });
    throw error;
  }
}

async function handleSignatureResponse(callback: InboundCallback): Promise<void> {
  logger.info('Handling signature response', { message_id: callback.message_id });

  const client = getSupabaseAdmin();

  try {
    // Lookup tenant_id and recipient from original outbox message
    const { data: outboxMsg } = await client
      .from('message_outbox')
      .select('tenant_id, recipient_id')
      .eq('id', callback.message_id)
      .limit(1);

    const org_id = outboxMsg?.[0]?.tenant_id || null;
    const parent_id = outboxMsg?.[0]?.recipient_id || callback.user_phone || null;

    const { error } = await client
      .from('consent_records')
      .insert({
        org_id,
        parent_id,
        student_id: null,
        consent_type: 'SIGNATURE',
        consent_version: '1.0',
        consented_at: callback.timestamp,
        channel: 'KAKAO',
        is_active: true
      });

    if (error) throw error;
    logger.info('Signature recorded', { message_id: callback.message_id, org_id });
  } catch (error) {
    logger.error('Failed to record signature', error instanceof Error ? error : new Error(String(error)), {
      message_id: callback.message_id
    });
    throw error;
  }
}
