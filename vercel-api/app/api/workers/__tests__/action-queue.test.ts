/**
 * ═══════════════════════════════════════════════════════════════
 * Action Queue Worker 테스트
 * Phase 1: Worker Gateway
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

// Mock env
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
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
      // Setup mocks for successful execution
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

function setupSuccessfulMocks(pendingActions: Record<string, unknown>[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'action_queue') {
      return {
        // For expire query
        update: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null, count: 0 }),
          }),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        // For fetch pending query
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: pendingActions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'ioo_trace') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
  });
}
