import { NextRequest, NextResponse } from 'next/server';
import { runOutboundWorker } from '@/lib/messaging';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.info('Messaging worker triggered');

  try {
    await runOutboundWorker();
    return NextResponse.json({ success: true, message: 'Worker completed' });
  } catch (error) {
    logger.error('Worker failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
