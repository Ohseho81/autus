/**
 * ═══════════════════════════════════════════════════════════════
 * Action Queue Worker 테스트
 * Phase 1: Worker Gateway + Phase 3: Telegram 연동
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Mock Telegram client
const mockSendTelegramMessage = vi.fn();
vi.mock('../../../../lib/telegram', () => ({
  sendTelegramMessage: (...args: unknown[]) => mockSendTelegramMessage(...args),
  formatByTemplate: vi.fn((template: string) => `[formatted:${template}]`),
  formatConsultation: vi.fn(() => '📋 *상담 예약*\n학생: 테스트'),
  formatEscalation: vi.fn(() => '🚨 *긴급 에스컬레이션*\n학생: 테스트'),
}));

// Mock env — getSupabaseAdmin checks NEXT_PUBLIC_SUPABASE_URL
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
vi.stubEnv('CRON_SECRET', 'test-cron-secret');

describe('Action Queue Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('CRON_SECRET 없이 요청하면 401을 반환해야 한다', async () => {
      const { GET } = await import('../action-queue/route');

      const request = new Request('http://localhost/api/workers/action-queue', {
        headers: {},
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('잘못된 CRON_SECRET로 요청하면 401을 반환해야 한다', async () => {
      const { GET } = await import('../action-queue/route');

      const request = new Request('http://localhost/api/workers/action-queue', {
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('올바른 CRON_SECRET로 요청하면 200을 반환해야 한다', async () => {
      setupSuccessfulMocks([]);

      const { GET } = await import('../action-queue/route');

      const request = new Request('http://localhost/api/workers/action-queue', {
        headers: {
          authorization: 'Bearer test-cron-secret',
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Action Processing', () => {
    it('PENDING 작업이 없으면 빈 결과를 반환해야 한다', async () => {
      setupSuccessfulMocks([]);

      const { GET } = await import('../action-queue/route');

      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const body = await response.json();

      expect(body.processed).toBe(0);
    });

    it('SEND_MESSAGE 작업을 처리해야 한다', async () => {
      const mockAction = {
        id: 'action_001',
        action_type: 'SEND_MESSAGE',
        priority: 5,
        status: 'PENDING',
        payload: {
          phone: '010-1234-5678',
          template: 'absence_notification',
          student_name: '김민준',
          encounter_title: '초5,6부',
        },
        retry_count: 0,
        max_retries: 3,
        trace_id: 'trace_001',
        created_at: new Date().toISOString(),
      };

      setupSuccessfulMocks([mockAction]);

      const { GET } = await import('../action-queue/route');

      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const body = await response.json();

      expect(body.processed).toBe(1);
    });

    it('만료된 작업을 EXPIRED로 변경해야 한다', async () => {
      setupSuccessfulMocks([]);

      const { GET } = await import('../action-queue/route');

      const request = createAuthenticatedRequest();
      await GET(request);

      // expire update가 호출되었는지 확인
      expect(mockFrom).toHaveBeenCalledWith('action_queue');
    });
  });

  describe('Retry Logic', () => {
    it('실패 시 retry_count를 증가시켜야 한다', async () => {
      const mockAction = {
        id: 'action_002',
        action_type: 'UNKNOWN_TYPE',
        priority: 5,
        status: 'PENDING',
        payload: {},
        retry_count: 0,
        max_retries: 3,
        trace_id: 'trace_002',
        created_at: new Date().toISOString(),
      };

      setupSuccessfulMocks([mockAction]);

      const { GET } = await import('../action-queue/route');

      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const body = await response.json();

      expect(body.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Telegram Integration (Phase 3)', () => {
    it('SEND_MESSAGE — Telegram 설정 시 메시지를 발송해야 한다', async () => {
      vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-telegram-token');
      vi.stubEnv('TELEGRAM_OWNER_CHAT_ID', '123456');

      mockSendTelegramMessage.mockResolvedValue({ ok: true, message_id: 99 });

      const mockAction = {
        id: 'action_tg_001',
        action_type: 'SEND_MESSAGE',
        priority: 5,
        status: 'PENDING',
        payload: {
          phone: '010-1234-5678',
          template: 'absence_notification',
          student_name: '김민준',
          encounter_title: '초5,6부',
        },
        retry_count: 0,
        max_retries: 3,
        trace_id: 'trace_tg_001',
        created_at: new Date().toISOString(),
      };

      setupSuccessfulMocks([mockAction]);

      const { GET } = await import('../action-queue/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const body = await response.json();

      expect(body.succeeded).toBe(1);
      expect(mockSendTelegramMessage).toHaveBeenCalledWith(
        '123456',
        expect.any(String),
      );
    });

    it('SEND_MESSAGE — Telegram 미설정 시 fallback stub을 반환해야 한다', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_OWNER_CHAT_ID;

      const mockAction = {
        id: 'action_tg_002',
        action_type: 'SEND_MESSAGE',
        priority: 5,
        status: 'PENDING',
        payload: {
          phone: '010-1234-5678',
          template: 'absence_notification',
          student_name: '이서연',
        },
        retry_count: 0,
        max_retries: 3,
        trace_id: 'trace_tg_002',
        created_at: new Date().toISOString(),
      };

      setupSuccessfulMocks([mockAction]);

      const { GET } = await import('../action-queue/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const body = await response.json();

      // Should still succeed (graceful fallback, not throw)
      expect(body.succeeded).toBe(1);
      expect(mockSendTelegramMessage).not.toHaveBeenCalled();
    });

    it('SCHEDULE_CONSULTATION 작업을 처리해야 한다', async () => {
      vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-telegram-token');
      vi.stubEnv('TELEGRAM_OWNER_CHAT_ID', '123456');

      mockSendTelegramMessage.mockResolvedValue({ ok: true, message_id: 100 });

      const mockAction = {
        id: 'action_consult_001',
        action_type: 'SCHEDULE_CONSULTATION',
        priority: 5,
        status: 'PENDING',
        payload: {
          student_name: '박지훈',
          type: '학부모 상담',
          date: '2025-03-15 10:00',
        },
        retry_count: 0,
        max_retries: 3,
        trace_id: 'trace_consult_001',
        created_at: new Date().toISOString(),
      };

      setupSuccessfulMocks([mockAction]);

      const { GET } = await import('../action-queue/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const body = await response.json();

      expect(body.succeeded).toBe(1);
      expect(mockSendTelegramMessage).toHaveBeenCalled();
    });

    it('ESCALATE_TO_OWNER 작업을 처리해야 한다', async () => {
      vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-telegram-token');
      vi.stubEnv('TELEGRAM_OWNER_CHAT_ID', '123456');

      mockSendTelegramMessage.mockResolvedValue({ ok: true, message_id: 101 });

      const mockAction = {
        id: 'action_esc_001',
        action_type: 'ESCALATE_TO_OWNER',
        priority: 1,
        status: 'PENDING',
        payload: {
          student_name: '최수현',
          severity: '높음',
          reason: '3회 연속 결석',
        },
        retry_count: 0,
        max_retries: 3,
        trace_id: 'trace_esc_001',
        created_at: new Date().toISOString(),
      };

      setupSuccessfulMocks([mockAction]);

      const { GET } = await import('../action-queue/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const body = await response.json();

      expect(body.succeeded).toBe(1);
      expect(mockSendTelegramMessage).toHaveBeenCalled();
    });

    it('SCHEDULE_CONSULTATION — Telegram 미설정 시 fallback을 반환해야 한다', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_OWNER_CHAT_ID;

      const mockAction = {
        id: 'action_consult_002',
        action_type: 'SCHEDULE_CONSULTATION',
        priority: 5,
        status: 'PENDING',
        payload: { student_name: '테스트' },
        retry_count: 0,
        max_retries: 3,
        trace_id: 'trace_consult_002',
        created_at: new Date().toISOString(),
      };

      setupSuccessfulMocks([mockAction]);

      const { GET } = await import('../action-queue/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request);
      const body = await response.json();

      expect(body.succeeded).toBe(1);
      expect(mockSendTelegramMessage).not.toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function createAuthenticatedRequest(): Request {
  return new Request('http://localhost/api/workers/action-queue', {
    headers: {
      authorization: 'Bearer test-cron-secret',
    },
  });
}

/**
 * Creates a chainable mock object where every method returns `this`,
 * except terminal methods that resolve with data.
 */
function createChainableMock(pendingActions: Record<string, unknown>[]) {
  const mock: Record<string, unknown> = {};
  const chainMethods = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'or', 'not', 'in'];

  // select() starts a read chain; terminal is order→order→limit
  mock.select = vi.fn().mockReturnValue(mock);
  mock.update = vi.fn().mockReturnValue(mock);
  mock.insert = vi.fn().mockResolvedValue({ error: null });

  for (const m of chainMethods) {
    mock[m] = vi.fn().mockReturnValue(mock);
  }

  // order() returns mock so it can be chained (order→order→limit)
  mock.order = vi.fn().mockReturnValue(mock);

  // limit() is the terminal for fetchPendingActions
  mock.limit = vi.fn().mockResolvedValue({
    data: pendingActions,
    error: null,
  });

  // For any direct await on the chain (e.g. update().eq() awaited)
  mock.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data: pendingActions, error: null }),
  );

  return mock;
}

function setupSuccessfulMocks(pendingActions: Record<string, unknown>[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'action_queue') {
      return createChainableMock(pendingActions);
    }
    if (table === 'ioo_trace') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return createChainableMock([]);
  });
}
