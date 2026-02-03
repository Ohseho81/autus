/**
 * 🧠 MoltBot Brain - 완전체
 *
 * 몰트봇의 두뇌는
 * '생각하는 AI'가 아니라
 * '결과로 검증되는 의사결정 기계'다.
 *
 * LLM은 입,
 * 규칙은 손,
 * 그래프는 기억,
 * 결과는 교사다.
 */

import { InterventionLogger, logIntervention, resolveIntervention, ACTION_CODES, TRIGGER_TYPES } from './core/intervention-log.js';
import { RuleEngine, ruleEngine, DEFAULT_RULES } from './core/rule-engine.js';
import { StateGraph, stateGraph, NODE_TYPES, RELATION_TYPES, STATE_LEVELS } from './core/state-graph.js';
import { OutcomeEvaluator, outcomeEvaluator, KPI } from './core/outcome-evaluator.js';
import { InterventionDetector, MANUAL_ACTIONS, ACTION_RISK_LEVEL } from './core/intervention-detector.js';

// ============================================
// MoltBot Brain (통합 인터페이스)
// ============================================
export class MoltBotBrain {
  constructor() {
    this.interventionLogger = new InterventionLogger();
    this.ruleEngine = ruleEngine;
    this.stateGraph = stateGraph;
    this.outcomeEvaluator = outcomeEvaluator;

    // PHASE 1 핵심: 수동 개입 감지기
    this.interventionDetector = new InterventionDetector(this.interventionLogger);

    console.log(`
╔═══════════════════════════════════════════╗
║        🧠 MoltBot Brain Initialized       ║
╠═══════════════════════════════════════════╣
║  Rules: ${this.ruleEngine.rules.length} loaded                        ║
║  Graph: ${this.stateGraph.nodes.size} nodes, ${this.stateGraph.edges.length} edges             ║
║  Detector: PHASE 1 (Human → Log)          ║
║  Mode: Shadow + Auto                      ║
╚═══════════════════════════════════════════╝
    `);
  }

  // ============================================
  // 1️⃣ 데이터 입력 (결제, 출석 연동)
  // ============================================

  /**
   * 출석 데이터 입력
   */
  processAttendance(studentId, classId, status, timestamp = new Date()) {
    // 1. 상태 그래프 업데이트
    const node = this.stateGraph.getNode(NODE_TYPES.STUDENT, studentId);
    const currentData = node?.data || {};

    // 출석률 계산 (간략화)
    const totalSessions = (currentData.total_sessions || 0) + 1;
    const presentCount = (currentData.present_count || 0) + (status === 'present' ? 1 : 0);
    const attendanceRate = Math.round((presentCount / totalSessions) * 100);

    // 연속 결석 계산
    let consecutiveAbsent = currentData.consecutive_absent || 0;
    if (status === 'absent') {
      consecutiveAbsent++;
    } else {
      consecutiveAbsent = 0;
    }

    this.stateGraph.setNode(NODE_TYPES.STUDENT, studentId, {
      ...currentData,
      total_sessions: totalSessions,
      present_count: presentCount,
      attendance_rate: attendanceRate,
      consecutive_absent: consecutiveAbsent,
      last_attendance: timestamp.toISOString(),
      last_status: status,
    });

    // 2. 규칙 엔진 평가
    const context = {
      student_id: studentId,
      attendance_rate: attendanceRate,
      consecutive_absent: consecutiveAbsent,
      last_status: status,
    };

    const ruleResults = this.ruleEngine.evaluate(context);

    // 3. 개입 로깅 & 실행
    for (const result of ruleResults) {
      if (result.should_execute) {
        // Auto 모드: 자동 실행
        this.executeActions(result.actions, studentId, result);
      } else if (result.needs_approval) {
        // Shadow 모드: 로그만 남기고 알림
        console.log(`[SHADOW] Would execute: ${result.actions.join(', ')}`);
        logIntervention({
          actor: 'moltbot',
          target_type: NODE_TYPES.STUDENT,
          target_id: studentId,
          trigger: TRIGGER_TYPES.PATTERN,
          action: result.actions[0],
          context: result.context_snapshot,
          before_state: currentData,
          outcome: 'shadow_logged',
        });
      }
    }

    // 4. 상태 재계산
    this.stateGraph.calculateStudentState(studentId);

    return {
      attendance_rate: attendanceRate,
      consecutive_absent: consecutiveAbsent,
      triggered_rules: ruleResults.length,
    };
  }

