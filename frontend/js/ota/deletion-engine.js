/**
 * AUTUS × Musk Edition: Deletion Engine
 * "The best part is no part" 자동 적용
 * 
 * 사용되지 않는 기능 추적 → 삭제 후보 제안 → 자동화
 */

class DeletionEngine {
  constructor() {
    this.featureUsage = {};
    this.sessionStart = Date.now();
    this.errors = [];
    this.trackingEnabled = true;
    
    this.init();
  }

  init() {
    // 기능 사용 추적
    this.trackFeatureUsage();
    
    // 에러 수집
    this.setupErrorCollection();
    
    // 세션 종료 시 데이터 전송
    window.addEventListener('beforeunload', () => {
      this.submitTelemetry();
    });
    
    // 주기적 전송 (5분마다)
    setInterval(() => {
      this.submitTelemetry();
    }, 5 * 60 * 1000);
    
    console.log('[Deletion] Engine initialized - Tracking feature usage');
  }

  // ═══════════════════════════════════════════════════════════════
  // FEATURE TRACKING
  // ═══════════════════════════════════════════════════════════════

  trackFeatureUsage() {
    // 추적 대상 기능 초기화
    const trackedFeatures = [
      'auto_button',
      'manual_threshold',
      'physics_view',
      'export_pdf',
      'share_network',
      'brainwave_overlay',
      'voice_command',
      'notification_settings',
      'detailed_stats',
      'manual_data_sync',
      'theme_switcher',
      'language_settings',
      'chart_customization',
      'export_csv'
    ];
    
    trackedFeatures.forEach(feature => {
      this.featureUsage[feature] = 0;
    });
    
    // 클릭 이벤트 추적
    document.addEventListener('click', (e) => {
      const feature = e.target.closest('[data-feature]');
      if (feature) {
        const name = feature.dataset.feature;
        this.recordUsage(name);
      }
    });
    
    // 특정 요소 자동 추적
    this.setupAutoTracking();
  }

