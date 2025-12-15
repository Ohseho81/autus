/**
 * AUTUS Layer v2.1 — Enhanced Features
 * 추가 기능: 알림, 히스토리, 다크모드
 */

// ============================================
// 1. 알림 시스템 (Notifications)
// ============================================

const Notifications = {
  history: [],
  maxHistory: 50,
  
  // 알림 생성
  create(type, title, message, options = {}) {
    const notification = {
      id: Date.now(),
      type, // 'info', 'warning', 'alert', 'success'
      title,
      message,
      ts: new Date().toISOString(),
      read: false,
      ...options
    };
    
    this.history.unshift(notification);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    
    // 저장
    this.save();
    
    // UI 표시
    if (options.showToast !== false) {
      this.showToast(notification);
    }
    
    // 브라우저 알림 (권한 있을 경우)
    if (options.browserNotify && Notification.permission === 'granted') {
      new Notification(`AUTUS: ${title}`, {
        body: message,
        icon: chrome.runtime.getURL('icons/icon128.png'),
        tag: 'autus-' + notification.id
      });
    }
    
    return notification;
  },
  
  // 토스트 알림 표시
  showToast(notification) {
    const toast = document.createElement('div');
    toast.className = `autus-notification autus-notification-${notification.type}`;
    toast.innerHTML = `
      <div class="autus-notification-icon">${this.getIcon(notification.type)}</div>
      <div class="autus-notification-content">
        <div class="autus-notification-title">${notification.title}</div>
        <div class="autus-notification-message">${notification.message}</div>
      </div>
      <button class="autus-notification-close">×</button>
    `;
    
    toast.querySelector('.autus-notification-close').onclick = () => {
      toast.classList.add('autus-notification-hiding');
      setTimeout(() => toast.remove(), 300);
    };
    
    document.body.appendChild(toast);
    
    // 자동 제거 (5초)
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('autus-notification-hiding');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  },
  
  getIcon(type) {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      alert: '🚨',
      success: '✅'
    };
    return icons[type] || 'ℹ️';
  },
  
  // 저장/로드
  save() {
    localStorage.setItem('autus-notifications', JSON.stringify(this.history));
  },
  
  load() {
    try {
      const saved = localStorage.getItem('autus-notifications');
      if (saved) {
        this.history = JSON.parse(saved);
      }
    } catch (e) {}
  },
  
  // 읽음 처리
  markAsRead(id) {
    const notification = this.history.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.save();
    }
  },
  
  // 전체 읽음
  markAllAsRead() {
    this.history.forEach(n => n.read = true);
    this.save();
  },
  
  // 읽지 않은 개수
  getUnreadCount() {
    return this.history.filter(n => !n.read).length;
  }
};


// ============================================
// 2. 히스토리 시스템 (History)
// ============================================

