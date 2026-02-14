/**
 * AUTUS x 스마트핏 (SmartFit) ERP 연동 API
 * 
 * 지원 방식:
 * 1. CSV 파일 업로드 (POST with multipart/form-data)
 * 2. JSON 데이터 직접 전송 (POST with application/json)
 * 3. 구글드라이브 연동 (GET with folder_id)
 */

import { getSupabaseAdmin } from '../../../../lib/supabase';
import { captureError } from '../../../../lib/monitoring';

export const runtime = 'edge';

// Supabase 클라이언트

// 스마트핏 CSV 필드 매핑
interface SmartFitStudent {
  student_code: string;
  name: string;
  grade: string;
  class_name: string;
  parent_name: string;
  parent_phone: string;
  registered_at: string;
  monthly_fee: number;
  unpaid_amount: number;
  last_attendance: string;
  attendance_rate: number;
  memo: string;
}

// 위험도 계산 함수
function calculateRiskScore(student: SmartFitStudent): number {
  let risk = 0;
  
  // 1. 미납금 기준 (최대 150점)
  if (student.unpaid_amount >= 500000) risk += 150;
  else if (student.unpaid_amount >= 300000) risk += 100;
  else if (student.unpaid_amount >= 100000) risk += 50;
  else if (student.unpaid_amount > 0) risk += 20;
  
  // 2. 출석률 기준 (최대 150점)
  if (student.attendance_rate < 50) risk += 150;
  else if (student.attendance_rate < 70) risk += 100;
  else if (student.attendance_rate < 85) risk += 50;
  
  // 3. 최근 출석 기준 (최대 50점)
  const daysSinceLastAttendance = Math.floor(
    (Date.now() - new Date(student.last_attendance).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceLastAttendance > 7) risk += 50;
  else if (daysSinceLastAttendance > 3) risk += 25;
  
  // 4. 메모 키워드 분석 (최대 50점)
  const warningKeywords = ['퇴원', '고민', '불만', '연락', '어려움', '변경', '중단'];
  const memoLower = student.memo?.toLowerCase() || '';
  for (const keyword of warningKeywords) {
    if (memoLower.includes(keyword)) {
      risk += 25;
      break;
    }
  }
  
  return Math.min(300, risk);
}

// Risk Band 결정
function getRiskBand(score: number): string {
  if (score >= 200) return 'critical';
  if (score >= 150) return 'high';
  if (score >= 100) return 'medium';
  return 'low';
}

// CSV 파싱 함수
function parseCSV(csvText: string): SmartFitStudent[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  // 헤더 인덱스 찾기 (스마트핏 다양한 포맷 대응)
  const findIndex = (keywords: string[]) => {
    return headers.findIndex(h => 
      keywords.some(k => h.includes(k))
    );
  };
  
  const idx = {
    code: findIndex(['학생코드', '코드', 'ID', '번호']),
    name: findIndex(['학생명', '이름', '성명']),
    grade: findIndex(['학년', '학교']),
    className: findIndex(['반', '클래스', '과목']),
    parentName: findIndex(['학부모', '보호자', '부모']),
    parentPhone: findIndex(['연락처', '전화', '휴대폰', '핸드폰']),
    registeredAt: findIndex(['등록일', '입학일', '가입일']),
    fee: findIndex(['등록금', '수강료', '월납입']),
    unpaid: findIndex(['미납', '미수금', '연체']),
    lastAttendance: findIndex(['최근출석', '마지막출석', '출석일']),
    attendanceRate: findIndex(['출석률', '출석%']),
    memo: findIndex(['메모', '비고', '상담']),
  };
  
  const students: SmartFitStudent[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < 3) continue; // 빈 줄 스킵
    
    const student: SmartFitStudent = {
      student_code: values[idx.code] || `AUTO_${i}`,
      name: values[idx.name] || '',
      grade: values[idx.grade] || '',
      class_name: values[idx.className] || '',
      parent_name: values[idx.parentName] || '',
      parent_phone: values[idx.parentPhone] || '',
      registered_at: values[idx.registeredAt] || new Date().toISOString().split('T')[0],
      monthly_fee: parseInt(values[idx.fee]?.replace(/[^0-9]/g, '') || '0'),
      unpaid_amount: parseInt(values[idx.unpaid]?.replace(/[^0-9]/g, '') || '0'),
      last_attendance: values[idx.lastAttendance] || new Date().toISOString().split('T')[0],
      attendance_rate: parseFloat(values[idx.attendanceRate]?.replace('%', '') || '100'),
      memo: values[idx.memo] || '',
    };
    
    if (student.name) {
      students.push(student);
    }
  }
  
  return students;
}

