/**
 * 📱 MoltBot Brain - Telegram Adapter
 *
 * MoltBot Brain ↔ Telegram 연동
 * 알림 발송 및 명령 처리
 */

import { moltBotBrain } from '../index.js';
import { NODE_TYPES, STATE_LEVELS } from '../core/state-graph.js';

// ============================================
// 설정
// ============================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || '';

/**
 * Telegram 메시지 발송
 */
async function sendMessage(chatId, text, options = {}) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[TELEGRAM ADAPTER] No token, skipping:', text.slice(0, 50));
    return { sent: false, reason: 'no_token' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options.parse_mode || 'Markdown',
          ...options,
        }),
      }
    );

    const result = await response.json();
    return { sent: result.ok, result };
  } catch (error) {
    console.error('[TELEGRAM ADAPTER] Send error:', error.message);
    return { sent: false, error: error.message };
  }
}

// ============================================
// 알림 유형
// ============================================

/**
 * 위험 학생 알림
 */
export async function notifyRiskStudent(student, reason) {
  const message = `
⚠️ *위험 학생 감지*

👤 *${student.data?.name || student.entity_id}*
📊 상태: ${translateState(student.state)}
❗ 사유: ${reason}

*데이터:*
• 출석률: ${student.data?.attendance_rate || 0}%
• 연속 결석: ${student.data?.consecutive_absent || 0}회
• 미수금: ${(student.data?.total_outstanding || 0).toLocaleString()}원

💡 _대시보드에서 상세 확인하세요_
  `;

  return sendMessage(OWNER_CHAT_ID, message);
}

/**
 * 규칙 트리거 알림 (Shadow 모드)
 */
export async function notifyRuleTrigger(ruleResult, studentId) {
  const student = moltBotBrain.stateGraph.getNode(NODE_TYPES.STUDENT, studentId);

  const message = `
🔔 *규칙 트리거 (Shadow)*

📋 *규칙:* ${ruleResult.rule_name}
👤 *학생:* ${student?.data?.name || studentId}

*제안 액션:*
${ruleResult.actions.map(a => `• ${translateAction(a)}`).join('\n')}

*컨텍스트:*
\`\`\`
${JSON.stringify(ruleResult.context_snapshot, null, 2)}
\`\`\`

_승인하려면 대시보드에서 처리하세요_
  `;

  return sendMessage(OWNER_CHAT_ID, message);
}

/**
 * 일일 리포트
 */
export async function sendDailyReport() {
  const dashboard = moltBotBrain.getDashboard();
  const report = dashboard.report;
  const atRisk = dashboard.at_risk;

  const message = `
📊 *일일 MoltBot 리포트*
${new Date().toLocaleDateString('ko-KR')}

*📈 요약*
• 총 개입: ${report.summary.total_interventions}회
• 성공률: ${report.summary.overall_success_rate}%
• 위험 학생: ${report.summary.at_risk_students}명

*⚠️ 위험 학생 (Top 5)*
${atRisk.slice(0, 5).map((s, i) =>
  `${i + 1}. ${s.data?.name || s.entity_id} (${translateState(s.state)})`
).join('\n') || '없음'}

*📋 규칙 통계*
${Object.entries(dashboard.rule_stats || {}).slice(0, 3).map(([id, stat]) =>
  `• ${id}: ${stat.triggered || 0}회 (성공 ${stat.success_rate || 0}%)`
).join('\n') || '데이터 없음'}

*💡 권고사항*
${report.recommendations.slice(0, 2).map(r => `• ${r.suggestion}`).join('\n') || '없음'}
  `;

  return sendMessage(OWNER_CHAT_ID, message);
}

/**
 * 상태 변경 알림
 */
export async function notifyStateChange(studentId, fromState, toState) {
  const student = moltBotBrain.stateGraph.getNode(NODE_TYPES.STUDENT, studentId);

  // 악화된 경우만 알림
  const stateOrder = {
    [STATE_LEVELS.OPTIMAL]: 5,
    [STATE_LEVELS.STABLE]: 4,
    [STATE_LEVELS.WATCH]: 3,
    [STATE_LEVELS.PROTECTED]: 2,
    [STATE_LEVELS.ALERT]: 1,
    [STATE_LEVELS.CRITICAL]: 0,
  };

  if (stateOrder[toState] >= stateOrder[fromState]) {
    return { sent: false, reason: 'improved_or_same' };
  }

  const message = `
📉 *상태 악화 감지*

👤 *${student?.data?.name || studentId}*
🔄 ${translateState(fromState)} → ${translateState(toState)}

*현재 데이터:*
• 출석률: ${student?.data?.attendance_rate || 0}%
• 미수금: ${(student?.data?.total_outstanding || 0).toLocaleString()}원
  `;

  return sendMessage(OWNER_CHAT_ID, message);
}

// ============================================
// 명령어 처리
// ============================================

/**
 * /brain 명령 처리
 */
