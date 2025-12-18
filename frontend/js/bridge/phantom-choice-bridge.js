// ═══════════════════════════════════════════════════════════════
// AUTUS Phantom-Choice Bridge v1.2 PATCHED
// Choice 카드 Hover/Hold/Lock → Phantom Orbit 연결
// ═══════════════════════════════════════════════════════════════

// 🔖 실행 버전 증거 (이 로그가 콘솔에 없으면 구버전 캐시)
console.info("[AUTUS_BUILD] phantom-choice-bridge.js v1.2 FIX_CLOSEST_20251218");

// 🛡️ Safe Element Utilities (closest 에러 방지)
const getElement = (e) => {
  const t = e?.target;
  if (t instanceof Element) return t;
  if (t && t.nodeType === 3) return t.parentElement; // Text node
  return null;
};
const safeClosest = (el, sel) => {
  if (!(el instanceof Element)) return null;
  try { return el.closest(sel); } catch { return null; }
};

class PhantomChoiceBridge {
  constructor() {
    this.phantomEngine = null;
    this.choiceEngine = window.choiceEngine;
    this.hoverTimeout = null;
    this.holdTimer = null;
    try {
      this.init();
    } catch (err) {
      console.warn('[PhantomBridge] Constructor error (safe):', err.message);
    }
  }

  init() {
    try {
      // Phantom 캔버스 찾기 또는 생성
      this.setupCanvas();
      
      // Choice 카드 이벤트 연결
      this.bindChoiceEvents();
      
      // Gate 상태 감시
      this.watchGate();
      
      console.log('[PhantomBridge] Initialized');
    } catch (err) {
      console.warn('[PhantomBridge] init() error (safe):', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Canvas 설정
  // ─────────────────────────────────────────────────────────────
  setupCanvas() {
    let canvas = document.getElementById('phantom-canvas');
    
    if (!canvas) {
      // Three.js 렌더러 위에 오버레이
      const threeCanvas = document.querySelector('canvas');
      
      if (threeCanvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'phantom-canvas';
        canvas.width = threeCanvas.width || window.innerWidth;
        canvas.height = threeCanvas.height || window.innerHeight;
        canvas.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 100;
          width: 100%;
          height: 100%;
        `;
        document.body.appendChild(canvas);
      } else {
        // fallback
        canvas = document.createElement('canvas');
        canvas.id = 'phantom-canvas';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 100;
          width: 100%;
          height: 100%;
        `;
        document.body.appendChild(canvas);
      }
    }

    // 리사이즈 핸들러
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (this.phantomEngine) {
        this.phantomEngine.center = { 
          x: canvas.width / 2, 
          y: canvas.height / 2 
        };
      }
    });

    this.phantomEngine = new PhantomOrbitEngine(canvas);
    this.phantomEngine.startAnimation();
  }

  // ─────────────────────────────────────────────────────────────
  // Choice 이벤트 바인딩
  // ─────────────────────────────────────────────────────────────
  bindChoiceEvents() {
    // Choice 카드 호버 (안전한 Element 접근)
    document.addEventListener('mouseenter', (e) => {
      try {
        const el = getElement(e);
        if (!el) return;
        const card = safeClosest(el, '.choice-card');
        if (card) this.onChoiceHover(card.dataset.choiceId);
      } catch {}
    }, true);

    document.addEventListener('mouseleave', (e) => {
      try {
        const el = getElement(e);
        if (!el) return;
        const card = safeClosest(el, '.choice-card');
        if (card) this.onChoiceLeave(card.dataset.choiceId);
      } catch {}
    }, true);

    // HOLD 버튼 (길게 누르기)
    document.addEventListener('mousedown', (e) => {
      try {
        const el = getElement(e);
        if (!el) return;
        const card = safeClosest(el, '.choice-card');
        if (card && !el.classList?.contains('card-lock-btn')) {
          this.holdTimer = setTimeout(() => {
            this.onChoiceHold(card.dataset.choiceId);
          }, 500);
        }
      } catch {}
    });

    document.addEventListener('mouseup', () => {
      clearTimeout(this.holdTimer);
    });

    // LOCK 버튼
    document.addEventListener('click', (e) => {
      try {
        const el = getElement(e);
        if (!el) return;
        if (el.classList?.contains('card-lock-btn')) {
          const card = safeClosest(el, '.choice-card');
          if (card) this.onChoiceLock(card.dataset.choiceId);
        }
      } catch {}
    });

    // 기존 액션 버튼 지원
    document.querySelectorAll('.action-btn, [data-action]').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        const action = btn.dataset.action || this.detectAction(btn);
        const choiceId = this.actionToChoiceId(action);
        if (choiceId) this.onChoiceHover(choiceId);
      });
      
