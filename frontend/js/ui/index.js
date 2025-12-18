// ═══════════════════════════════════════════════════════════════
// AUTUS UI Modules
// 사용자 인터페이스 컴포넌트
// ═══════════════════════════════════════════════════════════════

export const UI_MODULES = [
  'choice-card.js',           // Choice 카드 기본
  'choice-card-ui.js',        // Choice 카드 UI 렌더러
  'choice-card-enhanced.js',  // Choice 카드 확장 기능
  'choice-bottleneck-proof.js', // 병목 증명 UI
  'constitution-ui.js',       // 헌법 UI (Ctrl+Shift+C)
  'simulator-ui.js'           // 시뮬레이터 UI
];

// 동적 로드 함수
export function loadUIModules(basePath = '/frontend/js/ui/') {
  UI_MODULES.forEach(module => {
    const script = document.createElement('script');
    script.src = basePath + module;
    script.defer = true;
    document.head.appendChild(script);
  });
}

console.log('[AUTUS] UI modules index loaded');
