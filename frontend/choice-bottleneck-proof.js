// ═══════════════════════════════════════════════════════════════
// AUTUS Choice Bottleneck Proof v1.0
// Choice 카드 내부 '병목 → 선택' 1줄 증명 UX
// "왜 이 선택인가"를 한 줄로 압축
// ═══════════════════════════════════════════════════════════════

class ChoiceBottleneckProof {
  constructor() {
    this.bottleneckData = null;
    this.init();
  }

  init() {
    this.detectBottleneck();
    this.injectProofUI();
    this.startWatch();
    console.log('[AUTUS] Bottleneck Proof initialized');
  }

  // ─────────────────────────────────────────────────────────────
  // 병목 감지
  // ─────────────────────────────────────────────────────────────
  detectBottleneck() {
    const state = this.getState();
    
    // 병목 우선순위 (심각도 기준)
    const bottlenecks = [
      { key: 'recovery', value: state.recovery, threshold: 0.50, label: 'RECOVERY', severity: (0.50 - state.recovery) / 0.50 },
      { key: 'shock', value: state.shock, threshold: 0.70, label: 'SHOCK', severity: (state.shock - 0.70) / 0.30, inverted: true },
      { key: 'friction', value: state.friction, threshold: 0.70, label: 'FRICTION', severity: (state.friction - 0.70) / 0.30, inverted: true },
      { key: 'stability', value: state.stability, threshold: 0.45, label: 'STABILITY', severity: (0.45 - state.stability) / 0.45 },
      { key: 'cohesion', value: state.cohesion, threshold: 0.40, label: 'COHESION', severity: (0.40 - state.cohesion) / 0.40 }
    ];

    // 임계치 초과한 것 중 가장 심각한 것
    const active = bottlenecks
      .filter(b => b.inverted ? b.value > b.threshold : b.value < b.threshold)
      .sort((a, b) => b.severity - a.severity);

    this.bottleneckData = {
      primary: active[0] || null,
      secondary: active[1] || null,
      all: active
    };

    return this.bottleneckData;
  }

