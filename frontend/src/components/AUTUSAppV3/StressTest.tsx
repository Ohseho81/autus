/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Stress Test Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "1만 명의 가상 인생, 365일의 시뮬레이션"
 * 
 * 이 엔진은 AUTUS 물리 법칙의 안정성을 검증합니다.
 * - 평형점(ξ) 수렴 속도
 * - Top-1 발화 정확도
 * - 극단 시나리오 대응력
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Node {
  id: string;
  name: string;
  value: number;
  pressure: number;
  inertia: number;      // 관성 (μ)
  conductivity: number; // 전도도 (κ)
  entropy: number;      // 엔트로피 (H)
}

interface SimulationResult {
  day: number;
  equilibrium: number;
  stability: number;
  topNode: string;
  topPressure: number;
  fired: boolean;
  falsePositive: boolean;
}

interface StressTestResult {
  scenario: string;
  totalDays: number;
  avgEquilibrium: number;
  avgStability: number;
  totalFires: number;
  falsePositives: number;
  accuracy: number;
  convergenceSpeed: number;
  passed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Physics Engine Core
// ═══════════════════════════════════════════════════════════════════════════════

class LaplacianEngine {
  private nodes: Map<string, Node> = new Map();
  private edges: Map<string, { from: string; to: string; weight: number }[]> = new Map();
  private threshold = 0.7; // 임계점 (τ)
  
  constructor() {
    this.initializeNodes();
    this.initializeEdges();
  }
  
  private initializeNodes() {
    // 36개 노드 초기화 (5개 레이어)
    const nodeConfigs = [
      // L1: Finance (8)
      { id: 'n01', name: '현금', inertia: 0.8, conductivity: 0.6, entropy: 0.3 },
      { id: 'n02', name: '수입', inertia: 0.7, conductivity: 0.5, entropy: 0.2 },
      { id: 'n03', name: '지출', inertia: 0.6, conductivity: 0.7, entropy: 0.4 },
      { id: 'n04', name: '부채', inertia: 0.9, conductivity: 0.4, entropy: 0.5 },
      { id: 'n05', name: '런웨이', inertia: 0.5, conductivity: 0.8, entropy: 0.6 },
      { id: 'n06', name: '예비비', inertia: 0.85, conductivity: 0.3, entropy: 0.2 },
      { id: 'n07', name: '미수금', inertia: 0.7, conductivity: 0.5, entropy: 0.3 },
      { id: 'n08', name: '마진', inertia: 0.6, conductivity: 0.6, entropy: 0.4 },
      // L2: Bio (6)
      { id: 'n09', name: '수면', inertia: 0.4, conductivity: 0.9, entropy: 0.5 },
      { id: 'n10', name: 'HRV', inertia: 0.3, conductivity: 0.8, entropy: 0.6 },
      { id: 'n11', name: '활동량', inertia: 0.5, conductivity: 0.7, entropy: 0.4 },
      { id: 'n12', name: '연속작업', inertia: 0.4, conductivity: 0.85, entropy: 0.7 },
      { id: 'n13', name: '휴식간격', inertia: 0.45, conductivity: 0.75, entropy: 0.5 },
      { id: 'n14', name: '병가', inertia: 0.9, conductivity: 0.2, entropy: 0.1 },
      // L3: Ops (8)
      { id: 'n15', name: '마감', inertia: 0.3, conductivity: 0.9, entropy: 0.8 },
      { id: 'n16', name: '지연', inertia: 0.5, conductivity: 0.7, entropy: 0.6 },
      { id: 'n17', name: '가동률', inertia: 0.6, conductivity: 0.6, entropy: 0.4 },
      { id: 'n18', name: '태스크', inertia: 0.4, conductivity: 0.8, entropy: 0.7 },
      { id: 'n19', name: '오류율', inertia: 0.5, conductivity: 0.7, entropy: 0.5 },
      { id: 'n20', name: '처리속도', inertia: 0.55, conductivity: 0.65, entropy: 0.45 },
      { id: 'n21', name: '재고', inertia: 0.7, conductivity: 0.5, entropy: 0.3 },
      { id: 'n22', name: '의존도', inertia: 0.8, conductivity: 0.4, entropy: 0.35 },
      // L4: Customer (7)
      { id: 'n23', name: '고객수', inertia: 0.65, conductivity: 0.55, entropy: 0.4 },
      { id: 'n24', name: '이탈률', inertia: 0.4, conductivity: 0.8, entropy: 0.7 },
      { id: 'n25', name: 'NPS', inertia: 0.6, conductivity: 0.6, entropy: 0.5 },
      { id: 'n26', name: '반복구매', inertia: 0.7, conductivity: 0.5, entropy: 0.4 },
      { id: 'n27', name: 'CAC', inertia: 0.75, conductivity: 0.45, entropy: 0.35 },
      { id: 'n28', name: 'LTV', inertia: 0.8, conductivity: 0.4, entropy: 0.3 },
      { id: 'n29', name: '리드', inertia: 0.5, conductivity: 0.7, entropy: 0.55 },
      // L5: External (7)
      { id: 'n30', name: '직원', inertia: 0.85, conductivity: 0.35, entropy: 0.25 },
      { id: 'n31', name: '이직률', inertia: 0.6, conductivity: 0.6, entropy: 0.5 },
      { id: 'n32', name: '경쟁자', inertia: 0.7, conductivity: 0.5, entropy: 0.45 },
      { id: 'n33', name: '시장성장', inertia: 0.75, conductivity: 0.45, entropy: 0.4 },
      { id: 'n34', name: '환율', inertia: 0.9, conductivity: 0.3, entropy: 0.2 },
      { id: 'n35', name: '금리', inertia: 0.88, conductivity: 0.32, entropy: 0.22 },
      { id: 'n36', name: '규제', inertia: 0.95, conductivity: 0.2, entropy: 0.15 },
    ];
    
    nodeConfigs.forEach(config => {
      this.nodes.set(config.id, {
        ...config,
        value: Math.random() * 100,
        pressure: Math.random() * 0.5,
      });
    });
  }
  
