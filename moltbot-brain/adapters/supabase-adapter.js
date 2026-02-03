/**
 * 🔌 MoltBot Brain - Supabase Adapter
 *
 * Supabase Edge Functions ↔ MoltBot Brain 연동
 * 실시간 이벤트 처리 및 데이터 동기화
 */

import { createClient } from '@supabase/supabase-js';
import { moltBotBrain } from '../index.js';
import { NODE_TYPES, RELATION_TYPES } from '../core/state-graph.js';
import { TRIGGER_TYPES, ACTION_CODES } from '../core/intervention-log.js';

// ============================================
// Supabase Client
// ============================================
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ============================================
// Event Handlers
// ============================================

/**
 * 출석 이벤트 처리
 * attendance-chain-reaction 에서 호출
 */
export async function handleAttendanceEvent(payload) {
  const { student_id, lesson_slot_id, status, timestamp } = payload;

  console.log(`[SUPABASE ADAPTER] Attendance: ${student_id} → ${status}`);

  // 1. MoltBot Brain에 출석 데이터 전달
  const result = moltBotBrain.processAttendance(
    student_id,
    lesson_slot_id,
    status,
    new Date(timestamp)
  );

  // 2. 트리거된 규칙 확인
  if (result.triggered_rules > 0) {
    console.log(`[SUPABASE ADAPTER] Triggered ${result.triggered_rules} rules`);
  }

  // 3. 위험 상태면 알림 반환
  const student = moltBotBrain.stateGraph.getNode(NODE_TYPES.STUDENT, student_id);
  const needsAttention = student?.data?.consecutive_absent >= 2 ||
                         result.attendance_rate < 70;

  return {
    processed: true,
    attendance_rate: result.attendance_rate,
    consecutive_absent: result.consecutive_absent,
    triggered_rules: result.triggered_rules,
    needs_attention: needsAttention,
    student_state: student?.state,
  };
}

/**
 * 결제 이벤트 처리
 * payment-webhook 에서 호출
 */
export async function handlePaymentEvent(payload) {
  const { student_id, amount, payment_month, status, transaction_id } = payload;

  console.log(`[SUPABASE ADAPTER] Payment: ${student_id} → ${status} (${amount})`);

  // 1. MoltBot Brain에 결제 데이터 전달
  const result = moltBotBrain.processPayment(
    student_id,
    amount,
    payment_month,
    status
  );

  // 2. 상태 확인
  const student = moltBotBrain.stateGraph.getNode(NODE_TYPES.STUDENT, student_id);
  const needsAttention = result.total_outstanding > 0 && status !== 'paid';

  return {
    processed: true,
    total_outstanding: result.total_outstanding,
    triggered_rules: result.triggered_rules,
    needs_attention: needsAttention,
    student_state: student?.state,
  };
}

/**
 * 코치 퇴근 이벤트 처리
 * coach-clock-out-chain 에서 호출
 */
export async function handleCoachClockOutEvent(payload) {
  const { coach_id, work_date, lessons_completed, students_attended } = payload;

  console.log(`[SUPABASE ADAPTER] Coach clock out: ${coach_id}`);

  // 1. 코치 노드 업데이트
  moltBotBrain.stateGraph.setNode(NODE_TYPES.COACH, coach_id, {
    last_work_date: work_date,
    last_lessons_completed: lessons_completed,
    last_students_attended: students_attended,
  });

  // 2. 일일 리포트 생성
  const dashboard = moltBotBrain.getDashboard();

  return {
    processed: true,
    daily_report: {
      date: work_date,
      coach_id,
      lessons: lessons_completed,
      students: students_attended,
      at_risk_students: dashboard.at_risk.length,
    },
  };
}

// ============================================
// Supabase Sync (초기 데이터 로드)
// ============================================

/**
 * Supabase에서 학생 데이터 동기화
 */
