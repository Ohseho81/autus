import { NextRequest, NextResponse } from 'next/server';
import { enqueueMessage } from '@/lib/messaging';
import { logger } from '@/lib/logger';

interface SendMessageRequest {
  org_id: string;
  recipient_type: 'PARENT' | 'TEACHER' | 'DIRECTOR';
  recipient_id: string;
  phone: string;
  template_code: string;
  payload?: Record<string, unknown>;
  priority?: 'SAFETY' | 'HIGH' | 'NORMAL' | 'LOW';
}

function toEnqueuePriority(p?: string): 'SAFETY' | 'URGENT' | 'NORMAL' | 'LOW' {
  if (p === 'SAFETY') return 'SAFETY';
  if (p === 'HIGH') return 'URGENT';
  if (p === 'LOW') return 'LOW';
  return 'NORMAL';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as SendMessageRequest;

    if (!body.org_id || !body.recipient_id || !body.phone || !body.template_code) {
      return NextResponse.json(
        { success: false, error: 'org_id, recipient_id, phone, template_code are required' },
        { status: 400 }
      );
    }

    logger.info('Send message requested', {
      org_id: body.org_id,
      recipient_id: body.recipient_id,
      template_code: body.template_code,
    });

    const message_id = await enqueueMessage(
      body.org_id,
      body.recipient_type,
      body.recipient_id,
      body.phone,
      body.template_code,
      body.payload ?? {},
      toEnqueuePriority(body.priority)
    );

    return NextResponse.json({ success: true, message_id });
  } catch (error) {
    const msg = getErrorMessage(error);
    logger.error('Failed to send message', error instanceof Error ? error : new Error(msg));
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
