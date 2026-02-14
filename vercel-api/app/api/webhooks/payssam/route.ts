// =============================================================================
// AUTUS v1.0 - 결제선생 (Payssam) Payment Webhook
// Receives payment confirmation callbacks and updates invoice status.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { generateTraceId } from '../../../../lib/monitoring';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PaymentWebhookPayload {
  invoice_id: string;         // 결제선생 invoice ID (maps to payssam_invoice_id)
  status: 'paid' | 'failed' | 'refunded' | 'cancelled';
  paid_at: string;            // ISO 8601
  amount: number;
  payment_method?: string;    // card, transfer, etc.
  transaction_id?: string;    // 결제선생 transaction reference
  metadata?: Record<string, unknown>;
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

// -----------------------------------------------------------------------------
// Supabase client
// -----------------------------------------------------------------------------

function getSupabase() {
  return getSupabaseAdmin();
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function logTrace(params: IOOTraceParams): Promise<void> {
  try {
    const { error } = await getSupabase().from('ioo_trace').insert(params);
    if (error) {
      console.error('[PayssomWebhook] Failed to insert IOO trace:', error.message);
    }
  } catch (err) {
    console.error('[PayssomWebhook] IOO trace insert threw:', err);
  }
}

// -----------------------------------------------------------------------------
// Signature Verification
// -----------------------------------------------------------------------------

// TODO: Implement proper HMAC signature verification once 결제선생 API goes live.
// Expected flow:
//   1. Read raw body as buffer
//   2. Compute HMAC-SHA256 with PAYSSAM_WEBHOOK_SECRET
//   3. Compare with X-Payssam-Signature header
//   4. Reject if mismatch
//
// async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
//   const secret = process.env.PAYSSAM_WEBHOOK_SECRET;
//   if (!secret) return false;
//   const crypto = await import('crypto');
//   const expected = crypto
//     .createHmac('sha256', secret)
//     .update(rawBody)
//     .digest('hex');
//   return crypto.timingSafeEqual(
//     Buffer.from(expected, 'hex'),
//     Buffer.from(signature, 'hex'),
//   );
// }

function verifySignaturePlaceholder(
  _rawBody: string,
  signatureHeader: string | null,
): { valid: boolean; reason?: string } {
  const secret = process.env.PAYSSAM_WEBHOOK_SECRET;

  // If no secret configured, allow in development but warn
  if (!secret) {
    console.warn('[PayssomWebhook] PAYSSAM_WEBHOOK_SECRET not set -- skipping verification');
    return { valid: true, reason: 'no_secret_configured' };
  }

  // TODO: Replace with real HMAC verification above
  if (!signatureHeader) {
    return { valid: false, reason: 'missing_signature_header' };
  }

  // Placeholder: accept any non-empty signature when secret is configured
  // This will be replaced with cryptographic verification
  console.warn('[PayssomWebhook] Using placeholder signature check -- replace before production');
  return { valid: true, reason: 'placeholder_check' };
}

// -----------------------------------------------------------------------------
// POST Handler
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const traceId = generateTraceId('pay-wh');
  const startMs = Date.now();

  try {
    // --- Step 1: Read raw body and verify signature ---
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-payssam-signature');

    const sigCheck = verifySignaturePlaceholder(rawBody, signatureHeader);
    if (!sigCheck.valid) {
      await logTrace({
        trace_id: traceId,
        phase: 'INPUT',
        actor: 'payssam-webhook',
        action: 'verify_signature',
        result: 'failure',
        error_message: sigCheck.reason ?? 'invalid_signature',
      });

      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 },
      );
    }

    // --- Step 2: Parse payload ---
    let payload: PaymentWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as PaymentWebhookPayload;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    if (!payload.invoice_id || !payload.status) {
      return NextResponse.json(
        { error: 'Missing required fields: invoice_id, status' },
        { status: 400 },
      );
    }

    await logTrace({
      trace_id: traceId,
      phase: 'INPUT',
      actor: 'payssam-webhook',
      action: 'receive_payment_callback',
      payload: {
        invoice_id: payload.invoice_id,
        status: payload.status,
        amount: payload.amount,
      },
      result: 'pending',
    });

    const supabase = getSupabase();

    // --- Step 3: Find invoice by payssam_invoice_id ---
    const { data: invoice, error: findError } = await supabase
      .from('payment_invoices')
      .select('id, org_id, student_id, status, amount')
      .eq('payssam_invoice_id', payload.invoice_id)
      .single();

    if (findError || !invoice) {
      const errorMsg = findError?.message ?? 'Invoice not found';
      console.error('[PayssomWebhook] Invoice lookup failed:', errorMsg);

      await logTrace({
        trace_id: traceId,
        phase: 'OPERATION',
        actor: 'payssam-webhook',
        action: 'find_invoice',
        payload: { payssam_invoice_id: payload.invoice_id },
        result: 'failure',
        error_message: errorMsg,
      });

      return NextResponse.json(
        { error: 'Invoice not found', payssam_invoice_id: payload.invoice_id },
        { status: 404 },
      );
    }

    // --- Step 4: Update invoice status ---
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status: payload.status === 'paid' ? 'paid' : payload.status,
      callback_received_at: now,
      updated_at: now,
    };

    if (payload.status === 'paid') {
      updateData.paid_at = payload.paid_at ?? now;
      updateData.payment_method = payload.payment_method ?? null;
      updateData.transaction_id = payload.transaction_id ?? null;
    }

    const { error: updateError } = await supabase
      .from('payment_invoices')
      .update(updateData)
      .eq('id', invoice.id);

    if (updateError) {
      console.error('[PayssomWebhook] Invoice update failed:', updateError.message);

      await logTrace({
        trace_id: traceId,
        phase: 'OPERATION',
        actor: 'payssam-webhook',
        action: 'update_invoice',
        target_type: 'payment_invoices',
        target_id: invoice.id,
        result: 'failure',
        error_message: updateError.message,
      });

      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 },
      );
    }

    await logTrace({
      trace_id: traceId,
      phase: 'OPERATION',
      actor: 'payssam-webhook',
      action: 'update_invoice',
      target_type: 'payment_invoices',
      target_id: invoice.id,
      payload: {
        old_status: invoice.status,
        new_status: payload.status,
        amount: payload.amount,
      },
      result: 'success',
    });

    // --- Step 5: IOO OUTPUT trace ---
    const durationMs = Date.now() - startMs;

    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'payssam-webhook',
      action: 'payment_callback_processed',
      target_type: 'payment_invoices',
      target_id: invoice.id,
      payload: {
        payssam_invoice_id: payload.invoice_id,
        status: payload.status,
        org_id: invoice.org_id,
        student_id: invoice.student_id,
      },
      result: 'success',
      duration_ms: durationMs,
    });

    // --- Step 6: Resolve related risk_flags if payment confirmed ---
    if (payload.status === 'paid') {
      const { data: resolvedFlags, error: resolveError } = await supabase
        .from('risk_flags')
        .update({ status: 'resolved', resolved_at: now, updated_at: now })
        .eq('student_id', invoice.student_id)
        .eq('org_id', invoice.org_id)
        .eq('trigger_type', 'overdue_payment')
        .eq('status', 'open')
        .select('id');

      if (resolveError) {
        console.error('[PayssomWebhook] Failed to resolve risk flags:', resolveError.message);
      } else {
        const resolvedCount = resolvedFlags?.length ?? 0;
        if (resolvedCount > 0) {
          console.log(
            `[PayssomWebhook] Resolved ${resolvedCount} overdue_payment risk flag(s) ` +
            `for student ${invoice.student_id}`,
          );

          await logTrace({
            trace_id: traceId,
            phase: 'OPERATION',
            actor: 'payssam-webhook',
            action: 'resolve_risk_flags',
            target_type: 'risk_flags',
            payload: {
              resolved_count: resolvedCount,
              student_id: invoice.student_id,
              trigger_type: 'overdue_payment',
            },
            result: 'success',
          });
        }
      }
    }

    // --- Step 7: Return 200 ---
    console.log(
      `[PayssomWebhook] Processed callback for invoice ${payload.invoice_id} ` +
      `(status=${payload.status}) in ${durationMs}ms`,
    );

    return NextResponse.json(
      {
        ok: true,
        trace_id: traceId,
        invoice_id: invoice.id,
        status: payload.status,
        duration_ms: durationMs,
      },
      { status: 200 },
    );
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[PayssomWebhook] Unhandled error:', errorMessage);

    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'payssam-webhook',
      action: 'webhook_error',
      result: 'failure',
      error_message: errorMessage,
      duration_ms: durationMs,
    });

    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