export async function syncStudents() {
  if (!supabase) {
    console.log('[SUPABASE ADAPTER] No Supabase client, skipping sync');
    return { synced: 0 };
  }

  try {
    const { data: students, error } = await supabase
      .from('atb_students')
      .select('*');

    if (error) throw error;

    let synced = 0;
    for (const student of students || []) {
      moltBotBrain.stateGraph.setNode(NODE_TYPES.STUDENT, student.id, {
        name: student.name,
        phone: student.phone,
        parent_phone: student.parent_phone,
        grade: student.grade,
        class_id: student.class_id,
        attendance_rate: student.attendance_rate || 100,
        total_outstanding: student.total_outstanding || 0,
        enrollment_status: student.enrollment_status,
        risk_score: student.risk_score || 0,
        synced_at: new Date().toISOString(),
      });
      synced++;
    }

    console.log(`[SUPABASE ADAPTER] Synced ${synced} students`);
    return { synced };
  } catch (error) {
    console.error('[SUPABASE ADAPTER] Sync error:', error.message);
    return { synced: 0, error: error.message };
  }
}

/**
 * Supabase에서 수업 데이터 동기화
 */
export async function syncClasses() {
  if (!supabase) return { synced: 0 };

  try {
    const { data: classes, error } = await supabase
      .from('atb_classes')
      .select('*');

    if (error) throw error;

    let synced = 0;
    for (const cls of classes || []) {
      moltBotBrain.stateGraph.setNode(NODE_TYPES.CLASS, cls.id, {
        name: cls.name,
        day_of_week: cls.day_of_week,
        start_time: cls.start_time,
        end_time: cls.end_time,
        coach_id: cls.coach_id,
        max_students: cls.max_students,
      });
      synced++;
    }

    console.log(`[SUPABASE ADAPTER] Synced ${synced} classes`);
    return { synced };
  } catch (error) {
    console.error('[SUPABASE ADAPTER] Sync error:', error.message);
    return { synced: 0, error: error.message };
  }
}

/**
 * 전체 동기화
 */
export async function syncAll() {
  console.log('[SUPABASE ADAPTER] Starting full sync...');

  const students = await syncStudents();
  const classes = await syncClasses();

  // 관계 설정 (학생 → 수업)
  const studentNodes = Array.from(moltBotBrain.stateGraph.nodes.values())
    .filter(n => n.type === NODE_TYPES.STUDENT);

  for (const student of studentNodes) {
    if (student.data.class_id) {
      moltBotBrain.stateGraph.addEdge(
        NODE_TYPES.STUDENT, student.entity_id,
        NODE_TYPES.CLASS, student.data.class_id,
        RELATION_TYPES.ENROLLED_IN
      );
    }
  }

  console.log('[SUPABASE ADAPTER] Full sync complete');

  return {
    students: students.synced,
    classes: classes.synced,
    total: students.synced + classes.synced,
  };
}

// ============================================
// Realtime Subscription (옵션)
// ============================================

let attendanceSubscription = null;
let paymentSubscription = null;

/**
 * 실시간 구독 시작
 */
export function startRealtimeSync() {
  if (!supabase) return;

  // 출석 테이블 구독
  attendanceSubscription = supabase
    .channel('attendance-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'atb_attendance' },
      (payload) => {
        console.log('[REALTIME] New attendance:', payload.new);
        handleAttendanceEvent({
          student_id: payload.new.student_id,
          lesson_slot_id: payload.new.class_id,
          status: payload.new.status,
          timestamp: payload.new.date,
        });
      }
    )
    .subscribe();

  // 결제 테이블 구독
  paymentSubscription = supabase
    .channel('payment-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'atb_payments' },
      (payload) => {
        console.log('[REALTIME] Payment change:', payload.new);
        handlePaymentEvent({
          student_id: payload.new.student_id,
          amount: payload.new.amount,
          payment_month: payload.new.month,
          status: payload.new.status,
        });
      }
    )
    .subscribe();

  console.log('[SUPABASE ADAPTER] Realtime subscriptions started');
}

/**
 * 실시간 구독 중지
 */
export function stopRealtimeSync() {
  if (attendanceSubscription) {
    supabase?.removeChannel(attendanceSubscription);
  }
  if (paymentSubscription) {
    supabase?.removeChannel(paymentSubscription);
  }
  console.log('[SUPABASE ADAPTER] Realtime subscriptions stopped');
}

export default {
  supabase,
  handleAttendanceEvent,
  handlePaymentEvent,
  handleCoachClockOutEvent,
  syncStudents,
  syncClasses,
  syncAll,
  startRealtimeSync,
  stopRealtimeSync,
};
