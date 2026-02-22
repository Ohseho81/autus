/**
 * 🗄️ MoltBot Supabase Direct Queries
 *
 * activity_logs (Sovereign Ledger) 직접 쿼리 모듈.
 * Brain API 의존 없이 Supabase RPC + View 직접 호출.
 *
 * 대상 DB: activity_logs, student_v_index_summary, feature_usage_summary
 * RPC: get_completion_rate, get_churn_risk_students, get_parent_report
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// Supabase 클라이언트 (Service Role → RLS 우회)
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_ID = process.env.AUTUS_APP_ID || 'allthatbasket';

let supabase = null;

export function getClient() {
  if (!supabase && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

export function isAvailable() {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

// ============================================
// 1. 완료율 (SystemMode 판단)
// ============================================

export async function getCompletionRate(days = 7) {
  const sb = getClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .rpc('get_completion_rate', { p_app_id: APP_ID, p_days: days });

    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error('[SB] getCompletionRate error:', err.message);
    return null;
  }
}

// ============================================
// 2. 이탈 위험 학생
// ============================================

export async function getChurnRiskStudents(threshold = 10) {
  const sb = getClient();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .rpc('get_churn_risk_students', { p_app_id: APP_ID, p_threshold: threshold });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SB] getChurnRiskStudents error:', err.message);
    return [];
  }
}

// ============================================
// 3. 학부모 리포트 데이터
// ============================================

export async function getParentReport(studentId, days = 30) {
  const sb = getClient();
  if (!sb || !isValidUUID(studentId)) return null;

  try {
    const { data, error } = await sb
      .rpc('get_parent_report', { p_student_id: studentId, p_days: days });

    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error('[SB] getParentReport error:', err.message);
    return null;
  }
}

// ============================================
// 4. 기능별 사용량 (Sunset Rule)
// ============================================

export async function getFeatureUsage() {
  const sb = getClient();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('feature_usage_summary')
      .select('*')
      .eq('app_id', APP_ID)
      .order('uses_7d', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SB] getFeatureUsage error:', err.message);
    return [];
  }
}

// ============================================
// 5. 학생 V-Index 요약
// ============================================

export async function getStudentVIndex(studentId) {
  const sb = getClient();
  if (!sb || !isValidUUID(studentId)) return null;

  try {
    const { data, error } = await sb
      .from('student_v_index_summary')
      .select('*')
      .eq('student_id', studentId)
      .eq('app_id', APP_ID)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SB] getStudentVIndex error:', err.message);
    return null;
  }
}

// ============================================
// 6. 최근 활동 (타임라인)
// ============================================

export async function getRecentActivity(limit = 20) {
  const sb = getClient();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('activity_logs')
      .select('event_type, actor_role, student_id, raw_data, v_index_delta, occurred_at, source')
      .eq('app_id', APP_ID)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SB] getRecentActivity error:', err.message);
    return [];
  }
}

// ============================================
// 7. 오늘 이벤트 통계
// ============================================

export async function getTodayStats() {
  const sb = getClient();
  if (!sb) return null;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data, error } = await sb
      .from('activity_logs')
      .select('event_type')
      .eq('app_id', APP_ID)
      .gte('occurred_at', todayISO);

    if (error) throw error;

    const events = data || [];
    const stats = {
      total: events.length,
      check_ins: events.filter(e => e.event_type === 'attendance.check_in').length,
      check_outs: events.filter(e => e.event_type === 'attendance.check_out').length,
      absents: events.filter(e => e.event_type === 'attendance.absent_marked').length,
      sessions_started: events.filter(e => e.event_type === 'session.started').length,
      sessions_completed: events.filter(e => e.event_type === 'session.completed').length,
      payments: events.filter(e => e.event_type === 'payment.completed').length,
      skills: events.filter(e => e.event_type.startsWith('skill.')).length,
      ui_events: events.filter(e => e.event_type.startsWith('ui.')).length,
    };

    return stats;
  } catch (err) {
    console.error('[SB] getTodayStats error:', err.message);
    return null;
  }
}

// ============================================
// 8. V-Index 랭킹 (전체 학생)
// ============================================

export async function getVIndexRanking(limit = 10) {
  const sb = getClient();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('student_v_index_summary')
      .select('student_id, total_v_index, weekly_v_index, monthly_v_index, attendance_rate_30d, last_activity')
      .eq('app_id', APP_ID)
      .order('total_v_index', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SB] getVIndexRanking error:', err.message);
    return [];
  }
}

// ============================================
// 유틸리티
// ============================================

function escapeMarkdown(str) {
  return String(str || '').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ============================================
// Telegram 포맷터
// ============================================

export function formatCompletionRate(data) {
  if (!data) return '❌ 데이터 없음';

  const modeEmoji = {
    NORMAL: '🟢',
    STRICT: '🟡',
    DEGRADED: '🔴',
  }[data.mode_recommendation] || '⚪';

  return `📊 *세션 완료율 (${data.total_started > 0 ? '7일' : '-'})*

시작: ${data.total_started}건
완료: ${data.total_completed}건
완료율: *${data.completion_rate || 0}%*

${modeEmoji} 시스템 모드 권고: *${data.mode_recommendation}*`;
}

export function formatChurnRisk(students) {
  if (!students?.length) return '✅ 이탈 위험 학생 없음';

  const riskEmoji = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };

  const list = students.slice(0, 10).map((s, i) => {
    const emoji = riskEmoji[s.risk_level] || '⚪';
    const sid = escapeMarkdown(s.student_id?.slice(0, 8) || '?');
    return `${i + 1}. ${emoji} \`${sid}\`
   V\\-Index: ${s.monthly_v_index} | 비활성: ${s.days_inactive}일`;
  }).join('\n\n');

  return `⚠️ *이탈 위험 학생 (${students.length}명)*

${list}`;
}

export function formatTodayStats(stats) {
  if (!stats) return '❌ 오늘 통계 없음';

  return `📅 *오늘 현황*

총 이벤트: *${stats.total}*건

*출석*
✅ 체크인: ${stats.check_ins}
🚪 체크아웃: ${stats.check_outs}
❌ 결석: ${stats.absents}

*수업*
▶️ 시작: ${stats.sessions_started}
✅ 완료: ${stats.sessions_completed}

*기타*
💰 결제: ${stats.payments}
🎯 스킬: ${stats.skills}
📱 UI: ${stats.ui_events}`;
}

export function formatFeatureUsage(features) {
  if (!features?.length) return '❌ 기능 사용 데이터 없음';

  const list = features.slice(0, 15).map((f, i) => {
    const sunset = f.sunset_candidate ? '🌅' : '✅';
    const fKey = escapeMarkdown(f.feature_key || '?');
    return `${sunset} *${fKey}*
   7일: ${f.uses_7d} | 30일: ${f.uses_30d} | 유저: ${f.unique_users_7d}명`;
  }).join('\n\n');

  const sunsetCount = features.filter(f => f.sunset_candidate).length;

  return `📊 *기능별 사용량*
🌅 Sunset 후보: ${sunsetCount}개

${list}`;
}

export function formatVIndexRanking(rankings) {
  if (!rankings?.length) return '❌ V-Index 데이터 없음';

  const medals = ['🥇', '🥈', '🥉'];

  const list = rankings.slice(0, 10).map((r, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const sid = escapeMarkdown(r.student_id?.slice(0, 8) || '?');
    return `${medal} \`${sid}\`
   총합: ${r.total_v_index} | 주간: ${r.weekly_v_index || 0} | 출석: ${r.attendance_rate_30d || 0}%`;
  }).join('\n\n');

  return `🏆 *V-Index 랭킹*

${list}`;
}

export function formatParentReport(report) {
  if (!report) return '❌ 리포트 데이터 없음';

  return `👨‍👩‍👧 *학부모 리포트*

📊 *V-Index*
총합: ${report.total_v_index}
기간(30일): ${report.period_v_index}

📅 *출석률:* ${report.attendance_rate || 0}%

🎯 *스킬 향상:* ${report.skill_improvements?.length || 0}건
🏅 *배지 획득:* ${report.badges_earned || 0}개
💬 *코치 피드백:* ${report.coach_feedbacks || 0}건`;
}

export function formatRecentActivity(activities) {
  if (!activities?.length) return '❌ 최근 활동 없음';

  const typeEmoji = {
    'attendance.check_in': '✅',
    'attendance.check_out': '🚪',
    'attendance.absent_marked': '❌',
    'payment.completed': '💰',
    'payment.failed': '💳❌',
    'payment.overdue': '⏰',
    'session.started': '▶️',
    'session.completed': '🏁',
    'session.cancelled': '🚫',
    'skill.assessed': '📋',
    'skill.improved': '📈',
    'skill.badge_earned': '🏅',
    'coach.feedback_sent': '💬',
    'ui.page_view': '👁️',
    'ui.feature_used': '📱',
    'ui.menu_tap': '👆',
  };

  const list = activities.slice(0, 10).map(a => {
    const emoji = typeEmoji[a.event_type] || '📌';
    const time = new Date(a.occurred_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const delta = a.v_index_delta ? ` (V:${a.v_index_delta > 0 ? '+' : ''}${a.v_index_delta})` : '';
    return `${emoji} \`${time}\` ${a.event_type}${delta}`;
  }).join('\n');

  return `📜 *최근 활동*

${list}`;
}

// ============================================
// Telegram 명령어 셋업
// ============================================

export function setupDataCommands(bot) {
  // /data - 데이터 조회 명령어
  bot.onText(/\/data(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1]?.split(' ') || ['help'];
    const command = args[0];

    if (!isAvailable()) {
      bot.sendMessage(chatId, '❌ Supabase 미설정. `.env`에 `SUPABASE_URL`과 `SUPABASE_SERVICE_KEY`를 추가하세요.', { parse_mode: 'Markdown' });
      return;
    }

    let response = '';

    switch (command) {
      case 'today':
      case '오늘': {
        const stats = await getTodayStats();
        response = formatTodayStats(stats);
        break;
      }

      case 'completion':
      case '완료율': {
        const days = parseInt(args[1]) || 7;
        const data = await getCompletionRate(days);
        response = formatCompletionRate(data);
        break;
      }

      case 'risk':
      case '위험': {
        const limit = parseInt(args[1]) || 10;
        const students = await getChurnRiskStudents(limit);
        response = formatChurnRisk(students);
        break;
      }

      case 'vindex':
      case '랭킹': {
        const limit = parseInt(args[1]) || 10;
        const rankings = await getVIndexRanking(limit);
        response = formatVIndexRanking(rankings);
        break;
      }

      case 'features':
      case '기능': {
        const features = await getFeatureUsage();
        response = formatFeatureUsage(features);
        break;
      }

      case 'student':
      case '학생': {
        const studentId = args[1];
        if (!studentId) {
          response = '사용법: `/data student [학생UUID]`';
        } else {
          const vindex = await getStudentVIndex(studentId);
          if (vindex) {
            response = `👤 *학생 V-Index*

📊 총합: *${vindex.total_v_index}*
📅 주간: ${vindex.weekly_v_index || 0}
📆 월간: ${vindex.monthly_v_index || 0}
📈 총 이벤트: ${vindex.total_events}
✅ 출석률(30일): ${vindex.attendance_rate_30d || 0}%
🕐 최근활동: ${vindex.last_activity ? new Date(vindex.last_activity).toLocaleString('ko-KR') : '-'}`;
          } else {
            response = `❌ 학생을 찾을 수 없습니다: \`${studentId.slice(0, 8)}\``;
          }
        }
        break;
      }

      case 'report':
      case '리포트': {
        const studentId = args[1];
        const days = parseInt(args[2]) || 30;
        if (!studentId) {
          response = '사용법: `/data report [학생UUID] [일수]`';
        } else {
          const report = await getParentReport(studentId, days);
          response = formatParentReport(report);
        }
        break;
      }

      case 'recent':
      case '최근': {
        const limit = parseInt(args[1]) || 20;
        const activities = await getRecentActivity(limit);
        response = formatRecentActivity(activities);
        break;
      }

      default:
        response = `🗄️ *Sovereign Ledger 조회*

📅 /data today - 오늘 현황
📊 /data completion [일수] - 세션 완료율
⚠️ /data risk [개수] - 이탈 위험 학생
🏆 /data vindex [개수] - V-Index 랭킹
📱 /data features - 기능별 사용량
👤 /data student [UUID] - 학생 V-Index
👨‍👩‍👧 /data report [UUID] [일수] - 학부모 리포트
📜 /data recent [개수] - 최근 활동

💡 한글도 가능: /data 오늘, /data 위험, /data 랭킹`;
    }

    bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
  });

  console.log('🗄️ Supabase Direct Query 핸들러 연결됨');
}
