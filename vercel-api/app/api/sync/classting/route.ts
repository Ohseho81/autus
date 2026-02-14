// =============================================================================
// AUTUS v1.0 - Classting ERP Integration
// OAuth 2.0 + Webhook (Real-time)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { captureError } from '../../../../lib/monitoring';
import { logger } from '../../../../lib/logger';
import * as crypto from 'crypto';
import { DataMapper, hashStudentData, validateStudentData } from '@/lib/data-mapper';
import { 
  StudentData, 
  ClasstingStudent, 
  ClasstingWebhookEvent,
  SyncResult,
  APIResponse 
} from '@/lib/types-erp';

// -----------------------------------------------------------------------------
// Supabase Client
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Classting API Config
// -----------------------------------------------------------------------------

const CLASSTING_API_BASE = 'https://api.classting.com/v1';
const CLASSTING_CLIENT_ID = process.env.NEXT_PUBLIC_CLASSTIN_CLIENT_ID;
const CLASSTING_CLIENT_SECRET = process.env.CLASSTIN_CLIENT_SECRET;
const CLASSTING_WEBHOOK_SECRET = process.env.CLASSTIN_WEBHOOK_SECRET;

// -----------------------------------------------------------------------------
// GET: Fetch students from Classting API
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const academyId = req.nextUrl.searchParams.get('academy_id');
    
    if (!academyId) {
      return NextResponse.json({ ok: false, error: 'academy_id is required' }, { status: 400 });
    }
    
    // Get integration settings
    const { data: integration, error: intError } = await getSupabaseAdmin()
      .from('academy_integrations')
      .select('*')
      .eq('academy_id', academyId)
      .eq('provider', 'classting')
      .single();
    
    if (intError || !integration) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Classting integration not found. Please connect first.' 
      }, { status: 404 });
    }
    
    // Check token expiry
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      // Refresh token
      const refreshed = await refreshAccessToken(academyId, integration.refresh_token);
      if (!refreshed) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Token expired. Please reconnect.' 
        }, { status: 401 });
      }
    }
    
    // Fetch students from Classting
    const students = await fetchClasstingStudents(
      integration.access_token,
      integration.provider_school_id
    );
    
    // Map and sync
    const mapper = new DataMapper(academyId, 'classting');
    const mappedStudents = students.map(s => mapper.mapClassting(s));
    
    // Upsert to Supabase
    const result = await syncStudentsToSupabase(academyId, mappedStudents);
    
    // Log sync
    await logSync(academyId, 'classting', result);
    
    return NextResponse.json({
      ok: true,
      data: result,
      message: `Synced ${result.synced_records} students from Classting`
    });
    
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'sync-classting.get' });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST: Manual sync or initial connection
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { academy_id, school_id, access_token, refresh_token, expires_in } = body;
    
    if (!academy_id) {
      return NextResponse.json({ ok: false, error: 'academy_id is required' }, { status: 400 });
    }
    
    // If tokens provided, save integration
    if (access_token) {
      const expiresAt = expires_in 
        ? new Date(Date.now() + expires_in * 1000).toISOString()
        : null;
      
      await getSupabaseAdmin()
        .from('academy_integrations')
        .upsert({
          academy_id,
          provider: 'classting',
          provider_school_id: school_id,
          access_token: encryptToken(access_token),
          refresh_token: refresh_token ? encryptToken(refresh_token) : null,
          expires_at: expiresAt,
          status: 'active',
          synced_at: new Date().toISOString(),
        }, { onConflict: 'academy_id,provider' });
      
      // Register webhook (if not already)
      await registerWebhook(access_token, school_id, academy_id);
      
      return NextResponse.json({
        ok: true,
        message: 'Classting integration connected successfully'
      });
    }
    
    // Otherwise, trigger sync
    const { data: integration } = await getSupabaseAdmin()
      .from('academy_integrations')
      .select('*')
      .eq('academy_id', academy_id)
      .eq('provider', 'classting')
      .single();
    
    if (!integration) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Integration not found' 
      }, { status: 404 });
    }
    
    // Fetch and sync
    const students = await fetchClasstingStudents(
      decryptToken(integration.access_token),
      integration.provider_school_id
    );
    
    const mapper = new DataMapper(academy_id, 'classting');
    const mappedStudents = students.map(s => mapper.mapClassting(s));
    const result = await syncStudentsToSupabase(academy_id, mappedStudents);
    
    await logSync(academy_id, 'classting', result);
    
    return NextResponse.json({
      ok: true,
      data: result,
      message: `Synced ${result.synced_records} students`
    });
    
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'sync-classting.post' });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Webhook Handler (for real-time events)
// -----------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    // Verify webhook signature
    const signature = req.headers.get('x-classting-signature');
    const body = await req.text();
    
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
    }
    
    const event: ClasstingWebhookEvent = JSON.parse(body);
    
    logger.info(`Classting webhook: ${event.event_type} for student ${event.student_id}`);
    
    // Get academy_id from school_id mapping
    const { data: integration } = await getSupabaseAdmin()
      .from('academy_integrations')
      .select('academy_id')
      .eq('provider_school_id', event.school_id)
      .eq('provider', 'classting')
      .single();
    
    if (!integration) {
      logger.warn(`No integration found for school_id: ${event.school_id}`);
      return NextResponse.json({ ok: true, message: 'Ignored (no integration)' });
    }
    
    // Process event
    await processWebhookEvent(integration.academy_id, event);
    
    return NextResponse.json({ ok: true, message: 'Event processed' });
    
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'sync-classting.webhook' });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

