// ═══════════════════════════════════════════════════════════════
// AUTUS CLEANUP FINAL v1.1
// "It's already right. Remove what isn't part of the decision."
// 의사결정 경로에 없는 모든 요소 제거
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const CLEANUP = {
    
    // ─────────────────────────────────────────────────────────
    // 제거 대상 정의 (LOCK)
    // ─────────────────────────────────────────────────────────
    REMOVE_SELECTORS: [
      // Legacy Action Block
      '.recommended-action',
      '.recommendation-banner',
      '#recommendation-banner',
      '.legacy-actions',
      '.future-sim-panel',
      '#future-sim-panel',
      '[data-legacy-action]',
      
      // AUDIT 행동 유도
      '.execute-now',
      '.manual-override', 
      '.dismiss-btn',
      '[data-action="execute"]',
      '[data-action="override"]',
      '[data-action="dismiss"]',
      
      // Forecast 전역 패널
      '.choice-comparison:not(.mini)',
      '.forecast-comparison:not(.mini)',
      '#forecast-comparison',
      '.comparison-chart:not(.mini)',
      
      // 장문 설명
      '.prediction-detail',
      '.forecast-detail',
      '.action-explanation'
    ],

    REMOVE_TEXT_PATTERNS: [
      'RECOMMENDED ACTION',
      'EXECUTE NOW',
      'MANUAL OVERRIDE',
      'DISMISS',
      '선택 시 예측',
      'BEST CASE',
      'LIKELY CASE', 
      'WORST CASE'
    ],

    REMOVE_BUTTONS: [
      'RECOVER',
      'DEFRICTION', 
      'SHOCK DAMP',
      'SHOCK_DAMP',
      'EXECUTE',
      'OVERRIDE',
      'DISMISS'
    ],

    // ─────────────────────────────────────────────────────────
    // 1. 셀렉터 기반 제거
    // ─────────────────────────────────────────────────────────
    removeBySelectors() {
      this.REMOVE_SELECTORS.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.remove();
        });
      });
    },

    // ─────────────────────────────────────────────────────────
    // 2. 텍스트 패턴 기반 제거
    // ─────────────────────────────────────────────────────────
    removeByTextPatterns() {
      this.REMOVE_TEXT_PATTERNS.forEach(pattern => {
        document.querySelectorAll('*').forEach(el => {
          // 직접 텍스트 노드만 가진 요소
          if (el.childNodes.length <= 2 && 
              el.textContent && 
              el.textContent.includes(pattern) &&
              !el.closest('.choice-card') &&
              !el.closest('#choice-container')) {
            el.remove();
          }
        });
      });
    },

    // ─────────────────────────────────────────────────────────
    // 3. Legacy 버튼 제거 (Choice 카드 외부)
    // ─────────────────────────────────────────────────────────
    removeLegacyButtons() {
      document.querySelectorAll('button, .btn, [role="button"]').forEach(btn => {
        const text = (btn.textContent || '').toUpperCase().trim();
        const isLegacy = this.REMOVE_BUTTONS.some(t => text.includes(t));
        const isInChoice = btn.closest('.choice-card');
        const isInChoiceContainer = btn.closest('#choice-container');
        const isLockBtn = btn.classList.contains('card-lock-btn');
        const isAuditBtn = btn.classList.contains('audit-btn');
        
        if (isLegacy && !isInChoice && !isInChoiceContainer && !isLockBtn && !isAuditBtn) {
          // 부모 컨테이너까지 제거 시도
          const container = btn.closest('.action-buttons, .action-area, .button-group, .audit-actions, #layer-action');
          if (container) {
            container.style.display = 'none';
          } else {
            btn.style.display = 'none';
          }
        }
      });
    },

    // ─────────────────────────────────────────────────────────
    // 4. BEST/LIKELY/WORST 패널 제거
    // ─────────────────────────────────────────────────────────
    removePredictionPanels() {
      document.querySelectorAll('.branch, .sim-branches, .prediction-branches').forEach(el => {
        if (!el.closest('.choice-card')) {
          el.remove();
        }
      });

      // Hover sim cards 제거
      document.querySelectorAll('.hover-sim-card').forEach(el => {
        el.remove();
      });
    },

    // ─────────────────────────────────────────────────────────
    // 5. 라벨 중립화
    // ─────────────────────────────────────────────────────────
    neutralizeLabels() {
      const textMap = {
        '🎯 OPTIMAL': '◉ PRIMARY',
        'OPTIMAL': 'PRIMARY',
        'ALTERNATIVE': 'SECONDARY',
        'FALLBACK': 'TERTIARY'
      };

      const classMap = {
        'optimal': 'primary',
        'alternative': 'secondary', 
        'fallback': 'tertiary'
      };

      // 텍스트 교체
      document.querySelectorAll('.card-rank, .rank, [class*="rank"]').forEach(el => {
        let text = el.textContent;
        Object.keys(textMap).forEach(old => {
          if (text && text.includes(old)) {
            el.textContent = text.replace(old, textMap[old]);
          }
        });
      });

      // 클래스 교체
      Object.keys(classMap).forEach(old => {
        document.querySelectorAll(`.${old}`).forEach(el => {
          el.classList.remove(old);
          el.classList.add(classMap[old]);
        });
      });
    },

    // ─────────────────────────────────────────────────────────
    // 6. 중복 요소 정리
    // ─────────────────────────────────────────────────────────
    cleanupDuplicates() {
      const uniqueSelectors = [
        '.collapse-warning',
        '.causality-chain-section',
        '.primary-bottleneck-badge',
        '#choice-container'
      ];

      uniqueSelectors.forEach(sel => {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 1) {
          [...elements].slice(1).forEach(el => el.remove());
        }
      });
    },

    // ─────────────────────────────────────────────────────────
    // 7. CSS 강제 숨김
    // ─────────────────────────────────────────────────────────
    injectStyles() {
      if (document.getElementById('cleanup-final-styles')) return;

      const style = document.createElement('style');
      style.id = 'cleanup-final-styles';
      style.textContent = `
        /* ═══════════════════════════════════════════════════
           AUTUS CLEANUP - 강제 숨김
           ═══════════════════════════════════════════════════ */

        /* Legacy 완전 제거 */
        .recommended-action,
        .recommendation-banner,
        #recommendation-banner,
        .future-sim-panel,
        #future-sim-panel,
        .legacy-actions,
        [data-legacy="true"],
        .execute-now,
        .manual-override,
        .dismiss-btn,
        .hover-sim-card {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          overflow: hidden !important;
        }

        /* Layer Action 숨김 */
        #layer-action {
          display: none !important;
        }

        /* Forecast 전역 패널 제거 */
        .choice-comparison,
        .forecast-comparison,
        #forecast-comparison {
          display: none !important;
        }

        /* AUDIT 버튼 숨김 */
        [data-action="execute"],
        [data-action="override"],
        [data-action="dismiss"] {
          display: none !important;
        }

        /* PRIMARY 스타일 (OPTIMAL 대체) */
        .card-rank.primary,
        .choice-card.primary .card-rank {
          background: rgba(59, 130, 246, 0.2) !important;
          color: #3b82f6 !important;
        }

        .choice-card.primary {
          border-color: rgba(59, 130, 246, 0.4) !important;
        }

        .choice-card.primary .card-lock-btn {
          background: rgba(59, 130, 246, 0.2) !important;
          border-color: rgba(59, 130, 246, 0.4) !important;
          color: #3b82f6 !important;
        }

        /* SECONDARY 스타일 */
        .card-rank.secondary {
          background: rgba(147, 51, 234, 0.15) !important;
          color: #9333ea !important;
        }

        /* TERTIARY 스타일 */
        .card-rank.tertiary {
          background: rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.5) !important;
        }

        /* 카드 내부 mini-bar는 유지 */
        .choice-card .forecast-mini-bar,
        .choice-card .mini-comparison {
          display: flex !important;
        }
      `;
      document.head.appendChild(style);
    },

    // ─────────────────────────────────────────────────────────
    // 실행
    // ─────────────────────────────────────────────────────────
    run() {
      this.injectStyles();
      this.removeBySelectors();
      this.removeByTextPatterns();
      this.removeLegacyButtons();
      this.removePredictionPanels();
      this.neutralizeLabels();
      this.cleanupDuplicates();
      
      console.log('[AUTUS] Cleanup complete ✓');
    },

    // ─────────────────────────────────────────────────────────
    // 지속 감시 (동적 요소 대응)
    // ─────────────────────────────────────────────────────────
    watch() {
      const observer = new MutationObserver((mutations) => {
        let needsCleanup = false;
        
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length > 0) {
            needsCleanup = true;
          }
        });
        
        if (needsCleanup) {
          // 디바운스
          clearTimeout(this.watchTimeout);
          this.watchTimeout = setTimeout(() => {
            this.neutralizeLabels();
            this.removeLegacyButtons();
            this.cleanupDuplicates();
          }, 100);
        }
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    }
  };

  // ─────────────────────────────────────────────────────────
  // 초기화
  // ─────────────────────────────────────────────────────────
  function init() {
    CLEANUP.run();
    CLEANUP.watch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 전역 접근
  window.AUTUS_CLEANUP = CLEANUP;

})();