const History = {
  data: [],
  maxEntries: 1000,
  
  // 상태 기록
  record(shadow, metadata = {}) {
    const entry = {
      ts: Date.now(),
      shadow: { ...shadow },
      status: this.calculateStatus(shadow),
      ...metadata
    };
    
    this.data.push(entry);
    
    // 최대 개수 초과 시 오래된 것 제거
    if (this.data.length > this.maxEntries) {
      this.data = this.data.slice(-this.maxEntries);
    }
    
    // 주기적 저장 (10개마다)
    if (this.data.length % 10 === 0) {
      this.save();
    }
    
    return entry;
  },
  
  calculateStatus(shadow) {
    const risk = (shadow.shock || 0) * 1.5 + (shadow.friction || 0) * 0.5;
    return risk > 0.7 ? 'RED' : risk > 0.4 ? 'YELLOW' : 'GREEN';
  },
  
  // 시간 범위로 조회
  getRange(startTs, endTs) {
    return this.data.filter(e => e.ts >= startTs && e.ts <= endTs);
  },
  
  // 최근 N개 조회
  getRecent(count = 100) {
    return this.data.slice(-count);
  },
  
  // 통계 계산
  getStats(entries = this.data) {
    if (entries.length === 0) return null;
    
    const values = {};
    const planets = ['output', 'quality', 'time', 'friction', 'stability', 
                    'cohesion', 'recovery', 'transfer', 'shock'];
    
    planets.forEach(planet => {
      const planetValues = entries.map(e => e.shadow[planet] || 0);
      values[planet] = {
        min: Math.min(...planetValues),
        max: Math.max(...planetValues),
        avg: planetValues.reduce((a, b) => a + b, 0) / planetValues.length,
        current: planetValues[planetValues.length - 1]
      };
    });
    
    const statusCounts = { GREEN: 0, YELLOW: 0, RED: 0 };
    entries.forEach(e => statusCounts[e.status]++);
    
    return {
      period: {
        start: entries[0].ts,
        end: entries[entries.length - 1].ts,
        count: entries.length
      },
      planets: values,
      status: statusCounts,
      uptime: statusCounts.GREEN / entries.length * 100
    };
  },
  
  // 저장/로드
  save() {
    try {
      // 최근 500개만 저장 (용량 관리)
      const toSave = this.data.slice(-500);
      localStorage.setItem('autus-history', JSON.stringify(toSave));
    } catch (e) {
      console.warn('[AUTUS] History save failed:', e);
    }
  },
  
  load() {
    try {
      const saved = localStorage.getItem('autus-history');
      if (saved) {
        this.data = JSON.parse(saved);
      }
    } catch (e) {}
  },
  
  // 내보내기 (CSV)
  exportCSV() {
    const headers = ['timestamp', 'status', 'output', 'quality', 'time', 
                    'friction', 'stability', 'cohesion', 'recovery', 'transfer', 'shock'];
    
    const rows = this.data.map(e => [
      new Date(e.ts).toISOString(),
      e.status,
      ...headers.slice(2).map(h => e.shadow[h]?.toFixed(3) || '0')
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autus-history-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};


// ============================================
// 3. 테마 시스템 (Dark/Light Mode)
// ============================================

const Theme = {
  current: 'dark', // 'dark', 'light', 'auto'
  
  // 테마 설정
  set(theme) {
    this.current = theme;
    this.apply();
    this.save();
  },
  
  // 테마 적용
  apply() {
    const layer = document.getElementById('autus-layer');
    if (!layer) return;
    
    let effectiveTheme = this.current;
    
    // auto인 경우 시스템 설정 따름
    if (this.current === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: light)').matches 
        ? 'light' : 'dark';
    }
    
    layer.setAttribute('data-theme', effectiveTheme);
    
    // CSS 변수 업데이트
    const root = layer.style;
    
    if (effectiveTheme === 'light') {
      root.setProperty('--autus-void', '#f5f5f7');
      root.setProperty('--autus-cosmos', 'rgba(255, 255, 255, 0.97)');
      root.setProperty('--autus-surface', 'rgba(240, 240, 245, 0.95)');
      root.setProperty('--autus-text', 'rgba(0, 0, 0, 0.9)');
      root.setProperty('--autus-text-dim', 'rgba(0, 0, 0, 0.5)');
      root.setProperty('--autus-border', 'rgba(0, 0, 0, 0.1)');
    } else {
      root.setProperty('--autus-void', '#0a0a0f');
      root.setProperty('--autus-cosmos', 'rgba(10, 10, 15, 0.97)');
      root.setProperty('--autus-surface', 'rgba(20, 20, 30, 0.95)');
      root.setProperty('--autus-text', 'rgba(255, 255, 255, 0.9)');
      root.setProperty('--autus-text-dim', 'rgba(255, 255, 255, 0.5)');
      root.setProperty('--autus-border', 'rgba(0, 212, 255, 0.2)');
    }
  },
  
  // 토글
  toggle() {
    const themes = ['dark', 'light', 'auto'];
    const currentIndex = themes.indexOf(this.current);
    this.set(themes[(currentIndex + 1) % themes.length]);
    return this.current;
  },
  
  // 저장/로드
  save() {
    localStorage.setItem('autus-theme', this.current);
  },
  
  load() {
    const saved = localStorage.getItem('autus-theme');
    if (saved) {
      this.current = saved;
    }
  },
  
  // 시스템 테마 변경 감지
  watchSystem() {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (this.current === 'auto') {
        this.apply();
      }
    });
  }
};