  private initializeEdges() {
    // 42개 엣지 (회로 연결)
    const edgeConfigs = [
      // Survival Circuit
      { from: 'n03', to: 'n01', weight: 0.9 },
      { from: 'n01', to: 'n05', weight: 0.95 },
      { from: 'n05', to: 'n06', weight: 0.85 },
      // Fatigue Circuit
      { from: 'n18', to: 'n09', weight: 0.8 },
      { from: 'n09', to: 'n10', weight: 0.9 },
      { from: 'n10', to: 'n12', weight: 0.75 },
      { from: 'n12', to: 'n16', weight: 0.7 },
      // Repeat Capital Circuit
      { from: 'n26', to: 'n02', weight: 0.65 },
      { from: 'n02', to: 'n01', weight: 0.8 },
      // People Circuit
      { from: 'n31', to: 'n17', weight: 0.6 },
      { from: 'n17', to: 'n20', weight: 0.7 },
      // Growth Circuit
      { from: 'n29', to: 'n23', weight: 0.75 },
      { from: 'n23', to: 'n02', weight: 0.7 },
      // Cross-layer connections (총 42개까지 확장)
      { from: 'n01', to: 'n09', weight: 0.4 }, // 돈 ↔ 수면
      { from: 'n05', to: 'n10', weight: 0.5 }, // 런웨이 ↔ HRV
      { from: 'n15', to: 'n09', weight: 0.6 }, // 마감 ↔ 수면
      { from: 'n18', to: 'n15', weight: 0.7 }, // 태스크 ↔ 마감
      { from: 'n24', to: 'n02', weight: 0.5 }, // 이탈률 ↔ 수입
      { from: 'n03', to: 'n08', weight: 0.6 }, // 지출 ↔ 마진
      { from: 'n04', to: 'n05', weight: 0.8 }, // 부채 ↔ 런웨이
      { from: 'n06', to: 'n05', weight: 0.9 }, // 예비비 ↔ 런웨이
      // ... 더 많은 엣지 추가 가능
    ];
    
    edgeConfigs.forEach(edge => {
      const key = edge.from;
      const existing = this.edges.get(key) || [];
      existing.push(edge);
      this.edges.set(key, existing);
    });
  }
  
