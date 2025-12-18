// ═══════════════════════════════════════════════════════════════
// AUTUS Choice Card UI v1.0
// 버튼 → 카드 전환, 선택의 이유를 먼저 보여준다
// ═══════════════════════════════════════════════════════════════

class ChoiceCardUI {
  constructor() {
    this.engine = window.choiceEngine;
    this.container = null;
    this.selectedChoice = null;
    this.init();
  }

  init() {
    this.engine.loadState();
    this.engine.defineChoices();
    this.render();
    this.attachEvents();
  }

  // ─────────────────────────────────────────────────────────────
  // 메인 렌더링
  // ─────────────────────────────────────────────────────────────
  render() {
    // 기존 액션 영역 찾기 또는 새로 생성
    this.container = document.getElementById('choice-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'choice-container';
      
      // 기존 layer-action 영역 대체
      const oldActionArea = document.getElementById('layer-action');
      if (oldActionArea) {
        oldActionArea.style.display = 'none';
        oldActionArea.parentNode.insertBefore(this.container, oldActionArea);
      } else {
        document.body.appendChild(this.container);
      }
    }

    const choices = this.engine.choices;
    
    this.container.innerHTML = `
      <div class="choice-header">
        <span class="choice-title">STRATEGIC CHOICES</span>
        <span class="choice-subtitle">선택의 이유와 미래를 먼저 본다</span>
      </div>
      
      <div class="choice-cards">
        ${choices.map((c, i) => this.renderCard(c, i)).join('')}
      </div>
      
      <div class="choice-comparison">
        <div class="comparison-header">
          <span>FORECAST COMPARISON</span>
          <div class="timeframe-tabs">
            <button class="tf-tab active" data-tf="h1">+1h</button>
            <button class="tf-tab" data-tf="h24">+24h</button>
            <button class="tf-tab" data-tf="d7">+7d</button>
          </div>
        </div>
        <div class="comparison-chart" id="forecast-chart"></div>
      </div>
      
      <div class="collapse-warning" id="collapse-chain">
        ${this.renderCollapseChain()}
      </div>
    `;

    this.renderForecastChart('h1');
  }

  // ─────────────────────────────────────────────────────────────
  // Choice 카드 렌더링
  // ─────────────────────────────────────────────────────────────
  renderCard(choice, index) {
    const isOptimal = choice.rank === 'OPTIMAL';
    const state = this.engine.state;
    
    return `
      <div class="choice-card ${isOptimal ? 'optimal' : ''} ${choice.rank.toLowerCase()}" 
           data-choice-id="${choice.id}">
        
        <div class="card-rank ${choice.rank.toLowerCase()}">
          ${choice.rank === 'OPTIMAL' ? '🎯 ' : ''}${choice.rank}
        </div>
        
        <div class="card-header">
          <span class="card-id">CHOICE ${choice.id}</span>
          <span class="card-name">${choice.name}</span>
        </div>
        
        <div class="card-policy">${choice.policy}</div>
        
        <div class="card-reasoning">${choice.reasoning}</div>
        
        <div class="card-deltas">
          <div class="delta-section">
            <span class="delta-label">Δ STATE</span>
            ${this.renderDeltas(choice.delta, 'now')}
          </div>
        </div>
        
        <div class="card-forecast">
          <span class="forecast-label">FORECAST</span>
          <div class="forecast-row">
            <span class="tf">+1h</span>
            <span class="risk-val">${this.formatRisk(choice, 'h1')}</span>
          </div>
          <div class="forecast-row">
            <span class="tf">+24h</span>
            <span class="risk-val">${this.formatRisk(choice, 'h24')}</span>
          </div>
          <div class="forecast-row">
            <span class="tf">+7d</span>
            <span class="risk-val">${this.formatRisk(choice, 'd7')}</span>
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
        
        <button class="card-lock-btn" data-action="${choice.action}">
          LOCK ${choice.id}
        </button>
      </div>
    `;
  }

  renderDeltas(delta, timeframe) {
    const format = (key, val) => {
      const v = val?.[timeframe] || 0;
      const sign = v >= 0 ? '+' : '';
      const cls = v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral';
      return `<span class="delta-item ${cls}">${key.toUpperCase()} ${sign}${(v*100).toFixed(0)}%</span>`;
    };

    return Object.keys(delta)
      .map(key => format(key, delta[key]))
      .join('');
  }

  formatRisk(choice, tf) {
    const current = this.engine.state.risk;
    const delta = choice.delta.risk?.[tf] || 0;
    const future = Math.max(0, current + delta);
    const cls = delta < -0.15 ? 'good' : delta < -0.05 ? 'ok' : 'warn';
    return `<span class="risk-${cls}">Risk ${(future * 100).toFixed(0)}%</span>`;
  }

