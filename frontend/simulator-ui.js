// ═══════════════════════════════════════════════════════════════
// AUTUS Simulator UI v1.0
// 액션 버튼 호버 시 미래 분기 패널 표시
// ═══════════════════════════════════════════════════════════════

class SimulatorUI {
  constructor() {
    this.simulator = window.futureSimulator;
    this.panel = null;
    this.init();
  }

  init() {
    this.createPanel();
    this.attachListeners();
    this.showRecommendation();
  }

  // ─────────────────────────────────────────────────────────────
  // 시뮬레이션 패널 생성
  // ─────────────────────────────────────────────────────────────
  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'future-sim-panel';
    panel.className = 'future-sim-panel hidden';
    panel.innerHTML = `
      <div class="sim-header">
        <span class="sim-title">FUTURE SIMULATION</span>
        <span class="sim-action"></span>
      </div>
      <div class="sim-branches">
        <div class="branch best">
          <div class="branch-label">BEST</div>
          <div class="branch-content"></div>
          <div class="branch-confidence"></div>
        </div>
        <div class="branch likely">
          <div class="branch-label">LIKELY</div>
          <div class="branch-content"></div>
          <div class="branch-confidence"></div>
        </div>
        <div class="branch worst">
          <div class="branch-label">WORST</div>
          <div class="branch-content"></div>
          <div class="branch-confidence"></div>
        </div>
      </div>
      <div class="sim-description"></div>
    `;
    document.body.appendChild(panel);
    this.panel = panel;
  }

  // ─────────────────────────────────────────────────────────────
  // 액션 버튼에 호버 리스너 추가
  // ─────────────────────────────────────────────────────────────
  attachListeners() {
    const actionButtons = document.querySelectorAll('[data-action]');
    
    actionButtons.forEach(btn => {
      btn.addEventListener('mouseenter', (e) => {
        const action = btn.dataset.action;
        this.showSimulation(action, btn);
      });
      
      btn.addEventListener('mouseleave', () => {
        this.hideSimulation();
      });
    });

    // 기존 버튼에도 적용 (클래스 기반)
    const legacyButtons = document.querySelectorAll('.action-btn, .recover-btn, .defriction-btn, .shock-btn');
    legacyButtons.forEach(btn => {
      const action = this.detectAction(btn);
      if (action) {
        btn.dataset.action = action;
        btn.addEventListener('mouseenter', () => this.showSimulation(action, btn));
        btn.addEventListener('mouseleave', () => this.hideSimulation());
      }
    });
  }

  detectAction(btn) {
    const text = btn.textContent.toUpperCase();
    if (text.includes('RECOVER')) return 'RECOVER';
    if (text.includes('DEFRICTION')) return 'DEFRICTION';
    if (text.includes('SHOCK')) return 'SHOCK_DAMP';
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // 시뮬레이션 결과 표시
  // ─────────────────────────────────────────────────────────────
  showSimulation(action, targetBtn) {
    const sim = this.simulator.simulate(action);
    const state = this.simulator.getCurrentState();
    
    // 헤더 업데이트
    this.panel.querySelector('.sim-action').textContent = action;
    this.panel.querySelector('.sim-description').textContent = sim.likely.description;
    
    // 각 분기 업데이트
    ['best', 'likely', 'worst'].forEach(scenario => {
      const branch = this.panel.querySelector(`.branch.${scenario}`);
      const data = sim[scenario];
      
      branch.querySelector('.branch-content').innerHTML = this.formatBranchContent(state, data);
      branch.querySelector('.branch-confidence').textContent = `Confidence: ${(data.confidence * 100).toFixed(0)}%`;
    });
    
    // 위치 조정
    const rect = targetBtn.getBoundingClientRect();
    this.panel.style.left = `${Math.min(rect.left, window.innerWidth - 350)}px`;
    this.panel.style.top = `${rect.bottom + 10}px`;
    
    this.panel.classList.remove('hidden');
  }

  formatBranchContent(before, data) {
    const after = data.state;
    const delta = data.delta;
    
    const formatDelta = (val) => {
      if (val > 0.001) return `<span class="positive">+${(val*100).toFixed(0)}%</span>`;
      if (val < -0.001) return `<span class="negative">${(val*100).toFixed(0)}%</span>`;
      return `<span class="neutral">0%</span>`;
    };
    
    return `
      <div class="metric">
        <span class="label">Recovery</span>
        <span class="value">${(before.recovery*100).toFixed(0)}% → ${(after.recovery*100).toFixed(0)}%</span>
        <span class="delta">${formatDelta(delta.recovery || 0)}</span>
      </div>
      <div class="metric">
        <span class="label">Entropy</span>
        <span class="value">${before.entropy.toFixed(2)} → ${after.entropy.toFixed(2)}</span>
        <span class="delta">${formatDelta(-(delta.entropy || 0))}</span>
      </div>
      <div class="metric risk">
        <span class="label">Risk</span>
        <span class="value">${before.risk.toFixed(2)} → ${after.risk.toFixed(2)}</span>
        <span class="delta">${formatDelta(-(delta.risk || 0))}</span>
      </div>
    `;
  }

  hideSimulation() {
    this.panel.classList.add('hidden');
  }

  // ─────────────────────────────────────────────────────────────
  // 최적 액션 추천 표시
  // ─────────────────────────────────────────────────────────────
  showRecommendation() {
    const ranked = this.simulator.rankActions();
    const best = ranked[0];
    
    // 추천 배너 생성
    let banner = document.getElementById('recommendation-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'recommendation-banner';
      banner.className = 'recommendation-banner';
      
      // 액션 버튼 영역 상단에 삽입
      const actionArea = document.querySelector('#layer-action, .action-area, .action-buttons');
      if (actionArea) {
        actionArea.insertBefore(banner, actionArea.firstChild);
      } else {
        document.body.appendChild(banner);
      }
    }
    
    banner.innerHTML = `
      <div class="rec-header">🎯 RECOMMENDED ACTION</div>
      <div class="rec-action">${best.action}</div>
      <div class="rec-reasons">
        ${best.reason.map(r => `<div class="rec-reason">• ${r}</div>`).join('')}
      </div>
      <div class="rec-alternatives">
        <span>2nd: ${ranked[1].action}</span>
        <span>3rd: ${ranked[2].action}</span>
      </div>
    `;
    
    // 최적 버튼 강조
    document.querySelectorAll('[data-action], .action-btn').forEach(btn => {
      btn.classList.remove('recommended');
      const btnAction = btn.dataset.action || this.detectAction(btn);
      if (btnAction === best.action) {
        btn.classList.add('recommended');
      }
    });
  }
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.simulatorUI = new SimulatorUI();
    }, 500);
  });
} else {
  setTimeout(() => {
    window.simulatorUI = new SimulatorUI();
  }, 500);
}
