// ═══════════════════════════════════════════════════════════════════════════
// AUTUS Constitution UI v1.0
// 10조 표시 패널 + 위반 알림
// ═══════════════════════════════════════════════════════════════════════════

class ConstitutionUI {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.init();
  }

  init() {
    this.createPanel();
    this.bindEvents();
    this.injectFooterBadge();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 패널 생성
  // ─────────────────────────────────────────────────────────────────────────
  createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'constitution-panel';
    this.panel.className = 'constitution-panel';
    this.panel.innerHTML = `
      <div class="const-header">
        <div class="const-title">
          <span class="const-icon">📜</span>
          <span>AUTUS 10조</span>
          <span class="const-version">v1.0 LOCKED</span>
        </div>
        <button class="const-close" id="const-close">×</button>
      </div>
      <div class="const-body">
        <div class="const-articles" id="const-articles"></div>
        <div class="const-footer">
          <div class="const-meta">
            <span>FROZEN: 2025-12-18</span>
            <span>•</span>
            <span>HASH: AUTUS-V1-LOCKED</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.panel);
    this.renderArticles();
    this.addStyles();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 조항 렌더링
  // ─────────────────────────────────────────────────────────────────────────
  renderArticles() {
    const container = document.getElementById('const-articles');
    if (!container || !window.AUTUS_CONSTITUTION) return;

    let html = '';
    for (let i = 1; i <= 10; i++) {
      const article = AUTUS_CONSTITUTION[`ARTICLE_${i}`];
      html += `
        <div class="const-article">
          <div class="article-header">
            <span class="article-num">제${i}조</span>
            <span class="article-title">${article.title}</span>
            <span class="article-title-en">${article.title_en}</span>
          </div>
          <div class="article-content">${article.content}</div>
          <div class="article-principle">
            <span class="principle-label">원칙:</span>
            <span class="principle-text">${article.principle}</span>
          </div>
          ${article.formula ? `<div class="article-formula"><code>${article.formula}</code></div>` : ''}
        </div>
      `;
    }
    container.innerHTML = html;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 스타일 추가
  // ─────────────────────────────────────────────────────────────────────────
  addStyles() {
    if (document.getElementById('constitution-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'constitution-styles';
    style.textContent = `
      .constitution-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        max-height: 80vh;
        background: rgba(10, 12, 18, 0.98);
        border: 2px solid rgba(212, 175, 55, 0.5);
        border-radius: 16px;
        z-index: 99999;
        display: none;
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
                    0 0 40px rgba(212, 175, 55, 0.2);
      }
      
      .constitution-panel.visible {
        display: block;
        animation: constFadeIn 0.3s ease;
      }
      
      @keyframes constFadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      
      .const-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        background: linear-gradient(135deg, rgba(212, 175, 55, 0.1), transparent);
      }
      
      .const-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 600;
        color: #d4af37;
        letter-spacing: 1px;
      }
      
      .const-icon {
        font-size: 20px;
      }
      
      .const-version {
        font-size: 9px;
        padding: 2px 8px;
        background: rgba(212, 175, 55, 0.2);
        border-radius: 4px;
        color: rgba(212, 175, 55, 0.8);
      }
      
      .const-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
      }
      
      .const-close:hover {
        color: rgba(255, 255, 255, 0.8);
      }
      
      .const-body {
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      .const-article {
        padding: 16px;
        margin-bottom: 12px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        border-left: 3px solid rgba(212, 175, 55, 0.5);
      }
      
      .article-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      
      .article-num {
        font-size: 11px;
        font-weight: 700;
        color: #d4af37;
        background: rgba(212, 175, 55, 0.15);
        padding: 3px 8px;
        border-radius: 4px;
      }
      
      .article-title {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
      }
      
      .article-title-en {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
        font-style: italic;
      }
      
      .article-content {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.6;
        margin-bottom: 10px;
      }
      
      .article-principle {
        font-size: 11px;
        padding: 8px 12px;
        background: rgba(212, 175, 55, 0.08);
        border-radius: 6px;
      }
      
      .principle-label {
        color: rgba(212, 175, 55, 0.7);
        margin-right: 6px;
      }
      
      .principle-text {
        color: rgba(255, 255, 255, 0.7);
        font-style: italic;
      }
      
      .article-formula {
        margin-top: 10px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
      }
      
      .article-formula code {
        font-family: 'SF Mono', monospace;
        font-size: 11px;
        color: #22c55e;
      }
      
      .const-footer {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
      
      .const-meta {
        display: flex;
        gap: 12px;
        font-size: 9px;
        color: rgba(255, 255, 255, 0.3);
        justify-content: center;
      }
      
      /* Footer Badge */
      #constitution-badge {
        position: fixed;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 16px;
        background: rgba(212, 175, 55, 0.1);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 20px;
        font-size: 9px;
        color: rgba(212, 175, 55, 0.7);
        cursor: pointer;
        z-index: 100;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      #constitution-badge:hover {
        background: rgba(212, 175, 55, 0.2);
        color: #d4af37;
      }
      
      #constitution-badge .badge-icon {
        font-size: 12px;
      }
      
      /* Violation Alert */
      .const-violation-alert {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: rgba(239, 68, 68, 0.9);
        border-radius: 8px;
        color: white;
        font-size: 12px;
        z-index: 999999;
        display: none;
        animation: violationPulse 0.5s ease;
      }
      
      @keyframes violationPulse {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.05); }
      }
    `;
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Footer 배지 삽입
  // ─────────────────────────────────────────────────────────────────────────
  injectFooterBadge() {
    if (document.getElementById('constitution-badge')) return;
    
    const badge = document.createElement('div');
    badge.id = 'constitution-badge';
    badge.innerHTML = `
      <span class="badge-icon">📜</span>
      <span>AUTUS 10조</span>
      <span style="opacity: 0.5">v1.0 LOCKED</span>
    `;
    badge.onclick = () => this.toggle();
    document.body.appendChild(badge);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 이벤트 바인딩
  // ─────────────────────────────────────────────────────────────────────────
  bindEvents() {
    // 닫기 버튼
    document.getElementById('const-close')?.addEventListener('click', () => {
      this.hide();
    });

    // ESC 키
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // 위반 알림
    window.addEventListener('constitution:violation', (e) => {
      this.showViolationAlert(e.detail);
    });

    // Ctrl+Shift+C 단축키
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 표시/숨김
  // ─────────────────────────────────────────────────────────────────────────
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.isVisible = true;
    this.panel.classList.add('visible');
  }

  hide() {
    this.isVisible = false;
    this.panel.classList.remove('visible');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 위반 알림
  // ─────────────────────────────────────────────────────────────────────────
  showViolationAlert(violation) {
    let alert = document.getElementById('const-violation-alert');
    if (!alert) {
      alert = document.createElement('div');
      alert.id = 'const-violation-alert';
      alert.className = 'const-violation-alert';
      document.body.appendChild(alert);
    }
    
    const article = AUTUS_CONSTITUTION[`ARTICLE_${violation.article}`];
    alert.innerHTML = `⚠️ 제${violation.article}조 위반: ${article.title} — ${violation.description}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
      alert.style.display = 'none';
    }, 5000);
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.constitutionUI = new ConstitutionUI();
  }, 2500);
});

if (document.readyState === 'complete') {
  setTimeout(() => {
    if (!window.constitutionUI) {
      window.constitutionUI = new ConstitutionUI();
    }
  }, 2500);
}

console.log('[AUTUS] Constitution UI available (Ctrl+Shift+C or click badge)');
