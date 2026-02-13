/**
 * Risk Detection Worker 테스트
 * Phase 2: 위험감지 + 3-way chain (출석 -> 결제 -> 상담)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable mock that returns itself for any method call
function chainMock(resolveData: unknown = { data: [], error: null }): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'then') {
        // Make it thenable - resolve with the data
        return (resolve: (v: unknown) => void) => resolve(resolveData);
      }
      // Return a function that returns another chainable mock
      return vi.fn((..._args: unknown[]) => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

// Mock Supabase
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock env
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
vi.stubEnv('CRON_SECRET', 'test-cron-secret');

describe('Risk Detection Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('Authentication', () => {
    it('CRON_SECRET 없이 요청하면 401을 반환해야 한다', async () => {
      const { GET } = await import('../risk-detection/route');

      const request = new Request('http://localhost/api/workers/risk-detection', {
        headers: {},
      });

      const response = await GET(request as any);
      expect(response.status).toBe(401);
    });

    it('잘못된 CRON_SECRET로 요청하면 401을 반환해야 한다', async () => {
      const { GET } = await import('../risk-detection/route');

      const request = new Request('http://localhost/api/workers/risk-detection', {
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });

      const response = await GET(request as any);
      expect(response.status).toBe(401);
    });

    it('올바른 CRON_SECRET로 요청하면 200을 반환해야 한다', async () => {
      const { GET } = await import('../risk-detection/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request as any);

      expect(response.status).toBe(200);
    });
  });

  describe('Pipeline Execution', () => {
    it('데이터가 없으면 0개 플래그를 반환해야 한다', async () => {
      const { GET } = await import('../risk-detection/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request as any);
      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.total_new_flags).toBe(0);
      expect(body.trace_id).toBeDefined();
      expect(body.duration_ms).toBeDefined();
    });

    it('응답에 stats 필드가 포함되어야 한다', async () => {
      const { GET } = await import('../risk-detection/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request as any);
      const body = await response.json();

      expect(body).toHaveProperty('absent_streak_flags');
      expect(body).toHaveProperty('overdue_payment_flags');
      expect(body).toHaveProperty('low_attendance_flags');
      expect(body).toHaveProperty('expired_flags');
      expect(body).toHaveProperty('total_new_flags');
    });

    it('trace_id가 risk- 프리픽스로 시작해야 한다', async () => {
      const { GET } = await import('../risk-detection/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request as any);
      const body = await response.json();

      expect(body.trace_id).toMatch(/^risk-/);
    });

    it('duration_ms가 숫자여야 한다', async () => {
      const { GET } = await import('../risk-detection/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request as any);
      const body = await response.json();

      expect(typeof body.duration_ms).toBe('number');
      expect(body.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Escalation Chain', () => {
    it('파이프라인이 에러 없이 실행되어야 한다', async () => {
      const { GET } = await import('../risk-detection/route');
      const request = createAuthenticatedRequest();
      const response = await GET(request as any);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
    });

    it('ioo_trace 테이블에 기록을 시도해야 한다', async () => {
      const { GET } = await import('../risk-detection/route');
      const request = createAuthenticatedRequest();
      await GET(request as any);

      // ioo_trace에 대해 from이 호출되었는지 확인
      const iooTraceCalls = mockFrom.mock.calls.filter(
        (call: string[]) => call[0] === 'ioo_trace',
      );
      expect(iooTraceCalls.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function createAuthenticatedRequest(): Request {
  return new Request('http://localhost/api/workers/risk-detection', {
    headers: {
      authorization: 'Bearer test-cron-secret',
    },
  });
}

function setupDefaultMocks() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'ioo_trace') {
      return chainMock({ error: null });
    }
    if (table === 'action_queue') {
      return chainMock({ error: null });
    }
    // All data tables return empty results by default
    return chainMock({ data: [], error: null });
  });
}
