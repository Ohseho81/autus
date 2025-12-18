// ═══════════════════════════════════════════════════════════════
// AUTUS CLEANUP FINAL v2.0 (강제 보호 모드)
// #layer-action을 절대로 숨기지 않도록 강제 보호
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  console.log('[AUTUS] Cleanup v2.0 시작...');

  // ─────────────────────────────────────────────────────────────
  // 1. #layer-action 강제 표시 함수
  // ─────────────────────────────────────────────────────────────
  function forceShowLayerAction() {
    const el = document.getElementById('layer-action');
    if (el) {
      el.style.setProperty('display', 'flex', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.classList.remove('legacy-hidden', 'hidden');
      el.removeAttribute('aria-hidden');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CSS 주입 (다른 CSS 규칙 무력화)
  // ─────────────────────────────────────────────────────────────
  function injectProtectiveCSS() {
    // 기존 cleanup 스타일 제거
    const oldStyle = document.getElementById('cleanup-final-styles');
    if (oldStyle) oldStyle.remove();

    const style = document.createElement('style');
    style.id = 'cleanup-final-styles';
    style.textContent = `
      /* ═══════════════════════════════════════════════════
         AUTUS CLEANUP v2.0 - #layer-action 강제 보호
         ═══════════════════════════════════════════════════ */

      /* #layer-action 강제 표시 (최우선) */
      #layer-action {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        flex-direction: column !important;
        gap: 10px !important;
        pointer-events: auto !important;
      }

      #layer-action * {
        visibility: visible !important;
        opacity: 1 !important;
      }

      /* legacy-hidden 클래스 무력화 (layer-action용) */
      #layer-action.legacy-hidden,
      #layer-action.hidden {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      /* 다른 불필요한 요소만 숨김 */
      .recommendation-banner,
      #recommendation-banner,
      .future-sim-panel,
      #future-sim-panel,
      #choice-container {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. MutationObserver로 지속 보호
  // ─────────────────────────────────────────────────────────────
  function setupProtection() {
    const el = document.getElementById('layer-action');
    if (!el) {
      console.warn('[AUTUS] #layer-action not found');
      return;
    }

    // 속성 변경 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          // style 또는 class가 변경되면 복원
          if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
            forceShowLayerAction();
          }
        }
      });
    });

    observer.observe(el, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    console.log('[AUTUS] MutationObserver 보호 활성화');
  }

  // ─────────────────────────────────────────────────────────────
  // 4. 다른 스크립트의 숨김 함수 무력화
  // ─────────────────────────────────────────────────────────────
  function disableHidingScripts() {
    // ChoiceCardUI의 render에서 layer-action 숨김 방지
    if (window.ChoiceCardUI) {
      const originalRender = window.ChoiceCardUI.prototype.render;
      window.ChoiceCardUI.prototype.render = function() {
        originalRender.call(this);
        forceShowLayerAction();
      };
    }

    // LegacyActionControl 완전 비활성화
    if (window.LegacyActionControl) {
      window.LegacyActionControl.prototype.hideLegacyBlock = function() {
        console.log('[AUTUS] hideLegacyBlock 차단됨');
      };
    }

    // 기존 인스턴스도 비활성화
    if (window.legacyControl) {
      window.legacyControl.hideLegacyBlock = function() {
        console.log('[AUTUS] legacyControl.hideLegacyBlock 차단됨');
      };
    }

    if (window.choiceCardUI) {
      const originalRender = window.choiceCardUI.render?.bind(window.choiceCardUI);
      if (originalRender) {
        window.choiceCardUI.render = function() {
          originalRender();
          forceShowLayerAction();
        };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. 주기적 강제 복원 (최후의 수단)
  // ─────────────────────────────────────────────────────────────
  function startPeriodicProtection() {
    setInterval(() => {
      forceShowLayerAction();
    }, 500); // 0.5초마다 복원
  }

  // ─────────────────────────────────────────────────────────────
  // 실행
  // ─────────────────────────────────────────────────────────────
  function init() {
    injectProtectiveCSS();
    forceShowLayerAction();
    setupProtection();
    disableHidingScripts();
    startPeriodicProtection();
    
    console.log('[AUTUS] Cleanup v2.0 완료 - #layer-action 강제 보호 활성화');
  }

  // DOM 로드 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 추가: 1초, 2초, 3초 후에도 재실행 (다른 스크립트 로드 대응)
  setTimeout(init, 1000);
  setTimeout(init, 2000);
  setTimeout(init, 3000);

  // 전역 접근
  window.AUTUS_CLEANUP = {
    forceShow: forceShowLayerAction,
    init: init
  };

})();
