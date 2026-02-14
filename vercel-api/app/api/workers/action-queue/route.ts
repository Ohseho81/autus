// =============================================================================
// AUTUS v1.0 - Action Queue Worker
// Cron-driven worker that processes the action_queue table every minute.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import {
  sendTelegramMessage,
  formatByTemplate,
  formatConsultation,
  formatEscalation,
} from '../../../../lib/telegram';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ActionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

interface ActionQueueRow {
  id: string;
  action_type: string;
  priority: number;
  status: ActionStatus;
  payload: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  last_error: string | null;
  expires_at: string | null;
  dedupe_key: string | null;
  trace_id: string;
  result: Record<string, unknown> | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ActionResult {
  sent: boolean;
  reason: string;
  channel?: string;
  message_id?: number;
  would_send_to?: string;
  template?: string;
  student_name?: string;
  encounter_title?: string;
  [key: string]: unknown;
}

interface IOOTraceParams {
  trace_id: string;
  phase: 'INPUT' | 'OPERATION' | 'OUTPUT';
  actor: string;
  action: string;
  target_type?: string;
  target_id?: string;
  payload?: Record<string, unknown>;
  result: 'pending' | 'success' | 'failure' | 'skipped';
  error_message?: string;
  duration_ms?: number;
}

interface ProcessingStats {
  processed: number;
  succeeded: number;
  failed: number;
  expired: number;
}

// -----------------------------------------------------------------------------
// Supabase client (lazy, service-role for full access)
// -----------------------------------------------------------------------------

function getSupabase() {
  return getSupabaseAdmin();
}

// -----------------------------------------------------------------------------
// IOO Trace Helper
// -----------------------------------------------------------------------------

async function logTrace(params: IOOTraceParams): Promise<void> {
  try {
    const { error } = await getSupabase().from('ioo_trace').insert(params);
    if (error) {
      console.error('[Worker] Failed to insert IOO trace:', error.message);
    }
  } catch (err) {
    console.error('[Worker] IOO trace insert threw:', err);
  }
}

// -----------------------------------------------------------------------------
// Action Processors
// -----------------------------------------------------------------------------

async function processMessage(action: ActionQueueRow): Promise<ActionResult> {
  const {
    phone,
    template,
    student_name,
    encounter_title,
  } = action.payload as Record<string, unknown>;

  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;

  // Graceful fallback: 토큰 또는 채팅 ID 미설정 시 기존 stub 동작 유지
  if (!process.env.TELEGRAM_BOT_TOKEN || !ownerChatId) {
    console.log(
      `[Worker] Telegram not configured — would send ${String(template ?? 'unknown_template')} ` +
      `to ${String(phone ?? 'unknown_phone')} ` +
      `for student ${String(student_name ?? 'unknown')}`,
    );
    return {
      sent: false,
      reason: 'telegram_not_configured',
      would_send_to: typeof phone === 'string' ? phone : undefined,
      template: typeof template === 'string' ? template : undefined,
      student_name: typeof student_name === 'string' ? student_name : undefined,
      encounter_title: typeof encounter_title === 'string' ? encounter_title : undefined,
    };
  }

  const text = formatByTemplate(
    typeof template === 'string' ? template : undefined,
    action.payload,
  );

  const result = await sendTelegramMessage(ownerChatId, text);

  return {
    sent: result.ok,
    reason: result.ok ? 'telegram_sent' : (result.error_description ?? 'telegram_error'),
    channel: 'telegram',
    message_id: result.message_id,
    template: typeof template === 'string' ? template : undefined,
    student_name: typeof student_name === 'string' ? student_name : undefined,
    encounter_title: typeof encounter_title === 'string' ? encounter_title : undefined,
  };
}

async function processConsultation(action: ActionQueueRow): Promise<ActionResult> {
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;

  if (!process.env.TELEGRAM_BOT_TOKEN || !ownerChatId) {
    return { sent: false, reason: 'telegram_not_configured' };
  }

  const text = formatConsultation(action.payload);
  const result = await sendTelegramMessage(ownerChatId, text);

  return {
    sent: result.ok,
    reason: result.ok ? 'telegram_sent' : (result.error_description ?? 'telegram_error'),
    channel: 'telegram',
    message_id: result.message_id,
  };
}

async function processEscalation(action: ActionQueueRow): Promise<ActionResult> {
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;

  if (!process.env.TELEGRAM_BOT_TOKEN || !ownerChatId) {
    return { sent: false, reason: 'telegram_not_configured' };
  }

  const text = formatEscalation(action.payload);
  const result = await sendTelegramMessage(ownerChatId, text);

  return {
    sent: result.ok,
    reason: result.ok ? 'telegram_sent' : (result.error_description ?? 'telegram_error'),
    channel: 'telegram',
    message_id: result.message_id,
  };
}

async function processAction(action: ActionQueueRow): Promise<ActionResult> {
  switch (action.action_type) {
    case 'SEND_MESSAGE':
      return processMessage(action);
    case 'SCHEDULE_CONSULTATION':
      return processConsultation(action);
    case 'ESCALATE_TO_OWNER':
      return processEscalation(action);
    default:
      throw new Error(`Unknown action type: ${action.action_type}`);
  }
}

// -----------------------------------------------------------------------------
// Retry Helpers
// -----------------------------------------------------------------------------

function computeNextRetryAt(retryCount: number): string {
  const backoffSeconds = Math.pow(2, retryCount);
  const nextRetry = new Date(Date.now() + backoffSeconds * 1000);
  return nextRetry.toISOString();
}

// -----------------------------------------------------------------------------
// Core Processing Pipeline
// -----------------------------------------------------------------------------

async function expireOldActions(): Promise<number> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('action_queue')
    .update({ status: 'EXPIRED' as ActionStatus, updated_at: now })
    .eq('status', 'PENDING')
    .lt('expires_at', now)
    .select('id');

