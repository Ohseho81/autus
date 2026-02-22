import { NextRequest, NextResponse } from 'next/server';
import { grantConsent, revokeConsent, checkConsent } from '@/lib/messaging';
import { logger } from '@/lib/logger';

interface ConsentRequest {
  org_id: string;
  parent_id: string;
  consent_type: 'SERVICE_TERMS' | 'PRIVACY' | 'MARKETING' | 'CHANNEL_ADD';
  consent_version?: string;
  channel?: string;
  student_id?: string;
  action: 'GRANT' | 'REVOKE' | 'CHECK';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get('org_id');
    const parent_id = searchParams.get('parent_id');
    const consent_type = searchParams.get('consent_type') as ConsentRequest['consent_type'];

    if (!org_id || !parent_id || !consent_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    logger.info('Checking consent', { org_id, parent_id, consent_type });

    const consent = await checkConsent(org_id, parent_id, consent_type);

    return NextResponse.json({ success: true, consent });
  } catch (error) {
    logger.error('Failed to check consent', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as ConsentRequest;

    if (!body.org_id || !body.parent_id || !body.consent_type || !body.action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    logger.info('Consent action requested', {
      org_id: body.org_id,
      parent_id: body.parent_id,
      consent_type: body.consent_type,
      action: body.action
    });

    if (body.action === 'GRANT') {
      const consent_id = await grantConsent(
        body.org_id,
        body.parent_id,
        body.consent_type,
        body.consent_version || '1.0',
        body.channel || 'API',
        body.student_id
      );
      return NextResponse.json({ success: true, consent_id });
    } else if (body.action === 'REVOKE') {
      await revokeConsent(body.org_id, body.parent_id, body.consent_type);
      return NextResponse.json({ success: true, message: 'Consent revoked' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Failed to process consent action', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