  // ─────────────────────────────────────────────────────────────
  // 붕괴 경로 렌더링
  // ─────────────────────────────────────────────────────────────
  renderCollapseChain() {
    const chain = this.engine.collapseChain();
    
    return `
      <div class="collapse-header">
        <span class="collapse-icon">⚠️</span>
        <span class="collapse-title">COLLAPSE CHAIN (if no action)</span>
      </div>
      <div class="collapse-path">
        ${chain.map((c, i) => `
          <span class="collapse-node ${c.margin < 0.1 ? 'critical' : 'warning'}">
            ${c.planet}
            <small>${(c.value * 100).toFixed(0)}%</small>
          </span>
          ${i < chain.length - 1 ? '<span class="collapse-arrow">→</span>' : ''}
        `).join('')}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Forecast 비교 차트
  // ─────────────────────────────────────────────────────────────
  renderForecastChart(timeframe) {
    const chart = document.getElementById('forecast-chart');
    if (!chart) return;

    const choices = this.engine.choices;
    const current = this.engine.state.risk;
    
    chart.innerHTML = `
      <div class="chart-baseline">
        <span class="baseline-label">CURRENT</span>
        <div class="baseline-bar" style="width: ${current * 100}%">
          <span>${(current * 100).toFixed(0)}%</span>
        </div>
      </div>
      ${choices.map(c => {
        const delta = c.delta.risk?.[timeframe] || 0;
        const future = Math.max(0, current + delta);
        const improvement = -delta;
        const cls = c.rank.toLowerCase();
        return `
          <div class="chart-row ${cls}">
            <span class="chart-label">${c.id}: ${c.name}</span>
            <div class="chart-bar-container">
              <div class="chart-bar ${improvement > 0.15 ? 'good' : improvement > 0.05 ? 'ok' : 'warn'}" 
                   style="width: ${future * 100}%">
                <span>${(future * 100).toFixed(0)}%</span>
              </div>
              <span class="chart-delta">${improvement > 0 ? '↓' : '↑'}${(Math.abs(improvement) * 100).toFixed(0)}%</span>
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 이벤트 핸들러
  // ─────────────────────────────────────────────────────────────
  attachEvents() {
    // 카드 선택
    this.container.querySelectorAll('.choice-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('card-lock-btn')) return;
        this.selectCard(card.dataset.choiceId);
      });
    });

    // LOCK 버튼
    this.container.querySelectorAll('.card-lock-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.lockChoice(btn.dataset.action);
      });
    });

    // Timeframe 탭
    this.container.querySelectorAll('.tf-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.container.querySelectorAll('.tf-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderForecastChart(tab.dataset.tf);
      });
    });
  }

  selectCard(choiceId) {
    this.container.querySelectorAll('.choice-card').forEach(c => {
      c.classList.remove('selected');
    });
    this.container.querySelector(`[data-choice-id="${choiceId}"]`)?.classList.add('selected');
    this.selectedChoice = choiceId;
  }

  lockChoice(action) {
    console.log(`[AUTUS] LOCK: ${action}`);
    
    // 기존 시스템에 액션 전달 (previewAction 호출)
    if (typeof previewAction === 'function') {
      previewAction(action);
    }
    
    // 시각적 피드백
    const card = this.container.querySelector(`[data-action="${action}"]`)?.closest('.choice-card');
    if (card) {
      card.classList.add('locked');
      card.querySelector('.card-lock-btn').textContent = '✓ LOCKED';
      card.querySelector('.card-lock-btn').disabled = true;
    }
    
    // Action Log에 기록
    this.logAction(action);
  }

  logAction(action) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const choice = this.engine.choices.find(c => c.action === action);
    
    // 기존 logAction 함수 사용
    if (typeof logAction === 'function') {
      logAction(`Choice: ${choice?.name || action} | ${choice?.reasoning || ''}`, 'success');
    }
    
    const log = document.getElementById('causality-log') || this.createCausalityLog();
    const entry = document.createElement('div');
    entry.className = 'causality-entry';
    entry.innerHTML = `
      <span class="log-time">[${timestamp}]</span>
      <span class="log-action">${action.toUpperCase()}</span>
      <span class="log-reason">${choice?.reasoning || ''}</span>
      <span class="log-expected">Expected: Risk ${choice?.delta.risk?.h24 ? ((this.engine.state.risk + choice.delta.risk.h24) * 100).toFixed(0) : '?'}%</span>
    `;
    log.insertBefore(entry, log.querySelector('.causality-entry'));
  }

  createCausalityLog() {
    const log = document.createElement('div');
    log.id = 'causality-log';
    log.className = 'causality-log';
    log.innerHTML = '<div class="log-header">CAUSALITY LOG</div>';
    this.container.appendChild(log);
    return log;
  }

  // ─────────────────────────────────────────────────────────────
  // 상태 업데이트
  // ─────────────────────────────────────────────────────────────
  refresh() {
    this.engine.loadState();
    this.engine.defineChoices();
    this.render();
    this.attachEvents();
  }
}

// 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.choiceCardUI = new ChoiceCardUI();
    }, 800);
  });
} else {
  setTimeout(() => {
    window.choiceCardUI = new ChoiceCardUI();
  }, 800);
}
