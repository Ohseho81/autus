/**
 * AUTUS Layer v2.1 — Bezos Edition
 * "고객에게 묻지 말고, 다시 쓰게 만들어라. 그리고 실패하면 우리가 비용을 내라."
 * 
 * CHANGES FROM v2.0:
 * - SLA STRIP 추가 (상단)
 * - AUTO · SLA ENFORCED 버튼
 * - CRITICAL 상태에서 GREEN 차단
 * - Action Log (설명 없이 실행만)
 * - 만족 설문 제거 (행동 증거만)
 */

(function() {
  'use strict';

  if (window.__AUTUS_LAYER_V2_1__) return;
  window.__AUTUS_LAYER_V2_1__ = true;

  // ============================================
  // SLA Configuration (Bezos Policy)
  // ============================================
  
  const SLA = {
    worker: { recoveryMin: 0.5, stabilityMin: 0.2 },
    employer: { qualityMin: 0.6, churn6mMax: 0.15 },
    regulator: { illegalRateMax: 0.02 },
    ops: { frictionMax: 0.5, automationMin: 0.8 },
  };

  const SLA_STATUS = { OK: 'OK', AT_RISK: 'AT_RISK', BREACH: 'BREACH' };

  // ============================================
  // Configuration
  // ============================================
  
  const CONFIG = {
    API_BASE: 'https://solar.autus-ai.com',
    POLL_INTERVAL: 3000,
    ANIMATION_FPS: 30,
    
    PLANETS: [
      { id: 'output', name: 'OUT', color: '#4ecdc4' },
      { id: 'quality', name: 'QUA', color: '#a8e6cf' },
      { id: 'time', name: 'TIM', color: '#7b68ee' },
      { id: 'friction', name: 'FRI', color: '#ff6b6b' },
      { id: 'stability', name: 'STA', color: '#45b7d1' },
      { id: 'cohesion', name: 'COH', color: '#f7dc6f' },
      { id: 'recovery', name: 'REC', color: '#82e0aa' },
      { id: 'transfer', name: 'TRA', color: '#bb8fce' },
      { id: 'shock', name: 'SHK', color: '#e74c3c' }
    ],
    
    ENTITY_RULES: [
      { pattern: /localhost/, entity: 'company_abc' },
      { pattern: /autus/, entity: 'company_abc' },
      { pattern: /./, entity: 'company_abc' }
    ]
  };

  // ============================================
  // State Management
  // ============================================
  
  const state = {
    enabled: true,
    expanded: false,
    connected: false,
    entityId: 'company_abc',
    shadow: null,
    systemStatus: 'STABLE',  // STABLE | CAUTION | CRITICAL
    slaResult: null,
    autoEnabled: true,       // AUTO · SLA ENFORCED (Bezos: OFF = 고객 신뢰 파괴)
    actionLog: [],
    lastUpdate: null,
    animationId: null
  };

  // ============================================
  // SLA Evaluator (Bezos Policy 1 & 4)
  // ============================================
  
  function evalSLA(shadow, metrics = {}) {
    const result = {
      worker: SLA_STATUS.OK,
      employer: SLA_STATUS.OK,
      regulator: SLA_STATUS.OK,
      ops: SLA_STATUS.OK,
    };

    // Worker SLA
    if (shadow.recovery < SLA.worker.recoveryMin) result.worker = SLA_STATUS.AT_RISK;
    if (shadow.stability < SLA.worker.stabilityMin) result.worker = SLA_STATUS.BREACH;

    // Employer SLA
    if (shadow.quality < SLA.employer.qualityMin) result.employer = SLA_STATUS.AT_RISK;
    if (metrics.churn6m > SLA.employer.churn6mMax) result.employer = SLA_STATUS.BREACH;

    // Regulator SLA
    if (metrics.illegalRate > SLA.regulator.illegalRateMax) result.regulator = SLA_STATUS.BREACH;

    // Ops SLA
    if (shadow.friction > SLA.ops.frictionMax) result.ops = SLA_STATUS.AT_RISK;

    return result;
  }

  function evalSystemStatus(shadow) {
    const risk = (shadow.shock || 0) * 1.5 + (shadow.friction || 0) * 0.5;
    const stability = shadow.stability || 0.5;
    const cohesion = shadow.cohesion || 0.5;

    if (stability < 0.2 || risk > 0.8 || cohesion < 0.2) return 'CRITICAL';
    if (stability < 0.4 || risk > 0.5 || cohesion < 0.4) return 'CAUTION';
    return 'STABLE';
  }

  // Gate Rules (Bezos Policy 2 & 3)
  function gateDecision(systemStatus) {
    if (systemStatus === 'CRITICAL') {
      return { greenAllowed: false, amberAllowed: true, autoRequired: true };
    }
    return { greenAllowed: true, amberAllowed: true, autoRequired: false };
  }

  // Action Log (Bezos Policy 4: 설명 없이 실행만)
  function logAction(message, type = 'info') {
    const entry = { ts: Date.now(), message, type };
    state.actionLog.unshift(entry);
    if (state.actionLog.length > 20) state.actionLog.pop();
    renderActionLog();
    return entry;
  }

  // ============================================
  // Utility Functions
  // ============================================
  
  const Utils = {
    lerp: (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t)),
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    formatNumber: (n, decimals = 2) => typeof n === 'number' && !isNaN(n) ? n.toFixed(decimals) : '—',
    formatTime: () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    detectEntity: () => {
      const url = window.location.href;
      for (const rule of CONFIG.ENTITY_RULES) {
        if (rule.pattern.test(url)) return rule.entity;
      }
      return 'company_abc';
    }
  };

  // ============================================
  // API Client
  // ============================================
  
  const API = {
    async fetchShadow(entityId) {
      try {
        const response = await fetch(
          `${CONFIG.API_BASE}/api/v1/shadow/snapshot/${entityId}`,
          { method: 'GET', headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        state.connected = true;
        return data;
      } catch (error) {
        state.connected = false;
        return null;
      }
    },
    
    simulateShadow() {
      const t = Date.now() / 1000;
      const shadow = {};
      CONFIG.PLANETS.forEach((planet, i) => {
        const phase = i * 0.7;
        const freq = 0.05 + i * 0.02;
        shadow[planet.id] = Utils.clamp(0.5 + 0.3 * Math.sin(t * freq + phase), 0, 1);
      });
      return { shadow, simulated: true };
    },

    async triggerAutoRemediation() {
      try {
        const response = await fetch(
          `${CONFIG.API_BASE}/api/v1/auto/remediate`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity_id: state.entityId }) }
        );
        return response.ok;
      } catch {
        return false;
      }
    }
  };

  // ============================================
  // DOM Creation (Bezos Edition)
  // ============================================
  
  function createLayer() {
    const existing = document.getElementById('autus-layer');
    if (existing) existing.remove();
    
    const layer = document.createElement('div');
    layer.id = 'autus-layer';
    
    layer.innerHTML = `
      <!-- Beacon -->
      <div id="autus-beacon" class="status-green">
        <div id="autus-beacon-core"></div>
      </div>
      
      <!-- Main Panel -->
      <div id="autus-panel">
        <!-- Header -->
        <div id="autus-header">
          <span id="autus-logo">AUTUS</span>
          <span id="autus-entity"></span>
          <span id="autus-status" class="green">STABLE</span>
          <button id="autus-close" title="Minimize">×</button>
        </div>
        
        <!-- SLA STRIP (Bezos Policy 1) -->
        <div id="autus-sla-strip">
          <div class="sla-item" data-role="worker">
            <span class="sla-dot"></span>
            <span class="sla-label">WORKER</span>
            <span class="sla-status">OK</span>
          </div>
          <div class="sla-item" data-role="employer">
            <span class="sla-dot"></span>
            <span class="sla-label">EMPLOYER</span>
            <span class="sla-status">OK</span>
          </div>
          <div class="sla-item" data-role="ops">
            <span class="sla-dot"></span>
            <span class="sla-label">OPS</span>
            <span class="sla-status">OK</span>
          </div>
          <div class="sla-item" data-role="regulator">
            <span class="sla-dot"></span>
            <span class="sla-label">REG</span>
            <span class="sla-status">OK</span>
          </div>
        </div>
        
        <!-- Solar System Canvas -->
        <div id="autus-solar">
          <canvas id="autus-canvas"></canvas>
        </div>
        
        <!-- Twin State (내부 참고값으로 강등 - Bezos Policy 1) -->
        <details id="autus-twin-details">
          <summary>INTERNAL METRICS</summary>
          <div id="autus-twin">
            <div class="autus-twin-row">
              <span class="autus-twin-label">Energy</span>
              <div class="autus-twin-bar"><div class="autus-twin-fill energy" id="fill-energy"></div></div>
              <span class="autus-twin-value" id="val-energy">—</span>
            </div>
            <div class="autus-twin-row">
              <span class="autus-twin-label">Flow</span>
              <div class="autus-twin-bar"><div class="autus-twin-fill flow" id="fill-flow"></div></div>
              <span class="autus-twin-value" id="val-flow">—</span>
            </div>
            <div class="autus-twin-row">
              <span class="autus-twin-label">Risk</span>
              <div class="autus-twin-bar"><div class="autus-twin-fill risk" id="fill-risk"></div></div>
              <span class="autus-twin-value" id="val-risk">—</span>
            </div>
          </div>
        </details>
        
        <!-- 9 Planets Grid -->
        <div id="autus-planets"></div>
        
        <!-- AUTO · SLA ENFORCED Button (Bezos Policy 3) -->
        <div id="autus-auto-zone">
          <button id="autus-auto-btn" class="auto-on">AUTO · SLA ENFORCED</button>
          <div id="autus-gate-status"></div>
        </div>
        
        <!-- Action Log (Bezos Policy 4: 설명 없이 실행만) -->
        <div id="autus-action-log">
          <div class="action-log-title">ACTION LOG</div>
          <div id="autus-action-list"></div>
        </div>
        
        <!-- Forecast -->
        <div id="autus-forecast">
          <span id="autus-forecast-label">Forecast Δt</span>
          <span id="autus-forecast-time">+1h</span>
          <span id="autus-forecast-delta" class="neutral">—</span>
        </div>
        
        <!-- Footer -->
        <div id="autus-footer">
          <span id="autus-time">--:--:--</span>
          <div id="autus-connection">
            <div id="autus-connection-dot"></div>
            <span id="autus-connection-text">Live</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(layer);
    createPlanetGrid();
    return layer;
  }
  
  function createPlanetGrid() {
    const container = document.getElementById('autus-planets');
    if (!container) return;
    container.innerHTML = '';
    CONFIG.PLANETS.forEach(planet => {
      const el = document.createElement('div');
      el.className = `autus-planet planet-${planet.id}`;
      el.innerHTML = `
        <div class="autus-planet-dot" style="background: ${planet.color}"></div>
        <div class="autus-planet-name">${planet.name}</div>
        <div class="autus-planet-value" id="planet-${planet.id}">—</div>
      `;
      container.appendChild(el);
    });
  }

  // ============================================
  // Renderer
  // ============================================
  
  const Renderer = {
    ctx: null, width: 0, height: 0, dpr: 1, lastFrame: 0,
    
    init() {
      const canvas = document.getElementById('autus-canvas');
      if (!canvas) return false;
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.width = rect.width;
      this.height = rect.height;
      canvas.width = this.width * this.dpr;
      canvas.height = this.height * this.dpr;
      canvas.style.width = this.width + 'px';
      canvas.style.height = this.height + 'px';
      this.ctx = canvas.getContext('2d');
      this.ctx.scale(this.dpr, this.dpr);
      return true;
    },
    
    clear() { if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height); },
    
    drawBackground() {
      const ctx = this.ctx, cx = this.width / 2, cy = this.height / 2;
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.height * 0.8);
      bg.addColorStop(0, 'rgba(0, 30, 60, 0.3)');
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.width, this.height);
    },
    
    drawOrbits() {
      const ctx = this.ctx, cx = this.width / 2, cy = this.height / 2;
      const baseR = Math.min(this.width, this.height) * 0.12;
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + i * baseR * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    
    drawSun() {
      const ctx = this.ctx, cx = this.width / 2, cy = this.height / 2;
      const r = Math.min(this.width, this.height) * 0.08;
      const t = Date.now() / 1000;
      const pulse = 1 + 0.05 * Math.sin(t * 2);
      
      // Color based on system status
      let coreColor = '#ffd700';
      if (state.systemStatus === 'CRITICAL') coreColor = '#ff4444';
      else if (state.systemStatus === 'CAUTION') coreColor = '#ffaa00';
      
      const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5 * pulse);
      outerGlow.addColorStop(0, coreColor + '66');
      outerGlow.addColorStop(0.5, coreColor + '26');
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      core.addColorStop(0, '#fffacd');
      core.addColorStop(0.4, coreColor);
      core.addColorStop(1, coreColor);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    },
    
    drawPlanets() {
      const ctx = this.ctx, cx = this.width / 2, cy = this.height / 2;
      const baseR = Math.min(this.width, this.height) * 0.12;
      const t = Date.now() / 1000;
      if (!state.shadow) return;
      
      CONFIG.PLANETS.forEach((planet, i) => {
        const value = state.shadow[planet.id] || 0.5;
        const orbitR = baseR + (Math.floor(i / 3) + 1) * baseR * 0.55;
        const speed = 0.2 + (i % 3) * 0.1;
        const offset = i * 0.8;
        const angle = t * speed + offset;
        const x = cx + Math.cos(angle) * orbitR;
        const y = cy + Math.sin(angle) * orbitR;
        const size = 3 + value * 4;
        ctx.shadowColor = planet.color;
        ctx.shadowBlur = 8 + value * 6;
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    },
    
    render() {
      const now = Date.now();
      if (now - this.lastFrame < 1000 / CONFIG.ANIMATION_FPS) {
        state.animationId = requestAnimationFrame(() => this.render());
        return;
      }
      this.lastFrame = now;
      this.clear();
      this.drawBackground();
      this.drawOrbits();
      this.drawSun();
      this.drawPlanets();
      if (state.expanded) state.animationId = requestAnimationFrame(() => this.render());
    },
    
    start() { if (!this.ctx && !this.init()) return; this.render(); },
    stop() { if (state.animationId) { cancelAnimationFrame(state.animationId); state.animationId = null; } }
  };

  // ============================================
  // UI Updates (Bezos Edition)
  // ============================================
  
  const UI = {
    updateSLAStrip() {
      if (!state.slaResult) return;
      
      document.querySelectorAll('#autus-sla-strip .sla-item').forEach(item => {
        const role = item.dataset.role;
        const status = state.slaResult[role] || 'OK';
        const dot = item.querySelector('.sla-dot');
        const statusEl = item.querySelector('.sla-status');
        
        item.className = `sla-item sla-${status.toLowerCase()}`;
        statusEl.textContent = status === 'AT_RISK' ? 'AT RISK' : status;
      });
    },
    
    updateAutoButton() {
      const btn = document.getElementById('autus-auto-btn');
      const gateStatus = document.getElementById('autus-gate-status');
      if (!btn) return;
      
      const gate = gateDecision(state.systemStatus);
      
      if (state.autoEnabled) {
        btn.className = 'auto-on';
        btn.textContent = 'AUTO · SLA ENFORCED';
      } else {
        btn.className = 'auto-off';
        btn.textContent = 'AUTO · OFF ⚠️';
      }
      
      // Gate status (CRITICAL 시 GREEN 차단)
      if (gate.autoRequired) {
        gateStatus.textContent = '🚫 GREEN BLOCKED · AMBER ONLY';
        gateStatus.className = 'gate-critical';
        // CRITICAL에서 AUTO OFF 불가
        state.autoEnabled = true;
        btn.className = 'auto-on auto-locked';
        btn.textContent = 'AUTO · SLA ENFORCED 🔒';
      } else if (!gate.greenAllowed) {
        gateStatus.textContent = '⚠️ GREEN RESTRICTED';
        gateStatus.className = 'gate-caution';
      } else {
        gateStatus.textContent = '';
        gateStatus.className = '';
      }
    },
    
    updateStatus() {
      if (!state.shadow) return;
      
      const { shadow } = state;
      
      // System status
      state.systemStatus = evalSystemStatus(shadow);
      state.slaResult = evalSLA(shadow);
      
      // Beacon
      const beacon = document.getElementById('autus-beacon');
      if (beacon) {
        beacon.className = state.systemStatus === 'STABLE' ? 'status-green' :
                          state.systemStatus === 'CAUTION' ? 'status-yellow' : 'status-red';
      }
      
      // Status Badge
      const statusEl = document.getElementById('autus-status');
      if (statusEl) {
        statusEl.textContent = state.systemStatus;
        statusEl.className = state.systemStatus.toLowerCase();
      }
      
      // Entity
      const entityEl = document.getElementById('autus-entity');
      if (entityEl) entityEl.textContent = state.entityId.replace('_', ' ').toUpperCase();
      
      // Twin State Bars (내부 참고값)
      const energy = (shadow.output + shadow.quality + shadow.stability) / 3;
      const flow = shadow.transfer;
      const risk = Utils.clamp(shadow.shock * 1.5 + shadow.friction * 0.5, 0, 1);
      this.updateBar('energy', energy);
      this.updateBar('flow', flow);
      this.updateBar('risk', risk);
      
      // Planet Values
      CONFIG.PLANETS.forEach(planet => {
        const el = document.getElementById(`planet-${planet.id}`);
        if (el) el.textContent = Utils.formatNumber(shadow[planet.id]);
      });
      
      // SLA Strip
      this.updateSLAStrip();
      
      // AUTO Button
      this.updateAutoButton();
      
      // Forecast
      const forecastDelta = (energy - 0.5) * 15 + (flow - 0.5) * 10;
      const deltaEl = document.getElementById('autus-forecast-delta');
      if (deltaEl) {
        const sign = forecastDelta >= 0 ? '+' : '';
        deltaEl.textContent = `${sign}${forecastDelta.toFixed(1)}%`;
        deltaEl.className = forecastDelta > 0 ? 'positive' : forecastDelta < 0 ? 'negative' : 'neutral';
      }
      
      // Connection
      const connDot = document.getElementById('autus-connection-dot');
      const connText = document.getElementById('autus-connection-text');
      if (connDot && connText) {
        connDot.classList.toggle('offline', !state.connected);
        connText.textContent = state.connected ? 'Live' : 'Offline';
      }
      
      // Auto remediation if needed
      if (state.autoEnabled) {
        this.checkAndRemediate();
      }
    },
    
    updateBar(name, value) {
      const fill = document.getElementById(`fill-${name}`);
      const val = document.getElementById(`val-${name}`);
      if (fill) {
        fill.style.width = `${value * 100}%`;
        if (name === 'risk') {
          fill.classList.remove('warning', 'danger');
          if (value > 0.7) fill.classList.add('danger');
          else if (value > 0.4) fill.classList.add('warning');
        }
      }
      if (val) val.textContent = Utils.formatNumber(value);
    },
    
    updateTime() {
      const timeEl = document.getElementById('autus-time');
      if (timeEl) timeEl.textContent = Utils.formatTime();
    },
    
    checkAndRemediate() {
      if (!state.slaResult) return;
      
      Object.entries(state.slaResult).forEach(([role, status]) => {
        if (status === 'BREACH') {
          logAction(`${role.toUpperCase()} SLA breached → AUTO remediation`, 'breach');
        } else if (status === 'AT_RISK') {
          logAction(`${role.toUpperCase()} SLA at risk`, 'warning');
        }
      });
      
      if (state.systemStatus === 'CRITICAL') {
        logAction('Recovery priority engaged', 'auto');
      }
    }
  };

  function renderActionLog() {
    const list = document.getElementById('autus-action-list');
    if (!list) return;
    
    list.innerHTML = state.actionLog.slice(0, 5).map(entry => {
      const time = new Date(entry.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return `<div class="action-entry action-${entry.type}">
        <span class="action-time">${time}</span>
        <span class="action-msg">• ${entry.message}</span>
      </div>`;
    }).join('');
  }

  // ============================================
  // Panel Controls
  // ============================================
  
  const Panel = {
    expand() {
      state.expanded = true;
      const beacon = document.getElementById('autus-beacon');
      const panel = document.getElementById('autus-panel');
      if (beacon) beacon.classList.add('hidden');
      if (panel) panel.classList.add('visible');
      setTimeout(() => { Renderer.init(); Renderer.start(); }, 100);
    },
    
    collapse() {
      state.expanded = false;
      const beacon = document.getElementById('autus-beacon');
      const panel = document.getElementById('autus-panel');
      if (panel) panel.classList.remove('visible');
      setTimeout(() => { if (beacon) beacon.classList.remove('hidden'); Renderer.stop(); }, 300);
    },
    
    toggle() { state.expanded ? this.collapse() : this.expand(); }
  };

  // ============================================
  // Event Handlers
  // ============================================
  
  function setupEvents() {
    const beacon = document.getElementById('autus-beacon');
    if (beacon) beacon.addEventListener('click', () => Panel.expand());
    
    const closeBtn = document.getElementById('autus-close');
    if (closeBtn) closeBtn.addEventListener('click', () => Panel.collapse());
    
    // AUTO button toggle (Bezos: OFF = 신뢰 파괴)
    const autoBtn = document.getElementById('autus-auto-btn');
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        // CRITICAL 상태에서는 OFF 불가
        if (state.systemStatus === 'CRITICAL') {
          logAction('AUTO cannot be disabled in CRITICAL state', 'warning');
          return;
        }
        
        if (state.autoEnabled) {
          if (!confirm('⚠️ SLA breach risk increases.\nOFF = Customer trust destruction.\n\nContinue?')) return;
          state.autoEnabled = false;
          logAction('AUTO disabled ⚠️ Risk increased', 'warning');
        } else {
          state.autoEnabled = true;
          logAction('AUTO enabled · SLA enforced', 'auto');
        }
        UI.updateAutoButton();
      });
    }
    
    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'a') { e.preventDefault(); Panel.toggle(); }
      if (e.key === 'Escape' && state.expanded) Panel.collapse();
    });
  }

  // ============================================
  // Data Fetching
  // ============================================
  
  async function fetchData() {
    state.entityId = Utils.detectEntity();
    const apiData = await API.fetchShadow(state.entityId);
    
    if (apiData && apiData.shadow) {
      state.shadow = apiData.shadow;
      state.lastUpdate = Date.now();
    } else {
      const simData = API.simulateShadow();
      state.shadow = simData.shadow;
    }
    
    UI.updateStatus();
  }
  
  function startPolling() {
    fetchData();
    setInterval(fetchData, CONFIG.POLL_INTERVAL);
    setInterval(() => UI.updateTime(), 1000);
    UI.updateTime();
  }

  // ============================================
  // Initialize
  // ============================================
  
  async function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    createLayer();
    setupEvents();
    startPolling();
    
    // Initial log
    logAction('AUTUS v2.1 Bezos Edition initialized', 'info');
    
    console.log('[AUTUS] Layer v2.1 Bezos Edition — "SLA is not an option."');
  }
  
  init();

})();
