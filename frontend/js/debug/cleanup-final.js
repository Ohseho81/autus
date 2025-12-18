// ═══════════════════════════════════════════════════════════════
// AUTUS CLEANUP FINAL v1.2 (Safe Mode)
// "It's already right. Remove what isn't part of the decision."
// 의사결정 경로에 없는 요소만 CSS로 숨김 (DOM 제거 최소화)
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const CLEANUP = {
    
    // ─────────────────────────────────────────────────────────
    // CSS 강제 숨김 (안전 - DOM 건드리지 않음)
    // ─────────────────────────────────────────────────────────
    injectStyles() {
      if (document.getElementById('cleanup-final-styles')) return;

      const style = document.createElement('style');
      style.id = 'cleanup-final-styles';
      style.textContent = `
        /* ═══════════════════════════════════════════════════
           AUTUS CLEANUP v1.2 - CSS Only (Safe Mode)
           ═══════════════════════════════════════════════════ */

        /* Legacy Action Block 숨김 */
        .recommended-action,
        .recommendation-banner,
        #recommendation-banner,
        .future-sim-panel,
        #future-sim-panel,
        .legacy-actions,
        .hover-sim-card {
          display: none !important;
        }

        /* Layer Action 숨김 (기존 버튼) */
        #layer-action {
          display: none !important;
        }

        /* Forecast 전역 패널 숨김 */
        .choice-comparison:not(.choice-card *),
        .forecast-comparison:not(.choice-card *),
        #forecast-comparison {
          display: none !important;
        }

        /* PRIMARY 스타일 (OPTIMAL 대체) */
        .card-rank.primary,
        .card-rank.optimal,
        .choice-card.primary .card-rank,
        .choice-card.optimal .card-rank {
          background: rgba(59, 130, 246, 0.2) !important;
          color: #3b82f6 !important;
        }

        .choice-card.primary,
        .choice-card.optimal {
          border-color: rgba(59, 130, 246, 0.4) !important;
        }

        .choice-card.primary .card-lock-btn,
        .choice-card.optimal .card-lock-btn {
          background: rgba(59, 130, 246, 0.2) !important;
          border-color: rgba(59, 130, 246, 0.4) !important;
          color: #3b82f6 !important;
        }

        /* SECONDARY 스타일 */
        .card-rank.secondary,
        .card-rank.alternative {
          background: rgba(147, 51, 234, 0.15) !important;
          color: #9333ea !important;
        }

        /* TERTIARY 스타일 */
        .card-rank.tertiary,
        .card-rank.fallback {
          background: rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.5) !important;
        }

        /* Choice 카드 내부 요소는 항상 유지 */
        .choice-card,
        .choice-card *,
        #choice-container,
        #choice-container * {
          /* 보호 */
        }

        /* 카드 내부 mini-bar 유지 */
        .choice-card .forecast-mini-bar {
          display: flex !important;
        }
      `;
      document.head.appendChild(style);
    },

    // ─────────────────────────────────────────────────────────
    // 라벨 중립화 (텍스트만 교체, DOM 유지)
    // ─────────────────────────────────────────────────────────
    neutralizeLabels() {
      const textMap = {
        '🎯 OPTIMAL': '◉ PRIMARY',
        'OPTIMAL': 'PRIMARY'
      };

      document.querySelectorAll('.card-rank').forEach(el => {
        let text = el.textContent || '';
        Object.keys(textMap).forEach(old => {
          if (text.includes(old)) {
            el.textContent = text.replace(old, textMap[old]);
          }
        });
        
        // 클래스도 업데이트
        if (el.classList.contains('optimal')) {
          el.classList.add('primary');
        }
      });

      // Choice 카드 클래스
      document.querySelectorAll('.choice-card.optimal').forEach(el => {
        el.classList.add('primary');
      });
    },

    // ─────────────────────────────────────────────────────────
    // 실행 (1회만)
    // ─────────────────────────────────────────────────────────
    run() {
      this.injectStyles();
      
      // 라벨 중립화는 한 번만 (3초 후)
      setTimeout(() => {
        this.neutralizeLabels();
      }, 3000);
      
      console.log('[AUTUS] Cleanup v1.2 (Safe Mode) ✓');
    }
  };

  // ─────────────────────────────────────────────────────────
  // 초기화 (1회만 실행)
  // ─────────────────────────────────────────────────────────
  function init() {
    CLEANUP.run();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 전역 접근
  window.AUTUS_CLEANUP = CLEANUP;

})();
