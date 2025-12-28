/**
 * AUTUS × Thiel Edition: Founder Network
 * 창업자 전용 네트워크 효과 시스템
 * 
 * "Competition is for losers. Start with a small monopoly, then expand."
 * — Peter Thiel
 */

class FounderNetwork {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.shareEnabled = false;
    this.networkSize = 847;  // 시뮬레이션 초기값
    this.accuracyBoost = 0;
    this.networkEffect = 1.0;
    this.monopolyScore = 0;
    this.founderNumber = null;
    this.founderTier = null;
    
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.init();
  }

  init() {
    this.loadPreferences();
    this.connectWebSocket();
    this.renderNetworkBar();
    this.renderEntanglementCanvas();
  }

  // ═══════════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════════

  loadPreferences() {
    this.shareEnabled = localStorage.getItem('autus_share_enabled') === 'true';
    this.founderNumber = parseInt(localStorage.getItem('autus_founder_number')) || null;
    this.founderTier = localStorage.getItem('autus_founder_tier') || null;
  }

  savePreferences() {
    localStorage.setItem('autus_share_enabled', this.shareEnabled ? 'true' : 'false');
    if (this.founderNumber) {
      localStorage.setItem('autus_founder_number', this.founderNumber.toString());
    }
    if (this.founderTier) {
      localStorage.setItem('autus_founder_tier', this.founderTier);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INVITE SYSTEM
  // ═══════════════════════════════════════════════════════════════

  async validateInvite(code, founderId) {
    try {
      const response = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, founder_id: founderId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { valid: false, message: error.detail || '검증 실패' };
      }
      
      const result = await response.json();
      
      if (result.valid) {
        this.founderNumber = result.founder_number;
        this.founderTier = result.tier;
        this.networkSize = result.network_size;
        
        localStorage.setItem('autus_founder_verified', 'true');
        localStorage.setItem('autus_founder_id', founderId);
        this.savePreferences();
        
        this.showWelcome(result);
        this.emit('founder_verified', result);
      }
      
      return result;
    } catch (e) {
      console.error('[Network] Invite validation failed:', e);
      return { valid: false, message: '네트워크 오류. 다시 시도해주세요.' };
    }
  }

  showWelcome(result) {
    const modal = document.createElement('div');
    modal.className = 'founder-welcome-modal';
    modal.innerHTML = `
      <div class="welcome-content">
        <div class="welcome-icon">🚀</div>
        <h2>Welcome, Founder #${result.founder_number}</h2>
        <div class="tier-badge tier-${result.tier?.toLowerCase()}">${result.tier}</div>
        <p>${result.message}</p>
        <div class="network-stats">
          <div class="stat">
            <span class="value">${result.network_size}</span>
            <span class="label">/ 1,000 창업자</span>
          </div>
          <div class="stat">
            <span class="value">${result.remaining_slots}</span>
            <span class="label">남은 슬롯</span>
          </div>
        </div>
        <div class="thiel-quote">
          "Every moment in business happens only once."
        </div>
        <button class="welcome-cta" onclick="this.closest('.founder-welcome-modal').remove()">
          네트워크 진입
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    
    // 양자 얽힘 효과
    setTimeout(() => this.triggerEntanglementEffect(), 500);
    
    // 진동 피드백
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50, 30, 100]);
    }
  }

  async generateInviteCode() {
    const founderId = localStorage.getItem('autus_founder_id');
    if (!founderId) {
      return { error: '네트워크 회원만 초대 코드를 생성할 수 있습니다.' };
    }
    
    try {
      const response = await fetch(`/api/invite/generate?founder_id=${founderId}`);
      
      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || '코드 생성 실패' };
      }
      
      const result = await response.json();
      this.showInviteCode(result);
      return result;
    } catch (e) {
      console.error('[Network] Generate invite failed:', e);
      return { error: '네트워크 오류' };
    }
  }

  showInviteCode(result) {
    const toast = document.createElement('div');
    toast.className = 'invite-code-toast';
    toast.innerHTML = `
      <div class="code-display">
        <span class="code">${result.code}</span>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${result.code}'); this.textContent='✓'">📋</button>
      </div>
      <p>${result.message}</p>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 8000);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANONYMOUS SHARING
  // ═══════════════════════════════════════════════════════════════

  toggleShare(enabled) {
    this.shareEnabled = enabled;
    this.savePreferences();
    
    if (enabled) {
      this.showShareConfirmation();
    }
    
    this.emit('share_toggled', enabled);
  }

  showShareConfirmation() {
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.innerHTML = `
      <span class="toast-icon">🔗</span>
      <div class="toast-content">
        <span class="toast-title">익명 공유 활성화</span>
        <span class="toast-message">개인 정보 0%, AI 학습에 기여합니다.</span>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
    
    if (navigator.vibrate) {
      navigator.vibrate([30]);
    }
  }

  async shareDecision(decision) {
    if (!this.shareEnabled) {
      console.log('[Network] Sharing disabled');
      return null;
    }
    
    try {
      const response = await fetch('/api/network/share?share_enabled=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision)
      });
      
      const result = await response.json();
      
      if (result.shared) {
        this.showContributionEffect(result.network_contribution);
        this.emit('decision_shared', result);
      }
      
      return result;
    } catch (e) {
      console.error('[Network] Share failed:', e);
      return null;
    }
  }

  showContributionEffect(contribution) {
    const effect = document.createElement('div');
    effect.className = 'contribution-effect';
    effect.innerHTML = `
      <span class="effect-icon">📈</span>
      <span class="effect-text">${contribution}</span>
    `;
    document.body.appendChild(effect);
    
    this.triggerEntanglementEffect();
    
    setTimeout(() => effect.remove(), 2000);
  }

  // ═══════════════════════════════════════════════════════════════
  // WEBSOCKET CONNECTION
  // ═══════════════════════════════════════════════════════════════

  connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = location.port ? `:${location.port}` : ':8001';
    const wsUrl = `${protocol}//${location.hostname}${port}/api/network/ws`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[Network] Connected to founder network');
        this.updateConnectionIndicator(true);
        this.emit('connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleNetworkMessage(data);
        } catch (e) {
          console.error('[Network] Failed to parse message:', e);
        }
      };
      
      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('[Network] Disconnected from founder network');
        this.updateConnectionIndicator(false);
        this.emit('disconnected');
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('[Network] WebSocket error:', error);
      };
    } catch (e) {
      console.error('[Network] Failed to connect:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Network] Max reconnect attempts reached');
      return;
    }
    
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;
    
    console.log(`[Network] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connectWebSocket(), delay);
  }

  handleNetworkMessage(data) {
    switch (data.type) {
      case 'CONNECTED':
        this.networkSize = data.founders;
        this.accuracyBoost = data.accuracy - 0.72;
        this.networkEffect = data.network_effect;
        this.monopolyScore = data.monopoly_score;
        this.updateNetworkBar();
        this.emit('network_update', data);
        break;
        
      case 'NEW_DELTA':
        this.networkSize = data.count;
        this.accuracyBoost = data.accuracy_boost;
        this.networkEffect = data.network_effect;
        this.monopolyScore = data.monopoly_score;
        this.updateNetworkBar();
        this.triggerEntanglementEffect();
        this.emit('new_delta', data);
        break;
        
      case 'STATS':
        this.networkSize = data.founders;
        this.monopolyScore = data.monopoly_score;
        this.updateNetworkBar();
        this.emit('stats_update', data);
        break;
        
      case 'pong':
        // Heartbeat response
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UI RENDERING
  // ═══════════════════════════════════════════════════════════════

  renderNetworkBar() {
    // 기존 바 제거
    document.querySelector('.network-bar')?.remove();
    
    const bar = document.createElement('div');
    bar.className = 'network-bar';
    bar.innerHTML = `
      <div class="network-indicator">
        <span class="pulse-dot"></span>
        <span class="network-label">네트워크:</span>
        <span class="network-count" data-autus="network_size">${this.networkSize.toLocaleString()}</span>
        <span class="network-anon">명</span>
      </div>
      <div class="monopoly-indicator">
        <span class="monopoly-label">독점:</span>
        <span class="monopoly-score" data-autus="monopoly_score">${this.monopolyScore}</span>
        <span class="monopoly-unit">%</span>
      </div>
      <div class="share-toggle-container">
        <label class="share-toggle">
          <input type="checkbox" id="share-toggle" ${this.shareEnabled ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">공유</span>
      </div>
    `;
    
    document.body.appendChild(bar);
    
    // 토글 이벤트
    document.getElementById('share-toggle')?.addEventListener('change', (e) => {
      this.toggleShare(e.target.checked);
    });
  }

  updateNetworkBar() {
    const countEl = document.querySelector('.network-count');
    if (countEl) {
      this.animateNumber(countEl, parseInt(countEl.textContent.replace(/,/g, '')), this.networkSize);
    }
    
    const monopolyEl = document.querySelector('.monopoly-score');
    if (monopolyEl) {
      monopolyEl.textContent = this.monopolyScore;
    }
  }

  updateConnectionIndicator(connected) {
    const dot = document.querySelector('.pulse-dot');
    if (dot) {
      dot.classList.toggle('connected', connected);
      dot.classList.toggle('disconnected', !connected);
    }
  }

  animateNumber(el, from, to) {
    const duration = 500;
    const startTime = performance.now();
    
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(from + (to - from) * this.easeOutQuad(progress));
      el.textContent = current.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  easeOutQuad(t) {
    return t * (2 - t);
  }

  // ═══════════════════════════════════════════════════════════════
  // QUANTUM ENTANGLEMENT EFFECT
  // ═══════════════════════════════════════════════════════════════

  renderEntanglementCanvas() {
    // 기존 캔버스 제거
    document.getElementById('entanglement-canvas')?.remove();
    
    const canvas = document.createElement('canvas');
    canvas.id = 'entanglement-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    
    // 리사이즈 핸들러
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  triggerEntanglementEffect() {
    const canvas = document.getElementById('entanglement-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 양자 얽힘 라인 생성
    const lines = [];
    const lineCount = Math.min(10, Math.ceil(this.networkEffect));
    
    for (let i = 0; i < lineCount; i++) {
      lines.push({
        startX: centerX,
        startY: centerY,
        endX: Math.random() * canvas.width,
        endY: Math.random() * canvas.height,
        progress: 0,
        speed: 0.02 + Math.random() * 0.03,
        hue: 170 + Math.random() * 20  // Cyan 계열
      });
    }
    
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      let allDone = true;
      
      lines.forEach(line => {
        if (line.progress < 1) {
          allDone = false;
          line.progress += line.speed;
          
          const currentX = line.startX + (line.endX - line.startX) * line.progress;
          const currentY = line.startY + (line.endY - line.startY) * line.progress;
          
          // 글로우 라인
          ctx.beginPath();
          ctx.moveTo(line.startX, line.startY);
          ctx.lineTo(currentX, currentY);
          ctx.strokeStyle = `hsla(${line.hue}, 100%, 70%, ${1 - line.progress})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // 끝점 노드
          ctx.beginPath();
          ctx.arc(currentX, currentY, 4 + Math.sin(line.progress * Math.PI) * 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${line.hue}, 100%, 70%, ${1 - line.progress * 0.5})`;
          ctx.fill();
        }
      });
      
      if (!allDone) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT SYSTEM
  // ═══════════════════════════════════════════════════════════════

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[Network] Event listener error (${event}):`, e);
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════

  async getNetworkStats() {
    try {
      const response = await fetch('/api/network/stats');
      return await response.json();
    } catch (e) {
      console.error('[Network] Failed to get stats:', e);
      return null;
    }
  }

  async getPatterns() {
    try {
      const response = await fetch('/api/network/patterns');
      return await response.json();
    } catch (e) {
      console.error('[Network] Failed to get patterns:', e);
      return null;
    }
  }

  getFounderInfo() {
    return {
      number: this.founderNumber,
      tier: this.founderTier,
      verified: localStorage.getItem('autus_founder_verified') === 'true',
      shareEnabled: this.shareEnabled
    };
  }
}

// 글로벌 노출
window.FounderNetwork = FounderNetwork;
