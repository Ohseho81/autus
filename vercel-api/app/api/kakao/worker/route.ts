import { NextRequest, NextResponse } from 'next/server';
import { runOutboundWorker } from '@/lib/messaging';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/kakao/worker
 * Triggers the outbound message worker.
 * Called by Vercel Cron or manually with CRON_SECRET header.
 * Processes pending messages from message_outbox → Kakao Alimtalk API.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth: require CRON_SECRET for non-Vercel-cron calls
    const authHeader = request.headers.get('authorization');
    const cronHeader = request.headers.get('x-vercel-cron');

    if (!cronHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.warn('Unauthorized kakao worker call');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Kakao worker triggered');

    const startTime = Date.now();
    await runOutboundWorker();
    const elapsed = Date.now() - startTime;

    logger.info('Kakao worker completed', { elapsed_ms: elapsed });

    return NextResponse.json({
      success: true,
      message: 'Worker completed',
      elapsed_ms: elapsed,
    });
  } catch (error) {
    logger.error('Kakao worker failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kakao/worker
 * Also supports GET for Vercel Cron (cron jobs use GET by default)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
