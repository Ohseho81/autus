// ═══════════════════════════════════════════════════════════════
// AUTUS Strategic Mode v1.0
// Gate RED 시 자동 전환 — 위기 대응 모드
// "위기 상황에서는 선택이 아닌 생존"
// ═══════════════════════════════════════════════════════════════

class StrategicMode {
  constructor() {
    this.isActive = false;
    this.previousGate = 'GREEN';
    this.criticalThreshold = {
      risk: 0.65,
      recovery: 0.35,
      shock: 0.80
    };
    this.autoActionTimer = null;
    this.countdownValue = 30;
    this.overlay = null;
    
    this.init();
  }

  init() {
    this.createUI();
    this.watchGate();
    this.watchMetrics();
    
    console.log('[StrategicMode] Initialized');
  }

  // ─────────────────────────────────────────────────────────────
  // UI 생성
  // ─────────────────────────────────────────────────────────────
  createUI() {
    // 전략 모드 오버레이
    this.overlay = document.createElement('div');
    this.overlay.id = 'strategic-overlay';
    this.overlay.className = 'strategic-overlay';
    this.overlay.innerHTML = `
      <div class="strategic-panel">
        <div class="strategic-header">
          <div class="alert-icon">🚨</div>
          <div class="alert-title">STRATEGIC MODE</div>
          <div class="alert-subtitle">Critical State Detected</div>
        </div>
        
        <div class="strategic-status" id="strategic-status">
          <div class="status-row">
            <span class="status-label">TRIGGER</span>
            <span class="status-value" id="strategic-trigger">—</span>
          </div>
          <div class="status-row">
            <span class="status-label">RISK LEVEL</span>
            <span class="status-value danger" id="strategic-risk">—</span>
          </div>
          <div class="status-row">
            <span class="status-label">BOTTLENECK</span>
            <span class="status-value" id="strategic-bottleneck">—</span>
          </div>
        </div>

        <div class="strategic-recommendation" id="strategic-recommendation">
          <div class="rec-header">RECOMMENDED ACTION</div>
          <div class="rec-action" id="strategic-action">—</div>
          <div class="rec-reasoning" id="strategic-reasoning">—</div>
        </div>

        <div class="strategic-countdown">
          <div class="countdown-label">Auto-execute in</div>
          <div class="countdown-value" id="strategic-countdown">30</div>
          <div class="countdown-bar">
            <div class="countdown-progress" id="countdown-progress"></div>
          </div>
        </div>

        <div class="strategic-actions">
          <button class="strategic-btn execute" id="strategic-execute">
            ⚡ EXECUTE NOW
          </button>
          <button class="strategic-btn override" id="strategic-override">
            ✋ MANUAL OVERRIDE
          </button>
          <button class="strategic-btn dismiss" id="strategic-dismiss">
            ✕ DISMISS (risky)
          </button>
        </div>

        <div class="strategic-warning">
          ⚠️ Dismissing in critical state may lead to system collapse
        </div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  // ─────────────────────────────────────────────────────────────
  // 이벤트 바인딩
  // ─────────────────────────────────────────────────────────────
  bindEvents() {
    document.getElementById('strategic-execute').addEventListener('click', () => {
      this.executeRecommendation();
    });

    document.getElementById('strategic-override').addEventListener('click', () => {
      this.manualOverride();
    });

    document.getElementById('strategic-dismiss').addEventListener('click', () => {
      this.dismiss();
    });

    // ESC 키로 override
    document.addEventListener('keydown', (e) => {
      if (this.isActive && e.key === 'Escape') {
        this.manualOverride();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Gate 감시
  // ─────────────────────────────────────────────────────────────
  watchGate() {
    const checkGate = () => {
      const gateEl = document.getElementById('gate-badge');
      if (!gateEl) return;

      const text = gateEl.textContent;
      let currentGate = 'GREEN';
      
      if (text.includes('RED')) currentGate = 'RED';
      else if (text.includes('AMBER')) currentGate = 'AMBER';

      // RED 진입 감지
      if (currentGate === 'RED' && this.previousGate !== 'RED') {
        this.activate('GATE_RED');
      }
      
      // RED 탈출 감지
      if (currentGate !== 'RED' && this.isActive) {
        this.deactivate('Gate normalized');
      }

      this.previousGate = currentGate;
    };

    // 초기 체크
    checkGate();

    // MutationObserver
    const gateEl = document.getElementById('gate-badge');
    if (gateEl) {
      const observer = new MutationObserver(checkGate);
      observer.observe(gateEl, { childList: true, characterData: true, subtree: true });
    }

    // 폴백: 주기적 체크
    setInterval(checkGate, 1000);
  }

  // ─────────────────────────────────────────────────────────────
  // 메트릭 감시
  // ─────────────────────────────────────────────────────────────
  watchMetrics() {
    setInterval(() => {
      if (this.isActive) return; // 이미 활성화됨

      const state = this.getState();
      
      // Critical 조건 체크
      if (state.risk > this.criticalThreshold.risk) {
        this.activate('HIGH_RISK');
      } else if (state.recovery < this.criticalThreshold.recovery) {
        this.activate('LOW_RECOVERY');
      } else if (state.shock > this.criticalThreshold.shock) {
        this.activate('HIGH_SHOCK');
      }
    }, 2000);
  }

  getState() {
    const state = { risk: 0.5, recovery: 0.5, shock: 0.5, bottleneck: 'UNKNOWN' };

    if (typeof PhysicsFrame !== 'undefined') {
      state.risk = PhysicsFrame.snapshot?.risk || 0.5;
      state.bottleneck = PhysicsFrame.bottleneck?.axis || 'UNKNOWN';
    }

    if (typeof TwinState !== 'undefined') {
      state.recovery = TwinState.RECOVERY || 0.5;
      state.shock = TwinState.SHOCK || 0.5;
    }

    return state;
  }

  // ─────────────────────────────────────────────────────────────
  // 활성화
  // ─────────────────────────────────────────────────────────────
  activate(trigger) {
    if (this.isActive) return;

    this.isActive = true;
    this.overlay.classList.add('active');
    document.body.classList.add('strategic-active');

    // 상태 업데이트
    const state = this.getState();
    document.getElementById('strategic-trigger').textContent = trigger;
    document.getElementById('strategic-risk').textContent = `${(state.risk * 100).toFixed(0)}%`;
    document.getElementById('strategic-bottleneck').textContent = state.bottleneck;

    // 추천 액션 계산
    const recommendation = this.calculateRecommendation(state);
    document.getElementById('strategic-action').textContent = recommendation.action;
    document.getElementById('strategic-reasoning').textContent = recommendation.reasoning;

    // 카운트다운 시작
    this.startCountdown(recommendation.action);

    // 로그
    console.log('[StrategicMode] ACTIVATED:', trigger, state);
    
    if (window.causalityLog) {
      window.causalityLog.addEntry({
        id: Date.now(),
        type: 'strategic',
        timestamp: new Date().toISOString(),
        trigger,
        state,
        recommendation
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 추천 액션 계산
  // ─────────────────────────────────────────────────────────────
  calculateRecommendation(state) {
    // 우선순위: Recovery < 35% → RECOVER
    if (state.recovery < 0.35) {
      return {
        action: 'RECOVER',
        choiceId: 'A',
        reasoning: `Recovery ${(state.recovery * 100).toFixed(0)}% — 즉시 복구 필요. 다른 행동은 무의미.`
      };
    }

    // Shock > 80% → SHOCK_DAMP
    if (state.shock > 0.80) {
      return {
        action: 'SHOCK_DAMP',
        choiceId: 'B',
        reasoning: `Shock ${(state.shock * 100).toFixed(0)}% — 병목 해소 없이 시스템 마비 위험.`
      };
    }

    // Bottleneck 기반
    if (state.bottleneck === 'FRICTION') {
      return {
        action: 'DEFRICTION',
        choiceId: 'C',
        reasoning: `Friction bottleneck detected — 마찰 감소로 Flow 개선.`
      };
    }

    if (state.bottleneck === 'SHOCK') {
      return {
        action: 'SHOCK_DAMP',
        choiceId: 'B',
        reasoning: `Shock bottleneck detected — 충격 감쇠로 안정화.`
      };
    }

    // 기본: RECOVER
    return {
      action: 'RECOVER',
      choiceId: 'A',
      reasoning: `Risk ${(state.risk * 100).toFixed(0)}% — 복구 우선 정책 적용.`
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 카운트다운
  // ─────────────────────────────────────────────────────────────
  startCountdown(action) {
    this.countdownValue = 30;
    this.updateCountdown();

    this.autoActionTimer = setInterval(() => {
      this.countdownValue--;
      this.updateCountdown();

      if (this.countdownValue <= 0) {
        this.executeRecommendation();
      }
    }, 1000);
  }

  updateCountdown() {
    document.getElementById('strategic-countdown').textContent = this.countdownValue;
    const progress = (30 - this.countdownValue) / 30 * 100;
    document.getElementById('countdown-progress').style.width = `${progress}%`;
  }

  stopCountdown() {
    if (this.autoActionTimer) {
      clearInterval(this.autoActionTimer);
      this.autoActionTimer = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 실행
  // ─────────────────────────────────────────────────────────────
  executeRecommendation() {
    this.stopCountdown();
    
    const actionEl = document.getElementById('strategic-action');
    const action = actionEl.textContent;

    console.log('[StrategicMode] EXECUTE:', action);

    // previewAction 호출
    if (typeof previewAction === 'function') {
      const actionKey = action.toLowerCase().replace('_', '_');
      previewAction(actionKey);
    }

    // 자동 LOCK (2초 후)
    setTimeout(() => {
      if (typeof auditDecision === 'function') {
        auditDecision('LOCK');
      }
    }, 2000);

    this.deactivate('Action executed');
  }

  // ─────────────────────────────────────────────────────────────
  // Manual Override
  // ─────────────────────────────────────────────────────────────
  manualOverride() {
    this.stopCountdown();
    this.deactivate('Manual override');
    
    console.log('[StrategicMode] Manual override activated');
    
    // Choice 카드 표시
    const choiceContainer = document.getElementById('choice-container');
    if (choiceContainer) {
      choiceContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Dismiss
  // ─────────────────────────────────────────────────────────────
  dismiss() {
    if (!confirm('⚠️ Dismissing in critical state is risky. Continue?')) {
      return;
    }

    this.stopCountdown();
    this.deactivate('Dismissed by user');
    
    console.log('[StrategicMode] Dismissed (risky)');
  }

  // ─────────────────────────────────────────────────────────────
  // 비활성화
  // ─────────────────────────────────────────────────────────────
  deactivate(reason) {
    this.isActive = false;
    this.stopCountdown();
    this.overlay.classList.remove('active');
    document.body.classList.remove('strategic-active');

    console.log('[StrategicMode] DEACTIVATED:', reason);
  }

  // ─────────────────────────────────────────────────────────────
  // 수동 테스트용
  // ─────────────────────────────────────────────────────────────
  test() {
    this.activate('MANUAL_TEST');
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.strategicMode = new StrategicMode();
  }, 2000);
});

if (document.readyState === 'complete') {
  setTimeout(() => {
    if (!window.strategicMode) {
      window.strategicMode = new StrategicMode();
    }
  }, 2000);
}
