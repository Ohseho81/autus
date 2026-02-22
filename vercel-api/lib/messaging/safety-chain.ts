import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { SafetyLevel, TriggerType } from './types';
import { enqueueMessage } from './outbound-worker';

const SAFETY_THRESHOLDS = {
  LEVEL_1: 5 * 60 * 1000, // 5 minutes
  LEVEL_2: 10 * 60 * 1000, // 10 minutes
  LEVEL_3: 30 * 60 * 1000, // 30 minutes
};

export async function runSafetyChain(): Promise<void> {
  logger.info('Starting safety chain');

  const client = getSupabaseAdmin();

  try {
    // Find ATTEND confirmations with no actual attendance
    const { data: ghostAbsences, error } = await client
      .from('attendance_confirmations')
      .select('message_id, confirmed_at')
      .eq('status', 'ATTENDED')
      .gte('confirmed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // For each confirmation, get the associated message_outbox data
    for (const record of ghostAbsences || []) {
      const confirmTime = new Date(record.confirmed_at as string).getTime();
      const elapsedMs = Date.now() - confirmTime;
      const messageId = record.message_id as string;

      // Get message details
      const { data: msgData, error: msgError } = await client
        .from('message_outbox')
        .select('org_id, recipient_id, phone')
        .eq('id', messageId)
        .single();

      if (msgError || !msgData) {
        logger.warn('Could not find message for confirmation', { messageId });
        continue;
      }

      let level: SafetyLevel | null = null;

      if (elapsedMs >= SAFETY_THRESHOLDS.LEVEL_3) {
        level = 'LEVEL_3';
      } else if (elapsedMs >= SAFETY_THRESHOLDS.LEVEL_2) {
        level = 'LEVEL_2';
      } else if (elapsedMs >= SAFETY_THRESHOLDS.LEVEL_1) {
        level = 'LEVEL_1';
      }

      if (level) {
        await handleSafetyLevel(
          msgData.org_id as string,
          msgData.recipient_id as string,
          msgData.phone as string,
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
            'HIGH'
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
