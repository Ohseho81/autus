/**
 * AUTUS PWA Install Manager
 * 네이티브 앱 같은 설치 경험
 */

class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isStandalone = false;
    this.platform = this.detectPlatform();
    
    this.init();
  }

  init() {
    // 설치 상태 확인
    this.checkInstallState();
    
    // beforeinstallprompt 이벤트 캡처
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('[PWA] Install prompt captured');
      this.showInstallBanner();
    });
    
    // 설치 완료 감지
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.isInstalled = true;
      this.hideInstallBanner();
      this.showInstalledToast();
      this.deferredPrompt = null;
    });
    
    // Service Worker 메시지 수신
    navigator.serviceWorker?.addEventListener('message', (e) => {
      this.handleSWMessage(e.data);
    });
    
    // 초기 UI 렌더링
    this.renderInstallButton();
  }

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM DETECTION
  // ═══════════════════════════════════════════════════════════════

  detectPlatform() {
    const ua = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/.test(ua)) {
      return 'ios';
    } else if (/Android/.test(ua)) {
      return 'android';
    } else if (/Windows/.test(ua)) {
      return 'windows';
    } else if (/Mac/.test(ua)) {
      return 'macos';
    }
    return 'unknown';
  }

  checkInstallState() {
    // Standalone 모드 확인
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true ||
                        document.referrer.includes('android-app://');
    
    // 이미 설치됨
    if (this.isStandalone) {
      this.isInstalled = true;
      console.log('[PWA] Running as installed app');
    }
    
    // iOS Safari 확인
    if (this.platform === 'ios' && !this.isStandalone) {
      const lastPrompt = localStorage.getItem('autus_ios_prompt_time');
      const now = Date.now();
      
      // 24시간에 한 번만 표시
      if (!lastPrompt || now - parseInt(lastPrompt) > 24 * 60 * 60 * 1000) {
        setTimeout(() => this.showIOSInstallGuide(), 3000);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INSTALL PROMPT
  // ═══════════════════════════════════════════════════════════════

  async promptInstall() {
    if (!this.deferredPrompt) {
      // iOS는 수동 가이드
      if (this.platform === 'ios') {
        this.showIOSInstallGuide();
        return;
      }
      console.log('[PWA] No install prompt available');
      return;
    }
    
    // 설치 프롬프트 표시
    this.deferredPrompt.prompt();
    
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    
    if (outcome === 'accepted') {
      this.deferredPrompt = null;
    }
  }

  showInstallBanner() {
    if (this.isInstalled || this.isStandalone) return;
    
    // 이미 표시된 배너 제거
    document.querySelector('.pwa-install-banner')?.remove();
    
    const banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="banner-content">
        <div class="banner-icon">
          <div class="app-icon">A</div>
        </div>
        <div class="banner-text">
          <div class="banner-title">AUTUS 앱 설치</div>
          <div class="banner-subtitle">홈 화면에 추가하여 빠르게 접근</div>
        </div>
        <div class="banner-actions">
          <button class="banner-btn install" id="banner-install">설치</button>
          <button class="banner-btn dismiss" id="banner-dismiss">✕</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    // 이벤트 바인딩
    document.getElementById('banner-install')?.addEventListener('click', () => {
      this.promptInstall();
    });
    
    document.getElementById('banner-dismiss')?.addEventListener('click', () => {
      this.hideInstallBanner();
      localStorage.setItem('autus_banner_dismissed', Date.now().toString());
    });
    
    // 애니메이션
    setTimeout(() => banner.classList.add('visible'), 100);
  }

  hideInstallBanner() {
    const banner = document.querySelector('.pwa-install-banner');
    if (banner) {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 300);
    }
  }

  showIOSInstallGuide() {
    if (this.isInstalled || this.isStandalone) return;
    
    document.querySelector('.ios-install-guide')?.remove();
    
    const guide = document.createElement('div');
    guide.className = 'ios-install-guide';
    guide.innerHTML = `
      <div class="guide-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="guide-content">
        <div class="guide-header">
          <div class="app-icon-large">A</div>
          <h2>AUTUS 앱 설치</h2>
          <p>홈 화면에 추가하여 앱처럼 사용하세요</p>
        </div>
        <div class="guide-steps">
          <div class="step">
            <span class="step-number">1</span>
            <span class="step-text">하단의 <span class="share-icon">⎙</span> 공유 버튼 탭</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span class="step-text">"홈 화면에 추가" 선택</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span class="step-text">우측 상단 "추가" 탭</span>
          </div>
        </div>
        <button class="guide-close" onclick="this.closest('.ios-install-guide').remove()">
          알겠습니다
        </button>
      </div>
    `;
    
    document.body.appendChild(guide);
    localStorage.setItem('autus_ios_prompt_time', Date.now().toString());
    
    setTimeout(() => guide.classList.add('visible'), 100);
  }

  showInstalledToast() {
    const toast = document.createElement('div');
    toast.className = 'pwa-installed-toast';
    toast.innerHTML = `
      <span class="toast-icon">✓</span>
      <span class="toast-text">AUTUS가 설치되었습니다!</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // INSTALL BUTTON
  // ═══════════════════════════════════════════════════════════════

  renderInstallButton() {
    // 설치됨 또는 standalone이면 버튼 숨김
    if (this.isInstalled || this.isStandalone) return;
    
    const existingBtn = document.getElementById('pwa-install-btn');
    if (existingBtn) return;
    
    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.className = 'pwa-install-btn';
    
    // 플랫폼별 다른 메시지
    if (this.platform === 'ios') {
      btn.innerHTML = `
        <span class="btn-icon">📲</span>
        <span class="btn-text">홈에 추가</span>
      `;
    } else {
      btn.innerHTML = `
        <span class="btn-icon">📲</span>
        <span class="btn-text">앱 설치</span>
      `;
    }
    btn.title = '홈 화면에 추가';
    
    btn.addEventListener('click', () => {
      console.log('[PWA] Install button clicked, platform:', this.platform);
      this.promptInstall();
    });
    
    document.body.appendChild(btn);
    
    // 3초 후 배너도 표시
    setTimeout(() => {
      if (!this.isInstalled && !this.isStandalone) {
        this.showInstallBanner();
      }
    }, 3000);
  }

  hideInstallButton() {
    document.getElementById('pwa-install-btn')?.remove();
  }

  // ═══════════════════════════════════════════════════════════════
  // SERVICE WORKER
  // ═══════════════════════════════════════════════════════════════

  handleSWMessage(data) {
    switch (data.type) {
      case 'SW_ACTIVATED':
        console.log(`[PWA] Service Worker activated: v${data.version}`);
        break;
        
      case 'UPDATE_AVAILABLE':
        this.showUpdatePrompt(data);
        break;
    }
  }

  showUpdatePrompt(data) {
    const prompt = document.createElement('div');
    prompt.className = 'pwa-update-prompt';
    prompt.innerHTML = `
      <div class="update-content">
        <span class="update-icon">🚀</span>
        <div class="update-text">
          <div class="update-title">새 버전 v${data.version}</div>
          <div class="update-desc">${data.changelog || '새로운 기능이 추가되었습니다'}</div>
        </div>
        <button class="update-btn" id="update-now">업데이트</button>
      </div>
    `;
    
    document.body.appendChild(prompt);
    
    document.getElementById('update-now')?.addEventListener('click', () => {
      prompt.remove();
      location.reload(true);
    });
    
    setTimeout(() => prompt.classList.add('visible'), 100);
  }

  // ═══════════════════════════════════════════════════════════════
  // OFFLINE DETECTION
  // ═══════════════════════════════════════════════════════════════

  setupOfflineDetection() {
    window.addEventListener('online', () => {
      document.body.classList.remove('offline');
      this.showConnectionToast('온라인 연결됨', 'success');
    });
    
    window.addEventListener('offline', () => {
      document.body.classList.add('offline');
      this.showConnectionToast('오프라인 모드', 'warning');
    });
    
    // 초기 상태
    if (!navigator.onLine) {
      document.body.classList.add('offline');
    }
  }

  showConnectionToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `connection-toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '🌐' : '📴'}</span>
      <span class="toast-text">${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toast-out 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  canInstall() {
    return !!this.deferredPrompt || this.platform === 'ios';
  }

  getInstallState() {
    return {
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone,
      platform: this.platform,
      canPrompt: !!this.deferredPrompt
    };
  }
}

// 전역 노출
window.PWAInstallManager = PWAInstallManager;

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.pwaInstall = new PWAInstallManager();
  window.pwaInstall.setupOfflineDetection();
});
