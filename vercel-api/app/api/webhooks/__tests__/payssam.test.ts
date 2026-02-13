/**
 * Payssam Webhook 테스트
 * Phase 2: 결제선생 Payment Callback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable mock
function chainMock(resolveData: unknown = { data: null, error: null }): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(resolveData);
      }
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

describe('Payssam Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Payload Validation', () => {
    it('잘못된 JSON은 400을 반환해야 한다', async () => {
      setupDefaultMocks();
      const { POST } = await import('../../webhooks/payssam/route');
      const request = new Request('http://localhost/api/webhooks/payssam', {
        method: 'POST',
        body: 'not json',
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
    });

    it('invoice_id가 없으면 400을 반환해야 한다', async () => {
      setupDefaultMocks();
      const { POST } = await import('../../webhooks/payssam/route');
      const request = createWebhookRequest({ status: 'paid', amount: 100000 });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
    });

    it('status가 없으면 400을 반환해야 한다', async () => {
      setupDefaultMocks();
      const { POST } = await import('../../webhooks/payssam/route');
      const request = createWebhookRequest({ invoice_id: 'INV-001', amount: 100000 });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
    });
  });

  describe('Invoice Lookup', () => {
    it('존재하지 않는 청구서는 404를 반환해야 한다', async () => {
      setupNotFoundMocks();

      const { POST } = await import('../../webhooks/payssam/route');
      const request = createWebhookRequest({
        invoice_id: 'NONEXISTENT',
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount: 100000,
      });

      const response = await POST(request as any);
      expect(response.status).toBe(404);
    });
  });

  describe('Payment Processing', () => {
    it('paid 상태를 처리하면 200을 반환해야 한다', async () => {
      setupFoundInvoiceMocks();

      const { POST } = await import('../../webhooks/payssam/route');
      const request = createWebhookRequest({
        invoice_id: 'PAYSSAM-INV-001',
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount: 100000,
        payment_method: 'card',
        transaction_id: 'TXN-001',
      });

      const response = await POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.status).toBe('paid');
    });

    it('응답에 trace_id가 포함되어야 한다', async () => {
      setupFoundInvoiceMocks();

      const { POST } = await import('../../webhooks/payssam/route');
      const request = createWebhookRequest({
        invoice_id: 'PAYSSAM-INV-001',
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount: 100000,
      });

      const response = await POST(request as any);
      const body = await response.json();

      expect(body.trace_id).toBeDefined();
      expect(body.trace_id).toMatch(/^pay-wh-/);
    });

    it('응답에 duration_ms가 포함되어야 한다', async () => {
      setupFoundInvoiceMocks();

      const { POST } = await import('../../webhooks/payssam/route');
      const request = createWebhookRequest({
        invoice_id: 'PAYSSAM-INV-001',
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount: 100000,
      });

      const response = await POST(request as any);
      const body = await response.json();

      expect(typeof body.duration_ms).toBe('number');
      expect(body.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('ioo_trace 기록을 시도해야 한다', async () => {
      setupFoundInvoiceMocks();

      const { POST } = await import('../../webhooks/payssam/route');
      const request = createWebhookRequest({
        invoice_id: 'PAYSSAM-INV-001',
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount: 100000,
      });

      await POST(request as any);

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

function createWebhookRequest(payload: Record<string, unknown>): Request {
  return new Request('http://localhost/api/webhooks/payssam', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

function setupDefaultMocks() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'ioo_trace') {
      return chainMock({ error: null });
    }
    return chainMock({ data: null, error: null });
  });
}

function setupNotFoundMocks() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'ioo_trace') {
      return chainMock({ error: null });
    }
    if (table === 'payment_invoices') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found', code: 'PGRST116' },
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    return chainMock({ data: [], error: null });
  });
}

function setupFoundInvoiceMocks() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'ioo_trace') {
      return chainMock({ error: null });
    }
    if (table === 'payment_invoices') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'inv_001',
                org_id: 'org_001',
                student_id: 'student_001',
                status: 'sent',
                amount: 100000,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === 'risk_flags') {
      return chainMock({ data: [], error: null });
    }
    return chainMock({ data: [], error: null });
  });
}
