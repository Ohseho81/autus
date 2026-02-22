import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { MessageOutbox, MessageStatus } from './types';

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RATE_LIMIT = 10; // per second
const BACKOFF_BASE_MS = 1000;

export async function runOutboundWorker(): Promise<void> {
  logger.info('Starting outbound worker');
  
  try {
    while (true) {
      const client = getSupabaseAdmin();
      const { data: messages, error: fetchError } = await client
        .from('message_outbox')
        .select('*')
        .in('status', ['PENDING', 'FAILED'])
        .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE);

      if (fetchError) {
        throw fetchError;
      }

      if (!messages || messages.length === 0) {
        logger.info('No messages to process, exiting worker');
        break;
      }

      for (const message of messages as MessageOutbox[]) {
        const startTime = Date.now();
        try {
          await sendKakaoMessage(message);
          
          const { error: updateError } = await client
            .from('message_outbox')
            .update({ status: 'SENT', sent_at: new Date().toISOString(), retry_count: message.retry_count })
            .eq('id', message.id);

          if (updateError) throw updateError;

          const { error: logError } = await client
            .from('message_log')
            .insert({
              message_id: message.id,
              event_type: 'DELIVERED',
              timestamp: new Date().toISOString(),
              metadata: JSON.stringify({ org_id: message.org_id })
            });

          if (logError) throw logError;

          logger.info('Message sent successfully', { message_id: message.id, org_id: message.org_id });
        } catch (error) {
          const nextRetryCount = message.retry_count + 1;
          const backoffMs = BACKOFF_BASE_MS * Math.pow(2, message.retry_count);
          const nextRetryAt = new Date(Date.now() + backoffMs);

          if (nextRetryCount >= MAX_RETRIES) {
            const { error: deadLetterError } = await client
              .from('message_outbox')
              .update({ status: 'DEAD_LETTER', last_error: String(error), retry_count: nextRetryCount })
              .eq('id', message.id);

            if (deadLetterError) logger.error('Failed to update dead letter status', deadLetterError);
            logger.error('Message failed max retries', error instanceof Error ? error : new Error(String(error)), {
              message_id: message.id,
              retry_count: nextRetryCount
            });
          } else {
            const { error: retryError } = await client
              .from('message_outbox')
              .update({ 
                status: 'FAILED', 
                last_error: String(error), 
                retry_count: nextRetryCount, 
                next_retry_at: nextRetryAt.toISOString() 
              })
              .eq('id', message.id);

            if (retryError) logger.error('Failed to update retry status', retryError);
            logger.warn('Message send failed, scheduled retry', {
              message_id: message.id,
              retry_count: nextRetryCount,
              next_retry_at: nextRetryAt.toISOString()
            });
          }
        }

        const elapsed = Date.now() - startTime;
        const rateLimitDelay = Math.max(0, (1000 / RATE_LIMIT) - elapsed);
        if (rateLimitDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        }
      }
    }
  } catch (error) {
    logger.error('Outbound worker error', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function enqueueMessage(
  org_id: string,
  recipient_type: 'PARENT' | 'TEACHER' | 'DIRECTOR',
  recipient_id: string,
  phone: string,
  template_code: string,
  payload: Record<string, unknown>,
  priority: 'SAFETY' | 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL'
): Promise<string> {
  const idempotency_key = `${org_id}:${recipient_id}:${template_code}:${Date.now()}`;

  try {
    const client = getSupabaseAdmin();
    
    const { data: existing } = await client
      .from('message_outbox')
      .select('id')
      .eq('idempotency_key', idempotency_key);

    if (existing && existing.length > 0) {
      logger.info('Message already queued', { idempotency_key, existing_id: existing[0].id });
      return existing[0].id;
    }

    const { data: result, error } = await client
      .from('message_outbox')
      .insert({
        org_id,
        recipient_type,
        recipient_id,
        phone,
        template_code,
        payload_json: payload,
        idempotency_key,
        status: 'PENDING',
        priority,
        retry_count: 0,
        created_at: new Date().toISOString()
      })
      .select('id');

    if (error) throw error;
    if (!result || result.length === 0) throw new Error('No result returned');

    const message_id = result[0].id;
    logger.info('Message enqueued', { message_id, org_id, recipient_id, template_code, priority });
    return message_id;
  } catch (error) {
    logger.error('Failed to enqueue message', error instanceof Error ? error : new Error(String(error)), {
      org_id,
      recipient_id,
      template_code
    });
    throw error;
  }
}

async function sendKakaoMessage(message: MessageOutbox): Promise<void> {
  // Placeholder for Kakao API integration
  logger.info('Sending Kakao message', {
    message_id: message.id,
    phone: message.phone,
    template_code: message.template_code
  });

  // TODO: Integrate with Kakao API
  // Example: await kakaoClient.sendAlimtalk(message.phone, message.template_code, message.payload_json);
  
  // Simulate a successful send
  return Promise.resolve();
}
