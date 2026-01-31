/**
 * 🧠 MoltBot Brain - Intervention Log
 *
 * "사람이 개입한 모든 순간"을 기록
 * 이게 고정되는 순간, 몰트봇은 배우기 시작한다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../logs');

// ============================================
// Intervention Log 스키마 (LOCKED)
// ============================================
/**
 * @typedef {Object} InterventionLog
 * @property {string} id - 고유 ID (UUID)
 * @property {string} timestamp - ISO 8601 타임스탬프
 * @property {string} actor - 개입자 (coach, admin, parent, system)
 * @property {string} target_type - 대상 유형 (student, class, payment, schedule)
 * @property {string} target_id - 대상 ID
 * @property {string} trigger - 개입 트리거 (alert, observation, request, scheduled)
 * @property {string} action - 수행한 행동 (코드)
 * @property {Object} context - 개입 시점 상태
 * @property {Object} before_state - 개입 전 상태
 * @property {Object} after_state - 개입 후 상태 (나중에 기록)
 * @property {string} outcome - 결과 (pending, success, failed, partial)
 * @property {Object} metrics - 측정 지표
 */

// 액션 코드 (표준화)
export const ACTION_CODES = {
  // 출석 관련
  ATT_REMIND: 'attendance_reminder',      // 출석 리마인더 발송
  ATT_CONTACT: 'attendance_contact',      // 결석 연락
  ATT_PROTECT: 'attendance_protect_mode', // 보호 모드 진입

  // 결제 관련
  PAY_REMIND: 'payment_reminder',         // 수납 리마인더
  PAY_CONTACT: 'payment_contact',         // 미수금 연락
  PAY_EXTEND: 'payment_extend',           // 납부 기한 연장
  PAY_DISCOUNT: 'payment_discount',       // 할인 적용

  // 스케줄 관련
  SCH_CHANGE: 'schedule_change',          // 수업 시간 변경
  SCH_MAKEUP: 'schedule_makeup',          // 보강 스케줄
  SCH_CANCEL: 'schedule_cancel',          // 수업 취소

  // 커뮤니케이션
  COM_MESSAGE: 'communication_message',   // 일반 메시지
  COM_REPORT: 'communication_report',     // 리포트 발송
  COM_FEEDBACK: 'communication_feedback', // 피드백 요청

  // 위험 관리
  RISK_FLAG: 'risk_flag',                 // 위험 플래그
  RISK_ESCALATE: 'risk_escalate',         // 에스컬레이션
  RISK_RESOLVE: 'risk_resolve',           // 해결 처리
};

// 트리거 유형
export const TRIGGER_TYPES = {
  ALERT: 'alert',           // 시스템 알림에 반응
  OBSERVATION: 'observation', // 직접 관찰
  REQUEST: 'request',       // 요청에 의한
  SCHEDULED: 'scheduled',   // 정기 작업
  PATTERN: 'pattern',       // 패턴 감지
};

// ============================================
// Intervention Logger
// ============================================
export class InterventionLogger {
  constructor(logFile = 'interventions.jsonl') {
    this.logPath = path.join(LOG_DIR, logFile);
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  /**
   * 개입 기록 생성
   */
  log(intervention) {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      outcome: 'pending',
      ...intervention,
    };

    // JSONL 형식으로 저장 (한 줄씩 추가)
    fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');

    console.log(`[INTERVENTION] ${entry.actor} → ${entry.action} → ${entry.target_type}:${entry.target_id}`);

    return entry;
  }

  /**
   * 개입 결과 업데이트
   */
  updateOutcome(id, outcome, afterState = null, metrics = null) {
    const logs = this.readAll();
    const updated = logs.map(log => {
      if (log.id === id) {
        return {
          ...log,
          outcome,
          after_state: afterState,
          metrics: { ...log.metrics, ...metrics },
          resolved_at: new Date().toISOString(),
        };
      }
      return log;
    });

    this.writeAll(updated);
    return updated.find(l => l.id === id);
  }

  /**
   * 모든 로그 읽기
   */
  readAll() {
    if (!fs.existsSync(this.logPath)) return [];

    const content = fs.readFileSync(this.logPath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }

  /**
   * 전체 덮어쓰기
   */
  writeAll(logs) {
    const content = logs.map(l => JSON.stringify(l)).join('\n') + '\n';
    fs.writeFileSync(this.logPath, content);
  }

  /**
   * 특정 대상의 개입 이력 조회
   */
  getByTarget(targetType, targetId) {
    return this.readAll().filter(
      log => log.target_type === targetType && log.target_id === targetId
    );
  }

  /**
   * 특정 액션의 성공률 계산
   */
  getActionSuccessRate(actionCode) {
    const logs = this.readAll().filter(l => l.action === actionCode);
    if (logs.length === 0) return null;

    const success = logs.filter(l => l.outcome === 'success').length;
    return {
      total: logs.length,
      success,
      rate: Math.round((success / logs.length) * 100),
    };
  }

  /**
   * 패턴 분석: 어떤 트리거 → 어떤 액션이 효과적인가
   */
  analyzePatterns() {
    const logs = this.readAll().filter(l => l.outcome !== 'pending');
    const patterns = {};

    logs.forEach(log => {
      const key = `${log.trigger}→${log.action}`;
      if (!patterns[key]) {
        patterns[key] = { total: 0, success: 0 };
      }
      patterns[key].total++;
      if (log.outcome === 'success') {
        patterns[key].success++;
      }
    });

    // 성공률로 정렬
    return Object.entries(patterns)
      .map(([pattern, stats]) => ({
        pattern,
        ...stats,
        rate: Math.round((stats.success / stats.total) * 100),
      }))
      .sort((a, b) => b.rate - a.rate);
  }
}

// ============================================
// 편의 함수
// ============================================
const logger = new InterventionLogger();

export function logIntervention(params) {
  return logger.log(params);
}

export function resolveIntervention(id, outcome, afterState, metrics) {
  return logger.updateOutcome(id, outcome, afterState, metrics);
}

export function getInterventionPatterns() {
  return logger.analyzePatterns();
}

export default InterventionLogger;