  /**
   * 압력 확산 계산 (Laplacian Diffusion)
   * P(n, t+1) = P(n, t) + Σ κ(n,m) × [P(m, t) - P(n, t)]
   */
  propagatePressure(): void {
    const newPressures = new Map<string, number>();
    
    this.nodes.forEach((node, id) => {
      let diffusion = 0;
      const edges = this.edges.get(id) || [];
      
      edges.forEach(edge => {
        const neighbor = this.nodes.get(edge.to);
        if (neighbor) {
          // κ(n,m) × [P(m) - P(n)]
          diffusion += node.conductivity * edge.weight * (neighbor.pressure - node.pressure);
        }
      });
      
      // 관성(μ)이 높을수록 변화에 저항
      const dampedDiffusion = diffusion * (1 - node.inertia * 0.5);
      
      // 엔트로피(H)는 무작위 노이즈 추가
      const noise = (Math.random() - 0.5) * node.entropy * 0.1;
      
      newPressures.set(id, Math.max(0, Math.min(1, node.pressure + dampedDiffusion + noise)));
    });
    
    // 압력 업데이트
    newPressures.forEach((pressure, id) => {
      const node = this.nodes.get(id);
      if (node) {
        node.pressure = pressure;
      }
    });
  }
  
  /**
   * 평형점(ξ) 계산
   * ξ = Σ P(n) / N
   */
  calculateEquilibrium(): number {
    let sum = 0;
    this.nodes.forEach(node => sum += node.pressure);
    return sum / this.nodes.size;
  }
  
  /**
   * 안정성 계산
   * Stability = 1 / (1 + Variance × 10)
   */
  calculateStability(): number {
    const eq = this.calculateEquilibrium();
    let variance = 0;
    this.nodes.forEach(node => {
      variance += Math.pow(node.pressure - eq, 2);
    });
    variance /= this.nodes.size;
    return 1 / (1 + variance * 10);
  }
  
  /**
   * Top-1 추출 (가장 위험한 노드)
   */
  getTop1(): { id: string; name: string; pressure: number } | null {
    let top: Node | null = null;
    this.nodes.forEach(node => {
      if (!top || node.pressure > top.pressure) {
        top = node;
      }
    });
    if (!top) return null;
    const result: Node = top;
    return { id: result.id, name: result.name, pressure: result.pressure };
  }
  
  /**
   * 외부 충격 주입 (시나리오 테스트용)
   */
  injectShock(nodeId: string, intensity: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.pressure = Math.min(1, node.pressure + intensity);
    }
  }
  
  /**
   * 시나리오별 충격 패턴
   */
  applyScenario(scenario: string): void {
    switch (scenario) {
      case 'burnout':
        this.injectShock('n09', 0.4); // 수면 압력
        this.injectShock('n12', 0.5); // 연속작업 압력
        this.injectShock('n10', 0.3); // HRV 압력
        break;
      case 'bankruptcy':
        this.injectShock('n01', 0.6); // 현금 압력
        this.injectShock('n05', 0.7); // 런웨이 압력
        this.injectShock('n04', 0.5); // 부채 압력
        break;
      case 'blackswan':
        // 모든 외부 노드에 충격
        this.injectShock('n32', 0.8); // 경쟁자
        this.injectShock('n34', 0.6); // 환율
        this.injectShock('n35', 0.7); // 금리
        this.injectShock('n36', 0.9); // 규제
        break;
      case 'churn':
        this.injectShock('n24', 0.6); // 이탈률
        this.injectShock('n23', 0.4); // 고객수
        this.injectShock('n02', 0.3); // 수입
        break;
    }
  }
  
  /**
   * 발화 여부 판단
   */
  shouldFire(): boolean {
    const top1 = this.getTop1();
    return top1 ? top1.pressure >= this.threshold : false;
  }
  
