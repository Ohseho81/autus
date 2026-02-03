/**
 * 🧪 MoltBot Brain - 통합 테스트
 *
 * 모든 컴포넌트가 올바르게 연동되는지 테스트
 */

import { moltBotBrain, NODE_TYPES, STATE_LEVELS, ACTION_CODES } from './index.js';
import supabaseAdapter from './adapters/supabase-adapter.js';
import telegramAdapter from './adapters/telegram-adapter.js';
import { constitutionAdapter, QUALITY_SCORE } from './adapters/constitution-adapter.js';
import { handleRequest } from './api/routes.js';

// ============================================
// 테스트 유틸
// ============================================
let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ ${name}`);
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================
// 테스트 실행
// ============================================
console.log('\n🧪 MoltBot Brain 통합 테스트 시작\n');
console.log('='.repeat(50));

// ----------------------------------------
// 1. MoltBot Brain 기본 기능
// ----------------------------------------
console.log('\n📦 1. MoltBot Brain 기본 기능\n');

test('Brain 인스턴스 생성', () => {
  assertTrue(moltBotBrain !== undefined);
  assertTrue(moltBotBrain.ruleEngine !== undefined);
  assertTrue(moltBotBrain.stateGraph !== undefined);
  assertTrue(moltBotBrain.outcomeEvaluator !== undefined);
});

test('기본 규칙 로드됨', () => {
  const rules = moltBotBrain.getRules();
  assertTrue(rules.length >= 6, '최소 6개 규칙 필요');
});

test('대시보드 조회', () => {
  const dashboard = moltBotBrain.getDashboard();
  assertTrue(dashboard.graph_stats !== undefined);
  assertTrue(dashboard.rule_stats !== undefined);
  assertTrue(dashboard.report !== undefined);
});

// ----------------------------------------
// 2. 출석 처리 테스트
// ----------------------------------------
console.log('\n📝 2. 출석 처리 테스트\n');

const testStudentId = 'test_student_001';
const testClassId = 'test_class_001';

test('출석 처리 (present)', () => {
  const result = moltBotBrain.processAttendance(
    testStudentId,
    testClassId,
    'present',
    new Date()
  );

  assertEqual(result.consecutive_absent, 0, '연속 결석');
  assertTrue(result.attendance_rate > 0, '출석률 계산됨');
});

test('결석 처리 (absent)', () => {
  const result = moltBotBrain.processAttendance(
    testStudentId,
    testClassId,
    'absent',
    new Date()
  );

  assertEqual(result.consecutive_absent, 1, '연속 결석 증가');
});

test('연속 결석 시 규칙 트리거', () => {
  // 추가 결석 처리
  moltBotBrain.processAttendance(testStudentId, testClassId, 'absent', new Date());
  const result = moltBotBrain.processAttendance(testStudentId, testClassId, 'absent', new Date());

  assertTrue(result.consecutive_absent >= 3, '연속 결석 3회 이상');
  assertTrue(result.triggered_rules > 0, '규칙 트리거됨');
});

// ----------------------------------------
// 3. 결제 처리 테스트
// ----------------------------------------
console.log('\n💰 3. 결제 처리 테스트\n');

test('결제 처리 (paid)', () => {
  const result = moltBotBrain.processPayment(
    testStudentId,
    100000,
    '2026-02',
    'paid'
  );

  assertEqual(result.total_outstanding, 0, '미수금 0');
});

test('미납 처리 (overdue)', () => {
  const result = moltBotBrain.processPayment(
    testStudentId,
    100000,
    '2026-02',
    'overdue'
  );

  assertEqual(result.total_outstanding, 100000, '미수금 발생');
});

// ----------------------------------------
// 4. State Graph 테스트
// ----------------------------------------
console.log('\n🕸️ 4. State Graph 테스트\n');

test('노드 조회', () => {
  const node = moltBotBrain.stateGraph.getNode(NODE_TYPES.STUDENT, testStudentId);
  assertTrue(node !== null, '노드 존재');
  assertTrue(node.data !== undefined, '데이터 존재');
});

test('상태 계산', () => {
  const state = moltBotBrain.stateGraph.calculateStudentState(testStudentId);
  assertTrue([
    STATE_LEVELS.OPTIMAL,
    STATE_LEVELS.STABLE,
    STATE_LEVELS.WATCH,
    STATE_LEVELS.ALERT,
    STATE_LEVELS.CRITICAL,
    STATE_LEVELS.PROTECTED,
  ].includes(state), '유효한 상태');
});

test('위험 학생 조회', () => {
  const atRisk = moltBotBrain.stateGraph.getAtRiskStudents();
  assertTrue(Array.isArray(atRisk), '배열 반환');
});

test('통계 조회', () => {
  const stats = moltBotBrain.stateGraph.getStats();
  assertTrue(stats.total_nodes > 0, '노드 존재');
});

// ----------------------------------------
// 5. Supabase Adapter 테스트
// ----------------------------------------
console.log('\n🔌 5. Supabase Adapter 테스트\n');

test('출석 이벤트 핸들러', async () => {
  const result = await supabaseAdapter.handleAttendanceEvent({
    student_id: 'adapter_test_001',
    lesson_slot_id: 'class_001',
    status: 'present',
    timestamp: new Date().toISOString(),
  });

  assertTrue(result.processed, '처리됨');
  assertTrue(result.attendance_rate !== undefined, '출석률 반환');
});

test('결제 이벤트 핸들러', async () => {
  const result = await supabaseAdapter.handlePaymentEvent({
    student_id: 'adapter_test_001',
    amount: 100000,
    payment_month: '2026-02',
    status: 'paid',
  });

  assertTrue(result.processed, '처리됨');
});

// ----------------------------------------
// 6. Telegram Adapter 테스트
// ----------------------------------------
console.log('\n📱 6. Telegram Adapter 테스트\n');

test('Brain 명령어 - status', () => {
  const result = telegramAdapter.handleBrainCommand('status', []);
  assertTrue(result.includes('MoltBot Brain 상태'), '상태 메시지');
});

test('Brain 명령어 - dashboard', () => {
  const result = telegramAdapter.handleBrainCommand('dashboard', []);
  assertTrue(result.includes('대시보드 요약'), '대시보드 메시지');
});

test('Brain 명령어 - risk', () => {
  const result = telegramAdapter.handleBrainCommand('risk', []);
  assertTrue(result.includes('위험 학생'), '위험 학생 메시지');
});

test('Brain 명령어 - rules', () => {
  const result = telegramAdapter.handleBrainCommand('rules', []);
  assertTrue(result.includes('규칙 목록'), '규칙 메시지');
});

// ----------------------------------------
// 7. Constitution Adapter 테스트
// ----------------------------------------
console.log('\n⚖️ 7. Constitution Adapter 테스트\n');

test('Quality Score 계산', () => {
  const score = QUALITY_SCORE.calculate({
    userSatisfaction: 80,
    reuseRate: 70,
    failureRate: 10,
    outcomeImpact: 75,
  });

  assertTrue(score > 0 && score <= 100, '점수 범위');
});

test('규칙 승격 검증 (실패 - K4 대기)', () => {
  const rule = { id: 'TEST_RULE', name: 'Test Rule', mode: 'shadow' };
  const verdict = constitutionAdapter.validateRulePromotion(
    rule,
    'shadow',
    'auto',
    { triggeredCount: 15, successCount: 12 }
  );

  assertTrue(!verdict.approved, '승인되지 않음 (대기 필요)');
  assertTrue(verdict.violations.some(v => v.law === 'K4'), 'K4 위반');
});

test('대기 중 변경사항 조회', () => {
  const pending = constitutionAdapter.getPendingChanges();
  assertTrue(Array.isArray(pending), '배열 반환');
  assertTrue(pending.length > 0, '대기 중인 변경 존재');
});

// ----------------------------------------
// 8. API Routes 테스트
// ----------------------------------------
console.log('\n🌐 8. API Routes 테스트\n');

test('API - Health Check', async () => {
  const result = await handleRequest({
    method: 'GET',
    path: '/api/moltbot/health',
  });

  assertEqual(result.status, 200, 'Status');
  assertEqual(result.body.status, 'healthy', 'Health');
});

test('API - Dashboard', async () => {
  const result = await handleRequest({
    method: 'GET',
    path: '/api/moltbot/dashboard',
  });

  assertEqual(result.status, 200, 'Status');
  assertTrue(result.body.graph_stats !== undefined, 'Graph stats');
});

test('API - Rules', async () => {
  const result = await handleRequest({
    method: 'GET',
    path: '/api/moltbot/rules',
  });

  assertEqual(result.status, 200, 'Status');
  assertTrue(result.body.rules.length > 0, 'Rules exist');
});

test('API - At Risk Students', async () => {
  const result = await handleRequest({
    method: 'GET',
    path: '/api/moltbot/students/at-risk',
  });

  assertEqual(result.status, 200, 'Status');
  assertTrue(result.body.count !== undefined, 'Count exists');
});

test('API - Attendance Event', async () => {
  const result = await handleRequest({
    method: 'POST',
    path: '/api/moltbot/attendance',
    body: {
      student_id: 'api_test_001',
      lesson_slot_id: 'class_001',
      status: 'present',
      timestamp: new Date().toISOString(),
    },
  });

  assertEqual(result.status, 200, 'Status');
  assertTrue(result.body.processed, 'Processed');
});

test('API - 404 Not Found', async () => {
  const result = await handleRequest({
    method: 'GET',
    path: '/api/moltbot/nonexistent',
  });

  assertEqual(result.status, 404, 'Status');
});

// ============================================
// 결과 출력
// ============================================
console.log('\n' + '='.repeat(50));
console.log(`\n📊 테스트 결과: ${passCount}/${testCount} 통과`);

if (passCount === testCount) {
  console.log('\n✅ 모든 테스트 통과! 🎉\n');
} else {
  console.log(`\n⚠️ ${testCount - passCount}개 테스트 실패\n`);
}

// 최종 상태 출력
console.log('📈 최종 Brain 상태:');
const stats = moltBotBrain.stateGraph.getStats();
console.log(`   • 노드: ${stats.total_nodes}개`);
console.log(`   • 엣지: ${stats.total_edges}개`);
console.log(`   • 학생 상태:`, stats.student_states);
console.log('');