// ============================================
// 4. 추가 CSS (알림용)
// ============================================

const additionalCSS = `
/* Notification Styles */
.autus-notification {
  position: fixed;
  top: 80px;
  right: 24px;
  width: 320px;
  padding: 14px 16px;
  background: var(--autus-cosmos, rgba(10, 10, 15, 0.97));
  border: 1px solid var(--autus-border, rgba(0, 212, 255, 0.2));
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  z-index: 2147483647;
  animation: autus-notification-in 0.3s ease-out;
  font-family: -apple-system, system-ui, sans-serif;
}

.autus-notification-hiding {
  animation: autus-notification-out 0.3s ease-in forwards;
}

@keyframes autus-notification-in {
  from { opacity: 0; transform: translateX(100px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes autus-notification-out {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(100px); }
}

.autus-notification-info { border-left: 3px solid #00d4ff; }
.autus-notification-warning { border-left: 3px solid #ffaa00; }
.autus-notification-alert { border-left: 3px solid #ff4444; }
.autus-notification-success { border-left: 3px solid #00ff88; }

.autus-notification-icon {
  font-size: 18px;
  line-height: 1;
}

.autus-notification-content {
  flex: 1;
}

.autus-notification-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--autus-text, #f8f8ff);
  margin-bottom: 4px;
}

.autus-notification-message {
  font-size: 11px;
  color: var(--autus-text-dim, rgba(255,255,255,0.6));
  line-height: 1.4;
}

.autus-notification-close {
  background: transparent;
  border: none;
  color: var(--autus-text-dim);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}

.autus-notification-close:hover {
  opacity: 1;
  color: #ff4444;
}

/* History Panel Styles */
.autus-history-panel {
  position: absolute;
  top: 0;
  left: -340px;
  width: 320px;
  height: 100%;
  background: var(--autus-cosmos);
  border-right: 1px solid var(--autus-border);
  overflow-y: auto;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

.autus-history-panel.visible {
  transform: translateX(0);
}

.autus-history-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--autus-border);
  font-size: 10px;
}

.autus-history-item-time {
  color: var(--autus-text-dim);
  margin-bottom: 4px;
}

.autus-history-item-values {
  display: flex;
  gap: 8px;
}

.autus-history-item-value {
  padding: 2px 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
}

/* Theme Toggle Button */
.autus-theme-toggle {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255,255,255,0.05);
  color: var(--autus-text-dim);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.autus-theme-toggle:hover {
  background: rgba(255,255,255,0.1);
  color: var(--autus-text);
}
`;


// ============================================
// 5. 초기화 확장
// ============================================

function initEnhancements() {
  // CSS 추가
  const style = document.createElement('style');
  style.textContent = additionalCSS;
  document.head.appendChild(style);
  
  // 저장된 데이터 로드
  Notifications.load();
  History.load();
  Theme.load();
  
  // 테마 적용
  Theme.apply();
  Theme.watchSystem();
  
  // 상태 변경 시 알림 생성
  let lastStatus = null;
  
  window.addEventListener('autus-status-change', (e) => {
    const { status, shadow } = e.detail;
    
    // 상태 기록
    History.record(shadow, { entityId: e.detail.entityId });
    
    // 상태 변경 알림
    if (lastStatus && lastStatus !== status) {
      if (status === 'RED') {
        Notifications.create('alert', 'System Alert', 
          'Risk level has reached critical threshold', 
          { browserNotify: true });
      } else if (status === 'YELLOW' && lastStatus === 'GREEN') {
        Notifications.create('warning', 'Caution', 
          'System status requires attention');
      } else if (status === 'GREEN' && lastStatus !== 'GREEN') {
        Notifications.create('success', 'Recovered', 
          'System has returned to stable state');
      }
    }
    
    lastStatus = status;
  });
  
  console.log('[AUTUS] Enhanced features initialized');
}

// 내보내기 (content.js에서 사용)
window.AUTUS_Notifications = Notifications;
window.AUTUS_History = History;
window.AUTUS_Theme = Theme;
window.AUTUS_initEnhancements = initEnhancements;
