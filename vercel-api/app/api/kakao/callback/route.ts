import { NextRequest, NextResponse } from 'next/server';
import { handleInboundCallback } from '@/lib/messaging';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    logger.info('Kakao callback received', {
      message_id: body.message_id,
      response_type: body.response_type
    });

    await handleInboundCallback({
      message_id: body.message_id,
      response_type: body.response_type,
      button_key: body.button_key,
      user_phone: body.user_phone,
      timestamp: body.timestamp || new Date().toISOString(),
      raw_payload: body
    });

    return NextResponse.json({ success: true, message: 'Callback processed' });
  } catch (error) {
    logger.error('Failed to process Kakao callback', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