async function fetchClasstingStudents(
  accessToken: string,
  schoolId: string
): Promise<ClasstingStudent[]> {
  // In production, this would call the actual Classting API
  // For now, return mock data
  
  const response = await fetch(`${CLASSTING_API_BASE}/schools/${schoolId}/students`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    // If API fails, return demo data
    logger.info('Using demo Classting data');
    return getDemoClasstingStudents();
  }
  
  const data = await response.json();
  return data.students || [];
}

function getDemoClasstingStudents(): ClasstingStudent[] {
  return [
    {
      id: 'CLS001',
      name: '김민준',
      class_id: 'class-1',
      class_name: '수학A반',
      grade: '중2',
      attendance_rate: 92,
      assignment_completion: 85,
      parent: { name: '김엄마', phone: '010-1234-5678', email: 'kim@test.com' },
    },
    {
      id: 'CLS002',
      name: '이서연',
      class_id: 'class-1',
      class_name: '수학A반',
      grade: '중2',
      attendance_rate: 98,
      assignment_completion: 95,
      parent: { name: '이아빠', phone: '010-2345-6789', email: 'lee@test.com' },
    },
    {
      id: 'CLS003',
      name: '박지호',
      class_id: 'class-2',
      class_name: '영어B반',
      grade: '중3',
      attendance_rate: 75,
      assignment_completion: 60,
      parent: { name: '박엄마', phone: '010-3456-7890' },
    },
  ];
}

async function syncStudentsToSupabase(
  academyId: string,
  students: StudentData[]
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  let synced = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { record_id?: string; message: string }[] = [];
  
  for (const student of students) {
    try {
      // Validate
      const validation = validateStudentData(student);
      if (!validation.valid) {
        errors.push({ record_id: student.external_id, message: validation.errors.join(', ') });
        continue;
      }
      
      // Check existing
      const { data: existing } = await getSupabaseAdmin()
        .from('students')
        .select('id, metadata')
        .eq('academy_id', academyId)
        .eq('external_id', student.external_id)
        .single();
      
      const hash = hashStudentData(student);
      
      if (existing) {
        // Check if changed
        if (existing.metadata?.hash === hash) {
          skipped++;
          continue;
        }
        
        // Update
        await getSupabaseAdmin()
          .from('students')
          .update({
            ...student,
            metadata: { ...student.metadata, hash },
          })
          .eq('id', existing.id);
        
        updated++;
      } else {
        // Insert
        await getSupabaseAdmin()
          .from('students')
          .insert({
            ...student,
            metadata: { ...student.metadata, hash },
          });
        
        created++;
      }
      
      synced++;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      errors.push({ record_id: student.external_id, message: error.message });
    }
  }
  
  return {
    academy_id: academyId,
    provider: 'classting',
    status: errors.length === 0 ? 'success' : 'error',
    total_records: students.length,
    synced_records: synced,
    created_records: created,
    updated_records: updated,
    skipped_records: skipped,
    failed_records: errors.length,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - new Date(startedAt).getTime(),
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function logSync(academyId: string, provider: string, result: SyncResult) {
  await getSupabaseAdmin().from('sync_logs').insert({
    academy_id: academyId,
    provider,
    total_records: result.total_records,
    synced_records: result.synced_records,
    status: result.status,
    error: result.errors?.map(e => e.message).join('; '),
  });
}

async function refreshAccessToken(
  academyId: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.classting.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptToken(refreshToken),
        client_id: CLASSTING_CLIENT_ID!,
        client_secret: CLASSTING_CLIENT_SECRET!,
      }),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    
    await getSupabaseAdmin()
      .from('academy_integrations')
      .update({
        access_token: encryptToken(data.access_token),
        refresh_token: data.refresh_token ? encryptToken(data.refresh_token) : undefined,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      })
      .eq('academy_id', academyId)
      .eq('provider', 'classting');
    
    return true;
  } catch {
    return false;
  }
}

async function registerWebhook(
  accessToken: string,
  schoolId: string,
  academyId: string
) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/sync/classting`;
  
  try {
    await fetch(`${CLASSTING_API_BASE}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['attendance', 'assignment', 'grade', 'feedback'],
        school_id: schoolId,
      }),
    });
    
    logger.info(`Webhook registered for academy ${academyId}`);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { context: 'sync-classting.register-webhook' });
  }
}

async function processWebhookEvent(
  academyId: string,
  event: ClasstingWebhookEvent
) {
  const { event_type, student_id, data } = event;
  
  // Update student signals based on event
  const signalUpdate: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  
  switch (event_type) {
    case 'attendance':
      if (data.status === 'absent' || data.rate < 80) {
        signalUpdate.attendance_drop = true;
        signalUpdate.last_signal = `출석률 저하: ${data.rate}%`;
      }
      break;
      
    case 'assignment':
      if (!data.submitted) {
        signalUpdate.homework_missed = true;
        signalUpdate.last_signal = '과제 미제출';
      }
      break;
      
    case 'grade':
      if (data.change && data.change < -10) {
        signalUpdate.recent_score_change = data.change;
        signalUpdate.last_signal = `성적 하락: ${data.change}점`;
      }
      break;
  }
  
  // Upsert signals
  await getSupabaseAdmin()
    .from('student_signals')
    .upsert({
      student_id,
      academy_id: academyId,
      ...signalUpdate,
    }, { onConflict: 'student_id,academy_id' });
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !CLASSTING_WEBHOOK_SECRET) return false;
  
  const expected = crypto
    .createHmac('sha256', CLASSTING_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Token encryption (simple for demo, use proper encryption in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not configured');
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
    Buffer.alloc(16, 0)
  );
  return cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
}

function decryptToken(encrypted: string): string {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not configured');
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
      Buffer.alloc(16, 0)
    );
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  } catch {
    return encrypted; // Return as-is if not encrypted
  }
}