  /**
   * 결제 데이터 입력
   */
  processPayment(studentId, amount, paymentMonth, status) {
    const node = this.stateGraph.getNode(NODE_TYPES.STUDENT, studentId);
    const currentData = node?.data || {};

    // 미수금 계산
    let totalOutstanding = currentData.total_outstanding || 0;
    if (status === 'paid') {
      totalOutstanding = Math.max(0, totalOutstanding - amount);
    } else if (status === 'overdue') {
      totalOutstanding += amount;
    }

    // 납부 기한까지 남은 일수
    const daysUntilDue = status === 'pending'
      ? Math.ceil((new Date(`${paymentMonth}-05`) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const daysOverdue = status === 'overdue'
      ? Math.ceil((new Date() - new Date(`${paymentMonth}-05`)) / (1000 * 60 * 60 * 24))
      : 0;

    this.stateGraph.setNode(NODE_TYPES.STUDENT, studentId, {
      ...currentData,
      total_outstanding: totalOutstanding,
      payment_status: status,
      last_payment: status === 'paid' ? new Date().toISOString() : currentData.last_payment,
      days_until_due: daysUntilDue,
      days_overdue: daysOverdue,
    });

    // 규칙 평가
    const context = {
      student_id: studentId,
      total_outstanding: totalOutstanding,
      days_until_due: daysUntilDue,
      days_overdue: daysOverdue,
      payment_status: status,
    };

    const ruleResults = this.ruleEngine.evaluate(context);

    for (const result of ruleResults) {
      if (result.should_execute) {
        this.executeActions(result.actions, studentId, result);
      }
    }

    this.stateGraph.calculateStudentState(studentId);

    return {
      total_outstanding: totalOutstanding,
      triggered_rules: ruleResults.length,
    };
  }

  // ============================================
  // 2️⃣ 액션 실행
  // ============================================

  /**
   * 액션 실행
   */
  executeActions(actions, studentId, context) {
    const node = this.stateGraph.getNode(NODE_TYPES.STUDENT, studentId);
    const beforeState = node?.data || {};

    for (const action of actions) {
      // 개입 로그 생성
      const intervention = logIntervention({
        actor: 'moltbot',
        target_type: NODE_TYPES.STUDENT,
        target_id: studentId,
        trigger: TRIGGER_TYPES.PATTERN,
        action,
        context: context.context_snapshot,
        before_state: beforeState,
      });

      // 실제 액션 실행 (여기서 메시징 시스템 연동)
      const success = this.performAction(action, studentId, context);

      // 결과 업데이트
      resolveIntervention(
        intervention.id,
        success ? 'success' : 'failed',
        this.stateGraph.getNode(NODE_TYPES.STUDENT, studentId)?.data,
        { executed: true }
      );

      console.log(`[EXECUTE] ${action} for student ${studentId} → ${success ? '✅' : '❌'}`);
    }
  }

  /**
   * 개별 액션 수행 (실제 실행)
   */
  performAction(action, studentId, context) {
    // TODO: 실제 메시징/알림 시스템 연동
    switch (action) {
      case ACTION_CODES.ATT_REMIND:
        console.log(`  → 출석 리마인더 발송: ${studentId}`);
        return true;

      case ACTION_CODES.ATT_CONTACT:
        console.log(`  → 결석 연락: ${studentId}`);
        return true;

      case ACTION_CODES.ATT_PROTECT:
        this.stateGraph.enterProtectedMode(studentId, 'consecutive_absent');
        console.log(`  → 보호 모드 진입: ${studentId}`);
        return true;

      case ACTION_CODES.PAY_REMIND:
        console.log(`  → 수납 리마인더 발송: ${studentId}`);
        return true;

      case ACTION_CODES.PAY_CONTACT:
        console.log(`  → 미수금 연락: ${studentId}`);
        return true;

      case ACTION_CODES.RISK_FLAG:
        console.log(`  → 위험 플래그 설정: ${studentId}`);
        return true;

      default:
        console.log(`  → Unknown action: ${action}`);
        return false;
    }
  }

  // ============================================
  // 3️⃣ 조회 & 리포트
  // ============================================

  /**
   * 대시보드 데이터
   */
  getDashboard() {
    return {
      graph_stats: this.stateGraph.getStats(),
      rule_stats: this.ruleEngine.getStats(),
      at_risk: this.stateGraph.getAtRiskStudents(),
      patterns: this.interventionLogger.analyzePatterns().slice(0, 5),
      report: this.outcomeEvaluator.generateReport(),
    };
  }

  /**
   * 학생 상세
   */
  getStudentDetail(studentId) {
    return {
      context: this.stateGraph.getStudentContext(studentId),
      interventions: this.interventionLogger.getByTarget(NODE_TYPES.STUDENT, studentId),
    };
  }

  /**
   * 규칙 목록
   */
  getRules() {
    return this.ruleEngine.listRules();
  }

  /**
   * 규칙 모드 변경
   */
  setRuleMode(ruleId, mode) {
    return this.ruleEngine.setRuleMode(ruleId, mode);
  }

  // ============================================
  // 4️⃣ PHASE 1: 수동 개입 감지 (Human → Log)
  // ============================================

  /**
   * 수동 개입 감지 (PHASE 1 핵심)
   */
  detectManualAction(action, actor, target, context = {}) {
    return this.interventionDetector.detect(action, actor, target, context);
  }

  /**
   * 학생 상태 변경 감지
   */
  detectStatusChange(actor, studentId, fromStatus, toStatus, reason = '') {
    return this.interventionDetector.detectStatusChange(
      actor, studentId, fromStatus, toStatus, reason
    );
  }

  /**
   * 반 변경 감지
   */
  detectClassChange(actor, studentId, fromClassId, toClassId, reason = '') {
    return this.interventionDetector.detectClassChange(
      actor, studentId, fromClassId, toClassId, reason
    );
  }

  /**
   * 수동 메시지 발송 감지
   */
  detectManualMessage(actor, studentId, messageType, channel) {
    return this.interventionDetector.detectManualMessage(
      actor, studentId, messageType, channel
    );
  }

  /**
   * 일일 개입 리포트
   */
  getDailyInterventionReport() {
    return this.interventionDetector.getDailyReport();
  }

  /**
   * Telegram용 개입 리포트
   */
  getTelegramInterventionReport() {
    return this.interventionDetector.getTelegramReport();
  }
}

// ============================================
// Export
// ============================================
export {
  // Core Components
  InterventionLogger,
  RuleEngine,
  StateGraph,
  OutcomeEvaluator,
  InterventionDetector,

  // Singletons
  ruleEngine,
  stateGraph,
  outcomeEvaluator,

  // Constants
  ACTION_CODES,
  TRIGGER_TYPES,
  NODE_TYPES,
  RELATION_TYPES,
  STATE_LEVELS,
  KPI,
  DEFAULT_RULES,
  MANUAL_ACTIONS,
  ACTION_RISK_LEVEL,

  // Utilities
  logIntervention,
  resolveIntervention,
};

// 싱글톤 Brain 인스턴스
export const moltBotBrain = new MoltBotBrain();
export default MoltBotBrain;
