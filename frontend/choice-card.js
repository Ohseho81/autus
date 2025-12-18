// ═══════════════════════════════════════════════════════════════
// AUTUS Choice Card System v1.0
// 버튼 OS → 선택 OS 전환
// "왜 이 선택이 최적인지"를 먼저 보여준다
// ═══════════════════════════════════════════════════════════════

class ChoiceEngine {
  constructor() {
    this.state = null;
    this.choices = [];
  }

  // ─────────────────────────────────────────────────────────────
  // 현재 상태 로드
  // ─────────────────────────────────────────────────────────────
  loadState() {
    // PhysicsFrame이 있으면 사용
    if (typeof TwinState !== 'undefined' && typeof PhysicsFrame !== 'undefined') {
      this.state = {
        recovery: TwinState.RECOVERY || 0.42,
        stability: TwinState.STABILITY || 0.55,
        cohesion: TwinState.COHESION || 0.62,
        shock: TwinState.SHOCK || 0.72,
        friction: TwinState.FRICTION || 0.79,
        transfer: TwinState.TRANSFER || 0.56,
        entropy: PhysicsFrame.snapshot?.entropy || 0.688,
        pressure: PhysicsFrame.snapshot?.pressure || 0.703,
        risk: PhysicsFrame.snapshot?.risk || 0.584,
        flow: PhysicsFrame.snapshot?.flow || 0.453
      };
    } else {
      this.state = {
        recovery: this.getValue('recovery', 0.42),
        stability: this.getValue('stability', 0.55),
        cohesion: this.getValue('cohesion', 0.62),
        shock: this.getValue('shock', 0.72),
        friction: this.getValue('friction', 0.79),
        transfer: this.getValue('transfer', 0.56),
        entropy: this.getMetric('entropy', 0.688),
        pressure: this.getMetric('pressure', 0.703),
        risk: this.getMetric('risk', 0.584),
        flow: this.getMetric('flow', 0.453)
      };
    }
    return this.state;
  }

  getValue(planet, fallback) {
    const el = document.querySelector(`[data-planet="${planet}"] .value`);
    return el ? parseFloat(el.textContent) / 100 : fallback;
  }

  getMetric(metric, fallback) {
    const el = document.querySelector(`[data-metric="${metric}"]`);
    return el ? parseFloat(el.textContent) : fallback;
  }

  // ─────────────────────────────────────────────────────────────
  // 선택지 정의 (Policy 기반)
  // ─────────────────────────────────────────────────────────────
  defineChoices() {
    const s = this.state;
    
    this.choices = [
      {
        id: 'A',
        name: 'RECOVER FIRST',
        policy: '복구 우선 정책',
        action: 'recover',
        delta: {
          recovery: { now: +0.18, h1: +0.22, h24: +0.28, d7: +0.35 },
          friction: { now: -0.05, h1: -0.08, h24: -0.12, d7: -0.15 },
          risk: { now: -0.12, h1: -0.18, h24: -0.25, d7: -0.32 }
        },
        sideEffect: 'Output 일시 저하 (-8%)',
        confidence: this.calcConfidence('recover', s),
        reasoning: s.recovery < 0.50 
          ? `Recovery ${(s.recovery*100).toFixed(0)}% < 임계치(50%). 복구 없이 다른 행동은 무의미.`
          : `Recovery 안정. 선제적 복구로 여유 확보.`
      },
      {
        id: 'B', 
        name: 'UNBLOCK FLOW',
        policy: '병목 해소 정책',
        action: 'shock_damp',
        delta: {
          shock: { now: -0.22, h1: -0.28, h24: -0.35, d7: -0.40 },
          stability: { now: +0.12, h1: +0.15, h24: +0.20, d7: +0.25 },
          risk: { now: -0.10, h1: -0.15, h24: -0.22, d7: -0.28 }
        },
        sideEffect: 'Recovery 정체 (Δ0)',
        confidence: this.calcConfidence('shock_damp', s),
        reasoning: s.shock > 0.70
          ? `Shock ${(s.shock*100).toFixed(0)}% = 병목 상태. 해소 없이 시스템 마비.`
          : `Shock 관리 가능. 예방적 안정화.`
      },
      {
        id: 'C',
        name: 'REDUCE FRICTION',
        policy: '마찰 감소 정책',
        action: 'defriction',
        delta: {
          friction: { now: -0.20, h1: -0.25, h24: -0.30, d7: -0.35 },
          flow: { now: +0.15, h1: +0.20, h24: +0.28, d7: +0.35 },
          risk: { now: -0.08, h1: -0.12, h24: -0.18, d7: -0.22 }
        },
        sideEffect: 'Shock 미처리 (위험 잔존)',
        confidence: this.calcConfidence('defriction', s),
        reasoning: s.friction > 0.70
          ? `Friction ${(s.friction*100).toFixed(0)}% = 고마찰. Flow 개선 필요.`
          : `Friction 정상. 효율 최적화.`
      }
    ];

    // 최적 선택 계산
    this.rankChoices();
    return this.choices;
  }

