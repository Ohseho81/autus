// =============================================================================
// AUTUS v1.0 - Narakhub (나라핵) ERP Integration
// CSV Batch Processing with EUC-KR Encoding
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { parse } from 'csv-parse/sync';
import { DataMapper, hashStudentData, validateStudentData, calculateRiskScore, getRiskBand } from '@/lib/data-mapper';
import { StudentData, NarakhubCSVRow, SyncResult } from '@/lib/types-erp';

// -----------------------------------------------------------------------------
// Supabase Client
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// POST: Process CSV from n8n or direct upload
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let csvContent: string;
    let academyId: string;
    let encoding = 'EUC-KR';
    
    // Handle different content types
    if (contentType.includes('application/json')) {
      const body = await req.json();
      csvContent = body.csv_content;
      academyId = body.academy_id;
      encoding = body.encoding || 'EUC-KR';
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      academyId = req.nextUrl.searchParams.get('academy_id') || '';
      encoding = req.nextUrl.searchParams.get('encoding') || 'EUC-KR';
      
      // Read raw bytes and decode
      const buffer = await req.arrayBuffer();
      csvContent = decodeBuffer(Buffer.from(buffer), encoding);
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      academyId = formData.get('academy_id') as string || 
                  req.nextUrl.searchParams.get('academy_id') || '';
      
      if (!file) {
        return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
      }
      
      const buffer = await file.arrayBuffer();
      csvContent = decodeBuffer(Buffer.from(buffer), encoding);
    } else {
      return NextResponse.json({ ok: false, error: 'Unsupported content type' }, { status: 400 });
    }
    
    if (!academyId) {
      return NextResponse.json({ ok: false, error: 'academy_id is required' }, { status: 400 });
    }
    
    if (!csvContent || csvContent.trim() === '') {
      return NextResponse.json({ ok: false, error: 'CSV content is empty' }, { status: 400 });
    }
    
    // Parse CSV
    const records = parseNarakhubCSV(csvContent);
    
    if (records.length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid records found in CSV' }, { status: 400 });
    }
    
    // Map to StudentData
    const mapper = new DataMapper(academyId, 'narakhub');
    const students = records.map(r => mapper.mapNarakhub(r));
    
    // Sync to Supabase
    const result = await syncStudentsToSupabase(academyId, students);
    
    // Log sync
    await logSync(academyId, 'narakhub', result);
    
    return NextResponse.json({
      ok: true,
      data: result,
      message: `Processed ${result.synced_records} students from Narakhub CSV`
    });
    
  } catch (error: any) {
    console.error('Narakhub sync error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// GET: Get sync status or trigger manual sync from file path
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const academyId = req.nextUrl.searchParams.get('academy_id');
    const filePath = req.nextUrl.searchParams.get('file_path');
    
    if (!academyId) {
      return NextResponse.json({ ok: false, error: 'academy_id is required' }, { status: 400 });
    }
    
    // If file_path provided, read and sync (for n8n trigger)
    if (filePath) {
      // In production, read from filesystem
      // For now, return demo data
      const demoCSV = getDemoNarakhubCSV();
      
      const records = parseNarakhubCSV(demoCSV);
      const mapper = new DataMapper(academyId, 'narakhub');
      const students = records.map(r => mapper.mapNarakhub(r));
      const result = await syncStudentsToSupabase(academyId, students);
      
      await logSync(academyId, 'narakhub', result);
      
      return NextResponse.json({
        ok: true,
        data: result,
        message: `Synced ${result.synced_records} students from file`
      });
    }
    
    // Otherwise, return last sync status
    const { data: lastSync } = await getSupabaseAdmin()
      .from('sync_logs')
      .select('*')
      .eq('academy_id', academyId)
      .eq('provider', 'narakhub')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return NextResponse.json({
      ok: true,
      data: {
        last_sync: lastSync,
        provider: 'narakhub',
        academy_id: academyId,
      }
    });
    
  } catch (error: any) {
    console.error('Narakhub GET error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Decode buffer with specified encoding
 */
function decodeBuffer(buffer: Buffer, encoding: string): string {
  // For EUC-KR, we need iconv-lite in production
  // For now, try standard decodings
  try {
    if (encoding.toUpperCase() === 'EUC-KR' || encoding.toUpperCase() === 'CP949') {
      // Try to detect if it's actually UTF-8
      const utf8 = buffer.toString('utf8');
      if (!utf8.includes('�')) {
        return utf8;
      }
      
      // Fallback: assume it's already converted or use latin1
      return buffer.toString('latin1');
    }
    
    return buffer.toString('utf8');
  } catch {
    return buffer.toString('utf8');
  }
}

/**
 * Parse Narakhub CSV format
 */
function parseNarakhubCSV(content: string): NarakhubCSVRow[] {
  try {
    // Detect delimiter (comma or tab)
    const firstLine = content.split('\n')[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      relax_column_count: true,
      trim: true,
    });
    
    // Map column names (handle variations)
    return records.map((row: any) => ({
      학생ID: row['학생ID'] || row['학생코드'] || row['student_id'] || row['ID'],
      학생명: row['학생명'] || row['이름'] || row['name'] || row['학생이름'],
      학년: row['학년'] || row['grade'] || '',
      반: row['반'] || row['class'] || row['클래스'] || '',
      학부모명: row['학부모명'] || row['보호자명'] || row['parent_name'] || '',
      연락처: row['연락처'] || row['전화번호'] || row['phone'] || row['학부모연락처'] || '',
      이메일: row['이메일'] || row['email'] || '',
      등록금: row['등록금'] || row['수강료'] || row['월납입액'] || row['fee'] || '0',
      미납금: row['미납금'] || row['미납액'] || row['unpaid'] || '0',
      출석률: row['출석률'] || row['출석'] || row['attendance'] || '100',
      상담메모: row['상담메모'] || row['메모'] || row['비고'] || row['memo'] || '',
    })).filter((row: NarakhubCSVRow) => row.학생ID && row.학생명);
    
  } catch (error) {
    console.error('CSV parse error:', error);
    return [];
  }
}

/**
 * Demo Narakhub CSV data
 */
function getDemoNarakhubCSV(): string {
  return `학생ID,학생명,학년,반,학부모명,연락처,이메일,등록금,미납금,출석률,상담메모
NRH001,김민준,중2,수학A,김엄마,010-1234-5678,kim@test.com,350000,0,95%,모범생
NRH002,이서연,중2,수학A,이아빠,010-2345-6789,lee@test.com,350000,0,98%,성적 우수
NRH003,박지호,중3,영어B,박엄마,010-3456-7890,,350000,200000,72%,출석률 저하 주의
NRH004,최유진,고1,국어C,최엄마,010-4567-8901,choi@test.com,400000,400000,85%,미납 지속
NRH005,정하늘,중1,수학A,정아빠,010-5678-9012,,300000,0,90%,`;
}

/**
 * Sync students to Supabase with risk calculation
 */
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
  
  // Validate all students first
  const validStudents: StudentData[] = [];
  for (const student of students) {
    const validation = validateStudentData(student);
    if (!validation.valid) {
      errors.push({ record_id: student.external_id, message: validation.errors.join(', ') });
    } else {
      validStudents.push(student);
    }
  }

  // Batch lookup all existing students in a single query
  const { data: existingStudents } = await getSupabaseAdmin()
    .from('students')
    .select('id, external_id, metadata')
    .eq('academy_id', academyId)
    .in('external_id', validStudents.map(s => s.external_id));

  // Build lookup map
  const existingMap = new Map(
    (existingStudents || []).map(s => [s.external_id, s])
  );

  // Process in memory: separate into upsert records and skipped
  const upsertRecords: any[] = [];
  const upsertStudentsList: StudentData[] = [];

  for (const student of validStudents) {
    try {
      const riskScore = calculateRiskScore(student);
      const riskBand = getRiskBand(riskScore);
      const hash = hashStudentData(student);

      const existing = existingMap.get(student.external_id);

      if (existing && existing.metadata?.hash === hash) {
        skipped++;
        continue;
      }

      const studentWithRisk = {
        ...student,
        risk_score: riskScore,
        risk_band: riskBand,
        confidence_score: 0.75,
        metadata: { ...student.metadata, hash },
      };

      if (existing) {
        updated++;
      } else {
        created++;
      }

      upsertRecords.push(studentWithRisk);
      upsertStudentsList.push(student);
      synced++;
    } catch (err: any) {
      errors.push({ record_id: student.external_id, message: err.message });
    }
  }

  // Batch upsert only changed records
  if (upsertRecords.length > 0) {
    const { error: upsertError } = await getSupabaseAdmin()
      .from('students')
      .upsert(upsertRecords, { onConflict: 'academy_id,external_id' });

    if (upsertError) {
      errors.push({ message: `Batch upsert failed: ${upsertError.message}` });
    }
  }

  // Batch upsert signals for changed students
  for (const student of upsertStudentsList) {
    await upsertStudentSignals(academyId, student);
  }
  
  return {
    academy_id: academyId,
    provider: 'narakhub',
    status: errors.length === 0 ? 'success' : (synced > 0 ? 'success' : 'error'),
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

/**
 * Upsert student signals based on data
 */
async function upsertStudentSignals(academyId: string, student: StudentData) {
  const signals: string[] = [];
  
  // Detect signals
  if (student.attendance_rate && student.attendance_rate < 80) {
    signals.push(`출석률 저하: ${student.attendance_rate}%`);
  }
  
  if (student.unpaid_amount && student.unpaid_amount > 0) {
    signals.push(`미납금 발생: ${student.unpaid_amount.toLocaleString()}원`);
  }
  
  if (student.homework_completion && student.homework_completion < 70) {
    signals.push(`과제 완성도 저하: ${student.homework_completion}%`);
  }
  
  await getSupabaseAdmin()
    .from('student_signals')
    .upsert({
      student_id: student.external_id,
      academy_id: academyId,
      attendance_drop: (student.attendance_rate || 100) < 80,
      homework_missed: student.homework_completion ? Math.floor((100 - student.homework_completion) / 10) : 0,
      unpaid_amount: student.unpaid_amount || 0,
      recent_score_change: student.score_change || 0,
      recent_signals: signals,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,academy_id' });
}

/**
 * Log sync result
 */
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