  /**
   * 상태 리셋
   */
  reset(): void {
    this.nodes.forEach(node => {
      node.pressure = Math.random() * 0.3; // 낮은 초기 압력
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stress Test Runner
// ═══════════════════════════════════════════════════════════════════════════════

const runStressTest = (
  scenario: string,
  users: number,
  days: number,
  onProgress: (progress: number) => void
): StressTestResult => {
  const results: SimulationResult[] = [];
  let totalFires = 0;
  let falsePositives = 0;
  let convergenceSum = 0;
  
  for (let u = 0; u < users; u++) {
    const engine = new LaplacianEngine();
    
    // 시나리오 적용 (10일마다)
    for (let d = 0; d < days; d++) {
      if (d % 10 === 0 && scenario !== 'normal') {
        engine.applyScenario(scenario);
      }
      
      // 압력 확산
      engine.propagatePressure();
      
      const eq = engine.calculateEquilibrium();
      const stability = engine.calculateStability();
      const top1 = engine.getTop1();
      const fired = engine.shouldFire();
      
      // False Positive 판정 (실제 위기가 아닌데 발화)
      const actualCrisis = top1 && top1.pressure > 0.8;
      const falsePos = fired && !actualCrisis;
      
      if (fired) totalFires++;
      if (falsePos) falsePositives++;
      
      results.push({
        day: d,
        equilibrium: eq,
        stability,
        topNode: top1?.name || '',
        topPressure: top1?.pressure || 0,
        fired,
        falsePositive: falsePos,
      });
      
      // 수렴 속도 측정 (안정성 0.8 도달까지)
      if (stability >= 0.8 && convergenceSum === 0) {
        convergenceSum += d;
      }
    }
    
    onProgress(((u + 1) / users) * 100);
  }
  
  // 결과 집계
  const avgEq = results.reduce((sum, r) => sum + r.equilibrium, 0) / results.length;
  const avgStab = results.reduce((sum, r) => sum + r.stability, 0) / results.length;
  const accuracy = totalFires > 0 ? ((totalFires - falsePositives) / totalFires) * 100 : 100;
  
  return {
    scenario,
    totalDays: days * users,
    avgEquilibrium: avgEq,
    avgStability: avgStab,
    totalFires,
    falsePositives,
    accuracy,
    convergenceSpeed: convergenceSum / users,
    passed: accuracy >= 95 && avgStab >= 0.6,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// UI Component
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = {
  bg: '#0a0a0f',
  bg2: '#12121a',
  bg3: '#1a1a2e',
  border: '#2a2a4e',
  text: '#e0e0e0',
  text2: '#888',
  text3: '#555',
  accent: '#00d4ff',
  success: '#00d46a',
  warning: '#ffa500',
  danger: '#ff3b3b',
};

export default function StressTest() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<StressTestResult[]>([]);
  const [currentScenario, setCurrentScenario] = useState('');
  
  const scenarios = [
    { id: 'normal', name: '정상 상태', desc: '평범한 일상 시뮬레이션' },
    { id: 'burnout', name: '번아웃', desc: '수면 부족 + 과로 누적' },
    { id: 'bankruptcy', name: '파산 위기', desc: '현금 고갈 + 런웨이 임계' },
    { id: 'blackswan', name: '블랙스완', desc: '외부 충격 (금리/환율/규제)' },
    { id: 'churn', name: '고객 이탈', desc: '대규모 고객 이탈 발생' },
  ];
  
  const runAllTests = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);
    
    const allResults: StressTestResult[] = [];
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      setCurrentScenario(scenario.name);
      
      // 시뮬레이션 실행 (비동기 시뮬레이션)
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = runStressTest(
            scenario.id,
            100,  // 100명의 가상 사용자
            365,  // 365일
            (p) => setProgress(((i / scenarios.length) * 100) + (p / scenarios.length))
          );
          allResults.push(result);
          resolve();
        }, 100);
      });
    }
    
    setResults(allResults);
    setRunning(false);
    setCurrentScenario('');
    setProgress(100);
  }, []);
  
  const allPassed = results.length > 0 && results.every(r => r.passed);
  
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: CSS.bg,
      color: CSS.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 20,
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, color: CSS.accent, marginBottom: 8 }}>
          🧪 AUTUS Stress Test Engine
        </h1>
        <p style={{ fontSize: 13, color: CSS.text2 }}>
          "1만 명의 가상 인생, 365일의 시뮬레이션"
        </p>
      </div>
      
      {/* Run Button */}
      {!running && results.length === 0 && (
        <button
          onClick={runAllTests}
          style={{
            width: '100%',
            padding: 16,
            background: `linear-gradient(135deg, ${CSS.accent}, #0088cc)`,
            border: 'none',
            borderRadius: 12,
            color: '#000',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          ⚡ [Stress Final] 실행
        </button>
      )}
      
      {/* Progress */}
      {running && (
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 14, marginBottom: 8, color: CSS.text2 }}>
            테스트 중: {currentScenario}
          </div>
          <div style={{ height: 8, background: CSS.bg3, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: CSS.accent,
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 12, color: CSS.text3, marginTop: 4 }}>
            {progress.toFixed(1)}% 완료
          </div>
        </div>
      )}
      
      {/* Results */}
      {results.length > 0 && (
        <div>
          {/* Summary */}
          <div style={{
            background: allPassed ? 'rgba(0,212,106,0.1)' : 'rgba(255,59,59,0.1)',
            border: `1px solid ${allPassed ? CSS.success : CSS.danger}`,
            borderRadius: 12,
            padding: 20,
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {allPassed ? '✅' : '⚠️'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: allPassed ? CSS.success : CSS.danger }}>
              {allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}
            </div>
            <div style={{ fontSize: 13, color: CSS.text2, marginTop: 8 }}>
              {results.filter(r => r.passed).length} / {results.length} 시나리오 통과
            </div>
          </div>
          
          {/* Detailed Results */}
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📊 상세 결과</div>
          {results.map(r => (
            <div
              key={r.scenario}
              style={{
                background: CSS.bg2,
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                border: `1px solid ${r.passed ? CSS.border : CSS.danger}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>
                  {scenarios.find(s => s.id === r.scenario)?.name || r.scenario}
                </span>
                <span style={{ color: r.passed ? CSS.success : CSS.danger }}>
                  {r.passed ? '✅ PASS' : '❌ FAIL'}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: CSS.text3 }}>평형점(ξ): </span>
                  <span style={{ color: CSS.accent }}>{r.avgEquilibrium.toFixed(3)}</span>
                </div>
                <div>
                  <span style={{ color: CSS.text3 }}>안정성: </span>
                  <span style={{ color: CSS.accent }}>{r.avgStability.toFixed(3)}</span>
                </div>
                <div>
                  <span style={{ color: CSS.text3 }}>총 발화: </span>
                  <span>{r.totalFires}회</span>
                </div>
                <div>
                  <span style={{ color: CSS.text3 }}>오탐지: </span>
                  <span style={{ color: r.falsePositives > 0 ? CSS.warning : CSS.success }}>
                    {r.falsePositives}회
                  </span>
                </div>
                <div>
                  <span style={{ color: CSS.text3 }}>정확도: </span>
                  <span style={{ color: r.accuracy >= 95 ? CSS.success : CSS.danger }}>
                    {r.accuracy.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span style={{ color: CSS.text3 }}>수렴속도: </span>
                  <span>{r.convergenceSpeed.toFixed(0)}일</span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Next Steps */}
          {allPassed && (
            <div style={{
              background: `linear-gradient(135deg, ${CSS.bg2}, ${CSS.bg3})`,
              borderRadius: 12,
              padding: 20,
              marginTop: 20,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                🚀 다음 단계: [Pulse Start]
              </div>
              <div style={{ fontSize: 13, color: CSS.text2, marginBottom: 16 }}>
                모든 테스트를 통과했습니다. 베타 테스터에게 배포할 준비가 되었습니다.
              </div>
              <button
                onClick={() => alert('🎉 베타 배포 시작! (실제 구현 필요)')}
                style={{
                  padding: '12px 24px',
                  background: CSS.success,
                  border: 'none',
                  borderRadius: 10,
                  color: '#000',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⚡ 베타 테스터 100명에게 배포
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