  if (error) {
    console.error('[Worker] Failed to expire old actions:', error.message);
    return 0;
  }

  const expiredCount = data?.length ?? 0;
  if (expiredCount > 0) {
    console.log(`[Worker] Expired ${expiredCount} action(s)`);
  }
  return expiredCount;
}

async function fetchPendingActions(): Promise<ActionQueueRow[]> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('action_queue')
    .select('*')
    .eq('status', 'PENDING')
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[Worker] Failed to fetch pending actions:', error.message);
    return [];
  }

  return (data as ActionQueueRow[]) ?? [];
}

async function processActions(
  actions: ActionQueueRow[],
): Promise<{ succeeded: number; failed: number }> {
  const supabase = getSupabase();
  let succeeded = 0;
  let failed = 0;

  for (const action of actions) {
    const startMs = Date.now();

    // Mark as PROCESSING
    await supabase
      .from('action_queue')
      .update({
        status: 'PROCESSING' as ActionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', action.id);

    // Log IOO OPERATION trace
    await logTrace({
      trace_id: action.trace_id,
      phase: 'OPERATION',
      actor: 'action-queue-worker',
      action: action.action_type,
      target_type: 'action_queue',
      target_id: action.id,
      payload: action.payload,
      result: 'pending',
    });

    try {
      const result = await processAction(action);
      const durationMs = Date.now() - startMs;

      // Mark as COMPLETED
      await supabase
        .from('action_queue')
        .update({
          status: 'COMPLETED' as ActionStatus,
          result: result,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.id);

      // Log IOO OUTPUT trace (success)
      await logTrace({
        trace_id: action.trace_id,
        phase: 'OUTPUT',
        actor: 'action-queue-worker',
        action: action.action_type,
        target_type: 'action_queue',
        target_id: action.id,
        payload: result,
        result: 'success',
        duration_ms: durationMs,
      });

      succeeded++;
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const newRetryCount = action.retry_count + 1;

      if (newRetryCount >= action.max_retries) {
        // Exhausted retries -- mark as FAILED
        await supabase
          .from('action_queue')
          .update({
            status: 'FAILED' as ActionStatus,
            retry_count: newRetryCount,
            last_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', action.id);
      } else {
        // Retry with exponential backoff -- revert to PENDING
        await supabase
          .from('action_queue')
          .update({
            status: 'PENDING' as ActionStatus,
            retry_count: newRetryCount,
            next_retry_at: computeNextRetryAt(newRetryCount),
            last_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', action.id);
      }

      // Log IOO OUTPUT trace (failure)
      await logTrace({
        trace_id: action.trace_id,
        phase: 'OUTPUT',
        actor: 'action-queue-worker',
        action: action.action_type,
        target_type: 'action_queue',
        target_id: action.id,
        result: 'failure',
        error_message: errorMessage,
        duration_ms: durationMs,
      });

      failed++;
      console.error(
        `[Worker] Action ${action.id} (${action.action_type}) failed:`,
        errorMessage,
      );
    }
  }

  return { succeeded, failed };
}

// -----------------------------------------------------------------------------
// GET Handler (Vercel Cron entry point)
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const stats: ProcessingStats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    expired: 0,
  };

  try {
    // Step 1: Expire old actions
    stats.expired = await expireOldActions();

    // Step 2: Fetch pending actions
    const pendingActions = await fetchPendingActions();
    stats.processed = pendingActions.length;

    // Step 3: Process each action
    if (pendingActions.length > 0) {
      const { succeeded, failed } = await processActions(pendingActions);
      stats.succeeded = succeeded;
      stats.failed = failed;
    }

    console.log(
      `[Worker] Cycle complete: ${stats.processed} processed, ` +
      `${stats.succeeded} succeeded, ${stats.failed} failed, ` +
      `${stats.expired} expired`,
    );

    return NextResponse.json(stats, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Worker] Fatal error in action-queue worker:', errorMessage);

    return NextResponse.json(
      { error: errorMessage, ...stats },
      { status: 500 },
    );
  }
}