      btn.addEventListener('mouseleave', () => {
        const action = btn.dataset.action || this.detectAction(btn);
        const choiceId = this.actionToChoiceId(action);
        if (choiceId) this.onChoiceLeave(choiceId);
      });
    });
  }

  detectAction(btn) {
    const text = btn.textContent.toUpperCase();
    if (text.includes('RECOVER')) return 'RECOVER';
    if (text.includes('DEFRICTION')) return 'DEFRICTION';
    if (text.includes('SHOCK')) return 'SHOCK_DAMP';
    return null;
  }

  actionToChoiceId(action) {
    const mapping = {
      'RECOVER': 'A',
      'recover': 'A',
      'SHOCK_DAMP': 'B',
      'shock_damp': 'B',
      'DEFRICTION': 'C',
      'defriction': 'C'
    };
    return mapping[action];
  }

  // ─────────────────────────────────────────────────────────────
  // Hover 처리 (150ms 딜레이)
  // ─────────────────────────────────────────────────────────────
  onChoiceHover(choiceId) {
    clearTimeout(this.hoverTimeout);
    
    this.hoverTimeout = setTimeout(() => {
      const choiceData = this.getChoiceData(choiceId);
      if (choiceData) {
        this.phantomEngine.createPhantom(choiceId, choiceData);
        this.highlightAffectedPlanets(choiceId, true);
        this.drawConnectionLine(choiceId);
        this.showPhantomLegend(true);
      }
    }, 150);
  }

  onChoiceLeave(choiceId) {
    clearTimeout(this.hoverTimeout);
    
    // HOLD 상태가 아니면 제거
    if (!this.phantomEngine.heldPhantoms.has(choiceId)) {
      this.phantomEngine.removePhantom(choiceId);
      this.highlightAffectedPlanets(choiceId, false);
      this.removeConnectionLine(choiceId);
      
      // 모든 phantom이 없으면 legend 숨김
      if (this.phantomEngine.phantoms.size === 0) {
        this.showPhantomLegend(false);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Hold 처리 (비교 모드)
  // ─────────────────────────────────────────────────────────────
  onChoiceHold(choiceId) {
    this.phantomEngine.holdPhantom(choiceId);
    
    // 카드 시각 피드백
    const card = document.querySelector(`[data-choice-id="${choiceId}"]`);
    if (card) {
      card.classList.add('held');
    }
    
    console.log(`[AUTUS] HOLD: Choice ${choiceId} - Compare mode`);
  }

  // ─────────────────────────────────────────────────────────────
  // Lock 처리 (선택 확정)
  // ─────────────────────────────────────────────────────────────
  onChoiceLock(choiceId) {
    this.phantomEngine.lockPhantom(choiceId);
    
    // 연결선 애니메이션
    this.animateLockConnection(choiceId);
    
    // 다른 카드의 held 상태 제거
    document.querySelectorAll('.choice-card.held').forEach(c => {
      c.classList.remove('held');
    });
    
    console.log(`[AUTUS] LOCK: Choice ${choiceId} - Phantom → NOW convergence`);
  }

  // ─────────────────────────────────────────────────────────────
  // Choice 데이터 가져오기
  // ─────────────────────────────────────────────────────────────
  getChoiceData(choiceId) {
    if (this.choiceEngine?.choices) {
      return this.choiceEngine.choices.find(c => c.id === choiceId);
    }
    
    // Fallback 데이터
    const fallbackChoices = {
      'A': {
        id: 'A',
        name: 'RECOVER FIRST',
        action: 'RECOVER',
        delta: {
          recovery: { now: 0.18, h1: 0.22, h24: 0.28, d7: 0.35 },
          friction: { now: -0.05, h1: -0.08, h24: -0.12, d7: -0.15 },
          risk: { now: -0.12, h1: -0.18, h24: -0.25, d7: -0.32 }
        },
        confidence: 0.87
      },
      'B': {
        id: 'B',
        name: 'UNBLOCK FLOW',
        action: 'SHOCK_DAMP',
        delta: {
          shock: { now: -0.22, h1: -0.28, h24: -0.35, d7: -0.40 },
          stability: { now: 0.12, h1: 0.15, h24: 0.20, d7: 0.25 },
          risk: { now: -0.10, h1: -0.15, h24: -0.22, d7: -0.28 }
        },
        confidence: 0.72
      },
      'C': {
        id: 'C',
        name: 'REDUCE FRICTION',
        action: 'DEFRICTION',
        delta: {
          friction: { now: -0.20, h1: -0.25, h24: -0.30, d7: -0.35 },
          transfer: { now: 0.15, h1: 0.20, h24: 0.28, d7: 0.35 },
          risk: { now: -0.08, h1: -0.12, h24: -0.18, d7: -0.22 }
        },
        confidence: 0.65
      }
    };
    
    return fallbackChoices[choiceId];
  }

  // ─────────────────────────────────────────────────────────────
  // 영향 행성 하이라이트
  // ─────────────────────────────────────────────────────────────
  highlightAffectedPlanets(choiceId, active) {
    const choiceData = this.getChoiceData(choiceId);
    if (!choiceData) return;

    const affectedKeys = Object.keys(choiceData.delta || {});
    
    // Planet rows 하이라이트
    document.querySelectorAll('.planet-row').forEach(el => {
      const key = el.dataset.key?.toLowerCase();
      if (active) {
        if (affectedKeys.some(k => k.toLowerCase().includes(key))) {
          el.classList.add('phantom-active');
          el.classList.remove('phantom-dim');
        } else {
          el.classList.add('phantom-dim');
          el.classList.remove('phantom-active');
        }
      } else {
        el.classList.remove('phantom-active', 'phantom-dim');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 카드 → 행성 연결선
  // ─────────────────────────────────────────────────────────────
  drawConnectionLine(choiceId) {
    const card = document.querySelector(`[data-choice-id="${choiceId}"]`);
    if (!card) return;

    let svg = document.getElementById('connection-lines');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'connection-lines';
      svg.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 99;
      `;
      document.body.appendChild(svg);
    }

    // 카드 위치
    const cardRect = card.getBoundingClientRect();
    const cardCenter = {
      x: cardRect.left,
      y: cardRect.top + cardRect.height / 2
    };

    // 화면 중앙 (행성 위치)
    const targetX = window.innerWidth / 2;
    const targetY = window.innerHeight / 2;

    // 연결선 그리기
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.id = `connection-${choiceId}`;
    
    const d = `M ${cardCenter.x} ${cardCenter.y} Q ${cardCenter.x - 100} ${(cardCenter.y + targetY) / 2} ${targetX} ${targetY}`;
    
    line.setAttribute('d', d);
    line.setAttribute('stroke', 'rgba(59, 130, 246, 0.3)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke-dasharray', '5,5');
    line.classList.add('connection-line');
    
    svg.appendChild(line);
  }

  removeConnectionLine(choiceId) {
    const line = document.getElementById(`connection-${choiceId}`);
    if (line) {
      line.remove();
    }
  }

  animateLockConnection(choiceId) {
    const line = document.getElementById(`connection-${choiceId}`);
    if (line) {
      line.setAttribute('stroke', 'rgba(34, 197, 94, 0.8)');
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-dasharray', 'none');
      
      setTimeout(() => line.remove(), 800);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Legend 표시
  // ─────────────────────────────────────────────────────────────
  showPhantomLegend(visible) {
    const legend = document.getElementById('phantom-legend');
    if (legend) {
      legend.classList.toggle('visible', visible);
    }
    
    const hint = document.getElementById('phantom-hint');
    if (hint) {
      hint.classList.toggle('visible', !visible);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Gate 상태 감시
  // ─────────────────────────────────────────────────────────────
  watchGate() {
    // Gate badge 감시
    const updateGate = () => {
      const gateEl = document.getElementById('gate-badge');
      if (gateEl) {
        const text = gateEl.textContent;
        const gate = text.includes('RED') ? 'RED' :
                    text.includes('AMBER') ? 'AMBER' : 'GREEN';
        this.phantomEngine.setGate(gate);
      }
    };

    // 초기 설정
    updateGate();

    // MutationObserver로 변경 감지
    const observer = new MutationObserver(updateGate);
    const gateEl = document.getElementById('gate-badge');
    if (gateEl) {
      observer.observe(gateEl, { subtree: true, childList: true, characterData: true });
    }
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.phantomBridge = new PhantomChoiceBridge();
  }, 1000);
});

// 이미 로드된 경우
if (document.readyState === 'complete') {
  setTimeout(() => {
    if (!window.phantomBridge) {
      window.phantomBridge = new PhantomChoiceBridge();
    }
  }, 1000);
}
