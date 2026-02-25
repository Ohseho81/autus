import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { SafetyLevel, TriggerType } from './types';
import { enqueueMessage } from './outbound-worker';

const SAFETY_THRESHOLDS = {
  LEVEL_1: 5 * 60 * 1000, // 5 minutes
  LEVEL_2: 10 * 60 * 1000, // 10 minutes
  LEVEL_3: 30 * 60 * 1000, // 30 minutes
};

async function checkActualAttendance(
  client: SupabaseClient,
  studentId: string,
  dateStr: string
): Promise<boolean> {
  const presentStatuses = ['present', 'ATTENDED', 'attended', '출석'];

  const checkStatus = (rows: unknown[]): boolean => {
    if (!rows?.length) return false;
    const status = (rows[0] as Record<string, unknown>).status as string;
    return presentStatuses.includes(String(status));
  };

  try {
    const atbByDate = await client
      .from('atb_attendance')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('date', dateStr)
      .limit(1);
    if (atbByDate.data?.length && checkStatus(atbByDate.data)) return true;

    const atbByAttDate = await client
      .from('atb_attendance')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('attendance_date', dateStr)
      .limit(1);
    if (atbByAttDate.data?.length && checkStatus(atbByAttDate.data)) return true;
  } catch {
    /* atb_attendance may not exist */
  }

  try {
    const { data: rec } = await client
      .from('attendance_records')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('date', dateStr)
      .limit(1);
    if (rec?.length && checkStatus(rec)) return true;
  } catch {
    /* attendance_records may not exist */
  }

  try {
    const { data: alt } = await client
      .from('attendance')
      .select('id, status')
      .eq('student_id', studentId)
      .gte('attended_at', `${dateStr}T00:00:00`)
      .lt('attended_at', `${dateStr}T23:59:59`)
      .limit(1);
    if (alt?.length && checkStatus(alt)) return true;
  } catch {
    /* attendance may not exist */
  }

  return false;
}

export async function runSafetyChain(): Promise<void> {
  logger.info('Starting safety chain');

  const client = getSupabaseAdmin();

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: attendedConfirmations, error } = await client
      .from('attendance_confirmations')
      .select('message_id, confirmed_at, student_id, session_date')
      .eq('status', 'ATTENDED')
      .gte('confirmed_at', oneHourAgo);

    if (error) throw error;

    const ghostAbsences: Array<{
      message_id: string;
      confirmed_at: string;
      student_id?: string;
      session_date?: string;
    }> = [];

    for (const record of attendedConfirmations || []) {
      const studentId = record.student_id as string | undefined;
      const sessionDate = record.session_date as string | undefined;
      const confirmedAt = record.confirmed_at as string;

      let resolvedStudentId = studentId;
      let resolvedDate = sessionDate || confirmedAt.slice(0, 10);

      if (!resolvedStudentId) {
        const { data: msgData } = await client
          .from('message_outbox')
          .select('recipient_id, variables')
          .eq('id', record.message_id)
          .single();
        if (msgData?.recipient_id) resolvedStudentId = msgData.recipient_id as string;
        if (msgData?.variables && typeof msgData.variables === 'object') {
          const vars = msgData.variables as Record<string, unknown>;
          if (vars.student_id) resolvedStudentId = String(vars.student_id);
        }
      }

      if (!resolvedStudentId) {
        logger.warn('Cannot resolve student_id for confirmation', { message_id: record.message_id });
        continue;
      }

      const hasAttendance = await checkActualAttendance(client, resolvedStudentId, resolvedDate);
      if (hasAttendance) {
        logger.debug('Student attended, skipping safety', { student_id: resolvedStudentId, date: resolvedDate });
        continue;
      }

      ghostAbsences.push({
        message_id: record.message_id as string,
        confirmed_at: confirmedAt,
        student_id: resolvedStudentId,
        session_date: resolvedDate,
      });
    }

    for (const record of ghostAbsences) {
      const confirmTime = new Date(record.confirmed_at).getTime();
      const elapsedMs = Date.now() - confirmTime;
      const messageId = record.message_id;

      const { data: msgData, error: msgError } = await client
        .from('message_outbox')
        .select('tenant_id, recipient_id, recipient_phone')
        .eq('id', messageId)
        .maybeSingle();

      const msg = msgData;
      if (msgError || !msg) {
        logger.warn('Could not find message for confirmation', { messageId });
        continue;
      }

      let level: SafetyLevel | null = null;
      if (elapsedMs >= SAFETY_THRESHOLDS.LEVEL_3) level = 'LEVEL_3';
      else if (elapsedMs >= SAFETY_THRESHOLDS.LEVEL_2) level = 'LEVEL_2';
      else if (elapsedMs >= SAFETY_THRESHOLDS.LEVEL_1) level = 'LEVEL_1';

      if (level) {
        await handleSafetyLevel(
          msg.tenant_id as string,
          (record.student_id || msg.recipient_id) as string,
          msg.recipient_phone as string,
          messageId,
          level
        );
      }
    }

    logger.info('Safety chain completed', { processed: ghostAbsences?.length || 0 });
  } catch (error) {
    logger.error('Safety chain error', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function handleSafetyLevel(
  org_id: string,
  recipient_id: string,
  phone: string,
  message_id: string,
  level: SafetyLevel
): Promise<void> {
  logger.info('Processing safety level', { level, message_id, recipient_id });

  const client = getSupabaseAdmin();

  try {
    switch (level) {
      case 'LEVEL_1':
        // 5 min: Enqueue SAFETY priority Kakao message
        await enqueueMessage(
          org_id,
          'PARENT',
          recipient_id,
          phone,
          'ATTENDANCE_REMINDER',
          { student_id: recipient_id },
          'SAFETY'
        );
        logger.info('Level 1 safety action: Enqueued SAFETY priority message', { message_id });
        break;

      case 'LEVEL_2':
        // 10 min: Log phone call needed
        const { error: alertError } = await client
          .from('safety_alerts')
          .insert({
            org_id,
            student_id: recipient_id,
            level,
            trigger_type: 'STAGNATION_4W' as TriggerType,
            metadata: JSON.stringify({ action: 'PHONE_CALL_NEEDED' }),
            created_at: new Date().toISOString()
          });

        if (alertError) throw alertError;
        logger.info('Level 2 safety action: Logged phone call needed', { message_id });
        break;

      case 'LEVEL_3':
        // 30 min: Insert trigger_log + director alert
        const { error: triggerError } = await client
          .from('trigger_log')
          .insert({
            org_id,
            student_id: recipient_id,
            trigger_type: 'STAGNATION_4W' as TriggerType,
            severity: 'CRITICAL',
            metadata: JSON.stringify({ ghost_absence: true }),
            created_at: new Date().toISOString()
          });

        if (triggerError) throw triggerError;

        const { data: directors, error: directorError } = await client
          .from('users')
          .select('id, phone')
          .eq('org_id', org_id)
          .eq('role', 'DIRECTOR');

        if (directorError) throw directorError;

        for (const director of directors || []) {
          await enqueueMessage(
            org_id,
            'DIRECTOR',
            director.id as string,
            director.phone as string,
            'GHOST_ABSENCE_ALERT',
            { student_id: recipient_id, original_message_id: message_id },
            'URGENT'
          );
        }

        logger.info('Level 3 safety action: Triggered director alert', { message_id, director_count: directors?.length || 0 });
        break;
    }
  } catch (error) {
    logger.error('Failed to handle safety level', error instanceof Error ? error : new Error(String(error)), {
      level,
      message_id,
      recipient_id
    });
    throw error;
  }
}
