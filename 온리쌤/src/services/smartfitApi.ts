/**
 * smartfitApi.ts
 * 스마트핏 REST API 연동 서비스
 *
 * API 명세 (ATB 시스템개발 20260202):
 * 1. 회원상태 조회 - 날짜 기준 전체 회원의 유효/만료/연기 상태
 * 2. 출석 조회 - 기간별 출석 데이터
 * 3. 수납/미수 조회 - 기간별 결제/미납 데이터
 */

import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 회원 상태 타입
 */
export type MemberStatus = 'VALID' | 'EXPIRED' | 'SUSPENDED';

/**
 * 회원 상태 응답
 */
export interface MemberStatusResponse {
  member_idx: string;
  member_name: string;
  status: MemberStatus;
  status_label: string;
  membership_type: string;
  start_date: string;
  end_date: string;
  remaining_days: number;
}

/**
 * 출석 기록 응답
 */
export interface AttendanceResponse {
  member_idx: string;
  member_name: string;
  lesson_name: string;
  membership_type: string;
  coach_name: string;
  attendance_datetime: string;
  attendance_date: string;
  attendance_time: string;
}

/**
 * 수납/미수 응답
 */
export interface PaymentResponse {
  member_idx: string;
  member_name: string;
  sale_item: string;
  payment_amount: number;
  outstanding_amount: number;
  sale_datetime: string;
  payment_status: 'PAID' | 'PARTIAL' | 'UNPAID';
}

/**
 * 동기화 결과
 */
