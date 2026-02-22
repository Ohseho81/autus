import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyReports } from '@/lib/messaging';
import { logger } from '@/lib/logger';

interface MonthlyReportRequest {
  org_id: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as MonthlyReportRequest;

    logger.info('Monthly report generation requested', { org_id: body.org_id });

    await generateMonthlyReports(body.org_id);

    return NextResponse.json({ success: true, message: 'Monthly reports generated' });
  } catch (error) {
    logger.error('Failed to generate monthly reports', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