  setupAutoTracking() {
    // AUTO 버튼
    const autoBtn = document.getElementById('auto-btn') || document.getElementById('auto-button');
    if (autoBtn) {
      autoBtn.addEventListener('click', () => this.recordUsage('auto_button'));
    }
    
    // 공유 토글
    const shareToggle = document.getElementById('share-toggle');
    if (shareToggle) {
      shareToggle.addEventListener('change', () => this.recordUsage('share_network'));
    }
    
    // 페이지 뷰 추적
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', () => {
        const page = el.dataset.page;
        this.recordUsage(`page_view_${page}`);
      });
    });
  }

  recordUsage(feature) {
    if (!this.trackingEnabled) return;
    
    if (!this.featureUsage[feature]) {
      this.featureUsage[feature] = 0;
    }
    this.featureUsage[feature]++;
    
    console.log(`[Deletion] Feature used: ${feature} (count: ${this.featureUsage[feature]})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ERROR COLLECTION
  // ═══════════════════════════════════════════════════════════════

  setupErrorCollection() {
    window.addEventListener('error', (e) => {
      this.errors.push({
        message: e.message,
        file: e.filename,
        line: e.lineno,
        col: e.colno,
        time: Date.now()
      });
      
      // 최대 50개 에러만 유지
      if (this.errors.length > 50) {
        this.errors.shift();
      }
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      this.errors.push({
        message: e.reason?.message || 'Unhandled Promise Rejection',
        type: 'promise',
        time: Date.now()
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TELEMETRY
  // ═══════════════════════════════════════════════════════════════

  async submitTelemetry() {
    const sessionDuration = Math.round((Date.now() - this.sessionStart) / 1000);
    
    // 최소 10초 이상 세션만 전송
    if (sessionDuration < 10) return;
    
    const data = {
      client_version: window.updateManager?.currentVersion || '1.0.0',
      device_type: this.getDeviceType(),
      feature_usage: { ...this.featureUsage },
      errors: this.errors.slice(-10), // 최근 10개 에러만
      session_duration_sec: sessionDuration
    };
    
    try {
      const response = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      // 저사용 기능 경고
      if (result.low_usage_features?.length > 0) {
        console.log('[Deletion] Low usage features detected:', result.low_usage_features);
      }
      
      return result;
    } catch (e) {
      console.error('[Deletion] Telemetry submit failed:', e);
      return null;
    }
  }

  getDeviceType() {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  // ═══════════════════════════════════════════════════════════════
  // DELETION CANDIDATES
  // ═══════════════════════════════════════════════════════════════

  async getDeletionCandidates() {
    try {
      const response = await fetch('/api/deletion-candidates');
      const data = await response.json();
      return data;
    } catch (e) {
      console.error('[Deletion] Failed to fetch candidates:', e);
      return null;
    }
  }

  async showDeletionReport() {
    const data = await this.getDeletionCandidates();
    if (!data) return;
    
    console.group('🗑️ AUTUS Deletion Report (Musk Principle)');
    console.log(`Philosophy: "${data.philosophy}"`);
    console.log('');
    console.log('📊 Deletion Candidates:');
    console.table(data.candidates);
    console.log('');
    console.log(`Total features removed YTD: ${data.total_features_removed_ytd}`);
    console.log(`Automation improvement: ${data.automation_rate_improvement}`);
    console.log(`Current feature count: ${data.current_feature_count}`);
    console.log(`Target feature count: ${data.target_feature_count}`);
    console.log('');
    console.log(`💬 "${data.musk_quote}"`);
    console.groupEnd();
    
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTOMATION ROADMAP
  // ═══════════════════════════════════════════════════════════════

  async getAutomationRoadmap() {
    try {
      const response = await fetch('/api/automation-roadmap');
      return await response.json();
    } catch (e) {
      console.error('[Deletion] Failed to fetch roadmap:', e);
      return null;
    }
  }

  async showAutomationProgress() {
    const data = await this.getAutomationRoadmap();
    if (!data) return;
    
    console.group('🤖 AUTUS Automation Roadmap');
    console.log(`Philosophy: "${data.philosophy}"`);
    console.log('');
    console.log(`Current human intervention: ${data.current_human_intervention}`);
    console.log(`Target: ${data.target_human_intervention}`);
    console.log('');
    console.log('📅 Roadmap:');
    console.table(data.roadmap);
    console.log('');
    console.log('📈 Progress:');
    console.log(`  Started at: ${data.progress.started_at}`);
    console.log(`  Current: ${data.progress.current}`);
    console.log(`  Improvement: ${data.progress.improvement}`);
    console.log('');
    console.log(`💬 "${data.musk_quote}"`);
    console.groupEnd();
    
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // LOCAL ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  analyzeLocalUsage() {
    const total = Object.values(this.featureUsage).reduce((a, b) => a + b, 0) || 1;
    
    const analysis = Object.entries(this.featureUsage)
      .map(([feature, count]) => ({
        feature,
        count,
        percentage: ((count / total) * 100).toFixed(1) + '%',
        status: count === 0 ? '🔴 UNUSED' : count / total < 0.05 ? '🟡 LOW' : '🟢 ACTIVE'
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      total_interactions: total,
      session_duration: Math.round((Date.now() - this.sessionStart) / 1000),
      features: analysis,
      unused_count: analysis.filter(f => f.count === 0).length,
      low_usage_count: analysis.filter(f => f.status === '🟡 LOW').length
    };
  }

  showLocalAnalysis() {
    const analysis = this.analyzeLocalUsage();
    
    console.group('📊 Local Usage Analysis');
    console.log(`Session duration: ${analysis.session_duration}s`);
    console.log(`Total interactions: ${analysis.total_interactions}`);
    console.log('');
    console.table(analysis.features);
    console.log('');
    console.log(`Unused features: ${analysis.unused_count}`);
    console.log(`Low usage features: ${analysis.low_usage_count}`);
    console.log('');
    console.log('💡 Musk Principle: Features with 0 usage should be deleted.');
    console.groupEnd();
    
    return analysis;
  }

  // ═══════════════════════════════════════════════════════════════
  // UI INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  renderDeletionBanner() {
    // 삭제 예정 기능 배너 (해당 기능 위에 표시)
    const scheduledDeletions = [
      { selector: '#manual-threshold', message: 'v1.3.0에서 제거 예정 (AUTO 모드로 대체)' },
      { selector: '#export-pdf', message: 'v1.3.0에서 제거 예정 (사용률 0.8%)' }
    ];
    
    scheduledDeletions.forEach(({ selector, message }) => {
      const element = document.querySelector(selector);
      if (element && !element.querySelector('.deletion-banner')) {
        const banner = document.createElement('div');
        banner.className = 'deletion-banner';
        banner.innerHTML = `
          <span class="banner-icon">🗑️</span>
          <span class="banner-text">${message}</span>
        `;
        element.style.position = 'relative';
        element.appendChild(banner);
      }
    });
  }
}

// 전역 노출
window.DeletionEngine = DeletionEngine;

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.deletionEngine = new DeletionEngine();
});

// 개발자 도구용 단축키
window.autusDelete = {
  report: () => window.deletionEngine?.showDeletionReport(),
  roadmap: () => window.deletionEngine?.showAutomationProgress(),
  local: () => window.deletionEngine?.showLocalAnalysis()
};

console.log('[Deletion] Dev tools: autusDelete.report(), autusDelete.roadmap(), autusDelete.local()');
