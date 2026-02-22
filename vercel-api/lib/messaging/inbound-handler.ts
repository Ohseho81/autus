import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { InboundCallback, InboundResponseType } from './types';

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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
    const { error } = await client
      .from('attendance_confirmations')
      .upsert({
        message_id: callback.message_id,
        status: 'ATTENDED',
        confirmed_at: callback.timestamp
      }, {
        onConflict: 'message_id'
      });

    if (error) throw error;
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
    const { error } = await client
      .from('attendance_confirmations')
      .upsert({
        message_id: callback.message_id,
        status: 'ABSENT',
        confirmed_at: callback.timestamp
      }, {
        onConflict: 'message_id'
      });

    if (error) throw error;
    logger.info('Absence recorded', { message_id: callback.message_id });
  } catch (error) {
    logger.error('Failed to record absence', error instanceof Error ? error : new Error(String(error)), {
      message_id: callback.message_id
    });
    throw error;
  }
}

async function handleConsentResponse(callback: InboundCallback): Promise<void> {
  logger.info('Handling consent response', { message_id: callback.message_id });

  const client = getSupabaseAdmin();

  try {
    const { error } = await client
      .from('consent_records')
      .insert({
        org_id: null,
        parent_id: callback.user_phone || null,
        student_id: null,
        consent_type: 'SERVICE_TERMS',
        consent_version: '1.0',
        consented_at: callback.timestamp,
        channel: 'KAKAO',
        is_active: true
      });

    if (error) throw error;
    logger.info('Consent recorded', { message_id: callback.message_id });
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
    const { error } = await client
      .from('consent_records')
      .insert({
        org_id: null,
        parent_id: callback.user_phone || null,
        student_id: null,
        consent_type: 'SERVICE_TERMS',
        consent_version: '1.0',
        consented_at: callback.timestamp,
        channel: 'KAKAO',
        is_active: true
      });

    if (error) throw error;
    logger.info('Signature recorded', { message_id: callback.message_id });
  } catch (error) {
    logger.error('Failed to record signature', error instanceof Error ? error : new Error(String(error)), {
      message_id: callback.message_id
    });
    throw error;
  }
}