export function handleBrainCommand(command, args) {
  switch (command) {
    case 'status':
      return getBrainStatus();
    case 'dashboard':
      return getDashboardSummary();
    case 'risk':
      return getRiskStudents();
    case 'rules':
      return getRulesList();
    case 'student':
      return getStudentDetail(args[0]);
    default:
      return getHelpMessage();
  }
}

function getBrainStatus() {
  const stats = moltBotBrain.stateGraph.getStats();
  const ruleStats = moltBotBrain.ruleEngine.getStats();

  return `
🧠 *MoltBot Brain 상태*

*그래프:*
• 노드: ${stats.total_nodes}개
• 엣지: ${stats.total_edges}개
• 학생: ${stats.nodes_by_type?.student || 0}명

*규칙:*
• 활성 규칙: ${moltBotBrain.ruleEngine.rules.filter(r => r.enabled).length}개
• Auto: ${moltBotBrain.ruleEngine.rules.filter(r => r.mode === 'auto').length}개
• Shadow: ${moltBotBrain.ruleEngine.rules.filter(r => r.mode === 'shadow').length}개

*학생 상태:*
${Object.entries(stats.student_states || {}).map(([state, count]) =>
  `• ${translateState(state)}: ${count}명`
).join('\n') || '데이터 없음'}
  `;
}

function getDashboardSummary() {
  const dashboard = moltBotBrain.getDashboard();

  return `
📊 *대시보드 요약*

• 총 개입: ${dashboard.report.summary.total_interventions}회
• 성공률: ${dashboard.report.summary.overall_success_rate}%
• 위험 학생: ${dashboard.at_risk.length}명

*Top 패턴:*
${dashboard.patterns.slice(0, 3).map(p =>
  `• ${p.pattern}: ${p.rate}% (${p.total}회)`
).join('\n') || '없음'}
  `;
}

function getRiskStudents() {
  const atRisk = moltBotBrain.stateGraph.getAtRiskStudents();

  if (atRisk.length === 0) {
    return '✅ 현재 위험 학생이 없습니다!';
  }

  return `
⚠️ *위험 학생 목록* (${atRisk.length}명)

${atRisk.slice(0, 10).map((s, i) => {
  const data = s.data || {};
  return `${i + 1}. *${data.name || s.entity_id}* (${translateState(s.state)})
   출석: ${data.attendance_rate || 0}% | 미수금: ${(data.total_outstanding || 0).toLocaleString()}원`;
}).join('\n\n')}
  `;
}

function getRulesList() {
  const rules = moltBotBrain.getRules();

  return `
📋 *규칙 목록*

${rules.map(r =>
  `• *${r.id}* [${r.mode}] ${r.enabled ? '✅' : '❌'}
   ${r.name}`
).join('\n')}
  `;
}

function getStudentDetail(studentId) {
  if (!studentId) {
    return '사용법: /brain student [학생ID]';
  }

  const detail = moltBotBrain.getStudentDetail(studentId);
  if (!detail || !detail.context) {
    return `❌ 학생을 찾을 수 없습니다: ${studentId}`;
  }

  const student = detail.context.student;
  const data = student.data || {};

  return `
👤 *학생 상세: ${data.name || studentId}*

*기본 정보:*
• 상태: ${translateState(student.state)}
• 학년: ${data.grade || '-'}
• 연락처: ${data.phone || '-'}

*지표:*
• 출석률: ${data.attendance_rate || 0}%
• 연속 결석: ${data.consecutive_absent || 0}회
• 미수금: ${(data.total_outstanding || 0).toLocaleString()}원

*개입 이력:* ${detail.interventions.length}건
${detail.interventions.slice(-3).map(i =>
  `• ${i.action} (${i.outcome})`
).join('\n') || '없음'}
  `;
}

function getHelpMessage() {
  return `
🧠 *MoltBot Brain 명령어*

/brain status - 상태 확인
/brain dashboard - 대시보드 요약
/brain risk - 위험 학생 목록
/brain rules - 규칙 목록
/brain student [ID] - 학생 상세
  `;
}

// ============================================
// 헬퍼 함수
// ============================================

function translateState(state) {
  const translations = {
    [STATE_LEVELS.OPTIMAL]: '🟢 최적',
    [STATE_LEVELS.STABLE]: '🔵 안정',
    [STATE_LEVELS.WATCH]: '🟡 관찰',
    [STATE_LEVELS.ALERT]: '🟠 경고',
    [STATE_LEVELS.CRITICAL]: '🔴 위험',
    [STATE_LEVELS.PROTECTED]: '🟣 보호',
  };
  return translations[state] || state;
}

function translateAction(action) {
  const translations = {
    'attendance_reminder': '출석 리마인더 발송',
    'attendance_contact': '결석 연락',
    'attendance_protect_mode': '보호 모드 진입',
    'payment_reminder': '수납 리마인더',
    'payment_contact': '미수금 연락',
    'risk_flag': '위험 플래그 설정',
    'communication_feedback': '피드백 요청',
  };
  return translations[action] || action;
}

export default {
  sendMessage,
  notifyRiskStudent,
  notifyRuleTrigger,
  sendDailyReport,
  notifyStateChange,
  handleBrainCommand,
};
