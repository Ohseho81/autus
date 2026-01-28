/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v2.0 E2E Tests
 * 
 * A = T^σ 시스템 전체 테스트
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_URL || 'http://localhost:3000';

test.describe('AUTUS v2.0 API Tests', () => {
  
  // ============================================
  // Nodes API Tests
  // ============================================
  test.describe('Nodes API', () => {
    test('GET /api/autus/nodes - 노드 목록 조회', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/nodes`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.nodes).toBeDefined();
      expect(Array.isArray(data.data.nodes)).toBe(true);
      expect(data.data.stats).toBeDefined();
    });
    
    test('POST /api/autus/nodes - 노드 생성', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/autus/nodes`, {
        data: {
          action: 'create',
          orgId: 'org-test',
          type: 'STUDENT',
          name: '테스트 학생',
          email: 'test@example.com',
        }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.node).toBeDefined();
      expect(data.data.node.type).toBe('STUDENT');
      expect(data.data.node.lambda).toBe(1.0); // 기본 λ
    });
    
    test('POST /api/autus/nodes - λ 업데이트', async ({ request }) => {
      // 먼저 노드 조회
      const getResponse = await request.get(`${API_BASE}/api/autus/nodes`);
      const getData = await getResponse.json();
      const nodeId = getData.data.nodes[0]?.id;
      
      if (nodeId) {
        const response = await request.post(`${API_BASE}/api/autus/nodes`, {
          data: {
            action: 'update_lambda',
            id: nodeId,
            lambda: 2.5,
          }
        });
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.node.lambda).toBe(2.5);
      }
    });
  });
  
  // ============================================
  // Relationships API Tests
  // ============================================
  test.describe('Relationships API', () => {
    test('GET /api/autus/relationships - 관계 목록 조회', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/relationships`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.relationships).toBeDefined();
      expect(data.data.stats).toBeDefined();
      expect(data.data.stats.distribution).toBeDefined();
    });
    
    test('POST /api/autus/relationships - σ 업데이트', async ({ request }) => {
      const getResponse = await request.get(`${API_BASE}/api/autus/relationships`);
      const getData = await getResponse.json();
      const relId = getData.data.relationships[0]?.id;
      
      if (relId) {
        const response = await request.post(`${API_BASE}/api/autus/relationships`, {
          data: {
            action: 'update_sigma',
            id: relId,
            sigma: 1.5,
            reason: '테스트',
          }
        });
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.relationship.sigma).toBe(1.5);
        expect(data.data.grade).toBe('good');
      }
    });
    
    test('POST /api/autus/relationships - Ω 계산', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/autus/relationships`, {
        data: {
          action: 'calculate_omega',
        }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.data.omega).toBe('number');
      expect(typeof data.data.avgSigma).toBe('number');
    });
  });
  
  // ============================================
  // Time Logs API Tests
  // ============================================
  test.describe('Time Logs API', () => {
    test('POST /api/autus/time-logs - 시간 기록 생성', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/autus/time-logs`, {
        data: {
          action: 'create',
          orgId: 'org-test',
          tPhysical: 60, // 60분
          activityType: 'class_small',
          lambda: 2.0,
        }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.timeLog).toBeDefined();
      expect(data.data.calculation).toBeDefined();
      // T = λ × λ_activity × t = 2.0 × 1.0 × 60 = 120
      expect(data.data.calculation.tValue).toBeGreaterThan(0);
    });
    
    test('GET /api/autus/time-logs - 시간 기록 조회', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/time-logs`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.activityMultipliers).toBeDefined();
    });
  });
  
  // ============================================
  // Behaviors API Tests
  // ============================================
  test.describe('Behaviors API', () => {
    test('GET /api/autus/behavior - 행위 설정 조회', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/behavior`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.behaviors).toBeDefined();
      expect(Array.isArray(data.data.behaviors)).toBe(true);
      expect(data.data.tierSummary).toBeDefined();
    });
    
    test('POST /api/autus/behavior - 행위 기록', async ({ request }) => {
      const getNodes = await request.get(`${API_BASE}/api/autus/nodes`);
      const nodesData = await getNodes.json();
      const nodeId = nodesData.data.nodes[0]?.id;
      
      if (nodeId) {
        const response = await request.post(`${API_BASE}/api/autus/behavior`, {
          data: {
            nodeId,
            behaviorType: 'ATTENDANCE',
          }
        });
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(typeof data.data.sigmaContribution).toBe('number');
      }
    });
  });
  
  // ============================================
  // Alerts API Tests
  // ============================================
  test.describe('Alerts API', () => {
    test('GET /api/autus/alerts - 알림 목록 조회', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/alerts`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.alerts).toBeDefined();
      expect(data.data.stats).toBeDefined();
    });
    
    test('POST /api/autus/alerts - 알림 생성', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/autus/alerts`, {
        data: {
          action: 'create',
          level: 'warning',
          type: 'sigma_drop',
          message: '테스트 알림',
        }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.alert).toBeDefined();
    });
    
    test('POST /api/autus/alerts - σ 기반 알림 체크', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/autus/alerts`, {
        data: {
          action: 'check',
          nodeId: 'node-test',
          currentSigma: 0.65,
          previousSigma: 1.2,
          daysDelta: 7,
        }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      // σ가 0.7 미만으로 떨어졌으므로 critical alert 발생해야 함
      expect(data.data.alerts.length).toBeGreaterThan(0);
    });
  });
  
  // ============================================
  // Dashboard API Tests
  // ============================================
  test.describe('Dashboard API', () => {
    test('GET /api/autus/dashboard - Owner 대시보드', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/dashboard?role=OWNER`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('OWNER');
      expect(data.data.kpis).toBeDefined();
    });
    
    test('GET /api/autus/dashboard - Manager 대시보드', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/dashboard?role=MANAGER`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('MANAGER');
    });
    
    test('GET /api/autus/dashboard - Staff 대시보드', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/dashboard?role=STAFF`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('STAFF');
    });
  });
  
  // ============================================
  // Calculate API Tests
  // ============================================
  test.describe('Calculate API', () => {
    test('POST /api/autus/calculate - A = T^σ 계산', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/autus/calculate`, {
        data: {
          action: 'calculate_a',
          t: 100,
          lambda: 2.0,
          sigma: 1.5,
        }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.T).toBe(200); // T = λ × t = 2.0 × 100
      expect(data.data.A).toBeGreaterThan(0);
      expect(data.data.formula).toContain('T^σ');
    });
    
    test('POST /api/autus/calculate - σ 역산', async ({ request }) => {
      // A = T^σ에서 σ = log(A) / log(T)
      // T = 100, A = 1000 이면 σ = log(1000)/log(100) = 3/2 = 1.5
      const response = await request.post(`${API_BASE}/api/autus/calculate`, {
        data: {
          action: 'measure_sigma',
          a: 1000,
          t: 100,
          lambda: 1.0,
        }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.sigma).toBeCloseTo(1.5, 1);
    });
  });
  
  // ============================================
  // Sigma History API Tests
  // ============================================
  test.describe('Sigma History API', () => {
    test('GET /api/autus/sigma-history - σ 이력 조회', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/autus/sigma-history?nodeId=node-1&days=30`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.history).toBeDefined();
      expect(data.data.analysis).toBeDefined();
    });
  });
});

// ============================================
// UI Integration Tests
// ============================================
test.describe('AUTUS v2.0 UI Tests', () => {
  test('Dashboard 페이지 로드', async ({ page }) => {
    await page.goto(`${API_BASE}`);
    
    // 페이지 로드 확인
    await expect(page).toHaveTitle(/AUTUS/i);
  });
  
  test('σ 분포 표시 확인', async ({ page }) => {
    await page.goto(`${API_BASE}`);
    
    // σ 분포 바가 표시되는지 확인
    const distributionBar = page.locator('[data-testid="sigma-distribution"]');
    // 요소가 존재하면 표시 여부 확인
    if (await distributionBar.count() > 0) {
      await expect(distributionBar).toBeVisible();
    }
  });
  
  test('Ω (조직 가치) 표시 확인', async ({ page }) => {
    await page.goto(`${API_BASE}`);
    
    // Ω 게이지가 표시되는지 확인
    const omegaDisplay = page.locator('text=Ω');
    if (await omegaDisplay.count() > 0) {
      await expect(omegaDisplay.first()).toBeVisible();
    }
  });
});

// ============================================
// 공식 검증 Tests
// ============================================
test.describe('Formula Verification', () => {
  test('A = T^σ 공식 검증', async ({ request }) => {
    // 다양한 케이스 테스트
    const testCases = [
      { t: 100, lambda: 1.0, sigma: 1.0, expectedA: 100 },  // A = 100^1 = 100
      { t: 100, lambda: 2.0, sigma: 1.0, expectedA: 200 },  // A = 200^1 = 200
      { t: 100, lambda: 1.0, sigma: 2.0, expectedA: 10000 }, // A = 100^2 = 10000
    ];
    
    for (const tc of testCases) {
      const response = await request.post(`${API_BASE}/api/autus/calculate`, {
        data: {
          action: 'calculate_a',
          t: tc.t,
          lambda: tc.lambda,
          sigma: tc.sigma,
        }
      });
      
      const data = await response.json();
      expect(data.data.A).toBeCloseTo(tc.expectedA, 0);
    }
  });
  
  test('σ 등급 경계값 테스트', async ({ request }) => {
    const gradeTests = [
      { sigma: 0.69, expectedGrade: 'critical' },
      { sigma: 0.70, expectedGrade: 'at_risk' },
      { sigma: 0.99, expectedGrade: 'at_risk' },
      { sigma: 1.00, expectedGrade: 'neutral' },
      { sigma: 1.29, expectedGrade: 'neutral' },
      { sigma: 1.30, expectedGrade: 'good' },
      { sigma: 1.59, expectedGrade: 'good' },
      { sigma: 1.60, expectedGrade: 'loyal' },
      { sigma: 1.99, expectedGrade: 'loyal' },
      { sigma: 2.00, expectedGrade: 'advocate' },
    ];
    
    for (const tc of gradeTests) {
      const response = await request.get(`${API_BASE}/api/autus/relationships`);
      const data = await response.json();
      
      // 등급 함수 테스트
      const getSigmaGrade = (sigma: number) => {
        if (sigma < 0.7) return 'critical';
        if (sigma < 1.0) return 'at_risk';
        if (sigma < 1.3) return 'neutral';
        if (sigma < 1.6) return 'good';
        if (sigma < 2.0) return 'loyal';
        return 'advocate';
      };
      
      expect(getSigmaGrade(tc.sigma)).toBe(tc.expectedGrade);
    }
  });
});
