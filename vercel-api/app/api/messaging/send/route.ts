import { NextRequest, NextResponse } from 'next/server';
import { enqueueMessage } from '@/lib/messaging';
import { logger } from '@/lib/logger';

interface SendMessageRequest {
  org_id: string;
  recipient_type: 'PARENT' | 'TEACHER' | 'DIRECTOR';
  recipient_id: string;
  phone: string;
  template_code: string;
  payload: Record<string, unknown>;
  priority?: 'SAFETY' | 'HIGH' | 'NORMAL' | 'LOW';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as SendMessageRequest;

    logger.info('Send message requested', {
      org_id: body.org_id,
      recipient_id: body.recipient_id,
      template_code: body.template_code
    });

    const message_id = await enqueueMessage(
      body.org_id,
      body.recipient_type,
      body.recipient_id,
      body.phone,
      body.template_code,
      body.payload,
      body.priority || 'NORMAL'
    );

    return NextResponse.json({ success: true, message_id });
  } catch (error) {
    logger.error('Failed to send message', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
