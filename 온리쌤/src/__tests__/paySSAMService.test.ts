/**
 * PaySSAM Service 테스트
 * Phase 2: 결제선생 Integration
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
const mockSingle = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_001' } } }),
    },
    from: jest.fn((table: string) => {
      if (table === 'ioo_trace') {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'payment_invoices') {
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

import { PaySSAMService } from '../lib/paySSAMService';

describe('PaySSAMService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('createInvoice', () => {
    it('청구서를 생성하고 ID를 반환해야 한다', async () => {
      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'inv_001' },
            error: null,
          }),
        }),
      });

      const result = await PaySSAMService.createInvoice({
        orgId: 'org_001',
        studentId: 'student_001',
        parentPhone: '010-1234-5678',
        amount: 100000,
        description: '3월 수강료',
      });

      expect(result).toBe('inv_001');
    });

    it('중복 dedupe_key 시 null을 반환해야 한다 (23505)', async () => {
      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
          }),
        }),
      });

      const result = await PaySSAMService.createInvoice({
        orgId: 'org_001',
        studentId: 'student_001',
        parentPhone: '010-1234-5678',
        amount: 100000,
        description: '3월 수강료',
      });

      expect(result).toBeNull();
    });

    it('amount가 포함되어야 한다', async () => {
      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'inv_002' },
            error: null,
          }),
        }),
      });

      await PaySSAMService.createInvoice({
        orgId: 'org_001',
        studentId: 'student_001',
        parentPhone: '010-1234-5678',
        amount: 50000,
        description: '보충 수업료',
      });

      // insert가 호출되었는지 확인
      expect(mockInsert).toHaveBeenCalled();
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.amount).toBe(50000);
      expect(insertArg.status).toBe('pending');
    });
  });

  describe('sendInvoice', () => {
    it('pending 청구서를 발송하고 true를 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'inv_001',
              status: 'pending',
              parent_phone: '010-1234-5678',
              amount: 100000,
              description: '3월 수강료',
              due_date: '2026-03-01',
              org_id: 'org_001',
              student_id: 'student_001',
              trace_id: 'trace_001',
            },
            error: null,
          }),
        }),
      });

      mockUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await PaySSAMService.sendInvoice('inv_001');
      expect(result).toBe(true);
    });

    it('존재하지 않는 청구서는 false를 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      const result = await PaySSAMService.sendInvoice('nonexistent');
      expect(result).toBe(false);
    });

    it('이미 sent인 청구서는 발송하지 않아야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'inv_001', status: 'sent' },
            error: null,
          }),
        }),
      });

      const result = await PaySSAMService.sendInvoice('inv_001');
      expect(result).toBe(false);
    });
  });

  describe('getInvoice', () => {
    it('청구서를 조회해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'inv_001', status: 'pending', amount: 100000 },
            error: null,
          }),
        }),
      });

      const invoice = await PaySSAMService.getInvoice('inv_001');
      expect(invoice).toBeDefined();
      expect(invoice?.id).toBe('inv_001');
    });

    it('없는 청구서는 null을 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      const invoice = await PaySSAMService.getInvoice('nonexistent');
      expect(invoice).toBeNull();
    });
  });

  describe('getStudentInvoices', () => {
    it('학생의 청구서 목록을 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: 'inv_001', amount: 100000 },
              { id: 'inv_002', amount: 50000 },
            ],
            error: null,
          }),
        }),
      });

      const invoices = await PaySSAMService.getStudentInvoices('student_001');
      expect(invoices).toHaveLength(2);
    });
  });

  describe('confirmPayment', () => {
    it('수납 확인 시 paid 상태로 변경하고 true를 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'inv_001', trace_id: 'trace_001', student_id: 'student_001', status: 'sent' },
            error: null,
          }),
        }),
      });

      mockUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await PaySSAMService.confirmPayment('PAYSSAM-INV-001', { paid: true });
      expect(result).toBe(true);
    });

    it('이미 paid인 경우 false를 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'inv_001', status: 'paid' },
            error: null,
          }),
        }),
      });

      const result = await PaySSAMService.confirmPayment('PAYSSAM-INV-001', {});
      expect(result).toBe(false);
    });
  });

  describe('cancelInvoice', () => {
    it('pending 청구서를 취소하고 true를 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'inv_001', trace_id: 'trace_001', status: 'pending', payssam_invoice_id: null },
            error: null,
          }),
        }),
      });

      mockUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await PaySSAMService.cancelInvoice('inv_001', '고객 요청');
      expect(result).toBe(true);
    });

    it('paid 청구서는 취소할 수 없어야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'inv_001', status: 'paid' },
            error: null,
          }),
        }),
      });

      const result = await PaySSAMService.cancelInvoice('inv_001');
      expect(result).toBe(false);
    });
  });

  describe('getMonthlyStats', () => {
    it('월별 통계를 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [
                { status: 'paid', amount: 100000, point_cost: 55 },
                { status: 'sent', amount: 50000, point_cost: 55 },
                { status: 'paid', amount: 80000, point_cost: 55 },
              ],
              error: null,
            }),
          }),
        }),
      });

      const stats = await PaySSAMService.getMonthlyStats('org_001');
      expect(stats.total).toBe(3);
      expect(stats.paid).toBe(2);
      expect(stats.unpaid).toBe(1);
      expect(stats.paidAmount).toBe(180000);
      expect(stats.unpaidAmount).toBe(50000);
      expect(stats.pointCost).toBe(165);
    });

    it('데이터가 없으면 빈 통계를 반환해야 한다', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const stats = await PaySSAMService.getMonthlyStats('org_001');
      expect(stats.total).toBe(0);
      expect(stats.paid).toBe(0);
    });
  });
});