export interface SyncResult {
  success: boolean;
  synced_count: number;
  error_count: number;
  errors?: string[];
  last_synced_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ 설정
// ═══════════════════════════════════════════════════════════════════════════════

const SMARTFIT_API_BASE = process.env.EXPO_PUBLIC_SMARTFIT_API_URL || '';
const SMARTFIT_API_KEY = process.env.EXPO_PUBLIC_SMARTFIT_API_KEY || '';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 API 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

const smartfitFetch = async <T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> => {
  const queryString = new URLSearchParams(params).toString();
  const url = `${SMARTFIT_API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SMARTFIT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error instanceof Error ? error.message : String(error) || `API 오류: ${response.status}`);
  }

  return response.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📡 스마트핏 API 호출
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 1. 회원상태 조회
 * - 입력: 날짜
 * - 전달: 날짜 기준 전체 회원의 유효/만료/연기 상태값
 * - 항목: 회원idx, 회원상태값
 */
export const getMemberStatus = async (
  date: string // YYYY-MM-DD
): Promise<MemberStatusResponse[]> => {
  const data = await smartfitFetch<any[]>('/api/members/status', { date });

  return data.map((item) => ({
    member_idx: item.member_idx || item.회원idx,
    member_name: item.member_name || item.회원명,
    status: mapStatus(item.status || item.상태),
    status_label: item.status_label || item.상태명,
    membership_type: item.membership_type || item.회원권,
    start_date: item.start_date || item.시작일,
    end_date: item.end_date || item.종료일,
    remaining_days: calculateRemainingDays(item.end_date || item.종료일),
  }));
};

/**
 * 2. 출석 조회
 * - 입력: 기간
 * - 전달: 출석 기간의 데이터
 * - 항목: 회원idx, 수업, 회원권, 강사명, 출석일시
 */
export const getAttendance = async (
  startDate: string,
  endDate: string
): Promise<AttendanceResponse[]> => {
  const data = await smartfitFetch<any[]>('/api/attendance', {
    start_date: startDate,
    end_date: endDate,
  });

  return data.map((item) => ({
    member_idx: item.member_idx || item.회원idx,
    member_name: item.member_name || item.회원명,
    lesson_name: item.lesson_name || item.수업,
    membership_type: item.membership_type || item.회원권,
    coach_name: item.coach_name || item.강사명,
    attendance_datetime: item.attendance_datetime || item.출석일시,
    attendance_date: extractDate(item.attendance_datetime || item.출석일시),
    attendance_time: extractTime(item.attendance_datetime || item.출석일시),
  }));
};

/**
 * 3. 수납/미수 조회
 * - 입력: 기간
 * - 전달: 기간에 등록된 판매건의 완납/미납 데이터
 * - 항목: 회원idx, 판매내역, 결제금액, 미수금액, 판매일시
 */
export const getPayments = async (
  startDate: string,
  endDate: string
): Promise<PaymentResponse[]> => {
  const data = await smartfitFetch<any[]>('/api/payments', {
    start_date: startDate,
    end_date: endDate,
  });

  return data.map((item) => ({
    member_idx: item.member_idx || item.회원idx,
    member_name: item.member_name || item.회원명,
    sale_item: item.sale_item || item.판매내역,
    payment_amount: Number(item.payment_amount || item.결제금액 || 0),
    outstanding_amount: Number(item.outstanding_amount || item.미수금액 || 0),
    sale_datetime: item.sale_datetime || item.판매일시,
    payment_status: getPaymentStatus(
      Number(item.payment_amount || item.결제금액 || 0),
      Number(item.outstanding_amount || item.미수금액 || 0)
    ),
  }));
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 데이터 동기화
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 회원 데이터 동기화
 */
export const syncMembers = async (date: string): Promise<SyncResult> => {
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    const members = await getMemberStatus(date);

    for (const member of members) {
      try {
        // Supabase에 upsert
        const { error } = await supabase
          .from('students')
          .upsert(
            {
              smartfit_idx: member.member_idx,
              name: member.member_name,
              membership_status: member.status,
              membership_type: member.membership_type,
              membership_start: member.start_date,
              membership_end: member.end_date,
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'smartfit_idx' }
          );

        if (error) throw error;
        syncedCount++;
      } catch (err: unknown) {
        errors.push(`${member.member_name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 동기화 로그 저장
    await saveSyncLog('members', syncedCount, errors.length);

    return {
      success: errors.length === 0,
      synced_count: syncedCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      last_synced_at: new Date().toISOString(),
    };
  } catch (error: unknown) {
    return {
      success: false,
      synced_count: 0,
      error_count: 1,
      errors: [error instanceof Error ? error.message : String(error)],
      last_synced_at: new Date().toISOString(),
    };
  }
};

/**
 * 출석 데이터 동기화
 */
export const syncAttendance = async (
  startDate: string,
  endDate: string
): Promise<SyncResult> => {
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    const attendance = await getAttendance(startDate, endDate);

    for (const record of attendance) {
      try {
        // 학생 찾기
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('smartfit_idx', record.member_idx)
          .single();

        if (!student) {
          errors.push(`회원 없음: ${record.member_name}`);
          continue;
        }

        // 출석 기록 upsert
        const { error } = await supabase
          .from('attendance_records')
          .upsert(
            {
              student_id: student.id,
              check_in_time: record.attendance_datetime,
              lesson_name: record.lesson_name,
              coach_name: record.coach_name,
              source: 'smartfit',
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'student_id,check_in_time' }
          );

        if (error) throw error;
        syncedCount++;
      } catch (err: unknown) {
        errors.push(`${record.member_name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await saveSyncLog('attendance', syncedCount, errors.length);

    return {
      success: errors.length === 0,
      synced_count: syncedCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      last_synced_at: new Date().toISOString(),
    };
  } catch (error: unknown) {
    return {
      success: false,
      synced_count: 0,
      error_count: 1,
      errors: [error instanceof Error ? error.message : String(error)],
      last_synced_at: new Date().toISOString(),
    };
  }
};

/**
 * 수납/미수 데이터 동기화
 */
export const syncPayments = async (
  startDate: string,
  endDate: string
): Promise<SyncResult> => {
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    const payments = await getPayments(startDate, endDate);

    for (const payment of payments) {
      try {
        // 학생 찾기
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('smartfit_idx', payment.member_idx)
          .single();

        if (!student) {
          errors.push(`회원 없음: ${payment.member_name}`);
          continue;
        }

        // 결제 기록 upsert
        const { error } = await supabase
          .from('student_payments')
          .upsert(
            {
              student_id: student.id,
              sale_item: payment.sale_item,
              amount: payment.payment_amount,
              outstanding: payment.outstanding_amount,
              status: payment.payment_status,
              sale_date: payment.sale_datetime,
              source: 'smartfit',
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'student_id,sale_date,sale_item' }
          );

        if (error) throw error;
        syncedCount++;
      } catch (err: unknown) {
        errors.push(`${payment.member_name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await saveSyncLog('payments', syncedCount, errors.length);

    return {
      success: errors.length === 0,
      synced_count: syncedCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      last_synced_at: new Date().toISOString(),
    };
  } catch (error: unknown) {
    return {
      success: false,
      synced_count: 0,
      error_count: 1,
      errors: [error instanceof Error ? error.message : String(error)],
      last_synced_at: new Date().toISOString(),
    };
  }
};

/**
 * 전체 동기화
 */
export const syncAll = async (): Promise<{
  members: SyncResult;
  attendance: SyncResult;
  payments: SyncResult;
}> => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [members, attendance, payments] = await Promise.all([
    syncMembers(today),
    syncAttendance(thirtyDaysAgo, today),
    syncPayments(thirtyDaysAgo, today),
  ]);

  return { members, attendance, payments };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🛠️ 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

const mapStatus = (status: string): MemberStatus => {
  const statusMap: Record<string, MemberStatus> = {
    '유효': 'VALID',
    '만료': 'EXPIRED',
    '연기': 'SUSPENDED',
    'valid': 'VALID',
    'expired': 'EXPIRED',
    'suspended': 'SUSPENDED',
  };
  return statusMap[status.toLowerCase()] || 'EXPIRED';
};

const calculateRemainingDays = (endDate: string): number => {
  const end = new Date(endDate);
  const today = new Date();
  const diff = end.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const extractDate = (datetime: string): string => {
  return datetime.split(' ')[0] || datetime.split('T')[0];
};

const extractTime = (datetime: string): string => {
  const timePart = datetime.split(' ')[1] || datetime.split('T')[1];
  return timePart?.substring(0, 5) || '';
};

const getPaymentStatus = (
  paid: number,
  outstanding: number
): 'PAID' | 'PARTIAL' | 'UNPAID' => {
  if (outstanding === 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
};

const saveSyncLog = async (
  type: string,
  syncedCount: number,
  errorCount: number
) => {
  await supabase.from('sync_logs').insert({
    sync_type: type,
    synced_count: syncedCount,
    error_count: errorCount,
    synced_at: new Date().toISOString(),
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 Export
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  getMemberStatus,
  getAttendance,
  getPayments,
  syncMembers,
  syncAttendance,
  syncPayments,
  syncAll,
};
