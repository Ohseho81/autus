// ═══════════════════════════════════════════════════════════════
// AUTUS Legacy Action Control v1.0
// "행동 버튼은 더 이상 사용자 인터페이스가 아니다. 선택만이 인터페이스다."
// Legacy Action Block → 디버그 전용 격하
// ═══════════════════════════════════════════════════════════════

class LegacyActionControl {
  constructor() {
    this.debugMode = false;
    this.strategicMode = false;
    this.holdTimer = null;
    this.holdDuration = 1200; // 1.2초
    this.init();
  }

  init() {
    this.hideLegacyBlock();
    this.bindEvents();
    this.injectDebugBadge();
    console.log('[AUTUS] Legacy Action Control initialized');
  }

  // ─────────────────────────────────────────────────────────────
  // Legacy Block 완전 숨김 (기본 상태)
  // ─────────────────────────────────────────────────────────────
  hideLegacyBlock() {
    // 비활성화: 기존 UI 요소들을 숨기지 않음
    console.log('[AUTUS] Legacy Action Block hiding DISABLED - preserving layer-action');
    return;
    
    /* DISABLED - 이 코드가 #layer-action을 숨기는 원인
    const selectors = [
      '.recommended-action',
      '.recommendation-banner',
      '#recommendation-banner',
      '.legacy-actions',
      '.action-buttons',
      '[data-legacy-action]',
      '.recover-btn:not([data-choice])',
      '.defriction-btn:not([data-choice])',
      '.shock-btn:not([data-choice])',
      '#future-sim-panel',
      '.future-sim-panel',
      '.hover-sim-card'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.classList.add('legacy-hidden');
        el.setAttribute('data-legacy', 'true');
        el.setAttribute('aria-hidden', 'true');
      });
    });

    document.querySelectorAll('*').forEach(el => {
      if (el.textContent && 
          el.textContent.includes('RECOMMENDED ACTION') && 
          !el.closest('.choice-card') &&
          !el.closest('#choice-container')) {
        el.classList.add('legacy-hidden');
      }
    });

    console.log('[AUTUS] Legacy Action Block hidden');
    */
  }

  // ─────────────────────────────────────────────────────────────
  // 이벤트 바인딩
  // ─────────────────────────────────────────────────────────────
  bindEvents() {
    // Strategic Mode 토글 감시
    document.addEventListener('strategicModeChange', (e) => {
      this.strategicMode = e.detail?.enabled || false;
      if (!this.strategicMode) {
        this.hideDebugContext();
      }
    });

    // Strategic Mode 활성화 감지
    const checkStrategicMode = () => {
      const overlay = document.getElementById('strategic-overlay');
      if (overlay?.classList.contains('active')) {
        this.strategicMode = true;
      }
    };
    
    setInterval(checkStrategicMode, 1000);

    // Alt + D (1.2s) 디버그 접근
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'd' && this.strategicMode) {
        if (!this.holdTimer) {
          this.holdTimer = setTimeout(() => {
            this.showDebugContext();
          }, this.holdDuration);
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key === 'd' || e.key === 'Alt') {
        if (this.holdTimer) {
          clearTimeout(this.holdTimer);
          this.holdTimer = null;
        }
      }
    });

    // Escape로 디버그 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.debugMode) {
        this.hideDebugContext();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 디버그 컨텍스트 표시 (조건 충족 시에만)
  // ─────────────────────────────────────────────────────────────
  showDebugContext() {
    if (!this.strategicMode) {
      console.warn('[AUTUS] Debug context requires Strategic Mode');
      return;
    }

    this.debugMode = true;
    
    // DEBUG CONTEXT 배지 표시
    this.showDebugBadge();

    // Legacy Block 임시 노출 (변형된 형태)
    document.querySelectorAll('[data-legacy="true"]').forEach(el => {
      el.classList.remove('legacy-hidden');
      el.classList.add('legacy-debug-visible');
    });

    // 버튼 라벨 변경
    this.transformToDebugLabels();

    console.log('[AUTUS] Debug context activated');
  }

  hideDebugContext() {
    this.debugMode = false;
    
    // 배지 숨김
    this.hideDebugBadge();

    // Legacy Block 다시 숨김
    document.querySelectorAll('[data-legacy="true"]').forEach(el => {
      el.classList.add('legacy-hidden');
      el.classList.remove('legacy-debug-visible');
    });

    console.log('[AUTUS] Debug context deactivated');
  }

  // ─────────────────────────────────────────────────────────────
  // 디버그 배지
  // ─────────────────────────────────────────────────────────────
  injectDebugBadge() {
    if (document.getElementById('debug-context-badge')) return;
    
    const badge = document.createElement('div');
    badge.id = 'debug-context-badge';
    badge.className = 'debug-badge hidden';
    badge.innerHTML = `
      <span class="badge-icon">🔧</span>
      <span class="badge-text">DEBUG CONTEXT</span>
      <span class="badge-hint">ESC to close</span>
    `;
    document.body.appendChild(badge);
  }

  showDebugBadge() {
    const badge = document.getElementById('debug-context-badge');
    if (badge) {
      badge.classList.remove('hidden');
    }
  }

  hideDebugBadge() {
    const badge = document.getElementById('debug-context-badge');
    if (badge) {
      badge.classList.add('hidden');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 버튼 라벨 디버그용 변환
  // ─────────────────────────────────────────────────────────────
  transformToDebugLabels() {
    const labelMap = {
      'RECOVER': 'ACTION: RECOVER (DEBUG)',
      'DEFRICTION': 'ACTION: DEFRICTION (DEBUG)',
      'SHOCK DAMP': 'ACTION: SHOCK_DAMP (DEBUG)',
      'SHOCK_DAMP': 'ACTION: SHOCK_DAMP (DEBUG)'
    };

    document.querySelectorAll('[data-legacy="true"] button, [data-legacy="true"] .action-btn').forEach(btn => {
      const originalText = btn.textContent.trim().toUpperCase();
      Object.keys(labelMap).forEach(key => {
        if (originalText.includes(key)) {
          btn.textContent = labelMap[key];
          btn.classList.add('debug-action-btn');
          btn.disabled = false;
          
          // LOCK/HOLD/REJECT 연결 제거
          btn.removeAttribute('data-action');
          btn.onclick = (e) => {
            e.preventDefault();
            console.log(`[AUTUS DEBUG] Action triggered: ${key}`);
            this.logDebugAction(key);
          };
        }
      });
    });

    // RECOMMENDED 문구 제거
    document.querySelectorAll('[data-legacy="true"]').forEach(el => {
      if (el.innerHTML) {
        el.innerHTML = el.innerHTML.replace(/RECOMMENDED/gi, 'DEBUG');
      }
    });
  }

  logDebugAction(action) {
    const timestamp = new Date().toISOString();
    console.table({
      timestamp,
      action,
      mode: 'DEBUG',
      phantomConnected: false,
      lockConnected: false
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Strategic Mode 토글 (외부 호출용)
  // ─────────────────────────────────────────────────────────────
  setStrategicMode(enabled) {
    this.strategicMode = enabled;
    document.dispatchEvent(new CustomEvent('strategicModeChange', {
      detail: { enabled }
    }));
  }
}

// 전역 인스턴스
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.legacyControl = new LegacyActionControl();
  }, 2000);
});

if (document.readyState === 'complete') {
  setTimeout(() => {
    if (!window.legacyControl) {
      window.legacyControl = new LegacyActionControl();
    }
  }, 2000);
}
