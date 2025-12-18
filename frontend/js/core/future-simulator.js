// ═══════════════════════════════════════════════════════════════
// AUTUS Future Simulator v1.0
// 액션 선택 전 미래 3가지 분기 (BEST/LIKELY/WORST) 계산
// ═══════════════════════════════════════════════════════════════

class FutureSimulator {
  constructor() {
    // 물리 상수
    this.RECOVERY_CRITICAL = 0.50;
    this.ENTROPY_DANGER = 0.75;
    this.CONFIDENCE_BASE = 0.85;
  }

  // ─────────────────────────────────────────────────────────────
  // 현재 상태 가져오기 (TwinState + Snapshot)
  // ─────────────────────────────────────────────────────────────
  getCurrentState() {
    // PhysicsFrame이 있으면 사용, 없으면 DOM에서 추출
    if (typeof TwinState !== 'undefined' && typeof PhysicsFrame !== 'undefined') {
      return {
        recovery: TwinState.RECOVERY || 0.42,
        stability: TwinState.STABILITY || 0.55,
        cohesion: TwinState.COHESION || 0.62,
        shock: TwinState.SHOCK || 0.72,
        friction: TwinState.FRICTION || 0.79,
        entropy: PhysicsFrame.snapshot?.entropy || 0.688,
        pressure: PhysicsFrame.snapshot?.pressure || 0.703,
        risk: PhysicsFrame.snapshot?.risk || 0.584,
        flow: PhysicsFrame.snapshot?.flow || 0.453
      };
    }
    
    return {
      recovery: parseFloat(document.querySelector('[data-planet="recovery"] .value')?.textContent) / 100 || 0.42,
      stability: parseFloat(document.querySelector('[data-planet="stability"] .value')?.textContent) / 100 || 0.55,
      cohesion: parseFloat(document.querySelector('[data-planet="cohesion"] .value')?.textContent) / 100 || 0.62,
      shock: parseFloat(document.querySelector('[data-planet="shock"] .value')?.textContent) / 100 || 0.72,
      friction: parseFloat(document.querySelector('[data-planet="friction"] .value')?.textContent) / 100 || 0.79,
      entropy: parseFloat(document.querySelector('[data-metric="entropy"]')?.textContent) || 0.688,
      pressure: parseFloat(document.querySelector('[data-metric="pressure"]')?.textContent) || 0.703,
      risk: parseFloat(document.querySelector('[data-metric="risk"]')?.textContent) || 0.584,
      flow: parseFloat(document.querySelector('[data-metric="flow"]')?.textContent) || 0.453
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 액션별 물리 효과 정의
  // ─────────────────────────────────────────────────────────────
  getActionEffects(action) {
    const effects = {
      'RECOVER': {
        recovery: { best: 0.26, likely: 0.16, worst: 0.03 },
        entropy: { best: -0.12, likely: -0.08, worst: 0.02 },
        risk: { best: -0.16, likely: -0.10, worst: 0.05 },
        pressure: { best: -0.10, likely: -0.05, worst: 0.03 },
        description: 'Recovery 우선 복구 → 엔트로피 감소'
      },
      'DEFRICTION': {
        recovery: { best: 0.08, likely: 0.05, worst: -0.02 },
        friction: { best: -0.25, likely: -0.15, worst: -0.05 },
        entropy: { best: -0.08, likely: -0.05, worst: 0.01 },
        risk: { best: -0.12, likely: -0.08, worst: 0.02 },
        flow: { best: 0.15, likely: 0.10, worst: 0.03 },
        description: 'Friction 감소 → Flow 증가'
      },
      'SHOCK_DAMP': {
        shock: { best: -0.30, likely: -0.20, worst: -0.08 },
        stability: { best: 0.15, likely: 0.10, worst: 0.02 },
        entropy: { best: -0.10, likely: -0.06, worst: 0.03 },
        risk: { best: -0.14, likely: -0.09, worst: 0.04 },
        description: 'Shock 병목 해소 → 안정성 회복'
      }
    };
    return effects[action] || effects['RECOVER'];
  }

  // ─────────────────────────────────────────────────────────────
  // Confidence 계산 (현재 상태 기반)
  // ─────────────────────────────────────────────────────────────
  calculateConfidence(state, action, scenario) {
    let base = this.CONFIDENCE_BASE;
    
    // 상태가 나쁠수록 불확실성 증가
    if (state.recovery < this.RECOVERY_CRITICAL) base -= 0.10;
    if (state.entropy > this.ENTROPY_DANGER) base -= 0.08;
    if (state.shock > 0.70) base -= 0.05;
    
    // 시나리오별 조정
    const scenarioMod = { best: 0.02, likely: 0, worst: -0.15 };
    base += scenarioMod[scenario];
    
    // 액션-상태 적합성
    if (action === 'RECOVER' && state.recovery < 0.50) base += 0.05;
    if (action === 'SHOCK_DAMP' && state.shock > 0.70) base += 0.05;
    if (action === 'DEFRICTION' && state.friction > 0.70) base += 0.05;
    
    return Math.max(0.10, Math.min(0.95, base));
  }

  // ─────────────────────────────────────────────────────────────
  // 미래 분기 시뮬레이션
  // ─────────────────────────────────────────────────────────────
  simulate(action) {
    const state = this.getCurrentState();
    const effects = this.getActionEffects(action);
    
    const scenarios = ['best', 'likely', 'worst'];
    const results = {};
    
    scenarios.forEach(scenario => {
      const future = { ...state };
      
      // 효과 적용
      Object.keys(effects).forEach(key => {
        if (key !== 'description' && future[key] !== undefined) {
          future[key] = Math.max(0, Math.min(1, 
            state[key] + (effects[key]?.[scenario] || 0)
          ));
        }
      });
      
      // Risk 재계산 (물리 공식)
      future.risk = this.calculateRisk(future);
      
      results[scenario] = {
        state: future,
        delta: this.calculateDelta(state, future),
        confidence: this.calculateConfidence(state, action, scenario),
        description: effects.description
      };
    });
    
    return results;
  }

  // ─────────────────────────────────────────────────────────────
  // Risk 물리 공식
  // ─────────────────────────────────────────────────────────────
  calculateRisk(state) {
    const w = { recovery: 0.3, entropy: 0.25, pressure: 0.2, shock: 0.15, friction: 0.1 };
    return (
      (1 - state.recovery) * w.recovery +
      state.entropy * w.entropy +
      state.pressure * w.pressure +
      state.shock * w.shock +
      state.friction * w.friction
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Delta 계산
  // ─────────────────────────────────────────────────────────────
  calculateDelta(before, after) {
    const delta = {};
    ['recovery', 'entropy', 'risk', 'pressure', 'flow', 'shock', 'friction'].forEach(key => {
      if (before[key] !== undefined && after[key] !== undefined) {
        delta[key] = after[key] - before[key];
      }
    });
    return delta;
  }

  // ─────────────────────────────────────────────────────────────
  // 최적 액션 랭킹
  // ─────────────────────────────────────────────────────────────
  rankActions() {
    const actions = ['RECOVER', 'DEFRICTION', 'SHOCK_DAMP'];
    const state = this.getCurrentState();
    
    const ranked = actions.map(action => {
      const sim = this.simulate(action);
      const score = this.calculateActionScore(action, state, sim);
      return {
        action,
        score,
        simulation: sim,
        reason: this.generateReason(action, state, sim)
      };
    }).sort((a, b) => b.score - a.score);
    
    return ranked;
  }

  // ─────────────────────────────────────────────────────────────
  // 액션 스코어 계산
  // ─────────────────────────────────────────────────────────────
  calculateActionScore(action, state, sim) {
    let score = 0;
    const likely = sim.likely;
    
    // Risk 감소 가중치 높음
    score -= likely.delta.risk * 100;
    
    // Recovery 증가 보너스
    score += (likely.delta.recovery || 0) * 50;
    
    // Entropy 감소 보너스
    score -= (likely.delta.entropy || 0) * 30;
    
    // 상태 적합성 보너스
    if (action === 'RECOVER' && state.recovery < 0.50) score += 20;
    if (action === 'SHOCK_DAMP' && state.shock > 0.70) score += 15;
    if (action === 'DEFRICTION' && state.friction > 0.70) score += 10;
    
    // Confidence 반영
    score *= likely.confidence;
    
    return score;
  }

  // ─────────────────────────────────────────────────────────────
  // 물리 기반 이유 생성
  // ─────────────────────────────────────────────────────────────
  generateReason(action, state, sim) {
    const reasons = [];
    
    if (action === 'RECOVER') {
      if (state.recovery < 0.50) {
        reasons.push(`Recovery ${(state.recovery*100).toFixed(0)}% < Critical(50%)`);
      }
      reasons.push(`Expected Δ: Risk ${(state.risk).toFixed(2)} → ${(sim.likely.state.risk).toFixed(2)}`);
    }
    
    if (action === 'SHOCK_DAMP') {
      if (state.shock > 0.70) {
        reasons.push(`Shock ${(state.shock*100).toFixed(0)}% = 병목 상태`);
      }
      reasons.push(`Expected Δ: Stability +${((sim.likely.delta.stability || 0)*100).toFixed(0)}%`);
    }
    
    if (action === 'DEFRICTION') {
      if (state.friction > 0.70) {
        reasons.push(`Friction ${(state.friction*100).toFixed(0)}% 고마찰 상태`);
      }
      reasons.push(`Expected Δ: Flow +${((sim.likely.delta.flow || 0)*100).toFixed(0)}%`);
    }
    
    return reasons;
  }
}

// 전역 인스턴스
window.futureSimulator = new FutureSimulator();