  getState() {
    // TwinState에서 가져오기
    if (typeof TwinState !== 'undefined') {
      return {
        recovery: TwinState.RECOVERY || 0.42,
        stability: TwinState.STABILITY || 0.55,
        cohesion: TwinState.COHESION || 0.62,
        shock: TwinState.SHOCK || 0.72,
        friction: TwinState.FRICTION || 0.79,
        risk: typeof PhysicsFrame !== 'undefined' ? PhysicsFrame.snapshot?.risk : 0.58
      };
    }
    
    // ChoiceEngine에서 가져오기
    if (window.choiceEngine?.state) {
      return window.choiceEngine.state;
    }
    
    // Fallback
    return {
      recovery: 0.42,
      stability: 0.55,
      cohesion: 0.62,
      shock: 0.72,
      friction: 0.79,
      risk: 0.58
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 증명 UI 삽입
  // ─────────────────────────────────────────────────────────────
  injectProofUI() {
    const cards = document.querySelectorAll('.choice-card');
    
    cards.forEach(card => {
      const choiceId = card.dataset.choiceId;
      const proofLine = this.generateProofLine(choiceId);
      
      // 기존 proof 제거
      const existingProof = card.querySelector('.bottleneck-proof');
      if (existingProof) existingProof.remove();
      
      // 새 proof 삽입 (card-policy 아래)
      const policyEl = card.querySelector('.card-policy');
      if (policyEl && proofLine) {
        const proofEl = document.createElement('div');
        proofEl.className = 'bottleneck-proof';
        proofEl.innerHTML = proofLine;
        policyEl.after(proofEl);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 1줄 증명 생성
  // ─────────────────────────────────────────────────────────────
  generateProofLine(choiceId) {
    const bn = this.bottleneckData;
    if (!bn || !bn.primary) return null;

    // Choice별 병목 대응 매핑
    const choiceTargets = {
      'A': { primary: 'recovery', action: '복구', icon: '🔧' },
      'B': { primary: 'shock', action: '해소', icon: '⚡' },
      'C': { primary: 'friction', action: '감소', icon: '🔥' }
    };

    const target = choiceTargets[choiceId];
    if (!target) return null;

    // 이 Choice가 Primary 병목을 직접 해결하는지
    const directMatch = bn.primary.key === target.primary;
    
    // 이 Choice가 Secondary 병목을 해결하는지
    const secondaryMatch = bn.secondary && bn.secondary.key === target.primary;

    let proofText, proofClass;

    if (directMatch) {
      // 직접 대응
      proofText = `${target.icon} <strong>${bn.primary.label}</strong> ${(bn.primary.value * 100).toFixed(0)}% → 직접 ${target.action}`;
      proofClass = 'proof-direct';
    } else if (secondaryMatch) {
      // 2차 대응
      proofText = `${target.icon} <strong>${bn.secondary.label}</strong> ${(bn.secondary.value * 100).toFixed(0)}% → 간접 ${target.action}`;
      proofClass = 'proof-secondary';
    } else {
      // 우회 경로
      const relationText = this.getRelationText(target.primary, bn.primary.key);
      proofText = `${target.icon} ${target.primary.toUpperCase()} ${target.action} → ${relationText}`;
      proofClass = 'proof-indirect';
    }

    return `<span class="${proofClass}">${proofText}</span>`;
  }

  getRelationText(action, bottleneck) {
    const relations = {
      'recovery': {
        'shock': 'Shock 해소 전 기반 확보',
        'friction': 'Friction 감소 전 여유 확보',
        'stability': 'Stability 회복 지원',
        'cohesion': 'Cohesion 강화 기반'
      },
      'shock': {
        'recovery': 'Recovery 후 Flow 개선',
        'friction': 'Friction과 동시 처리',
        'stability': 'Stability 급상승 기대',
        'cohesion': 'Cohesion 연쇄 회복'
      },
      'friction': {
        'recovery': 'Recovery 완료 후 효과 증폭',
        'shock': 'Shock 해소와 병행',
        'stability': 'Stability 간접 개선',
        'cohesion': 'Cohesion Flow 개선'
      }
    };

    return relations[action]?.[bottleneck] || '간접 경로';
  }

  // ─────────────────────────────────────────────────────────────
  // 실시간 업데이트
  // ─────────────────────────────────────────────────────────────
  startWatch() {
    // 5초마다 업데이트
    setInterval(() => {
      this.detectBottleneck();
      this.injectProofUI();
      this.injectForecastMiniBar();
    }, 5000);

    // Choice 재생성 이벤트
    document.addEventListener('choicesUpdated', () => {
      this.detectBottleneck();
      this.injectProofUI();
      this.injectForecastMiniBar();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Forecast Mini Bar (Choice 카드 내장)
  // ─────────────────────────────────────────────────────────────
  injectForecastMiniBar() {
    const cards = document.querySelectorAll('.choice-card');
    
    cards.forEach(card => {
      const choiceId = card.dataset.choiceId;
      const choice = this.getChoiceData(choiceId);
      if (!choice) return;

      // 기존 mini-bar 제거
      const existingBar = card.querySelector('.forecast-mini-bar');
      if (existingBar) existingBar.remove();

      // 현재 Risk vs 예측 Risk
      const state = this.getState();
      const currentRisk = state.risk || 0.58;
      const predictedRisk = Math.max(0, currentRisk + (choice.delta?.risk?.h24 || 0));
      const improvement = currentRisk - predictedRisk;
      const improvementPct = (improvement / currentRisk * 100).toFixed(0);

      const barEl = document.createElement('div');
      barEl.className = 'forecast-mini-bar';
      barEl.innerHTML = `
        <div class="mini-bar-label">RISK Δ</div>
        <div class="mini-bar-container">
          <div class="mini-bar-current" style="width: ${currentRisk * 100}%"></div>
          <div class="mini-bar-predicted" style="width: ${predictedRisk * 100}%"></div>
        </div>
        <div class="mini-bar-delta ${improvement > 0 ? 'positive' : 'negative'}">
          ${improvement > 0 ? '↓' : '↑'}${Math.abs(improvementPct)}%
        </div>
      `;

      // card-forecast 앞에 삽입
      const forecastEl = card.querySelector('.card-forecast');
      if (forecastEl) {
        forecastEl.before(barEl);
      }
    });
  }

  getChoiceData(choiceId) {
    if (window.choiceEngine?.choices) {
      return window.choiceEngine.choices.find(c => c.id === choiceId);
    }
    return null;
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.bottleneckProof = new ChoiceBottleneckProof();
  }, 1500);
});

if (document.readyState === 'complete') {
  setTimeout(() => {
    if (!window.bottleneckProof) {
      window.bottleneckProof = new ChoiceBottleneckProof();
    }
  }, 1500);
}