  // ─────────────────────────────────────────────────────────────
  // Confidence 계산
  // ─────────────────────────────────────────────────────────────
  calcConfidence(action, s) {
    let conf = 0.75;
    
    // 상태-액션 적합성
    if (action === 'recover' && s.recovery < 0.50) conf += 0.15;
    if (action === 'shock_damp' && s.shock > 0.70) conf += 0.12;
    if (action === 'defriction' && s.friction > 0.70) conf += 0.10;
    
    // 상태 불안정 시 불확실성 증가
    if (s.entropy > 0.75) conf -= 0.08;
    if (s.risk > 0.60) conf -= 0.05;
    
    return Math.max(0.20, Math.min(0.95, conf));
  }

  // ─────────────────────────────────────────────────────────────
  // 선택지 순위 결정
  // ─────────────────────────────────────────────────────────────
  rankChoices() {
    const s = this.state;
    
    this.choices.forEach(c => {
      let score = 0;
      
      // Risk 감소량 (가중치 높음)
      score += Math.abs(c.delta.risk?.h24 || 0) * 40;
      
      // 상태 적합성
      if (c.action === 'recover' && s.recovery < 0.50) score += 30;
      if (c.action === 'shock_damp' && s.shock > 0.70) score += 25;
      if (c.action === 'defriction' && s.friction > 0.70) score += 20;
      
      // Confidence 반영
      score *= c.confidence;
      
      c.score = score;
    });

    this.choices.sort((a, b) => b.score - a.score);
    this.choices[0].rank = 'OPTIMAL';
    this.choices[1].rank = 'ALTERNATIVE';
    this.choices[2].rank = 'FALLBACK';
  }

  // ─────────────────────────────────────────────────────────────
  // 미래 상태 계산 (Forecast)
  // ─────────────────────────────────────────────────────────────
  forecast(choice, timeframe) {
    const future = { ...this.state };
    const delta = choice.delta;
    
    Object.keys(delta).forEach(key => {
      if (future[key] !== undefined && delta[key]?.[timeframe]) {
        future[key] = Math.max(0, Math.min(1, 
          this.state[key] + delta[key][timeframe]
        ));
      }
    });
    
    // Risk 재계산
    future.risk = this.calcRisk(future);
    
    return future;
  }

  calcRisk(s) {
    return (
      (1 - s.recovery) * 0.30 +
      s.entropy * 0.25 +
      s.pressure * 0.20 +
      s.shock * 0.15 +
      s.friction * 0.10
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 연쇄 붕괴 경로 계산
  // ─────────────────────────────────────────────────────────────
  collapseChain() {
    const s = this.state;
    const vulnerabilities = [
      { planet: 'Recovery', value: s.recovery, threshold: 0.30 },
      { planet: 'Stability', value: s.stability, threshold: 0.40 },
      { planet: 'Cohesion', value: s.cohesion, threshold: 0.35 },
      { planet: 'Shock', value: 1 - s.shock, threshold: 0.30 }, // 역수
      { planet: 'Friction', value: 1 - s.friction, threshold: 0.25 }
    ];
    
    return vulnerabilities
      .map(v => ({ ...v, margin: v.value - v.threshold }))
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 3);
  }
}

// 전역 인스턴스
window.choiceEngine = new ChoiceEngine();
