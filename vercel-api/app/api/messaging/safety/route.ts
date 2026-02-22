import { NextRequest, NextResponse } from 'next/server';
import { runSafetyChain } from '@/lib/messaging';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.info('Safety chain triggered');

  try {
    await runSafetyChain();
    return NextResponse.json({ success: true, message: 'Safety chain completed' });
  } catch (error) {
    logger.error('Safety chain failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
