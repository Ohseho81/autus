/**
 * AUTUS × Musk Edition: OTA Update Manager
 * Tesla-style 업데이트 경험
 * 
 * "The best part is no part. The best process is no process."
 * — Elon Musk
 */

class UpdateManager {
  constructor() {
    this.currentVersion = '1.2.0';
    this.updateAvailable = false;
    this.updateInfo = null;
    this.deviceId = this.getOrCreateDeviceId();
    this.checkInterval = 6 * 60 * 60 * 1000; // 6시간
    
    this.init();
  }

  init() {
    // Service Worker 메시지 수신
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleSWMessage(event.data);
      });
    }
    
    // 초기 버전 체크
    this.checkVersion();
    
    // 주기적 체크
    setInterval(() => this.checkVersion(), this.checkInterval);
    
    // 버전 배지 렌더링
    this.renderVersionBadge();
    
    console.log(`[OTA] Update Manager initialized v${this.currentVersion}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // VERSION CHECK
  // ═══════════════════════════════════════════════════════════════

  async checkVersion() {
    try {
      const response = await fetch(
        `/api/version?client_version=${this.currentVersion}&device_id=${this.deviceId}`
      );
      
      if (!response.ok) throw new Error('Version check failed');
      
      const data = await response.json();
      
      if (data.update_available) {
        this.updateAvailable = true;
        this.updateInfo = data;
        this.showUpdateNotification(data);
        
        console.log(`[OTA] Update available: v${data.version}`);
      }
      
      // 현재 인간 개입률 표시
      this.updateInterventionDisplay(data.human_intervention_current);
      
      return data;
    } catch (e) {
      console.error('[OTA] Version check failed:', e);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SERVICE WORKER COMMUNICATION
  // ═══════════════════════════════════════════════════════════════

  handleSWMessage(data) {
    switch (data.type) {
      case 'UPDATE_AVAILABLE':
        this.updateAvailable = true;
        this.updateInfo = data;
        this.showUpdateNotification(data);
        break;
        
      case 'UPDATE_APPLIED':
        if (data.action === 'RELOAD_REQUIRED') {
          this.showReloadPrompt();
        }
        break;
        
      case 'SW_ACTIVATED':
        console.log(`[OTA] Service Worker activated: v${data.version}`);
        this.currentVersion = data.version;
        this.renderVersionBadge();
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE NOTIFICATION
  // ═══════════════════════════════════════════════════════════════

  showUpdateNotification(info) {
    // 기존 알림 제거
    document.querySelector('.update-notification')?.remove();
    
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <div class="update-header">
          <span class="update-icon">🚀</span>
          <div class="update-title-group">
            <span class="update-title">v${info.version} 업데이트</span>
            <span class="update-group">${info.your_group || 'stable'}</span>
          </div>
        </div>
        <p class="update-changelog">${info.changelog_summary || info.changelog || ''}</p>
        <div class="update-meta">
          <span class="update-size">${info.update_size_kb ? (info.update_size_kb / 1024).toFixed(1) + ' MB' : ''}</span>
          <span class="update-rollout">${info.rollout_percentage}% 롤아웃</span>
          ${info.is_critical ? '<span class="critical-badge">필수</span>' : ''}
        </div>
        <div class="update-actions">
          <button class="update-btn primary" id="update-now">
            지금 업데이트
          </button>
          <button class="update-btn secondary" id="update-later">
            나중에
          </button>
        </div>
        <div class="musk-principle">
          "Delete → Simplify → Automate"
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 이벤트 바인딩
    document.getElementById('update-now')?.addEventListener('click', () => {
      this.applyUpdate();
      notification.remove();
    });
    
    document.getElementById('update-later')?.addEventListener('click', () => {
      notification.remove();
      this.scheduleReminder();
    });
    
    // 자동 숨김 (크리티컬 아닌 경우, 15초 후)
    if (!info.is_critical) {
      setTimeout(() => {
        notification.style.animation = 'slide-out-right 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
      }, 15000);
    }
    
    // 진동 피드백
    if (navigator.vibrate) {
      navigator.vibrate([30, 20, 30]);
    }
  }

  showReloadPrompt() {
    document.querySelector('.reload-prompt')?.remove();
    
    const prompt = document.createElement('div');
    prompt.className = 'reload-prompt';
    prompt.innerHTML = `
      <span class="reload-icon">✨</span>
      <p>업데이트 완료</p>
      <button class="reload-btn" id="reload-now">새로고침</button>
    `;
    
    document.body.appendChild(prompt);
    
    document.getElementById('reload-now')?.addEventListener('click', () => {
      location.reload();
    });
    
    // 10초 후 자동 새로고침
    setTimeout(() => {
      location.reload();
    }, 10000);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE APPLICATION
  // ═══════════════════════════════════════════════════════════════

  async applyUpdate() {
    try {
      // Service Worker에 업데이트 요청
      const registration = await navigator.serviceWorker?.ready;
      
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // 강제 새로고침
      location.reload(true);
    } catch (e) {
      console.error('[OTA] Update application failed:', e);
      // 폴백: 일반 새로고침
      location.reload();
    }
  }

  scheduleReminder() {
    console.log('[OTA] Update reminder scheduled for 6 hours');
    // 6시간 후 다시 알림
    setTimeout(() => {
      if (this.updateAvailable) {
        this.showUpdateNotification(this.updateInfo);
      }
    }, this.checkInterval);
  }

  // ═══════════════════════════════════════════════════════════════
  // VERSION BADGE & UI
  // ═══════════════════════════════════════════════════════════════

  renderVersionBadge() {
    document.querySelector('.version-badge')?.remove();
    
    const badge = document.createElement('div');
    badge.className = 'version-badge';
    badge.innerHTML = `v${this.currentVersion}`;
    badge.title = '클릭하여 변경 로그 보기';
    
    if (this.updateAvailable) {
      badge.classList.add('update-available');
      badge.innerHTML += ' <span class="update-dot"></span>';
    }
    
    badge.addEventListener('click', () => this.showChangelog());
    
    document.body.appendChild(badge);
  }

  updateInterventionDisplay(percentage) {
    const display = document.querySelector('[data-autus="human_intervention"]');
    if (display) {
      display.textContent = percentage;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CHANGELOG MODAL
  // ═══════════════════════════════════════════════════════════════

  async showChangelog() {
    try {
      const response = await fetch('/api/changelog?limit=5');
      const changelog = await response.json();
      
      const modal = document.createElement('div');
      modal.className = 'changelog-modal';
      modal.innerHTML = `
        <div class="changelog-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="changelog-content">
          <div class="changelog-header">
            <h2>변경 로그</h2>
            <span class="changelog-subtitle">Delete → Simplify → Automate</span>
            <button class="close-btn" onclick="this.closest('.changelog-modal').remove()">×</button>
          </div>
          <div class="changelog-list">
            ${changelog.map(entry => this.renderChangelogEntry(entry)).join('')}
          </div>
          <div class="changelog-footer">
            <div class="intervention-display">
              현재 인간 개입률: <span class="intervention-value">5%</span>
              <span class="intervention-target">→ 목표: 0%</span>
            </div>
            <p class="musk-quote">"${entry.musk_quote || 'The best part is no part.'}"</p>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // 삭제된 기능 애니메이션
      setTimeout(() => {
        modal.querySelectorAll('.entry-deletions li').forEach((li, i) => {
          setTimeout(() => {
            li.style.animation = 'strikethrough 0.5s ease-out forwards';
          }, i * 200);
        });
      }, 500);
      
    } catch (e) {
      console.error('[OTA] Failed to load changelog:', e);
    }
  }

  renderChangelogEntry(entry) {
    return `
      <div class="changelog-entry ${entry.type}">
        <div class="entry-header">
          <span class="entry-version">v${entry.version}</span>
          <span class="entry-date">${entry.date}</span>
          <span class="entry-type">${entry.type}</span>
        </div>
        <h3 class="entry-title">${entry.title}</h3>
        <p class="entry-description">${entry.description}</p>
        
        ${entry.deletions.length > 0 ? `
          <div class="entry-deletions">
            <span class="section-label">🗑️ 삭제됨 (Musk: Delete First)</span>
            <ul>
              ${entry.deletions.map(d => `<li>${d}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${entry.automations.length > 0 ? `
          <div class="entry-automations">
            <span class="section-label">🤖 자동화됨</span>
            <ul>
              ${entry.automations.map(a => `<li>${a}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  getOrCreateDeviceId() {
    let id = localStorage.getItem('autus_device_id');
    if (!id) {
      id = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('autus_device_id', id);
    }
    return id;
  }
}

// 전역 노출
window.UpdateManager = UpdateManager;

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.updateManager = new UpdateManager();
});
