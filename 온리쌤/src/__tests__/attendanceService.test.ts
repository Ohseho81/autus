/**
 * AttendanceService 테스트
 * 출석 체크 16단계 프로세스의 핵심 비즈니스 로직 검증
 */

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

// Mock PersonalAIService
jest.mock('../services/PersonalAIService', () => ({
  __esModule: true,
  default: {
    logEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

// Supabase mock helpers
const mockFromHandlers: Record<string, any> = {};

const createChainMock = () => {
  const mock: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return mock;
};

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (mockFromHandlers[table]) {
        return mockFromHandlers[table]();
      }
      return createChainMock();
    }),
  },
}));

// Mock __DEV__
(global as any).__DEV__ = true;

// Mock setImmediate for notification async processing
(global as any).setImmediate = (fn: () => void) => fn();

import {
  attendanceService,
  AttendanceError,
  AttendanceStatus,
} from '../services/AttendanceService';

describe('AttendanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    Object.keys(mockFromHandlers).forEach(key => delete mockFromHandlers[key]);
  });

  describe('checkAttendance - 입력 검증', () => {
    it('잘못된 출석번호 형식(3자리)이면 INVALID_NUMBER 에러를 반환해야 한다', async () => {
      const result = await attendanceService.checkAttendance('123');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.INVALID_NUMBER);
      expect(result.errorMessage).toBe('출석번호를 다시 확인해주세요');
    });

    it('잘못된 출석번호 형식(문자 포함)이면 INVALID_NUMBER 에러를 반환해야 한다', async () => {
      const result = await attendanceService.checkAttendance('12ab');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.INVALID_NUMBER);
    });

    it('빈 문자열이면 INVALID_NUMBER 에러를 반환해야 한다', async () => {
      const result = await attendanceService.checkAttendance('');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.INVALID_NUMBER);
    });

    it('5자리 이상이면 INVALID_NUMBER 에러를 반환해야 한다', async () => {
      const result = await attendanceService.checkAttendance('12345');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.INVALID_NUMBER);
    });
  });

  describe('checkAttendance - 학생 조회 실패', () => {
    it('DB에 없는 출석번호이면 INVALID_NUMBER 에러를 반환해야 한다', async () => {
      mockFromHandlers['atb_students'] = () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      });

      const result = await attendanceService.checkAttendance('9999');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.INVALID_NUMBER);
    });
  });

  describe('checkAttendance - 유효성 검증', () => {
    const activeStudent = {
      id: 'student_001',
      name: '김민수',
      attendance_number: '0001',
      payment_status: 'active',
      sessions_remaining: 10,
      parent_phone: '010-1234-5678',
      parent_kakao_id: 'kakao_001',
    };

    function setupStudentLookup(student: any) {
      mockFromHandlers['atb_students'] = () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: student, error: null }),
            }),
          }),
        }),
      });
    }

    it('미납 상태인 학생은 PAYMENT_OVERDUE 에러를 반환해야 한다', async () => {
      setupStudentLookup({ ...activeStudent, payment_status: 'overdue' });

      const result = await attendanceService.checkAttendance('0001');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.PAYMENT_OVERDUE);
      expect(result.errorMessage).toContain('미납');
    });

    it('회차가 소진된 학생은 SESSIONS_DEPLETED 에러를 반환해야 한다', async () => {
      setupStudentLookup({ ...activeStudent, sessions_remaining: 0 });

      const result = await attendanceService.checkAttendance('0001');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.SESSIONS_DEPLETED);
      expect(result.errorMessage).toContain('잔여 회차');
    });

    it('sessions_remaining이 null이면 회차 제한 없이 통과해야 한다', async () => {
      setupStudentLookup({ ...activeStudent, sessions_remaining: null });

      // 수업 없는 경우를 위해 session lookup도 설정
      mockFromHandlers['atb_sessions'] = () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          }),
        }),
      });

      const result = await attendanceService.checkAttendance('0001');
      // sessions_remaining null이므로 회차 체크 통과, 하지만 수업이 없으므로 WRONG_CLASS
      expect(result.error).toBe(AttendanceError.WRONG_CLASS);
    });

    it('현재 시간에 수업이 없으면 WRONG_CLASS 에러를 반환해야 한다', async () => {
      setupStudentLookup(activeStudent);

      mockFromHandlers['atb_sessions'] = () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          }),
        }),
      });

      const result = await attendanceService.checkAttendance('0001');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.WRONG_CLASS);
    });
  });

  describe('checkAttendance - 성공 케이스', () => {
    const activeStudent = {
      id: 'student_001',
      name: '김민수',
      attendance_number: '0001',
      payment_status: 'active',
      sessions_remaining: 10,
      parent_phone: '010-1234-5678',
      parent_kakao_id: 'kakao_001',
    };

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5분 전 시작
    const endTime = new Date(now.getTime() + 55 * 60 * 1000); // 55분 후 종료

    const mockSession = {
      id: 'session_001',
      session_date: todayStr,
      start_time: startTime.toTimeString().slice(0, 5),
      end_time: endTime.toTimeString().slice(0, 5),
      status: 'in_progress',
      atb_classes: { name: '초등 농구반' },
    };

    function setupFullFlow(student: any, session: any, existingAttendance: any = null) {
      mockFromHandlers['atb_students'] = () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: student, error: null }),
            }),
          }),
        }),
      });

      mockFromHandlers['atb_sessions'] = () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: session, error: null }),
              }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      mockFromHandlers['atb_session_students'] = () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingAttendance,
                error: existingAttendance ? null : { message: 'Not found' },
              }),
            }),
          }),
        }),
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'record_001' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      mockFromHandlers['atb_notifications'] = () => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      mockFromHandlers['atb_audit_logs'] = () => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });
    }

    it('정상적인 출석 체크 시 success를 반환해야 한다', async () => {
      setupFullFlow(activeStudent, mockSession);

      const result = await attendanceService.checkAttendance('0001');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.studentName).toBe('김민수');
      expect(result.data?.className).toBe('초등 농구반');
    });

    it('성공 시 metrics가 포함되어야 한다', async () => {
      setupFullFlow(activeStudent, mockSession);

      const result = await attendanceService.checkAttendance('0001');
      expect(result.metrics).toBeDefined();
      expect(result.metrics.startTime).toBeGreaterThan(0);
      expect(typeof result.metrics.totalTime).toBe('number');
    });

    it('이미 출석 완료된 학생은 ALREADY_CHECKED 에러를 반환해야 한다', async () => {
      setupFullFlow(activeStudent, mockSession, {
        attendance_status: 'present',
      });

      const result = await attendanceService.checkAttendance('0001');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.ALREADY_CHECKED);
    });
  });

  describe('AttendanceError enum', () => {
    it('모든 에러 코드가 정의되어 있어야 한다', () => {
      expect(AttendanceError.INVALID_NUMBER).toBe('E001');
      expect(AttendanceError.NOT_ENROLLED).toBe('E002');
      expect(AttendanceError.WRONG_CLASS).toBe('E003');
      expect(AttendanceError.ALREADY_CHECKED).toBe('E004');
      expect(AttendanceError.SESSION_EXPIRED).toBe('E005');
      expect(AttendanceError.PAYMENT_OVERDUE).toBe('E006');
      expect(AttendanceError.SESSIONS_DEPLETED).toBe('E007');
      expect(AttendanceError.TOO_EARLY).toBe('E008');
      expect(AttendanceError.SYSTEM_ERROR).toBe('E999');
    });
  });

  describe('AttendanceStatus enum', () => {
    it('모든 출석 상태가 정의되어 있어야 한다', () => {
      expect(AttendanceStatus.PENDING).toBe('pending');
      expect(AttendanceStatus.PRESENT).toBe('present');
      expect(AttendanceStatus.LATE).toBe('late');
      expect(AttendanceStatus.ABSENT).toBe('absent');
      expect(AttendanceStatus.EXCUSED).toBe('excused');
    });
  });

  describe('checkAttendance - 시스템 오류', () => {
    it('예상치 못한 예외 발생 시 SYSTEM_ERROR를 반환해야 한다', async () => {
      mockFromHandlers['atb_students'] = () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('DB connection failed')),
            }),
          }),
        }),
      });

      const result = await attendanceService.checkAttendance('0001');
      expect(result.success).toBe(false);
      expect(result.error).toBe(AttendanceError.SYSTEM_ERROR);
      expect(result.errorMessage).toContain('시스템 오류');
    });
  });
});
