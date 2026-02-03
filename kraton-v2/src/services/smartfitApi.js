/**
 * 🔄 SmartFit API 연동 서비스
 *
 * 기존 시스템(스마트핏) 데이터 동기화
 * - 회원 상태 조회
 * - 출석 기록 조회
 * - 수납 내역 조회
 *
 * API 명세: ATB 시스템개발 20260202.pdf 기반
 */

import { supabase, isSupabaseConnected } from '../pages/allthatbasket/lib/supabase.js';

const SMARTFIT_API_URL = import.meta.env.VITE_SMARTFIT_API_URL || '';
const SMARTFIT_API_KEY = import.meta.env.VITE_SMARTFIT_API_KEY || '';
const SMARTFIT_CENTER_ID = import.meta.env.VITE_SMARTFIT_CENTER_ID || '';

// ============================================
// API 클라이언트
// ============================================
async function smartfitFetch(endpoint, options = {}) {
  if (!SMARTFIT_API_URL) {
    console.log('[SmartFit] API URL not configured - using demo data');
    return { success: false, error: 'API not configured', demo: true };
  }

  const url = `${SMARTFIT_API_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${SMARTFIT_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Center-ID': SMARTFIT_CENTER_ID,
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`SmartFit API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[SmartFit] API Error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// 회원 동기화
// ============================================
export const smartfitAPI = {
  // 헬스 체크
  async health() {
    if (!SMARTFIT_API_URL) {
      return { status: 'offline', configured: false };
    }

    try {
      const result = await smartfitFetch('/health');
      return { status: 'online', configured: true, ...result };
    } catch (e) {
      return { status: 'error', configured: true, error: e.message };
    }
  },

  // 회원 목록 조회
  async getMembers() {
    const result = await smartfitFetch('/api/members');

    if (result.demo) {
      // 데모 데이터 (실제 분석 데이터 기반 107명)
      return {
        success: true,
        data: [
          { idx: 1, name: '김민준', grade: '초3', school: '대현초', status: 'active', phone: '010-1234-5678' },
          { idx: 2, name: '이서연', grade: '초4', school: '대곡초', status: 'active', phone: '010-2345-6789' },
          { idx: 3, name: '박지호', grade: '초5', school: '대치초', status: 'active', phone: '010-3456-7890' },
          // ... 107명 중 샘플
        ],
        total: 107,
        synced: false,
      };
    }

    return result;
  },

  // 출석 기록 조회
  async getAttendance(startDate, endDate) {
    const result = await smartfitFetch(`/api/attendance?start=${startDate}&end=${endDate}`);

    if (result.demo) {
      return {
        success: true,
        data: [],
        total: 0,
        synced: false,
      };
    }

    return result;
  },

  // 수납 내역 조회
  async getPayments(month) {
    const result = await smartfitFetch(`/api/payments?month=${month}`);

    if (result.demo) {
      return {
        success: true,
        data: [],
        total: 0,
        synced: false,
      };
    }

    return result;
  },
};

// ============================================
// 동기화 작업
// ============================================
export const syncService = {
  // 회원 동기화
  async syncMembers() {
    const { data: members, error } = await smartfitAPI.getMembers();

    if (error) return { success: false, error };

    if (!isSupabaseConnected()) {
      return { success: true, synced: members.length, demo: true };
    }

    let synced = 0;
    let errors = [];

    for (const member of members) {
      try {
        const { error: upsertError } = await supabase
          .from('atb_students')
          .upsert({
            smartfit_idx: member.idx,
            name: member.name,
            grade: member.grade,
            school: member.school,
            enrollment_status: member.status === 'active' ? 'active' : 'inactive',
            parent_phone: member.phone,
          }, { onConflict: 'smartfit_idx' });

        if (upsertError) throw upsertError;
        synced++;
      } catch (e) {
        errors.push({ idx: member.idx, error: e.message });
      }
    }

    // 동기화 로그 저장
    if (isSupabaseConnected()) {
      await supabase.from('atb_sync_logs').insert({
        sync_type: 'members',
        records_synced: synced,
        errors: errors.length > 0 ? errors : null,
      });
    }

    return { success: true, synced, errors, total: members.length };
  },

  // 출석 동기화
  async syncAttendance(startDate, endDate) {
    const { data: attendance, error } = await smartfitAPI.getAttendance(startDate, endDate);

    if (error) return { success: false, error };

    if (!isSupabaseConnected()) {
      return { success: true, synced: 0, demo: true };
    }

    let synced = 0;

    for (const record of attendance) {
      try {
        await supabase.from('atb_attendance').upsert({
          student_id: record.student_id,
          attendance_date: record.date,
          check_in_time: record.check_in,
          check_out_time: record.check_out,
          status: record.status,
          source: 'smartfit',
        }, { onConflict: 'student_id,attendance_date' });
        synced++;
      } catch (e) {
        console.error('[Sync] Attendance error:', e);
      }
    }

    return { success: true, synced, total: attendance.length };
  },

  // 수납 동기화
  async syncPayments(month) {
    const { data: payments, error } = await smartfitAPI.getPayments(month);

    if (error) return { success: false, error };

    if (!isSupabaseConnected()) {
      return { success: true, synced: 0, demo: true };
    }

    let synced = 0;

    for (const payment of payments) {
      try {
        await supabase.from('atb_payments').upsert({
          student_id: payment.student_id,
          amount: payment.amount,
          payment_month: payment.month,
          status: payment.status,
          source: 'smartfit',
        }, { onConflict: 'student_id,payment_month' });
        synced++;
      } catch (e) {
        console.error('[Sync] Payment error:', e);
      }
    }

    return { success: true, synced, total: payments.length };
  },

  // 전체 동기화
  async syncAll() {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const results = {
      members: await this.syncMembers(),
      attendance: await this.syncAttendance(startDate, endDate),
      payments: await this.syncPayments(month),
      timestamp: new Date().toISOString(),
    };

    return results;
  },

  // 동기화 상태 조회
  async getStatus() {
    if (!isSupabaseConnected()) {
      return {
        lastSync: null,
        isConfigured: !!SMARTFIT_API_URL,
        status: SMARTFIT_API_URL ? 'ready' : 'not_configured',
      };
    }

    const { data: lastLog } = await supabase
      .from('atb_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      lastSync: lastLog?.created_at || null,
      lastSyncType: lastLog?.sync_type || null,
      lastSyncRecords: lastLog?.records_synced || 0,
      isConfigured: !!SMARTFIT_API_URL,
      status: lastLog ? 'synced' : 'never_synced',
    };
  },
};

export default smartfitAPI;
