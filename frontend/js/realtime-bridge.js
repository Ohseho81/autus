/**
 * AUTUS Realtime Bridge
 * WebSocket 클라이언트 - PhysicsEngine 실시간 연결
 */

class AutusRealtimeBridge {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || this._detectWsUrl();
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.isConnected = false;
    this.listeners = new Map();
    
    // 글로벌 모델 (UI 바인딩용)
    window.__AUTUS_MODEL = {
      snapshot: { risk: 0, entropy: 0, pressure: 0, flow: 0, gate: 'GREEN' },
      costs: {},
      pnr_days: 30,
      loss_velocity: 0,
      timestamp: null
    };
    
    // 자동 연결
    if (window.AUTUS_AUTO_CONNECT !== false) {
      this.connect();
    }
  }
  
  _detectWsUrl() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = location.hostname || 'localhost';
    const port = 8001; // FastAPI 포트
    return `${protocol}//${host}:${port}/ws/physics`;
  }
  
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[AUTUS] Already connected');
      return;
    }
    
    console.log(`[AUTUS] Connecting to ${this.wsUrl}...`);
    
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('[AUTUS] ✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._updateConnectionIndicator(true);
        this._emit('connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleMessage(data);
        } catch (e) {
          console.error('[AUTUS] Parse error:', e);
        }
      };
      
      this.ws.onclose = () => {
        console.log('[AUTUS] WebSocket closed');
        this.isConnected = false;
        this._updateConnectionIndicator(false);
        this._emit('disconnected');
        this._scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('[AUTUS] WebSocket error:', error);
        this._emit('error', error);
      };
      
    } catch (error) {
      console.error('[AUTUS] Connection failed:', error);
      this._scheduleReconnect();
    }
  }
  
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[AUTUS] Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.min(this.reconnectAttempts, 5);
    
    console.log(`[AUTUS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => this.connect(), delay);
  }
  
  _handleMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'physics_update':
        this._updateModel(payload);
        this._updateDOM(payload);
        this._emit('physics_update', payload);
        break;
        
      case 'alert':
        this._showAlert(payload);
        this._emit('alert', payload);
        break;
        
      case 'action_result':
        this._emit('action_result', payload);
        break;
        
      default:
        console.log('[AUTUS] Unknown message type:', type);
    }
  }
  
  _updateModel(payload) {
    // 글로벌 모델 업데이트
    window.__AUTUS_MODEL = {
      ...window.__AUTUS_MODEL,
      ...payload,
      timestamp: Date.now()
    };
    
    // Three.js 효과 연동
    if (window.autusEffects) {
      const risk = payload.risk || 0;
      window.autusEffects.setIntensity(risk / 100);
      
      if (risk > 70) {
        window.autusEffects.setMode('warning');
      } else {
        window.autusEffects.setMode('normal');
      }
    }
  }
  
  _updateDOM(payload) {
    // data-autus 속성을 가진 모든 요소 업데이트
    document.querySelectorAll('[data-autus]').forEach(el => {
      const key = el.dataset.autus;
      const format = el.dataset.format || 'raw';
      
      let value = this._getNestedValue(payload, key);
      if (value === undefined) return;
      
      // 포맷팅
      const formatted = this._formatValue(value, format);
      
      // 업데이트
      if (el.textContent !== formatted) {
        el.textContent = formatted;
        el.classList.add('autus-updated');
        setTimeout(() => el.classList.remove('autus-updated'), 300);
      }
    });
  }
  
  _getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }
  
  _formatValue(value, format) {
    switch (format) {
      case 'currency':
        return `₩${Number(value).toLocaleString()}`;
      case 'percent':
        return `${Number(value).toFixed(1)}%`;
      case 'days':
        return `${Math.round(value)}일`;
      case 'decimal':
        return Number(value).toFixed(2);
      default:
        return String(value);
    }
  }
  
  _updateConnectionIndicator(connected) {
    const indicator = document.querySelector('.autus-connection-indicator');
    if (indicator) {
      indicator.classList.toggle('connected', connected);
      indicator.classList.toggle('disconnected', !connected);
    }
  }
  
  _showAlert(payload) {
    const { level, message } = payload;
    
    // 토스트 알림
    const toast = document.createElement('div');
    toast.className = `autus-toast autus-toast-${level}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      background: ${level === 'critical' ? '#ff3333' : level === 'warning' ? '#ff9900' : '#00ffcc'};
      color: ${level === 'critical' || level === 'warning' ? '#fff' : '#000'};
      font-weight: bold;
      z-index: 10000;
      animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
  
  // 이벤트 리스너
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const idx = callbacks.indexOf(callback);
      if (idx !== -1) callbacks.splice(idx, 1);
    }
  }
  
  _emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
  
  // 액션 전송
  sendAction(actionType, params = {}) {
    if (!this.isConnected) {
      console.error('[AUTUS] Not connected');
      return false;
    }
    
    this.ws.send(JSON.stringify({
      type: 'action',
      payload: { action: actionType, ...params }
    }));
    
    return true;
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// 글로벌 인스턴스
window.autusBridge = new AutusRealtimeBridge();

// 편의 함수
window.autusConnect = () => window.autusBridge.connect();
window.autusDisconnect = () => window.autusBridge.disconnect();
window.autusSendAction = (type, params) => window.autusBridge.sendAction(type, params);
