// ═══════════════════════════════════════════════════════════════
// AUTUS CHOICE SYSTEM v1.0 (Production Bundle)
// Choice Card + Phantom Orbit + Causality Log + Learning Loop
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // PART 1: CHOICE ENGINE
  // ═══════════════════════════════════════════════════════════════
  
  class ChoiceEngine {
    constructor() {
      this.state = null;
      this.choices = [];
      this.weights = this.loadWeights();
    }

    loadState() {
      const getValue = (sel, fallback) => {
        const el = document.querySelector(sel);
        if (!el) return fallback;
        const text = el.textContent.replace('%', '').trim();
        const num = parseFloat(text);
        return isNaN(num) ? fallback : num / 100;
      };

      this.state = {
        recovery: getValue('[data-planet="recovery"] .value, .recovery-value', 0.42),
        stability: getValue('[data-planet="stability"] .value, .stability-value', 0.55),
        cohesion: getValue('[data-planet="cohesion"] .value, .cohesion-value', 0.62),
        shock: getValue('[data-planet="shock"] .value, .shock-value', 0.72),
        friction: getValue('[data-planet="friction"] .value, .friction-value', 0.79),
        transfer: getValue('[data-planet="transfer"] .value, .transfer-value', 0.56),
        entropy: getValue('[data-metric="entropy"], .entropy-value', 0.688),
        pressure: getValue('[data-metric="pressure"], .pressure-value', 0.703),
        risk: getValue('[data-metric="risk"], .risk-value', 0.584),
        flow: getValue('[data-metric="flow"], .flow-value', 0.453)
      };
      return this.state;
    }

    defineChoices() {
      const s = this.state || this.loadState();
      
      this.choices = [
        {
          id: 'A',
          name: 'RECOVER FIRST',
          policy: '복구 우선 정책',
          action: 'RECOVER',
          delta: {
            recovery: { now: 0.18, h1: 0.22, h24: 0.28, d7: 0.35 },
            friction: { now: -0.05, h1: -0.08, h24: -0.12, d7: -0.15 },
            risk: { now: -0.12, h1: -0.18, h24: -0.25, d7: -0.32 }
          },
          sideEffect: 'Output 일시 저하 (-8%)',
          confidence: this.calcConfidence('RECOVER', s),
          reasoning: s.recovery < 0.50 
            ? `Recovery ${(s.recovery*100).toFixed(0)}% < 임계치(50%). 복구 없이 다른 행동은 무의미.`
            : `Recovery 안정. 선제적 복구로 여유 확보.`
        },
        {
          id: 'B', 
          name: 'UNBLOCK FLOW',
          policy: '병목 해소 정책',
          action: 'SHOCK_DAMP',
          delta: {
            shock: { now: -0.22, h1: -0.28, h24: -0.35, d7: -0.40 },
            stability: { now: 0.12, h1: 0.15, h24: 0.20, d7: 0.25 },
            risk: { now: -0.10, h1: -0.15, h24: -0.22, d7: -0.28 }
          },
          sideEffect: 'Recovery 정체 (Δ0)',
          confidence: this.calcConfidence('SHOCK_DAMP', s),
          reasoning: s.shock > 0.70
            ? `Shock ${(s.shock*100).toFixed(0)}% = 병목 상태. 해소 없이 시스템 마비.`
            : `Shock 관리 가능. 예방적 안정화.`
        },
        {
          id: 'C',
          name: 'REDUCE FRICTION',
          policy: '마찰 감소 정책',
          action: 'DEFRICTION',
          delta: {
            friction: { now: -0.20, h1: -0.25, h24: -0.30, d7: -0.35 },
            flow: { now: 0.15, h1: 0.20, h24: 0.28, d7: 0.35 },
            risk: { now: -0.08, h1: -0.12, h24: -0.18, d7: -0.22 }
          },
          sideEffect: 'Shock 미처리 (위험 잔존)',
          confidence: this.calcConfidence('DEFRICTION', s),
          reasoning: s.friction > 0.70
            ? `Friction ${(s.friction*100).toFixed(0)}% = 고마찰. Flow 개선 필요.`
            : `Friction 정상. 효율 최적화.`
        }
      ];

      this.rankChoices();
      return this.choices;
    }

    calcConfidence(action, s) {
      let conf = 0.75;
      if (action === 'RECOVER' && s.recovery < 0.50) conf += 0.15;
      if (action === 'SHOCK_DAMP' && s.shock > 0.70) conf += 0.12;
      if (action === 'DEFRICTION' && s.friction > 0.70) conf += 0.10;
      if (s.entropy > 0.75) conf -= 0.08;
      if (s.risk > 0.60) conf -= 0.05;
      
      // 가중치 적용
      const w = this.weights;
      if (w) {
        const pattern = action === 'RECOVER' ? 'safe' : action === 'SHOCK_DAMP' ? 'balanced' : 'fast';
        conf *= (w[`pattern_${pattern}`] || 1.0);
      }
      
      return Math.max(0.20, Math.min(0.95, conf));
    }

    rankChoices() {
      const s = this.state;
      
      this.choices.forEach(c => {
        let score = 0;
        score += Math.abs(c.delta.risk?.h24 || 0) * 40;
        score += (c.delta.recovery?.h24 || 0) * 50;
        if (c.action === 'RECOVER' && s.recovery < 0.50) score += 30;
        if (c.action === 'SHOCK_DAMP' && s.shock > 0.70) score += 25;
        if (c.action === 'DEFRICTION' && s.friction > 0.70) score += 20;
        score *= c.confidence;
        c.score = score;
      });

      this.choices.sort((a, b) => b.score - a.score);
      this.choices[0].rank = 'PRIMARY';
      this.choices[1].rank = 'SECONDARY';
      this.choices[2].rank = 'TERTIARY';
    }

    loadWeights() {
      try {
        const data = localStorage.getItem('autus-kernel-weights');
        return data ? JSON.parse(data).weights : null;
      } catch (e) {
        return null;
      }
    }

    getBottleneck() {
      const s = this.state || this.loadState();
      const checks = [
        { key: 'recovery', value: s.recovery, threshold: 0.50, label: 'RECOVERY', inverted: false },
        { key: 'shock', value: s.shock, threshold: 0.70, label: 'SHOCK', inverted: true },
        { key: 'friction', value: s.friction, threshold: 0.70, label: 'FRICTION', inverted: true }
      ];

      const active = checks
        .filter(b => b.inverted ? b.value > b.threshold : b.value < b.threshold)
        .sort((a, b) => {
          const sevA = b.inverted ? (b.value - b.threshold) : (b.threshold - b.value);
          const sevB = a.inverted ? (a.value - a.threshold) : (a.threshold - a.value);
          return sevB - sevA;
        });

      return active[0] || null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PART 2: CHOICE CARD UI
  // ═══════════════════════════════════════════════════════════════
  
  class ChoiceCardUI {
    constructor(engine) {
      this.engine = engine;
      this.container = null;
    }

    init() {
      this.engine.loadState();
      this.engine.defineChoices();
      this.createContainer();
      this.render();
      this.bindEvents();
    }

    createContainer() {
      this.container = document.getElementById('choice-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'choice-container';
        this.container.className = 'choice-container';
        
        // L3 ACTION LOG 영역 찾아서 그 앞에 삽입
        const l3 = document.querySelector('[data-layer="L3"], .action-log, #action-log');
        if (l3 && l3.parentElement) {
          l3.parentElement.insertBefore(this.container, l3);
        } else {
          // fallback: 메인 콘텐츠 영역에 추가
          const main = document.querySelector('.main-content, .content, main, .right-panel');
          if (main) {
            main.appendChild(this.container);
          } else {
            document.body.appendChild(this.container);
          }
        }
      }
    }

    render() {
      const choices = this.engine.choices;
      const bottleneck = this.engine.getBottleneck();
      const state = this.engine.state;
      
      this.container.innerHTML = `
        <div class="choice-header">
          <span class="choice-title">STRATEGIC CHOICES</span>
          <span class="choice-subtitle">선택의 이유와 미래를 먼저 본다</span>
        </div>
        
        ${bottleneck ? `
          <div class="primary-bottleneck-badge">
            <span class="bn-icon">⚠️</span>
            <span class="bn-label">PRIMARY BOTTLENECK:</span>
            <span class="bn-name">${bottleneck.label}</span>
            <span class="bn-value">${(bottleneck.value * 100).toFixed(0)}%</span>
          </div>
        ` : ''}
        
        <div class="choice-cards">
          ${choices.map(c => this.renderCard(c, state)).join('')}
        </div>
      `;
    }

    renderCard(choice, state) {
      const isPrimary = choice.rank === 'PRIMARY';
      const rankClass = choice.rank.toLowerCase();
      const currentRisk = state.risk || 0.58;
      const predictedRisk = currentRisk + (choice.delta.risk?.h24 || 0);
      const improvement = ((currentRisk - predictedRisk) / currentRisk * 100).toFixed(0);
      
      return `
        <div class="choice-card ${rankClass}" data-choice-id="${choice.id}">
          <div class="card-rank ${rankClass}">
            ${isPrimary ? '◉ ' : ''}${choice.rank}
          </div>
          
          <div class="card-header">
            <span class="card-id">CHOICE ${choice.id}</span>
            <span class="card-name">${choice.name}</span>
          </div>
          
          <div class="card-policy">${choice.policy}</div>
          
          <div class="card-reasoning">${choice.reasoning}</div>
          
          <div class="card-deltas">
            ${this.renderDeltas(choice.delta)}
          </div>
          
          <div class="forecast-mini-bar">
            <div class="mini-bar-label">RISK Δ</div>
            <div class="mini-bar-container">
              <div class="mini-bar-current" style="width: ${currentRisk * 100}%"></div>
              <div class="mini-bar-predicted" style="width: ${Math.max(0, predictedRisk) * 100}%"></div>
            </div>
            <div class="mini-bar-delta ${improvement > 0 ? 'positive' : 'negative'}">
              ${improvement > 0 ? '↓' : '↑'}${Math.abs(improvement)}%
            </div>
          </div>
          
          <div class="card-forecast">
            <span class="forecast-label">FORECAST</span>
            <div class="forecast-row">
              <span class="tf">+1h</span>
              <span class="risk-val">Risk ${((currentRisk + (choice.delta.risk?.h1 || 0)) * 100).toFixed(0)}%</span>
            </div>
            <div class="forecast-row">
              <span class="tf">+24h</span>
              <span class="risk-val">Risk ${((currentRisk + (choice.delta.risk?.h24 || 0)) * 100).toFixed(0)}%</span>
            </div>
            <div class="forecast-row">
              <span class="tf">+7d</span>
              <span class="risk-val">Risk ${((currentRisk + (choice.delta.risk?.d7 || 0)) * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div class="card-sideeffect">
            <span class="se-label">⚠️ TRADE-OFF</span>
            <span class="se-value">${choice.sideEffect}</span>
          </div>
          
          <div class="card-confidence">
            <div class="conf-bar" style="width: ${choice.confidence * 100}%"></div>
            <span class="conf-label">Confidence ${(choice.confidence * 100).toFixed(0)}%</span>
          </div>
          
          <button class="card-lock-btn" data-action="${choice.action}" data-choice="${choice.id}">
            LOCK ${choice.id}
          </button>
        </div>
      `;
    }

    renderDeltas(delta) {
      const items = [];
      Object.keys(delta).forEach(key => {
        const d = delta[key]?.h24 || delta[key]?.now || 0;
        if (Math.abs(d) > 0.01) {
          const sign = d >= 0 ? '+' : '';
          const cls = (key === 'risk' || key === 'friction' || key === 'shock') 
            ? (d < 0 ? 'positive' : 'negative')
            : (d > 0 ? 'positive' : 'negative');
          items.push(`<span class="delta-item ${cls}">${key.toUpperCase()} ${sign}${(d * 100).toFixed(0)}%</span>`);
        }
      });
      return `<div class="delta-section">${items.join('')}</div>`;
    }

    bindEvents() {
      this.container.querySelectorAll('.card-lock-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const action = btn.dataset.action;
          const choiceId = btn.dataset.choice;
          this.onLock(action, choiceId);
        });
      });

      this.container.querySelectorAll('.choice-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
          const choiceId = card.dataset.choiceId;
          this.onHover(choiceId, true);
        });
        card.addEventListener('mouseleave', () => {
          const choiceId = card.dataset.choiceId;
          this.onHover(choiceId, false);
        });
      });
    }

    onLock(action, choiceId) {
      console.log(`[AUTUS] LOCK: ${action} (Choice ${choiceId})`);
      
      // 카드 시각 피드백
      const card = this.container.querySelector(`[data-choice-id="${choiceId}"]`);
      if (card) {
        card.classList.add('locked');
        const btn = card.querySelector('.card-lock-btn');
        if (btn) {
          btn.textContent = '✓ LOCKED';
          btn.disabled = true;
        }
      }

      // Causality Log에 기록
      if (window.causalityLog) {
        const choice = this.engine.choices.find(c => c.id === choiceId);
        window.causalityLog.record(choiceId, choice, this.engine.state);
      }

      // 이벤트 발생
      document.dispatchEvent(new CustomEvent('choiceLocked', {
        detail: { action, choiceId, choice: this.engine.choices.find(c => c.id === choiceId) }
      }));
    }

    onHover(choiceId, active) {
      // Phantom Orbit 연동
      if (window.phantomOrbit) {
        if (active) {
          const choice = this.engine.choices.find(c => c.id === choiceId);
          window.phantomOrbit.showPhantom(choiceId, choice);
        } else {
          window.phantomOrbit.hidePhantom(choiceId);
        }
      }
    }

    refresh() {
      this.engine.loadState();
      this.engine.defineChoices();
      this.render();
      this.bindEvents();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PART 3: CAUSALITY LOG
  // ═══════════════════════════════════════════════════════════════
  
  class CausalityLog {
    constructor() {
      this.entries = this.load() || [];
      this.maxEntries = 20;
    }

    record(choiceId, choice, stateBefore) {
      const entry = {
        id: `entry-${Date.now()}`,
        timestamp: Date.now(),
        choiceId,
        action: choice.action,
        policy: choice.policy,
        stateBefore: { ...stateBefore },
        prediction: { ...choice.delta },
        confidence: choice.confidence,
        status: 'pending'
      };

      this.entries.unshift(entry);
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(0, this.maxEntries);
      }

      this.save();
      this.renderUI();
      
      return entry;
    }

    save() {
      try {
        localStorage.setItem('autus-causality', JSON.stringify(this.entries));
      } catch (e) {}
    }

    load() {
      try {
        return JSON.parse(localStorage.getItem('autus-causality'));
      } catch (e) {
        return null;
      }
    }

    renderUI() {
      let container = document.getElementById('causality-log-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'causality-log-container';
        container.className = 'causality-log-container';
        
        const choiceContainer = document.getElementById('choice-container');
        if (choiceContainer) {
          choiceContainer.after(container);
        }
      }

      const recent = this.entries.slice(0, 5);
      
      container.innerHTML = `
        <div class="causality-header">
          <span class="causality-title">⛓ CAUSALITY LOG</span>
          <span class="causality-count">${this.entries.length} records</span>
        </div>
        <div class="causality-entries">
          ${recent.length > 0 ? recent.map(e => this.renderEntry(e)).join('') : 
            '<div class="causality-empty">No records yet. LOCK a choice to start tracking.</div>'}
        </div>
      `;
    }

    renderEntry(entry) {
      const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
      
      return `
        <div class="causality-entry">
          <span class="entry-time">[${time}]</span>
          <span class="entry-action">${entry.action}</span>
          <span class="entry-policy">${entry.policy}</span>
          <span class="entry-conf">Conf: ${(entry.confidence * 100).toFixed(0)}%</span>
        </div>
      `;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PART 4: LEARNING LOOP (Simplified)
  // ═══════════════════════════════════════════════════════════════
  
  class LearningLoop {
    constructor() {
      this.weights = this.load() || this.defaults();
      this.alpha = 0.02;
    }

    defaults() {
      return {
        recovery: 1.0, friction: 1.0, shock: 1.0,
        pattern_safe: 1.0, pattern_balanced: 1.0, pattern_fast: 1.0
      };
    }

    load() {
      try {
        const data = JSON.parse(localStorage.getItem('autus-kernel-weights'));
        return data?.weights;
      } catch (e) {
        return null;
      }
    }

    save() {
      try {
        localStorage.setItem('autus-kernel-weights', JSON.stringify({
          weights: this.weights,
          updatedAt: Date.now()
        }));
      } catch (e) {}
    }

    adjust(pattern, success) {
      const key = `pattern_${pattern}`;
      if (this.weights[key] !== undefined) {
        const delta = success ? this.alpha : -this.alpha;
        this.weights[key] = Math.max(0.85, Math.min(1.15, this.weights[key] + delta));
        this.save();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PART 5: CLEANUP (Legacy 숨김)
  // ═══════════════════════════════════════════════════════════════
  
  class Cleanup {
    constructor() {
      this.applied = false;
    }

    run() {
      if (this.applied) return;
      
      this.injectStyles();
      this.hideLegacy();
      this.applied = true;
      
      console.log('[AUTUS] Cleanup complete');
    }

    injectStyles() {
      if (document.getElementById('autus-cleanup-css')) return;
      
      const style = document.createElement('style');
      style.id = 'autus-cleanup-css';
      style.textContent = `
        /* Legacy 숨김 - Choice 카드가 대체 */
        .action-log button,
        .action-log .action-btn,
        [data-layer="L3"] button,
        [data-layer="L3"] .action-btn,
        .audit-confirm button,
        .audit-confirm .lock-btn,
        .audit-confirm .hold-btn,
        .audit-confirm .reject-btn,
        [data-layer="L4"] button,
        .preview-notice,
        .auto-reject,
        [class*="preview-only"],
        [class*="auto-reject"] {
          display: none !important;
        }
        
        /* L3/L4 헤더는 유지 */
        [data-layer="L3"],
        [data-layer="L4"] {
          opacity: 0.5;
          pointer-events: none;
        }
        
        [data-layer="L3"]::before,
        [data-layer="L4"]::before {
          content: '(Choice 카드로 대체됨)';
          display: block;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          padding: 8px;
        }
      `;
      document.head.appendChild(style);
    }

    hideLegacy() {
      // L3 버튼 숨김
      document.querySelectorAll('.action-log button, [data-layer="L3"] button').forEach(btn => {
        btn.style.display = 'none';
      });
      
      // L4 버튼 숨김
      document.querySelectorAll('.audit-confirm button, [data-layer="L4"] button').forEach(btn => {
        btn.style.display = 'none';
      });
      
      // 텍스트 숨김
      document.querySelectorAll('*').forEach(el => {
        if (el.childNodes.length <= 2) {
          const text = el.textContent;
          if (text.includes('PREVIEW ONLY') || text.includes('Auto-reject') || text.includes('Hold 3s')) {
            el.style.display = 'none';
          }
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  function init() {
    console.log('[AUTUS] Initializing Choice System...');
    
    // 엔진 생성
    const engine = new ChoiceEngine();
    const ui = new ChoiceCardUI(engine);
    const causality = new CausalityLog();
    const learning = new LearningLoop();
    const cleanup = new Cleanup();
    
    // 전역 접근
    window.choiceEngine = engine;
    window.choiceCardUI = ui;
    window.causalityLog = causality;
    window.learningLoop = learning;
    window.autusCleanup = cleanup;
    
    // UI 초기화
    ui.init();
    causality.renderUI();
    
    // Legacy 숨김
    cleanup.run();
    
    // 5초마다 상태 갱신
    setInterval(() => {
      engine.loadState();
      engine.defineChoices();
    }, 5000);
    
    console.log('[AUTUS] Choice System ready ✓');
  }

  // DOM 로드 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

})();
