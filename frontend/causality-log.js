// ═══════════════════════════════════════════════════════════════
// AUTUS Causality Log v1.0
// 선택 → 결과 인과관계 기록 시스템
// "모든 선택은 흔적을 남긴다"
// ═══════════════════════════════════════════════════════════════

class CausalityLog {
  constructor() {
    this.entries = [];
    this.maxEntries = 50;
    this.container = null;
    this.isExpanded = false;
    
    this.init();
  }

  init() {
    this.loadFromStorage();
    this.createUI();
    this.bindEvents();
    this.render();
    
    console.log('[CausalityLog] Initialized with', this.entries.length, 'entries');
  }

  // ─────────────────────────────────────────────────────────────
  // UI 생성
  // ─────────────────────────────────────────────────────────────
  createUI() {
    this.container = document.createElement('div');
    this.container.id = 'causality-log-panel';
    this.container.className = 'causality-panel';
    this.container.innerHTML = `
      <div class="causality-header" id="causality-header">
        <div class="causality-title">
          <span class="causality-icon">⛓️</span>
          <span>CAUSALITY LOG</span>
          <span class="entry-count">(${this.entries.length})</span>
        </div>
        <div class="causality-controls">
          <button class="causality-btn" id="causality-export" title="Export">📤</button>
          <button class="causality-btn" id="causality-clear" title="Clear">🗑️</button>
          <button class="causality-btn" id="causality-toggle">▼</button>
        </div>
      </div>
      <div class="causality-body" id="causality-body">
        <div class="causality-filters">
          <button class="filter-btn active" data-filter="all">ALL</button>
          <button class="filter-btn" data-filter="lock">LOCK</button>
          <button class="filter-btn" data-filter="hold">HOLD</button>
          <button class="filter-btn" data-filter="reject">REJECT</button>
        </div>
        <div class="causality-entries" id="causality-entries"></div>
        <div class="causality-summary" id="causality-summary"></div>
      </div>
    `;
    
    document.body.appendChild(this.container);
  }

