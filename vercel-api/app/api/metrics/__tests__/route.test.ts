// ============================================
// Metrics API Test Suite
// Tests for /api/metrics endpoint with Supabase mocking
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, OPTIONS } from '../route';
import { createMockNextRequest, parseNextResponse, createMockSupabaseClient } from '@/lib/__tests__/test-utils';

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from '@/lib/supabase';

describe('Metrics API - GET /api/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('System Metrics', () => {
    it('should return system metrics', async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = createMockNextRequest('/api/metrics', {
        searchParams: { type: 'system' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.metrics.system).toBeDefined();
      expect(parsed.data.metrics.system.api_calls_total).toBeDefined();
      expect(parsed.data.metrics.system.error_rate).toBeDefined();
      expect(parsed.data.metrics.system.avg_response_time_ms).toBeDefined();
      expect(parsed.data.metrics.system.uptime).toBe('99.9%');
    });
  });

  describe('Database Metrics', () => {
    it('should return database metrics with node and relationship counts', async () => {
      const mockNodes = [
        { node_id: 'node-1', name: 'Node 1' },
        { node_id: 'node-2', name: 'Node 2' },
      ];

      const mockRelationships = [
        { edge_id: 'edge-1', sigma: 1.5, status: 'active' },
        { edge_id: 'edge-2', sigma: 1.2, status: 'active' },
      ];

      const mockSupabase = createMockSupabaseClient({
        autus_nodes: mockNodes,
        autus_relationships: mockRelationships,
      });

      // Mock the count queries
      const originalFrom = mockSupabase.from.bind(mockSupabase);
      mockSupabase.from = vi.fn((table: string) => {
        const query = originalFrom(table);

        // Override the then method to return count for head: true queries
        const originalThen = query.then.bind(query);
        query.then = vi.fn((onfulfilled: any) => {
          if (table === 'autus_nodes') {
            return onfulfilled({ count: mockNodes.length, data: null, error: null });
          } else if (table === 'autus_relationships') {
            return onfulfilled({ count: mockRelationships.length, data: mockRelationships, error: null });
          }
          return originalThen(onfulfilled);
        });

        return query;
      });

      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = createMockNextRequest('/api/metrics', {
        searchParams: { type: 'database' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.metrics.database).toBeDefined();
      expect(parsed.data.metrics.database.total_nodes).toBe(mockNodes.length);
      expect(parsed.data.metrics.database.total_relationships).toBe(mockRelationships.length);
      expect(parsed.data.metrics.database.avg_sigma).toBeDefined();
    });

    it('should handle empty database gracefully', async () => {
      const mockSupabase = createMockSupabaseClient({
        autus_nodes: [],
        autus_relationships: [],
      });

      const originalFrom = mockSupabase.from.bind(mockSupabase);
      mockSupabase.from = vi.fn((table: string) => {
        const query = originalFrom(table);
        const originalThen = query.then.bind(query);
        query.then = vi.fn((onfulfilled: any) => {
          return onfulfilled({ count: 0, data: [], error: null });
        });
        return query;
      });

      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = createMockNextRequest('/api/metrics', {
        searchParams: { type: 'database' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.metrics.database.total_nodes).toBe(0);
      expect(parsed.data.metrics.database.total_relationships).toBe(0);
    });
  });

  describe('Business Metrics', () => {
    it('should calculate omega and sigma distribution', async () => {
      const mockRelationships = [
        { sigma: 0.5, a_value: 100, status: 'active' }, // critical
        { sigma: 0.9, a_value: 150, status: 'active' }, // at_risk
        { sigma: 1.2, a_value: 200, status: 'active' }, // neutral
        { sigma: 1.5, a_value: 250, status: 'active' }, // good
        { sigma: 1.8, a_value: 300, status: 'active' }, // loyal
        { sigma: 2.2, a_value: 350, status: 'active' }, // advocate
        { sigma: 1.0, a_value: 0, status: 'inactive' }, // should be excluded
      ];

      const mockSupabase = createMockSupabaseClient({
        autus_relationships: mockRelationships,
      });

      const originalFrom = mockSupabase.from.bind(mockSupabase);
      mockSupabase.from = vi.fn((table: string) => {
        const query = originalFrom(table);
        const originalThen = query.then.bind(query);
        query.then = vi.fn((onfulfilled: any) => {
          return onfulfilled({ data: mockRelationships, error: null });
        });
        return query;
      });

      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = createMockNextRequest('/api/metrics', {
        searchParams: { type: 'business' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.metrics.business).toBeDefined();
      expect(parsed.data.metrics.business.omega).toBeDefined();
      expect(parsed.data.metrics.business.avg_sigma).toBeDefined();
      expect(parsed.data.metrics.business.sigma_distribution).toBeDefined();
      expect(parsed.data.metrics.business.churn_risk_percent).toBeDefined();
      expect(parsed.data.metrics.business.formula).toBe('A = T^σ');
    });

    it('should correctly categorize sigma distribution', async () => {
      const mockRelationships = [
        { sigma: 0.6, a_value: 100, status: 'active' }, // critical
        { sigma: 0.8, a_value: 100, status: 'active' }, // at_risk
        { sigma: 1.1, a_value: 100, status: 'active' }, // neutral
        { sigma: 1.4, a_value: 100, status: 'active' }, // good
        { sigma: 1.7, a_value: 100, status: 'active' }, // loyal
        { sigma: 2.5, a_value: 100, status: 'active' }, // advocate
      ];

      const mockSupabase = createMockSupabaseClient({
        autus_relationships: mockRelationships,
      });

      const originalFrom = mockSupabase.from.bind(mockSupabase);
      mockSupabase.from = vi.fn((table: string) => {
        const query = originalFrom(table);
        const originalThen = query.then.bind(query);
        query.then = vi.fn((onfulfilled: any) => {
          return onfulfilled({ data: mockRelationships, error: null });
        });
        return query;
      });

      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = createMockNextRequest('/api/metrics', {
        searchParams: { type: 'business' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      const distribution = parsed.data.metrics.business.sigma_distribution;
      expect(distribution.critical).toBe(1);
      expect(distribution.at_risk).toBe(1);
      expect(distribution.neutral).toBe(1);
      expect(distribution.good).toBe(1);
      expect(distribution.loyal).toBe(1);
      expect(distribution.advocate).toBe(1);
    });
  });

  describe('All Metrics', () => {
    it('should return all metrics when type is "all" or not specified', async () => {
      const mockSupabase = createMockSupabaseClient({
        autus_nodes: [{ node_id: 'node-1' }],
        autus_relationships: [{ edge_id: 'edge-1', sigma: 1.5, a_value: 100, status: 'active' }],
      });

      const originalFrom = mockSupabase.from.bind(mockSupabase);
      mockSupabase.from = vi.fn((table: string) => {
        const query = originalFrom(table);
        const originalThen = query.then.bind(query);
        query.then = vi.fn((onfulfilled: any) => {
          if (table === 'autus_nodes') {
            return onfulfilled({ count: 1, data: null, error: null });
          } else if (table === 'autus_relationships') {
            return onfulfilled({
              count: 1,
              data: [{ edge_id: 'edge-1', sigma: 1.5, a_value: 100, status: 'active' }],
              error: null
            });
          }
          return originalThen(onfulfilled);
        });
        return query;
      });

      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = createMockNextRequest('/api/metrics');

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.metrics.system).toBeDefined();
      expect(parsed.data.metrics.database).toBeDefined();
      expect(parsed.data.metrics.business).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(getSupabaseAdmin).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = createMockNextRequest('/api/metrics', {
        searchParams: { type: 'database' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(500);
      expect(parsed.data.success).toBe(false);
      expect(parsed.data.error).toBe('Failed to collect metrics');
    });

    it('should include fallback metrics on error', async () => {
      vi.mocked(getSupabaseAdmin).mockImplementation(() => {
        throw new Error('Connection refused');
      });

      const request = createMockNextRequest('/api/metrics');

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(500);
      expect(parsed.data.metrics.system).toBeDefined();
      expect(parsed.data.metrics.database.error).toBe('Unable to connect');
      expect(parsed.data.metrics.business.error).toBe('Unable to calculate');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers in response', async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = createMockNextRequest('/api/metrics');
      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.headers['access-control-allow-origin']).toBe('*');
      expect(parsed.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});

describe('Metrics API - OPTIONS', () => {
  it('should handle OPTIONS request for CORS preflight', async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
  });
});
