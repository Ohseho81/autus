// ═══════════════════════════════════════════════════════════════
// AUTUS Learning Debug Panel
// 개발자 전용 - Ctrl+Shift+L 토글
// ═══════════════════════════════════════════════════════════════

class LearningDebugPanel {
  constructor() {
    this.enabled = false;
    this.panel = null;
    this.updateInterval = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    
    if (this.enabled) {
      this.show();
    } else {
      this.hide();
    }
  }

  show() {
    if (!this.panel) {
      this.createPanel();
    }
    this.panel.style.display = 'block';
    this.startUpdate();
  }

  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
    this.stopUpdate();
  }

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'learning-debug-panel';
    this.panel.innerHTML = `
      <div class="debug-header">
        <span>⚙️ LEARNING DEBUG</span>
        <button class="debug-close" onclick="window.learningDebug.toggle()">×</button>
      </div>
      <div class="debug-content">
        <div class="debug-section">
          <div class="section-title">KERNEL WEIGHTS</div>
          <div id="debug-weights"></div>
        </div>
        <div class="debug-section">
          <div class="section-title">CONFIDENCE COEFFICIENTS</div>
          <div id="debug-conf"></div>
        </div>
        <div class="debug-section">
          <div class="section-title">PATTERN MODIFIERS</div>
          <div id="debug-patterns"></div>
        </div>
        <div class="debug-section">
          <div class="section-title">SESSION STATS</div>
          <div id="debug-stats"></div>
        </div>
        <div class="debug-actions">
          <button onclick="window.learningLoop?.reset()">Reset Weights</button>
          <button onclick="window.learningLoop?.debug()">Console Log</button>
        </div>
      </div>
    `;
    
    this.addStyles();
    document.body.appendChild(this.panel);
  }

  addStyles() {
    if (document.getElementById('learning-debug-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'learning-debug-styles';
    style.textContent = `
      #learning-debug-panel {
        position: fixed;
        top: 90px;
        left: 250px;
        width: 280px;
        background: rgba(10, 12, 16, 0.95);
        border: 1px solid rgba(147, 51, 234, 0.4);
        border-radius: 12px;
        font-family: 'SF Mono', monospace;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        z-index: 99999;
        display: none;
        backdrop-filter: blur(20px);
      }
      
      #learning-debug-panel .debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        color: #9333ea;
        font-weight: 600;
      }
      
      #learning-debug-panel .debug-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 16px;
        cursor: pointer;
      }
      
      #learning-debug-panel .debug-content {
        padding: 12px;
        max-height: 400px;
        overflow-y: auto;
      }
      
      #learning-debug-panel .debug-section {
        margin-bottom: 16px;
      }
      
      #learning-debug-panel .section-title {
        font-size: 9px;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.4);
        margin-bottom: 8px;
      }
      
      #learning-debug-panel .debug-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      #learning-debug-panel .debug-key {
        color: rgba(255, 255, 255, 0.6);
      }
      
      #learning-debug-panel .debug-value {
        font-weight: 600;
      }
      
      #learning-debug-panel .debug-value.modified {
        color: #f59e0b;
      }
      
      #learning-debug-panel .debug-value.default {
        color: rgba(255, 255, 255, 0.4);
      }
      
      #learning-debug-panel .debug-actions {
        display: flex;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      #learning-debug-panel .debug-actions button {
        flex: 1;
        padding: 8px;
        background: rgba(147, 51, 234, 0.2);
        border: 1px solid rgba(147, 51, 234, 0.4);
        border-radius: 6px;
        color: #9333ea;
        font-size: 10px;
        cursor: pointer;
      }
      
      #learning-debug-panel .debug-actions button:hover {
        background: rgba(147, 51, 234, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  startUpdate() {
    this.updateInterval = setInterval(() => this.update(), 1000);
    this.update();
  }

  stopUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  update() {
    if (!window.learningLoop) return;
    
    const ll = window.learningLoop;
    const w = ll.weights;
    
    // Kernel Weights
    const weightsHtml = ['recovery', 'friction', 'shock', 'entropy', 'pressure', 'stability']
      .map(key => this.renderWeight(key, w[key]))
      .join('');
    const weightsEl = document.getElementById('debug-weights');
    if (weightsEl) weightsEl.innerHTML = weightsHtml;
    
    // Confidence Coefficients
    const confHtml = ['conf_entropy', 'conf_risk', 'conf_pressure', 'conf_shock']
      .map(key => this.renderWeight(key.replace('conf_', ''), w[key], 0.35))
      .join('');
    const confEl = document.getElementById('debug-conf');
    if (confEl) confEl.innerHTML = confHtml;
    
    // Pattern Modifiers
    const patternsHtml = ['pattern_safe', 'pattern_balanced', 'pattern_fast']
      .map(key => this.renderWeight(key.replace('pattern_', ''), w[key]))
      .join('');
    const patternsEl = document.getElementById('debug-patterns');
    if (patternsEl) patternsEl.innerHTML = patternsHtml;
    
    // Session Stats
    const stats = ll.sessionStats;
    const statsEl = document.getElementById('debug-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="debug-row">
          <span class="debug-key">Consecutive Success</span>
          <span class="debug-value">${stats.consecutiveSuccess}</span>
        </div>
        <div class="debug-row">
          <span class="debug-key">Consecutive Failure</span>
          <span class="debug-value">${stats.consecutiveFailure}</span>
        </div>
        <div class="debug-row">
          <span class="debug-key">Last Pattern</span>
          <span class="debug-value">${stats.lastChoicePattern || 'N/A'}</span>
        </div>
      `;
    }
  }

  renderWeight(key, value, defaultVal = 1.0) {
    const isModified = Math.abs(value - defaultVal) > 0.001;
    const cls = isModified ? 'modified' : 'default';
    const displayValue = value.toFixed(3);
    const delta = ((value - defaultVal) * 100).toFixed(1);
    const deltaStr = isModified ? ` (${delta > 0 ? '+' : ''}${delta}%)` : '';
    
    return `
      <div class="debug-row">
        <span class="debug-key">${key}</span>
        <span class="debug-value ${cls}">${displayValue}${deltaStr}</span>
      </div>
    `;
  }
}

// 전역 인스턴스
window.learningDebug = new LearningDebugPanel();

// 단축키: Ctrl+Shift+L
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'L') {
    e.preventDefault();
    window.learningDebug.toggle();
  }
});

console.log('[AUTUS] Learning Debug available (Ctrl+Shift+L to toggle)');
