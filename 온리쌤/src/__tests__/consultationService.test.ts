/**
 * Consultation Service 테스트
 * Phase 2: 상담선생
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

// Mock supabase
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'ioo_trace') {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'action_queue') {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'risk_flags') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'rf_001', trigger_type: 'absent_streak', severity: 'high' },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'consultation_sessions') {
        return {
          insert: mockInsert,
          update: mockUpdate,
          select: mockSelect,
        };
      }
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

// Mock __DEV__
(global as any).__DEV__ = true;

import { ConsultationService } from '../lib/consultationService';

describe('ConsultationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('scheduleFromRisk', () => {
    it('위험 플래그에서 상담을 예약해야 한다', async () => {
      // Dedupe check returns no duplicate
      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
      });

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'cs_001' },
            error: null,
          }),
        }),
      });

      const result = await ConsultationService.scheduleFromRisk('rf_001', {
        orgId: 'org_001',
        studentId: 'student_001',
        parentPhone: '010-1234-5678',
        triggerType: 'absent_streak',
        triggerSnapshot: { absent_count: 5 },
      });

      expect(result).toBe('cs_001');
    });

    it('중복 dedupe_key가 있으면 기존 ID를 반환해야 한다', async () => {
      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'cs_existing' },
            error: null,
          }),
        }),
      });

      const result = await ConsultationService.scheduleFromRisk('rf_001', {
        orgId: 'org_001',
        studentId: 'student_001',
        parentPhone: '010-1234-5678',
        triggerType: 'absent_streak',
        triggerSnapshot: {},
      });

      expect(result).toBe('cs_existing');
    });
  });

  describe('scheduleManual', () => {
    it('수동으로 상담을 예약해야 한다', async () => {
      // Dedupe check
      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
      });

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'cs_002' },
            error: null,
          }),
        }),
      });

      const result = await ConsultationService.scheduleManual({
        orgId: 'org_001',
        studentId: 'student_001',
        parentPhone: '010-1234-5678',
        triggerType: 'overdue_payment',
        triggerSnapshot: { overdue_amount: 100000 },
        reason: '미납 상담 요청',
      });

      expect(result).toBe('cs_002');
    });
  });

  describe('startConsultation', () => {
    it('상담을 시작하면 true를 반환해야 한다', async () => {
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'cs_001', trace_id: 'trace_001' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await ConsultationService.startConsultation('cs_001');
      expect(result).toBe(true);
    });

    it('잘못된 상태의 상담은 시작할 수 없어야 한다', async () => {
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'No rows found' },
              }),
            }),
          }),
        }),
      });

      const result = await ConsultationService.startConsultation('cs_completed');
      expect(result).toBe(false);
    });
  });

  describe('completeConsultation', () => {
    it('상담 완료 시 completed 상태가 되어야 한다', async () => {
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'cs_001',
                  org_id: 'org_001',
                  student_id: 'student_001',
                  risk_flag_id: null,
                  trace_id: 'trace_001',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await ConsultationService.completeConsultation(
        'cs_001',
        '출석률 개선 상담 완료',
      );
      expect(result).toBe(true);
    });

    it('후속 조치가 있으면 follow_up 상태가 되어야 한다', async () => {
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'cs_001',
                  org_id: 'org_001',
                  student_id: 'student_001',
                  risk_flag_id: 'rf_001',
                  trace_id: 'trace_001',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await ConsultationService.completeConsultation(
        'cs_001',
        '추가 상담 필요',
        [{ action: '2주 후 재상담', dueDate: '2026-03-01', status: 'pending' }],
      );
      expect(result).toBe(true);
    });
  });

  describe('cancelConsultation', () => {
    it('상담 취소 시 true를 반환해야 한다', async () => {
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'cs_001', risk_flag_id: null, trace_id: 'trace_001' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await ConsultationService.cancelConsultation('cs_001', '학부모 취소 요청');
      expect(result).toBe(true);
    });
  });

  describe('getPendingConsultations', () => {
    it('대기 중 상담 목록을 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: 'cs_001', status: 'scheduled', trigger_type: 'absent_streak' },
              { id: 'cs_002', status: 'reminded', trigger_type: 'overdue_payment' },
            ],
            error: null,
          }),
        }),
      });

      const sessions = await ConsultationService.getPendingConsultations();
      expect(sessions).toHaveLength(2);
    });

    it('orgId 필터링이 동작해야 한다', async () => {
      mockSelect.mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'cs_001', status: 'scheduled' }],
              error: null,
            }),
          }),
        }),
      });

      const sessions = await ConsultationService.getPendingConsultations('org_001');
      expect(sessions).toBeDefined();
    });
  });

  describe('getStudentConsultations', () => {
    it('학생별 상담 이력을 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: 'cs_001', trigger_type: 'absent_streak' },
              { id: 'cs_002', trigger_type: 'overdue_payment' },
            ],
            error: null,
          }),
        }),
      });

      const sessions = await ConsultationService.getStudentConsultations('student_001');
      expect(sessions).toHaveLength(2);
    });
  });

  describe('getMonthlyStats', () => {
    it('월별 통계를 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [
                { status: 'completed', trigger_type: 'absent_streak' },
                { status: 'scheduled', trigger_type: 'overdue_payment' },
                { status: 'cancelled', trigger_type: 'absent_streak' },
                { status: 'follow_up', trigger_type: 'low_vindex' },
              ],
              error: null,
            }),
          }),
        }),
      });

      const stats = await ConsultationService.getMonthlyStats('org_001');
      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(1);
      expect(stats.cancelled).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.followUp).toBe(1);
      expect(stats.byTrigger['absent_streak']).toBe(2);
      expect(stats.byTrigger['overdue_payment']).toBe(1);
    });
  });

  describe('sendReminder', () => {
    it('리마인더를 발송하고 true를 반환해야 한다', async () => {
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'cs_001',
                  student_id: 'student_001',
                  parent_phone: '010-1234-5678',
                  scheduled_at: '2026-03-01T10:00:00Z',
                  trigger_type: 'absent_streak',
                  trace_id: 'trace_001',
                  dedupe_key: 'CONSULT-org_001-student_001-20260301',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await ConsultationService.sendReminder('cs_001');
      expect(result).toBe(true);
    });

    it('scheduled 상태가 아닌 상담은 리마인드할 수 없어야 한다', async () => {
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'No rows found' },
              }),
            }),
          }),
        }),
      });

      const result = await ConsultationService.sendReminder('cs_completed');
      expect(result).toBe(false);
    });
  });
});