// POST: CSV 업로드 또는 JSON 데이터 수신
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const url = new URL(req.url);
    const academyId = url.searchParams.get('academy_id') || 'demo-academy';
    
    let students: SmartFitStudent[] = [];
    
    // Content-Type에 따른 처리
    if (contentType.includes('multipart/form-data')) {
      // CSV 파일 업로드
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return Response.json({ success: false, error: 'CSV 파일이 필요합니다' }, { status: 400 });
      }
      
      const csvText = await file.text();
      students = parseCSV(csvText);
      
    } else if (contentType.includes('application/json')) {
      // JSON 직접 전송
      const body = await req.json();
      
      if (body.csv_text) {
        students = parseCSV(body.csv_text);
      } else if (body.students && Array.isArray(body.students)) {
        students = body.students;
      } else {
        return Response.json({ success: false, error: 'csv_text 또는 students 배열이 필요합니다' }, { status: 400 });
      }
      
    } else if (contentType.includes('text/csv')) {
      // Raw CSV 텍스트
      const csvText = await req.text();
      students = parseCSV(csvText);
      
    } else {
      return Response.json({ 
        success: false, 
        error: '지원하지 않는 Content-Type입니다. multipart/form-data, application/json, text/csv 중 하나를 사용하세요.' 
      }, { status: 400 });
    }
    
    if (students.length === 0) {
      return Response.json({ success: false, error: '파싱된 학생 데이터가 없습니다' }, { status: 400 });
    }
    
    // 데이터 변환 및 저장
    const results = {
      total: students.length,
      synced: 0,
      critical: 0,
      high: 0,
      errors: [] as string[],
    };
    
    for (const student of students) {
      try {
        const riskScore = calculateRiskScore(student);
        const riskBand = getRiskBand(riskScore);
        
        // Supabase에 저장
        const { error } = await getSupabaseAdmin().from('students').upsert({
          academy_id: academyId,
          external_id: student.student_code,
          name: student.name,
          grade: student.grade,
          class_name: student.class_name,
          parent_name: student.parent_name,
          parent_phone: student.parent_phone,
          registered_at: student.registered_at,
          monthly_fee: student.monthly_fee,
          unpaid_amount: student.unpaid_amount,
          last_attendance: student.last_attendance,
          attendance_rate: student.attendance_rate,
          memo: student.memo,
          risk_score: riskScore,
          risk_band: riskBand,
          erp_source: 'smartfit',
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'academy_id,external_id',
        });
        
        if (error) {
          results.errors.push(`${student.name}: ${error.message}`);
        } else {
          results.synced++;
          if (riskBand === 'critical') results.critical++;
          else if (riskBand === 'high') results.high++;
        }
        
      } catch (err) {
        results.errors.push(`${student.name}: ${err}`);
      }
    }
    
    // 동기화 로그 저장
    await getSupabaseAdmin().from('sync_logs').insert({
      academy_id: academyId,
      erp_source: 'smartfit',
      total_records: results.total,
      synced_records: results.synced,
      critical_count: results.critical,
      high_count: results.high,
      errors: results.errors.length > 0 ? results.errors : null,
      synced_at: new Date().toISOString(),
    });
    
    return Response.json({
      success: true,
      message: `스마트핏 데이터 동기화 완료`,
      data: {
        total: results.total,
        synced: results.synced,
        critical_students: results.critical,
        high_risk_students: results.high,
        errors: results.errors.length,
      },
      alerts: results.critical > 0 ? [
        `⚠️ 위험 학생 ${results.critical}명 감지됨! AUTUS 대시보드를 확인하세요.`
      ] : [],
    });
    
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'smartfit.handler' });
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '데이터 처리 중 오류 발생' 
    }, { status: 500 });
  }
}

// GET: 동기화 상태 확인
export async function GET(req: Request) {
  const url = new URL(req.url);
  const academyId = url.searchParams.get('academy_id') || 'demo-academy';
  
  // 최근 동기화 로그 조회
  const { data: logs, error: logsError } = await getSupabaseAdmin()
    .from('sync_logs')
    .select('*')
    .eq('academy_id', academyId)
    .eq('erp_source', 'smartfit')
    .order('synced_at', { ascending: false })
    .limit(5);
  
  // 현재 학생 통계
  const { data: students, error: studentsError } = await getSupabaseAdmin()
    .from('students')
    .select('risk_band')
    .eq('academy_id', academyId)
    .eq('erp_source', 'smartfit');
  
  const stats = {
    total: students?.length || 0,
    critical: students?.filter(s => s.risk_band === 'critical').length || 0,
    high: students?.filter(s => s.risk_band === 'high').length || 0,
    medium: students?.filter(s => s.risk_band === 'medium').length || 0,
    low: students?.filter(s => s.risk_band === 'low').length || 0,
  };
  
  return Response.json({
    success: true,
    academy_id: academyId,
    erp_source: 'smartfit',
    current_stats: stats,
    recent_syncs: logs || [],
    instructions: {
      upload_csv: 'POST /api/erp/smartfit?academy_id=YOUR_ID with CSV file',
      upload_json: 'POST /api/erp/smartfit?academy_id=YOUR_ID with { "csv_text": "..." }',
      check_status: 'GET /api/erp/smartfit?academy_id=YOUR_ID',
    },
  });
}
