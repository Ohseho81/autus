// ═══════════════════════════════════════════════════════════════
// AUTUS Choice Card Enhanced v1.1
// - OPTIMAL → PRIMARY 라벨 변경
// - 병목 증명 통합
// - Forecast Mini Bar 통합
// ═══════════════════════════════════════════════════════════════

(function() {
  // OPTIMAL → PRIMARY/SECONDARY/TERTIARY 변경
  const labelMap = {
    'OPTIMAL': 'PRIMARY',
    'ALTERNATIVE': 'SECONDARY',
    'FALLBACK': 'TERTIARY'
  };

  function updateLabels() {
    document.querySelectorAll('.card-rank').forEach(el => {
      const text = el.textContent.trim();
      Object.keys(labelMap).forEach(oldLabel => {
        if (text.includes(oldLabel)) {
          el.textContent = text.replace(oldLabel, labelMap[oldLabel]);
          el.classList.remove(oldLabel.toLowerCase());
          el.classList.add(labelMap[oldLabel].toLowerCase());
        }
      });
    });

    // CSS 클래스도 업데이트
    document.querySelectorAll('.choice-card.optimal').forEach(el => {
      el.classList.remove('optimal');
      el.classList.add('primary');
    });

    document.querySelectorAll('.choice-card.alternative').forEach(el => {
      el.classList.remove('alternative');
      el.classList.add('secondary');
    });

    document.querySelectorAll('.choice-card.fallback').forEach(el => {
      el.classList.remove('fallback');
      el.classList.add('tertiary');
    });
  }

  // Primary Bottleneck 배지 추가
  function addBottleneckBadge() {
    const container = document.getElementById('choice-container');
    if (!container) return;

    // 기존 배지 제거
    const existing = container.querySelector('.primary-bottleneck-badge');
    if (existing) existing.remove();

    // 병목 데이터 가져오기
    if (!window.bottleneckProof?.bottleneckData?.primary) return;
    
    const bn = window.bottleneckProof.bottleneckData.primary;
    
    const badge = document.createElement('div');
    badge.className = 'primary-bottleneck-badge';
    badge.innerHTML = `
      <span class="bn-icon">⚠️</span>
      <span class="bn-label">PRIMARY BOTTLENECK:</span>
      <span class="bn-name">${bn.label}</span>
      <span class="bn-value">${(bn.value * 100).toFixed(0)}%</span>
    `;

    // Choice 헤더 아래에 삽입
    const header = container.querySelector('.choice-header');
    if (header) {
      header.after(badge);
    } else {
      // fallback: 첫 번째 자식으로 삽입
      container.insertBefore(badge, container.firstChild);
    }
  }

  // 초기화
  function init() {
    // 라벨 업데이트는 Choice 카드 생성 후
    setTimeout(() => {
      updateLabels();
      addBottleneckBadge();
    }, 1500);

    // 주기적 업데이트
    setInterval(() => {
      updateLabels();
      addBottleneckBadge();
    }, 5000);

    // Choice 업데이트 시 재실행
    document.addEventListener('choicesUpdated', () => {
      updateLabels();
      addBottleneckBadge();
    });

    // MutationObserver로 동적 변화 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          const hasChoiceCard = [...mutation.addedNodes].some(node => 
            node.classList?.contains('choice-card') || 
            node.querySelector?.('.choice-card')
          );
          if (hasChoiceCard) {
            setTimeout(() => {
              updateLabels();
              addBottleneckBadge();
            }, 100);
          }
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[AUTUS] Choice Card Enhanced loaded');
})();
