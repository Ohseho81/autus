/**
 * AUTUS Layer v2.0 — Content Script
 * Complete Implementation
 * "See the Future. Don't Touch It."
 */

(function() {
  'use strict';

  // ============================================
  // Prevent Double Injection
  // ============================================
  
  if (window.__AUTUS_LAYER_V2__) return;
  window.__AUTUS_LAYER_V2__ = true;

  // ============================================
  // Configuration
  // ============================================
  
  const CONFIG = {
    API_BASE: 'https://solar.autus-ai.com',
    POLL_INTERVAL: 3000,
    RETRY_INTERVAL: 5000,
    MAX_RETRIES: 3,
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
    
    // URL → Entity 매핑 (확장 가능)
    ENTITY_RULES: [
      { pattern: /localhost/, entity: 'company_abc' },
      { pattern: /autus/, entity: 'company_abc' },
      { pattern: /seoul/, entity: 'city_seoul' },
      { pattern: /korea|\.kr/, entity: 'nation_kr' },
      { pattern: /./, entity: 'company_abc' } // default
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
    forecast: null,
    status: 'GREEN',
    bottleneck: null,
    lastUpdate: null,
    retryCount: 0,
    animationId: null
  };

  // ============================================
  // Utility Functions
  // ============================================
  
  const Utils = {
    lerp: (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t)),
    
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    
    formatNumber: (n, decimals = 2) => {
      if (typeof n !== 'number' || isNaN(n)) return '—';
      return n.toFixed(decimals);
    },
    
    formatTime: () => {
      return new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });
    },
    
    detectEntity: () => {
      const url = window.location.href;
      for (const rule of CONFIG.ENTITY_RULES) {
        if (rule.pattern.test(url)) {
          return rule.entity;
        }
      }
      return 'company_abc';
    },
    
    debounce: (fn, delay) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
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
          { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
          }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        state.connected = true;
        state.retryCount = 0;
        return data;
      } catch (error) {
        console.warn('[AUTUS] API fetch failed:', error.message);
        state.connected = false;
        state.retryCount++;
        return null;
      }
    },
    
    async fetchOrbits(entityId) {
      try {
        const response = await fetch(
          `${CONFIG.API_BASE}/api/v1/orbit/frames/${entityId}?window=3600000&density=30`,
          { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000)
          }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        console.warn('[AUTUS] Orbits fetch failed:', error.message);
        return null;
      }
    },
    
    // 시뮬레이션 폴백 (API 실패 시)
    simulateShadow() {
      const t = Date.now() / 1000;
      const shadow = {};
      
      CONFIG.PLANETS.forEach((planet, i) => {
        const phase = i * 0.7;
        const freq = 0.05 + i * 0.02;
        shadow[planet.id] = Utils.clamp(
          0.5 + 0.3 * Math.sin(t * freq + phase),
          0, 1
        );
      });
      
      return { shadow, simulated: true };
    }
  };

  // ============================================
  // DOM Creation
  // ============================================
  
  function createLayer() {
    // Remove existing layer if any
    const existing = document.getElementById('autus-layer');
    if (existing) existing.remove();
    
    const layer = document.createElement('div');
    layer.id = 'autus-layer';
    
    layer.innerHTML = `
      <!-- Beacon -->
      <div id="autus-beacon" class="status-green">
        <div id="autus-beacon-core"></div>
      </div>
      
      <!-- Shortcut Hint -->
      <div id="autus-shortcut-hint">
        <kbd>Alt</kbd>+<kbd>A</kbd> to toggle
      </div>
      
      <!-- Quick Status Toast -->
      <div id="autus-toast">
        <div id="autus-toast-status" class="green"></div>
        <span id="autus-toast-text">System Stable</span>
      </div>
      
      <!-- Main Panel -->
      <div id="autus-panel">
        <!-- Header -->
        <div id="autus-header">
          <span id="autus-logo">AUTUS</span>
          <span id="autus-entity"></span>
          <span id="autus-status" class="green">STABLE</span>
          <button id="autus-close" title="Minimize (Alt+A)">×</button>
        </div>
        
        <!-- Solar System -->
        <div id="autus-solar">
          <canvas id="autus-canvas"></canvas>
          <div id="autus-time-indicator">
            <div class="autus-time-segment">
              <div class="autus-time-dot past"></div>
              <span>PAST</span>
            </div>
            <div class="autus-time-segment">
              <div class="autus-time-dot now"></div>
              <span>NOW</span>
            </div>
            <div class="autus-time-segment">
              <div class="autus-time-dot forecast"></div>
              <span>FORECAST</span>
            </div>
          </div>
        </div>
        
        <!-- Twin State -->
        <div id="autus-twin">
          <div id="autus-twin-title">TWIN STATE</div>
          <div class="autus-twin-row">
            <span class="autus-twin-label">Energy</span>
            <div class="autus-twin-bar">
              <div class="autus-twin-fill energy" id="fill-energy"></div>
            </div>
            <span class="autus-twin-value" id="val-energy">—</span>
          </div>
          <div class="autus-twin-row">
            <span class="autus-twin-label">Flow</span>
            <div class="autus-twin-bar">
              <div class="autus-twin-fill flow" id="fill-flow"></div>
            </div>
            <span class="autus-twin-value" id="val-flow">—</span>
          </div>
          <div class="autus-twin-row">
            <span class="autus-twin-label">Risk</span>
            <div class="autus-twin-bar">
              <div class="autus-twin-fill risk" id="fill-risk"></div>
            </div>
            <span class="autus-twin-value" id="val-risk">—</span>
          </div>
        </div>
        
        <!-- 9 Planets Grid -->
        <div id="autus-planets"></div>
        
        <!-- Bottleneck Alert -->
        <div id="autus-bottleneck">
          <span id="autus-bottleneck-icon">⚠️</span>
          <span id="autus-bottleneck-text"></span>
          <span id="autus-bottleneck-value"></span>
        </div>
        
        <!-- Forecast -->
        <div id="autus-forecast">
          <div id="autus-forecast-icon"></div>
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
          <span id="autus-tagline">Reality → Physics → Future</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(layer);
    
    // Create planet grid
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
  // Canvas Renderer (Solar System)
  // ============================================
  
  const Renderer = {
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    lastFrame: 0,
    
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
    
    clear() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);
    },
    
    drawBackground() {
      const ctx = this.ctx;
      const cx = this.width / 2;
      const cy = this.height / 2;
      
      // Radial gradient background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.height * 0.8);
      bg.addColorStop(0, 'rgba(0, 30, 60, 0.3)');
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.width, this.height);
    },
    
    drawOrbits() {
      const ctx = this.ctx;
      const cx = this.width / 2;
      const cy = this.height / 2;
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
      const ctx = this.ctx;
      const cx = this.width / 2;
      const cy = this.height / 2;
      const r = Math.min(this.width, this.height) * 0.08;
      const t = Date.now() / 1000;
      const pulse = 1 + 0.05 * Math.sin(t * 2);
      
      // Outer glow
      const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5 * pulse);
      outerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
      outerGlow.addColorStop(0.5, 'rgba(255, 140, 0, 0.15)');
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      core.addColorStop(0, '#fffacd');
      core.addColorStop(0.4, '#ffd700');
      core.addColorStop(1, '#ff8c00');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    },
    
    drawPlanets() {
      const ctx = this.ctx;
      const cx = this.width / 2;
      const cy = this.height / 2;
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
        
        // Planet glow
        ctx.shadowColor = planet.color;
        ctx.shadowBlur = 8 + value * 6;
        
        // Planet body
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
      
      if (state.expanded) {
        state.animationId = requestAnimationFrame(() => this.render());
      }
    },
    
    start() {
      if (!this.ctx && !this.init()) return;
      this.render();
    },
    
    stop() {
      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
      }
    }
  };

  // ============================================
  // UI Updates
  // ============================================
  
  const UI = {
    updateStatus() {
      if (!state.shadow) return;
      
      const { shadow } = state;
      
      // Calculate derived values
      const energy = (shadow.output + shadow.quality + shadow.stability) / 3;
      const flow = shadow.transfer;
      const risk = Utils.clamp(shadow.shock * 1.5 + shadow.friction * 0.5, 0, 1);
      
      // Determine status
      state.status = risk > 0.7 ? 'RED' : risk > 0.4 ? 'YELLOW' : 'GREEN';
      
      // Detect bottleneck
      state.bottleneck = null;
      if (shadow.friction > 0.7) {
        state.bottleneck = { planet: 'FRICTION', value: shadow.friction };
      } else if (shadow.shock > 0.6) {
        state.bottleneck = { planet: 'SHOCK', value: shadow.shock };
      } else if (shadow.recovery < 0.3) {
        state.bottleneck = { planet: 'RECOVERY', value: shadow.recovery };
      }
      
      // Update Beacon
      const beacon = document.getElementById('autus-beacon');
      if (beacon) {
        beacon.className = `status-${state.status.toLowerCase()}`;
      }
      
      // Update Status Badge
      const statusEl = document.getElementById('autus-status');
      if (statusEl) {
        const statusText = state.status === 'GREEN' ? 'STABLE' : 
                          state.status === 'YELLOW' ? 'CAUTION' : 'ALERT';
        statusEl.textContent = statusText;
        statusEl.className = state.status.toLowerCase();
      }
      
      // Update Entity
      const entityEl = document.getElementById('autus-entity');
      if (entityEl) {
        entityEl.textContent = state.entityId.replace('_', ' ').toUpperCase();
      }
      
      // Update Twin State Bars
      this.updateBar('energy', energy);
      this.updateBar('flow', flow);
      this.updateBar('risk', risk);
      
      // Update Planet Values
      CONFIG.PLANETS.forEach(planet => {
        const el = document.getElementById(`planet-${planet.id}`);
        if (el) {
          el.textContent = Utils.formatNumber(shadow[planet.id]);
        }
      });
      
      // Update Bottleneck
      const bottleneckEl = document.getElementById('autus-bottleneck');
      if (bottleneckEl) {
        if (state.bottleneck) {
          bottleneckEl.classList.add('visible');
          document.getElementById('autus-bottleneck-text').textContent = 
            `${state.bottleneck.planet} bottleneck detected`;
          document.getElementById('autus-bottleneck-value').textContent = 
            Utils.formatNumber(state.bottleneck.value);
        } else {
          bottleneckEl.classList.remove('visible');
        }
      }
      
      // Update Forecast
      const forecastDelta = (energy - 0.5) * 15 + (flow - 0.5) * 10;
      const deltaEl = document.getElementById('autus-forecast-delta');
      if (deltaEl) {
        const sign = forecastDelta >= 0 ? '+' : '';
        deltaEl.textContent = `${sign}${forecastDelta.toFixed(1)}%`;
        deltaEl.className = forecastDelta > 0 ? 'positive' : 
                           forecastDelta < 0 ? 'negative' : 'neutral';
      }
      
      // Update Connection Status
      const connDot = document.getElementById('autus-connection-dot');
      const connText = document.getElementById('autus-connection-text');
      if (connDot && connText) {
        if (state.connected) {
          connDot.classList.remove('offline');
          connText.textContent = 'Live';
        } else {
          connDot.classList.add('offline');
          connText.textContent = 'Offline';
        }
      }
    },
    
    updateBar(name, value) {
      const fill = document.getElementById(`fill-${name}`);
      const val = document.getElementById(`val-${name}`);
      
      if (fill) {
        fill.style.width = `${value * 100}%`;
        
        // Risk-specific coloring
        if (name === 'risk') {
          fill.classList.remove('warning', 'danger');
          if (value > 0.7) fill.classList.add('danger');
          else if (value > 0.4) fill.classList.add('warning');
        }
      }
      
      if (val) {
        val.textContent = Utils.formatNumber(value);
      }
    },
    
    updateTime() {
      const timeEl = document.getElementById('autus-time');
      if (timeEl) {
        timeEl.textContent = Utils.formatTime();
      }
    },
    
    showToast(status, text) {
      const toast = document.getElementById('autus-toast');
      const toastStatus = document.getElementById('autus-toast-status');
      const toastText = document.getElementById('autus-toast-text');
      
      if (!toast) return;
      
      toastStatus.className = status.toLowerCase();
      toastText.textContent = text;
      toast.classList.add('visible');
      
      setTimeout(() => {
        toast.classList.remove('visible');
      }, 2000);
    },
    
    showShortcutHint() {
      const hint = document.getElementById('autus-shortcut-hint');
      if (!hint) return;
      
      hint.classList.add('visible');
      setTimeout(() => {
        hint.classList.remove('visible');
      }, 3000);
    }
  };

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
      
      // Start canvas animation
      setTimeout(() => {
        Renderer.init();
        Renderer.start();
      }, 100);
    },
    
    collapse() {
      state.expanded = false;
      
      const beacon = document.getElementById('autus-beacon');
      const panel = document.getElementById('autus-panel');
      
      if (panel) panel.classList.remove('visible');
      
      setTimeout(() => {
        if (beacon) beacon.classList.remove('hidden');
        Renderer.stop();
      }, 300);
    },
    
    toggle() {
      if (state.expanded) {
        this.collapse();
      } else {
        this.expand();
      }
    }
  };

  // ============================================
  // Event Handlers
  // ============================================
  
  function setupEvents() {
    // Beacon click
    const beacon = document.getElementById('autus-beacon');
    if (beacon) {
      beacon.addEventListener('click', () => Panel.expand());
      
      // Show shortcut hint on first hover
      let hintShown = false;
      beacon.addEventListener('mouseenter', () => {
        if (!hintShown) {
          UI.showShortcutHint();
          hintShown = true;
        }
      });
    }
    
    // Close button
    const closeBtn = document.getElementById('autus-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => Panel.collapse());
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Alt + A: Toggle panel
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        Panel.toggle();
      }
      
      // Alt + S: Quick status toast
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const statusText = state.status === 'GREEN' ? 'System Stable' :
                          state.status === 'YELLOW' ? 'Caution Advised' : 'Alert Active';
        UI.showToast(state.status, statusText);
      }
      
      // Escape: Close panel
      if (e.key === 'Escape' && state.expanded) {
        Panel.collapse();
      }
    });
    
    // Listen for messages from background script
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.command === 'toggle-panel') {
          Panel.toggle();
          sendResponse({ success: true });
        }
        if (message.command === 'quick-status') {
          const statusText = state.status === 'GREEN' ? 'System Stable' :
                            state.status === 'YELLOW' ? 'Caution Advised' : 'Alert Active';
          UI.showToast(state.status, statusText);
          sendResponse({ success: true });
        }
      });
    }
  }

  // ============================================
  // Data Fetching Loop
  // ============================================
  
  async function fetchData() {
    // Detect entity from URL
    state.entityId = Utils.detectEntity();
    
    // Try API first
    const apiData = await API.fetchShadow(state.entityId);
    
    if (apiData && apiData.shadow) {
      state.shadow = apiData.shadow;
      state.lastUpdate = Date.now();
    } else {
      // Fallback to simulation
      const simData = API.simulateShadow();
      state.shadow = simData.shadow;
    }
    
    UI.updateStatus();
  }
  
  function startPolling() {
    // Initial fetch
    fetchData();
    
    // Polling interval
    setInterval(fetchData, CONFIG.POLL_INTERVAL);
    
    // Time update
    setInterval(() => UI.updateTime(), 1000);
    UI.updateTime();
  }

  // ============================================
  // Load Settings from Storage
  // ============================================
  
  async function loadSettings() {
    if (!chrome?.storage?.local) return;
    
    return new Promise(resolve => {
      chrome.storage.local.get(['enabled', 'entityId', 'autoExpand'], (result) => {
        if (result.enabled === false) {
          state.enabled = false;
        }
        if (result.entityId) {
          state.entityId = result.entityId;
        }
        if (result.autoExpand) {
          setTimeout(() => Panel.expand(), 500);
        }
        resolve();
      });
    });
  }

  // ============================================
  // Initialize
  // ============================================
  
  async function init() {
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    // Load settings
    await loadSettings();
    
    // Check if enabled
    if (!state.enabled) {
      console.log('[AUTUS] Layer disabled');
      return;
    }
    
    // Create layer
    createLayer();
    
    // Setup events
    setupEvents();
    
    // Start data fetching
    startPolling();
    
    console.log('[AUTUS] Layer v2.0 initialized — See the Future. Don\'t Touch It.');
  }
  
  // Start
  init();

})();
