/**
 * 🗄️ 올댓바스켓 전역 상태 관리
 *
 * 문제: 각 화면이 독립적으로 state 관리 → 데이터 흐름 없음
 * 해결: 중앙 집중식 상태 관리 + 이벤트 기반 업데이트
 *
 * v2.0 - Supabase 실제 연동
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConnected, statsAPI } from './pages/allthatbasket/lib/supabase.js';
import { attendanceAPI, paymentAPI, notificationAPI } from './services/allthatbasket.js';

// ============================================
// 초기 상태
// ============================================
const initialState = {
  // 인증
  currentUser: null,
  currentRole: null, // 'owner' | 'admin' | 'coach' | 'parent'

  // 조직 구조
  staff: [], // { id, name, role, assignedBy, status }

  // 핵심 데이터
  students: [],
  payments: [],
  classes: [],

  // 피드백 시스템 (핵심!)
  feedbacks: [], // admin → owner
  approvals: [], // owner 승인 대기

  // 업무 관리
  tasks: [], // coach 업무

  // 외부 시스템 연결
  connections: [],

  // 인사이트 (자동 생성)
  insights: [],

  // 이벤트 로그 (Shadow Learning 데이터)
  events: [],

  // UI 상태
  loading: false,
  error: null,

  // 대시보드 KPI (Supabase statsAPI)
  dashboardStats: null, // { monthlyCollected, totalOutstanding, newStudentsThisMonth, todayAttendanceRate, ... }
};

// ============================================
// 액션 타입
// ============================================
const ActionTypes = {
  // 인증
  SET_USER: 'SET_USER',
  SET_ROLE: 'SET_ROLE',

  // 데이터 로드
  LOAD_DATA: 'LOAD_DATA',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',

  // 조직 관리 (원장)
  ASSIGN_ROLE: 'ASSIGN_ROLE',

  // 피드백 (관리자 → 원장)
  SEND_FEEDBACK: 'SEND_FEEDBACK',
  READ_FEEDBACK: 'READ_FEEDBACK',

  // 승인 (원장)
  ADD_APPROVAL: 'ADD_APPROVAL',
  DECIDE_APPROVAL: 'DECIDE_APPROVAL',

  // 업무 (코치)
  ADD_TASK: 'ADD_TASK',
  COMPLETE_TASK: 'COMPLETE_TASK',

  // 외부 시스템 (관리자)
  CONNECT_SYSTEM: 'CONNECT_SYSTEM',
  DISCONNECT_SYSTEM: 'DISCONNECT_SYSTEM',

  // 이벤트 기록 (Shadow Learning)
  LOG_EVENT: 'LOG_EVENT',

  // 인사이트 생성
  GENERATE_INSIGHTS: 'GENERATE_INSIGHTS',

  // 대시보드 KPI
  SET_DASHBOARD_STATS: 'SET_DASHBOARD_STATS',

  // 출석 관리
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
  UPDATE_ATTENDANCE: 'UPDATE_ATTENDANCE',

  // 결제 관리
  ADD_PAYMENT: 'ADD_PAYMENT',
  COMPLETE_PAYMENT: 'COMPLETE_PAYMENT',
  UPDATE_PAYMENT: 'UPDATE_PAYMENT',

  // 알림
  SEND_NOTIFICATION: 'SEND_NOTIFICATION',
};

// ============================================
// 리듀서
// ============================================
function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return { ...state, currentUser: action.payload };

    case ActionTypes.SET_ROLE:
      return { ...state, currentRole: action.payload };

    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };

    case ActionTypes.LOAD_DATA:
      return { ...state, ...action.payload, loading: false };

    // 원장: 역할 지정
    case ActionTypes.ASSIGN_ROLE: {
      const { staffId, newRole } = action.payload;
      const updatedStaff = state.staff.map(s =>
        s.id === staffId ? { ...s, role: newRole, assignedBy: state.currentUser?.id } : s
      );
      // 이벤트 기록
      const event = {
        type: 'ROLE_ASSIGNED',
        actor: state.currentUser?.id,
        target: staffId,
        data: { newRole },
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        staff: updatedStaff,
        events: [...state.events, event],
      };
    }

    // 관리자 → 원장 피드백
    case ActionTypes.SEND_FEEDBACK: {
      const feedback = {
        id: Date.now(),
        from: state.currentUser?.name || '관리자',
        fromId: state.currentUser?.id,
        type: action.payload.type, // 'report' | 'alert' | 'request'
        title: action.payload.title,
        items: action.payload.items,
        status: 'unread',
        createdAt: new Date().toISOString(),
      };
      const event = {
        type: 'FEEDBACK_SENT',
        actor: state.currentUser?.id,
        data: feedback,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        feedbacks: [...state.feedbacks, feedback],
        events: [...state.events, event],
      };
    }

    case ActionTypes.READ_FEEDBACK: {
      const updatedFeedbacks = state.feedbacks.map(f =>
        f.id === action.payload ? { ...f, status: 'read' } : f
      );
      return { ...state, feedbacks: updatedFeedbacks };
    }

    // 승인 요청 추가
    case ActionTypes.ADD_APPROVAL: {
      const approval = {
        id: Date.now(),
        ...action.payload,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        approvals: [...state.approvals, approval],
      };
    }

    // 원장 승인/거절
    case ActionTypes.DECIDE_APPROVAL: {
      const { approvalId, decision } = action.payload;
      const updatedApprovals = state.approvals.map(a =>
        a.id === approvalId ? { ...a, status: decision, decidedAt: new Date().toISOString() } : a
      );
      const event = {
        type: 'APPROVAL_DECIDED',
        actor: state.currentUser?.id,
        target: approvalId,
        data: { decision },
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        approvals: updatedApprovals,
        events: [...state.events, event],
      };
    }

    // 코치 업무
    case ActionTypes.ADD_TASK: {
      const task = {
        id: Date.now(),
        ...action.payload,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      return { ...state, tasks: [...state.tasks, task] };
    }

    case ActionTypes.COMPLETE_TASK: {
      const updatedTasks = state.tasks.map(t =>
        t.id === action.payload ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t
      );
      const event = {
        type: 'TASK_COMPLETED',
        actor: state.currentUser?.id,
        target: action.payload,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        tasks: updatedTasks,
        events: [...state.events, event],
      };
    }

    // 외부 시스템 연결
    case ActionTypes.CONNECT_SYSTEM: {
      const updatedConnections = state.connections.map(c =>
        c.id === action.payload ? { ...c, status: 'connected', connectedAt: new Date().toISOString() } : c
      );
      return { ...state, connections: updatedConnections };
    }

    case ActionTypes.DISCONNECT_SYSTEM: {
      const updatedConnections = state.connections.map(c =>
        c.id === action.payload ? { ...c, status: 'pending', connectedAt: null } : c
      );
      return { ...state, connections: updatedConnections };
    }

    // 이벤트 기록 (Shadow Learning)
    case ActionTypes.LOG_EVENT: {
      const event = {
        ...action.payload,
        timestamp: new Date().toISOString(),
      };
      return { ...state, events: [...state.events, event] };
    }

    // 인사이트 자동 생성
    case ActionTypes.GENERATE_INSIGHTS: {
      return { ...state, insights: action.payload };
    }

    // 대시보드 KPI (Supabase 연동)
    case ActionTypes.SET_DASHBOARD_STATS: {
      return { ...state, dashboardStats: action.payload };
    }

    // 출석 체크인
    case ActionTypes.CHECK_IN: {
      const { studentId, attendance } = action.payload;
      const updatedStudents = state.students.map(s =>
        s.id === studentId ? { ...s, todayAttendance: 'present' } : s
      );
      const event = {
        type: 'ATTENDANCE_CHECK_IN',
        studentId,
        data: attendance,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        students: updatedStudents,
        attendance: [...(state.attendance || []), attendance],
        events: [...state.events, event],
      };
    }

    // 출석 체크아웃
    case ActionTypes.CHECK_OUT: {
      const { studentId } = action.payload;
      const updatedStudents = state.students.map(s =>
        s.id === studentId ? { ...s, todayAttendance: 'checked_out' } : s
      );
      return { ...state, students: updatedStudents };
    }

    // 출석 업데이트
    case ActionTypes.UPDATE_ATTENDANCE: {
      return { ...state, attendance: action.payload };
    }

    // 결제 추가
    case ActionTypes.ADD_PAYMENT: {
      return {
        ...state,
        payments: [...(state.payments || []), action.payload],
      };
    }

    // 결제 완료
    case ActionTypes.COMPLETE_PAYMENT: {
      const updatedPayments = (state.payments || []).map(p =>
        p.id === action.payload.id ? { ...p, status: 'completed' } : p
      );
      const updatedApprovals = state.approvals.filter(a => a.id !== action.payload.approvalId);
      return { ...state, payments: updatedPayments, approvals: updatedApprovals };
    }

    // 결제 상태 업데이트
    case ActionTypes.UPDATE_PAYMENT: {
      const updatedPayments = (state.payments || []).map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload } : p
      );
      return { ...state, payments: updatedPayments };
    }

    // 알림 발송 기록
    case ActionTypes.SEND_NOTIFICATION: {
      const event = {
        type: 'NOTIFICATION_SENT',
        data: action.payload,
        timestamp: new Date().toISOString(),
      };
      return { ...state, events: [...state.events, event] };
    }

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================
const StoreContext = createContext(null);

// ============================================
// Provider
// ============================================
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 초기 데이터 로드
  useEffect(() => {
    loadInitialData();

    // Realtime 구독 설정 (Supabase 연결 시)
    let subscription = null;
    if (isSupabaseConnected() && supabase) {
      subscription = supabase
        .channel('allthatbasket-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'atb_students' }, (payload) => {
          console.log('[Realtime] 학생 데이터 변경:', payload);
          loadInitialData(); // 간단하게 전체 리로드 (추후 최적화)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'atb_payments' }, (payload) => {
          console.log('[Realtime] 결제 데이터 변경:', payload);
          loadInitialData();
        })
        .subscribe((status) => {
          console.log('[Realtime] 구독 상태:', status);
        });
    }

    return () => {
      if (subscription) {
        supabase?.removeChannel(subscription);
      }
    };
  }, []);

  // 인사이트 자동 생성 (상태 변경 시)
  useEffect(() => {
    if (state.currentRole === 'owner') {
      generateInsights();
    }
  }, [state.feedbacks, state.approvals, state.tasks, state.events]);

  // 초기 데이터 로드 (Supabase 우선, Fallback 지원)
  const loadInitialData = async () => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });

    // Supabase 연결 확인
    const isConnected = isSupabaseConnected();
    console.log('[Store] Supabase 연결 상태:', isConnected ? '✅ 연결됨' : '⚠️ 로컬 모드');

    if (isConnected && supabase) {
      try {
        // 직접 Supabase 쿼리 (실제 스키마에 맞춤)
        const { data: studentsRaw, error: studentsError } = await supabase
          .from('atb_students')
          .select('*')
          .order('name');

        const { data: classesRaw, error: classesError } = await supabase
          .from('atb_classes')
          .select('*')
          .order('name');

        if (studentsError) {
          console.error('[Store] 학생 로드 실패:', studentsError);
        }

        // 학생 데이터 변환 (실제 스키마 매핑 - atb_students)
        // attendance_rate, enrollment_status, total_outstanding
        const students = (studentsRaw || []).map(s => {
          const rate = Number(s.attendance_rate ?? s.engagement_score ?? 70);
          const status = s.enrollment_status === 'withdrawn' ? 'danger'
            : rate >= 80 ? 'active' : rate >= 60 ? 'warning' : 'danger';
          return {
            id: s.id,
            name: s.name,
            class: s.grade || '미배정',
            status,
            attendanceRate: rate,
            total_outstanding: s.total_outstanding ?? 0,
            parentPhone: s.parent_phone,
            enrollment_date: s.enrollment_date,
          };
        });

        // 수업 데이터
        const classes = (classesRaw || []).map(c => ({
          id: c.id,
          name: c.name,
          time: c.start_time || '16:00',
          studentCount: c.max_students || 0,
        }));

        // 스태프 (더미 - 나중에 coaches 테이블 연결)
        const staff = [
          { id: 'admin-1', name: '김관리', role: 'admin', status: 'active' },
          { id: 'coach-1', name: '박코치', role: 'coach', status: 'active' },
          { id: 'coach-2', name: '이코치', role: 'coach', status: 'active' },
        ];

        // 승인 대기 (위험 학생 기반)
        const approvals = students
          .filter(s => s.status === 'warning' || s.status === 'danger')
          .map((s, i) => ({
            id: `approval-${i}`,
            title: s.status === 'danger' ? '참여율 저조' : '주의 필요',
            studentName: s.name,
            type: 'attendance',
            status: 'pending',
          }));

        console.log('[Store] 데이터 로드 완료:', {
          students: students.length,
          classes: classes.length,
          approvals: approvals.length,
        });

        // 대시보드 KPI 로드 (Supabase)
        const { data: dashboardStats } = await statsAPI.getDashboard();
        if (dashboardStats) {
          dispatch({ type: ActionTypes.SET_DASHBOARD_STATS, payload: dashboardStats });
        }

        dispatch({
          type: ActionTypes.LOAD_DATA,
          payload: {
            students,
            staff,
            classes,
            approvals,
            connections: [
              { id: 1, name: '네이버 예약', type: 'booking', status: 'connected', icon: '📅' },
              { id: 2, name: '카카오 알림톡', type: 'notification', status: 'connected', icon: '💬' },
              { id: 3, name: '홈페이지', type: 'website', status: 'connected', icon: '🌐' },
              { id: 4, name: '토스 페이먼츠', type: 'payment', status: 'pending', icon: '💳' },
            ],
            feedbacks: [],
            insights: [],
            events: [],
            tasks: [
              { id: 1, title: '오후반 출석 체크', time: '16:00', status: 'pending', coachId: 'coach-1', type: 'attendance' },
              { id: 2, title: '학부모 상담', time: '17:00', status: 'pending', coachId: 'coach-1', type: 'contact' },
            ],
            _supabaseConnected: true,
          },
        });
        return;
      } catch (e) {
        console.error('[Store] Supabase 데이터 로드 실패:', e);
      }
    }

    // Fallback: 로컬 더미 데이터 (하지만 상태 관리는 실제로 동작)
    console.log('[Store] 로컬 더미 데이터 사용');
    const { data: fallbackStats } = await statsAPI.getDashboard();
    if (fallbackStats) {
      dispatch({ type: ActionTypes.SET_DASHBOARD_STATS, payload: fallbackStats });
    }
    dispatch({
      type: ActionTypes.LOAD_DATA,
      payload: {
        staff: [
          { id: 1, name: '김관리', role: 'admin', status: 'active' },
          { id: 2, name: '박코치', role: 'coach', status: 'active', assignedBy: 1 },
          { id: 3, name: '이코치', role: 'coach', status: 'active', assignedBy: 1 },
          { id: 4, name: '최코치', role: null, status: 'pending' },
        ],
        students: [
          { id: 1, name: '김민준', class: 'U-12 주니어반', status: 'active', attendanceRate: 92 },
          { id: 2, name: '이서연', class: 'U-12 주니어반', status: 'warning', attendanceRate: 75 },
          { id: 3, name: '박지호', class: 'U-15 중등반', status: 'active', attendanceRate: 88 },
          { id: 4, name: '최예은', class: 'U-15 중등반', status: 'danger', attendanceRate: 55 },
        ],
        classes: [
          { id: 1, name: 'U-12 주니어반', time: '16:00', studentCount: 12 },
          { id: 2, name: 'U-15 중등반', time: '18:00', studentCount: 8 },
          { id: 3, name: '성인 취미반', time: '20:00', studentCount: 6 },
        ],
        tasks: [
          { id: 1, title: 'U-12반 출석 체크', time: '16:00', status: 'completed', coachId: 2, type: 'attendance' },
          { id: 2, title: '김민준 영상 촬영', time: '16:30', status: 'completed', coachId: 2, type: 'video' },
          { id: 3, title: '학부모 상담', time: '17:00', status: 'pending', coachId: 2, type: 'contact' },
          { id: 4, title: 'U-15반 출석 체크', time: '18:00', status: 'pending', coachId: 3, type: 'attendance' },
        ],
        connections: [
          { id: 1, name: '네이버 예약', type: 'booking', status: 'connected', icon: '📅' },
          { id: 2, name: '카카오 알림톡', type: 'notification', status: 'connected', icon: '💬' },
          { id: 3, name: '홈페이지', type: 'website', status: 'connected', icon: '🌐' },
          { id: 4, name: '토스 페이먼츠', type: 'payment', status: 'pending', icon: '💳' },
        ],
        approvals: [
          { id: 1, title: '결제 실패', studentName: '김민준', type: 'payment', amount: 150000, status: 'pending' },
          { id: 2, title: '연속 결석 3회', studentName: '이서연', type: 'absence', status: 'pending' },
        ],
        feedbacks: [],
        insights: [],
        events: [],
        _supabaseConnected: false,
      },
    });
  };

  // 인사이트 자동 생성 (데이터 기반)
  const generateInsights = () => {
    const insights = [];

    // 1. 미처리 피드백 확인
    const unreadFeedbacks = state.feedbacks.filter(f => f.status === 'unread');
    if (unreadFeedbacks.length > 0) {
      insights.push({
        id: 'feedback-' + Date.now(),
        type: 'alert',
        title: `미확인 피드백 ${unreadFeedbacks.length}건`,
        description: '관리자가 보낸 피드백을 확인하세요',
        priority: 'high',
        action: '피드백 확인',
      });
    }

    // 2. 미처리 승인 확인
    const pendingApprovals = state.approvals.filter(a => a.status === 'pending');
    if (pendingApprovals.length > 0) {
      insights.push({
        id: 'approval-' + Date.now(),
        type: 'risk',
        title: `승인 대기 ${pendingApprovals.length}건`,
        description: '결제, 출석, 환불 관련 승인이 필요합니다',
        priority: 'high',
        action: '승인 처리',
      });
    }

    // 3. 위험 학생 확인
    const dangerStudents = state.students.filter(s => s.status === 'danger' || (s.attendanceRate || 100) < 60);
    if (dangerStudents.length > 0) {
      insights.push({
        id: 'students-' + Date.now(),
        type: 'risk',
        title: `위험 학생 ${dangerStudents.length}명`,
        description: `${dangerStudents.map(s => s.name).join(', ')} - 출석률 저조 또는 이탈 위험`,
        priority: 'medium',
        action: '학생 관리',
      });
    }

    // 4. 업무 완료율 확인
    const completedTasks = state.tasks.filter(t => t.status === 'completed').length;
    const totalTasks = state.tasks.length;
    if (totalTasks > 0 && completedTasks === totalTasks) {
      insights.push({
        id: 'tasks-' + Date.now(),
        type: 'growth',
        title: '오늘 업무 100% 완료',
        description: '코치들이 모든 업무를 완료했습니다',
        priority: 'low',
        action: '확인',
      });
    }

    dispatch({ type: ActionTypes.GENERATE_INSIGHTS, payload: insights });
  };

  // 액션 함수들
  const actions = {
    setRole: (role) => dispatch({ type: ActionTypes.SET_ROLE, payload: role }),
    setUser: (user) => dispatch({ type: ActionTypes.SET_USER, payload: user }),

    // 원장 액션
    assignRole: (staffId, newRole) => dispatch({ type: ActionTypes.ASSIGN_ROLE, payload: { staffId, newRole } }),
    decideApproval: (approvalId, decision) => dispatch({ type: ActionTypes.DECIDE_APPROVAL, payload: { approvalId, decision } }),
    readFeedback: (feedbackId) => dispatch({ type: ActionTypes.READ_FEEDBACK, payload: feedbackId }),

    // 관리자 액션
    sendFeedback: (feedback) => dispatch({ type: ActionTypes.SEND_FEEDBACK, payload: feedback }),
    addApproval: (approval) => dispatch({ type: ActionTypes.ADD_APPROVAL, payload: approval }),
    connectSystem: (connectionId) => dispatch({ type: ActionTypes.CONNECT_SYSTEM, payload: connectionId }),
    disconnectSystem: (connectionId) => dispatch({ type: ActionTypes.DISCONNECT_SYSTEM, payload: connectionId }),

    // 코치 액션
    completeTask: (taskId) => dispatch({ type: ActionTypes.COMPLETE_TASK, payload: taskId }),
    addTask: (task) => dispatch({ type: ActionTypes.ADD_TASK, payload: task }),

    // 출석 액션
    checkIn: async (studentId, classId = null) => {
      console.log('[checkIn] 호출됨:', { studentId, classId });
      try {
        const result = await attendanceAPI.checkIn(studentId, classId);
        console.log('[checkIn] API 결과:', result);
        if (result.data && !result.error) {
          dispatch({ type: ActionTypes.CHECK_IN, payload: { studentId, attendance: result.data } });
          console.log('[checkIn] 상태 업데이트 완료');
          // 학부모에게 알림 발송
          const student = state.students.find(s => s.id === studentId);
          if (student?.parentPhone) {
            await notificationAPI.sendAttendanceAlert(student.name, student.parentPhone, 'present');
            dispatch({ type: ActionTypes.SEND_NOTIFICATION, payload: { type: 'attendance', studentId } });
          }
        }
        return result;
      } catch (error) {
        console.error('[checkIn] 에러:', error);
        return { data: null, error };
      }
    },
    checkOut: async (studentId) => {
      const result = await attendanceAPI.checkOut(studentId);
      if (result.data && !result.error) {
        dispatch({ type: ActionTypes.CHECK_OUT, payload: { studentId } });
      }
      return result;
    },
    markAbsent: async (studentId, date, reason) => {
      const result = await attendanceAPI.markAbsent(studentId, date, reason);
      if (result.data && !result.error) {
        // 학부모에게 결석 알림
        const student = state.students.find(s => s.id === studentId);
        if (student?.parentPhone) {
          await notificationAPI.sendAttendanceAlert(student.name, student.parentPhone, 'absent');
        }
      }
      return result;
    },
    getTodayAttendance: async (classId) => {
      return attendanceAPI.getTodayAttendance(classId);
    },

    // 결제 액션
    createPayment: async (studentId, amount, month) => {
      const result = await paymentAPI.create(studentId, amount, month);
      if (result.data && !result.error) {
        dispatch({ type: ActionTypes.ADD_PAYMENT, payload: result.data });
        // 학부모에게 결제 알림
        const student = state.students.find(s => s.id === studentId);
        if (student?.parentPhone) {
          await notificationAPI.sendPaymentAlert(student.name, student.parentPhone, amount, result.data.due_date);
        }
      }
      return result;
    },
    completePayment: async (paymentId, approvalId = null) => {
      const result = await paymentAPI.complete(paymentId);
      if (result.data && !result.error) {
        dispatch({ type: ActionTypes.COMPLETE_PAYMENT, payload: { id: paymentId, approvalId } });
      }
      return result;
    },
    getOutstandingPayments: async () => {
      return paymentAPI.getOutstanding();
    },

    // 알림 액션
    sendNotification: async (type, recipient, data) => {
      const result = await notificationAPI.send(type, recipient, data);
      dispatch({ type: ActionTypes.SEND_NOTIFICATION, payload: { type, recipient, data } });
      return result;
    },
    sendAnnouncement: async (title, content) => {
      const recipients = state.students
        .filter(s => s.parentPhone)
        .map(s => s.parentPhone);
      return notificationAPI.sendAnnouncement(recipients, title, content);
    },

    // 이벤트 로깅
    logEvent: (event) => dispatch({ type: ActionTypes.LOG_EVENT, payload: event }),

    // 데이터 새로고침
    refresh: loadInitialData,
  };

  return (
    <StoreContext.Provider value={{ state, actions, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

// ============================================
// Hook
// ============================================
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}

// ============================================
// 선택자 (Selectors)
// ============================================
export const selectors = {
  // 원장용
  getUnreadFeedbacks: (state) => state.feedbacks.filter(f => f.status === 'unread'),
  getPendingApprovals: (state) => state.approvals.filter(a => a.status === 'pending'),
  getStaffByRole: (state, role) => state.staff.filter(s => s.role === role),

  // 관리자용
  getCoaches: (state) => state.staff.filter(s => s.role === 'coach'),
  getConnectedSystems: (state) => state.connections.filter(c => c.status === 'connected'),

  // 코치용
  getMyTasks: (state, coachId) => state.tasks.filter(t => t.coachId === coachId),
  getPendingTasks: (state) => state.tasks.filter(t => t.status === 'pending'),

  // 통계
  getStudentStats: (state) => {
    const students = state.students;
    return {
      total: students.length,
      normal: students.filter(s => (s.attendanceRate || 100) >= 80).length,
      warning: students.filter(s => (s.attendanceRate || 100) >= 60 && (s.attendanceRate || 100) < 80).length,
      danger: students.filter(s => (s.attendanceRate || 100) < 60).length,
    };
  },

  getTaskStats: (state) => {
    const tasks = state.tasks;
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
    };
  },
};

export { supabase, ActionTypes, isSupabaseConnected };