  // ─────────────────────────────────────────────────────────────
  // 이벤트 바인딩
  // ─────────────────────────────────────────────────────────────
  bindEvents() {
    // 토글
    document.getElementById('causality-header').addEventListener('click', (e) => {
      if (!e.target.classList.contains('causality-btn')) {
        this.toggle();
      }
    });

    document.getElementById('causality-toggle').addEventListener('click', () => {
      this.toggle();
    });

    // Export
    document.getElementById('causality-export').addEventListener('click', (e) => {
      e.stopPropagation();
      this.exportLog();
    });

    // Clear
    document.getElementById('causality-clear').addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearLog();
    });

    // Filters
    this.container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render(btn.dataset.filter);
      });
    });

    // 전역 이벤트 감지 (Lock/Hold/Reject)
    this.watchActions();
  }

  // ─────────────────────────────────────────────────────────────
  // 액션 감지
  // ─────────────────────────────────────────────────────────────
  watchActions() {
    // Lock 버튼 감지
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('card-lock-btn') || 
          e.target.classList.contains('audit-btn')) {
        const action = e.target.dataset.action || 
                      e.target.textContent.trim().toUpperCase();
        
        if (action === 'LOCK' || e.target.classList.contains('lock')) {
          const card = e.target.closest('.choice-card');
          const choiceId = card?.dataset.choiceId || 'unknown';
          this.recordLock(choiceId);
        } else if (action === 'HOLD' || e.target.classList.contains('hold')) {
          this.recordHold();
        } else if (action === 'REJECT' || e.target.classList.contains('reject')) {
          this.recordReject();
        }
      }
    });

    // Audit 결과 감지
    const auditLayer = document.getElementById('layer-audit');
    if (auditLayer) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          if (m.attributeName === 'class') {
            if (!auditLayer.classList.contains('active')) {
              // Audit 닫힘 감지
            }
          }
        });
      });
      observer.observe(auditLayer, { attributes: true });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 기록: LOCK
  // ─────────────────────────────────────────────────────────────
  recordLock(choiceId) {
    const state = this.captureState();
    const choice = this.getChoiceData(choiceId);
    
    const entry = {
      id: Date.now(),
      type: 'lock',
      timestamp: new Date().toISOString(),
      choice: {
        id: choiceId,
        name: choice?.name || `Choice ${choiceId}`,
        action: choice?.action || 'UNKNOWN'
      },
      stateBefore: state,
      expectedDelta: choice?.delta || {},
      reasoning: choice?.reasoning || 'No reasoning provided',
      confidence: choice?.confidence || 0,
      gate: this.getGate(),
      verified: false,
      stateAfter: null
    };

    this.addEntry(entry);
    
    // 5초 후 결과 검증
    setTimeout(() => this.verifyEntry(entry.id), 5000);
    
    console.log('[CausalityLog] LOCK recorded:', entry);
  }

  // ─────────────────────────────────────────────────────────────
  // 기록: HOLD
  // ─────────────────────────────────────────────────────────────
  recordHold() {
    const state = this.captureState();
    
    const entry = {
      id: Date.now(),
      type: 'hold',
      timestamp: new Date().toISOString(),
      stateBefore: state,
      gate: this.getGate(),
      note: 'Decision deferred'
    };

    this.addEntry(entry);
    console.log('[CausalityLog] HOLD recorded:', entry);
  }

  // ─────────────────────────────────────────────────────────────
  // 기록: REJECT
  // ─────────────────────────────────────────────────────────────
  recordReject() {
    const state = this.captureState();
    
    const entry = {
      id: Date.now(),
      type: 'reject',
      timestamp: new Date().toISOString(),
      stateBefore: state,
      gate: this.getGate(),
      note: 'Action rejected'
    };

    this.addEntry(entry);
    console.log('[CausalityLog] REJECT recorded:', entry);
  }

  // ─────────────────────────────────────────────────────────────
  // 결과 검증
  // ─────────────────────────────────────────────────────────────
  verifyEntry(entryId) {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry || entry.type !== 'lock') return;

    entry.stateAfter = this.captureState();
    entry.verified = true;
    
    // 실제 변화량 계산
    entry.actualDelta = {};
    ['risk', 'entropy', 'pressure', 'flow'].forEach(key => {
      if (entry.stateBefore[key] !== undefined && entry.stateAfter[key] !== undefined) {
        entry.actualDelta[key] = entry.stateAfter[key] - entry.stateBefore[key];
      }
    });

    // 정확도 계산
    entry.accuracy = this.calculateAccuracy(entry.expectedDelta, entry.actualDelta);
    
    this.saveToStorage();
    this.render();
    this.updateSummary();
    
    console.log('[CausalityLog] Verified:', entry);
  }

  calculateAccuracy(expected, actual) {
    if (!expected || !actual) return 0;
    
    let totalError = 0;
    let count = 0;
    
    Object.keys(expected).forEach(key => {
      const exp = expected[key]?.now || expected[key]?.h1 || 0;
      const act = actual[key] || 0;
      if (exp !== 0) {
        totalError += Math.abs((act - exp) / exp);
        count++;
      }
    });

    return count > 0 ? Math.max(0, 1 - totalError / count) : 0;
  }

  // ─────────────────────────────────────────────────────────────
  // 상태 캡처
  // ─────────────────────────────────────────────────────────────
  captureState() {
    const state = {};
    
    // PhysicsFrame에서 가져오기
    if (typeof PhysicsFrame !== 'undefined' && PhysicsFrame.snapshot) {
      state.risk = PhysicsFrame.snapshot.risk;
      state.entropy = PhysicsFrame.snapshot.entropy;
      state.pressure = PhysicsFrame.snapshot.pressure;
      state.flow = PhysicsFrame.snapshot.flow;
    }

    // TwinState에서 가져오기
    if (typeof TwinState !== 'undefined') {
      state.recovery = TwinState.RECOVERY;
      state.stability = TwinState.STABILITY;
      state.shock = TwinState.SHOCK;
      state.friction = TwinState.FRICTION;
    }

    // Bottleneck
    if (typeof PhysicsFrame !== 'undefined' && PhysicsFrame.bottleneck) {
      state.bottleneck = PhysicsFrame.bottleneck.axis;
    }

    return state;
  }

  getGate() {
    const el = document.getElementById('gate-badge');
    if (el) {
      const text = el.textContent;
      if (text.includes('RED')) return 'RED';
      if (text.includes('AMBER')) return 'AMBER';
      return 'GREEN';
    }
    return 'UNKNOWN';
  }

  getChoiceData(choiceId) {
    if (window.choiceEngine?.choices) {
      return window.choiceEngine.choices.find(c => c.id === choiceId);
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // 엔트리 관리
  // ─────────────────────────────────────────────────────────────
  addEntry(entry) {
    this.entries.unshift(entry);
    
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    this.saveToStorage();
    this.render();
    this.updateEntryCount();
  }

  // ─────────────────────────────────────────────────────────────
  // 렌더링
  // ─────────────────────────────────────────────────────────────
  render(filter = 'all') {
    const container = document.getElementById('causality-entries');
    if (!container) return;

    const filtered = filter === 'all' 
      ? this.entries 
      : this.entries.filter(e => e.type === filter);

    container.innerHTML = filtered.map(entry => this.renderEntry(entry)).join('');
    this.updateSummary();
  }

  renderEntry(entry) {
    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    const typeClass = entry.type;
    const typeIcon = entry.type === 'lock' ? '🔒' : 
                    entry.type === 'hold' ? '⏸️' : '❌';

    let content = '';
    
    if (entry.type === 'lock') {
      const accuracy = entry.verified 
        ? `<span class="accuracy ${entry.accuracy > 0.7 ? 'good' : entry.accuracy > 0.4 ? 'ok' : 'bad'}">${(entry.accuracy * 100).toFixed(0)}%</span>`
        : '<span class="pending">verifying...</span>';

      content = `
        <div class="entry-choice">
          <span class="choice-id">${entry.choice.id}</span>
          <span class="choice-name">${entry.choice.name}</span>
          ${accuracy}
        </div>
        <div class="entry-state">
          <span>Risk: ${(entry.stateBefore.risk * 100).toFixed(0)}%</span>
          ${entry.stateAfter ? `<span class="arrow">→</span><span>${(entry.stateAfter.risk * 100).toFixed(0)}%</span>` : ''}
        </div>
        <div class="entry-reasoning">${entry.reasoning}</div>
      `;
    } else {
      content = `<div class="entry-note">${entry.note || entry.type.toUpperCase()}</div>`;
    }

    return `
      <div class="causality-entry ${typeClass}">
        <div class="entry-header">
          <span class="entry-type">${typeIcon} ${entry.type.toUpperCase()}</span>
          <span class="entry-time">${time}</span>
          <span class="entry-gate gate-${entry.gate.toLowerCase()}">${entry.gate}</span>
        </div>
        <div class="entry-content">${content}</div>
      </div>
    `;
  }

  updateEntryCount() {
    const countEl = this.container.querySelector('.entry-count');
    if (countEl) {
      countEl.textContent = `(${this.entries.length})`;
    }
  }

  updateSummary() {
    const summaryEl = document.getElementById('causality-summary');
    if (!summaryEl) return;

    const locks = this.entries.filter(e => e.type === 'lock');
    const verified = locks.filter(e => e.verified);
    const avgAccuracy = verified.length > 0
      ? verified.reduce((sum, e) => sum + (e.accuracy || 0), 0) / verified.length
      : 0;

    summaryEl.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">Total Actions</span>
        <span class="summary-value">${this.entries.length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Locks</span>
        <span class="summary-value">${locks.length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Avg Accuracy</span>
        <span class="summary-value ${avgAccuracy > 0.7 ? 'good' : avgAccuracy > 0.4 ? 'ok' : 'bad'}">
          ${(avgAccuracy * 100).toFixed(0)}%
        </span>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 토글
  // ─────────────────────────────────────────────────────────────
  toggle() {
    this.isExpanded = !this.isExpanded;
    this.container.classList.toggle('expanded', this.isExpanded);
    document.getElementById('causality-toggle').textContent = this.isExpanded ? '▲' : '▼';
  }

  // ─────────────────────────────────────────────────────────────
  // Export
  // ─────────────────────────────────────────────────────────────
  exportLog() {
    const data = JSON.stringify(this.entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `autus-causality-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────
  // Clear
  // ─────────────────────────────────────────────────────────────
  clearLog() {
    if (confirm('Clear all causality log entries?')) {
      this.entries = [];
      this.saveToStorage();
      this.render();
      this.updateEntryCount();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Storage
  // ─────────────────────────────────────────────────────────────
  saveToStorage() {
    try {
      localStorage.setItem('autus-causality-log', JSON.stringify(this.entries));
    } catch (e) {
      console.warn('[CausalityLog] Storage save failed:', e);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('autus-causality-log');
      if (data) {
        this.entries = JSON.parse(data);
      }
    } catch (e) {
      console.warn('[CausalityLog] Storage load failed:', e);
      this.entries = [];
    }
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.causalityLog = new CausalityLog();
  }, 1500);
});

if (document.readyState === 'complete') {
  setTimeout(() => {
    if (!window.causalityLog) {
      window.causalityLog = new CausalityLog();
    }
  }, 1500);
}
