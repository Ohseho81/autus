import { NextRequest, NextResponse } from 'next/server';
import { handleInboundCallback, handleTokenAttendanceResponse } from '@/lib/messaging';
import { logger } from '@/lib/logger';

/** GET: pre-attendance [참석]/[결석] 웹링크 클릭 (token, action) */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  if (!token || !action || !['attend', 'absent'].includes(action)) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://autus-ai.com'}/attend?error=invalid`
    );
  }

  const result = await handleTokenAttendanceResponse(token, action as 'attend' | 'absent');
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://autus-ai.com';
  if (result) {
    return NextResponse.redirect(`${base}/attend?done=1&action=${action}`);
  }
  return NextResponse.redirect(`${base}/attend?error=notfound`);
}

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
