// ============================================
// Heartbeat API Test Suite
// Tests for /api/v1/heartbeat endpoints
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, OPTIONS } from '../route';
import { createMockNextRequest, parseNextResponse } from '@/lib/__tests__/test-utils';

describe('Heartbeat API - GET /api/v1/heartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('External Heartbeat', () => {
    it('should return external heartbeat data with default period', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'external' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.data).toBeDefined();
      expect(parsed.data.data.rhythm).toBeDefined();
      expect(parsed.data.data.rhythmLabel).toBeDefined();
      expect(parsed.data.data.timeline).toBeInstanceOf(Array);
      expect(parsed.data.data.keywords).toBeInstanceOf(Array);
      expect(parsed.data.data.sources).toBeInstanceOf(Array);
    });

    it('should limit timeline to 48 hours', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'external', period: '7d' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.data.data.timeline.length).toBeLessThanOrEqual(48);
    });

    it('should categorize rhythm based on intensity', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'external' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      const validRhythms = ['normal', 'elevated', 'spike', 'critical'];
      expect(validRhythms).toContain(parsed.data.data.rhythm);
    });

    it('should sort keywords by count', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'external' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      const keywords = parsed.data.data.keywords;
      expect(keywords).toBeInstanceOf(Array);

      if (keywords.length > 1) {
        for (let i = 0; i < keywords.length - 1; i++) {
          expect(keywords[i].count).toBeGreaterThanOrEqual(keywords[i + 1].count);
        }
      }
    });

    it('should handle different period parameters', async () => {
      const periods = ['1d', '7d', '30d'];

      for (const period of periods) {
        const request = createMockNextRequest('/api/v1/heartbeat', {
          searchParams: { endpoint: 'external', period },
        });

        const response = await GET(request);
        const parsed = await parseNextResponse(response);

        expect(parsed.status).toBe(200);
        expect(parsed.data.success).toBe(true);
      }
    });
  });

  describe('Voice Heartbeat', () => {
    it('should return voice heartbeat data', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'voice' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.data.rhythm).toBeDefined();
      expect(parsed.data.data.byStage).toBeDefined();
      expect(parsed.data.data.unresolvedCount).toBeDefined();
      expect(parsed.data.data.unresolvedVoices).toBeInstanceOf(Array);
    });

    it('should include voice stages in response', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'voice' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      const { byStage } = parsed.data.data;
      expect(byStage).toHaveProperty('request');
      expect(byStage).toHaveProperty('wish');
      expect(byStage).toHaveProperty('complaint');
      expect(byStage).toHaveProperty('churn_signal');
    });

    it('should have valid rhythm label', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'voice' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      const validLabels = ['정상', '상승', '급등', '위기'];
      expect(validLabels).toContain(parsed.data.data.rhythmLabel);
    });
  });

  describe('Resonance Analysis', () => {
    it('should return resonance data', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'resonance' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.data.resonances).toBeInstanceOf(Array);
      expect(parsed.data.data.hasResonance).toBeDefined();
    });

    it('should sort resonances by correlation', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'resonance' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      const resonances = parsed.data.data.resonances;

      if (resonances.length > 1) {
        for (let i = 0; i < resonances.length - 1; i++) {
          expect(resonances[i].correlation).toBeGreaterThanOrEqual(
            resonances[i + 1].correlation
          );
        }
      }
    });

    it('should show alert when high correlation exists', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'resonance' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      const { resonances, hasResonance, resonanceAlert } = parsed.data.data;

      if (hasResonance && resonances.length > 0) {
        expect(resonanceAlert).toBeTruthy();
        expect(resonanceAlert).toContain('공명');
      }
    });
  });

  describe('Keywords Detail', () => {
    it('should return keyword detail data', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'keywords', keyword: '비용' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.data.keyword).toBe('비용');
      expect(parsed.data.data.timeline).toBeInstanceOf(Array);
    });

    it('should filter by source parameter', async () => {
      const sources = ['external', 'internal', 'both'];

      for (const source of sources) {
        const request = createMockNextRequest('/api/v1/heartbeat', {
          searchParams: { endpoint: 'keywords', source },
        });

        const response = await GET(request);
        const parsed = await parseNextResponse(response);

        expect(parsed.status).toBe(200);

        if (source === 'external' || source === 'both') {
          expect(parsed.data.data.external).toBeDefined();
        }

        if (source === 'internal' || source === 'both') {
          expect(parsed.data.data.internal).toBeDefined();
        }
      }
    });

    it('should include timeline data', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat', {
        searchParams: { endpoint: 'keywords' },
      });

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      const timeline = parsed.data.data.timeline;
      expect(timeline).toBeInstanceOf(Array);
      expect(timeline.length).toBeGreaterThan(0);

      if (timeline.length > 0) {
        const firstEntry = timeline[0];
        expect(firstEntry).toHaveProperty('date');
        expect(firstEntry).toHaveProperty('externalCount');
        expect(firstEntry).toHaveProperty('internalCount');
      }
    });
  });

  describe('Default Endpoint', () => {
    it('should default to external endpoint when no endpoint specified', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat');

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.status).toBe(200);
      expect(parsed.data.data.sources).toBeDefined(); // External has sources
    });
  });

  describe('CORS', () => {
    it('should include CORS headers in response', async () => {
      const request = createMockNextRequest('/api/v1/heartbeat');

      const response = await GET(request);
      const parsed = await parseNextResponse(response);

      expect(parsed.headers['access-control-allow-origin']).toBe('*');
      expect(parsed.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});

describe('Heartbeat API - OPTIONS', () => {
  it('should handle OPTIONS request for CORS preflight', async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });
});
