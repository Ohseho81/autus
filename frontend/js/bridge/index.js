// ═══════════════════════════════════════════════════════════════
// AUTUS Bridge Modules
// 시스템 간 연결 및 통합
// ═══════════════════════════════════════════════════════════════

export const BRIDGE_MODULES = [
  'phantom-orbit.js',          // Phantom 궤도 시스템
  'phantom-choice-bridge.js',  // Phantom-Choice 연결
  'choice-card-integration.js', // Choice 카드 통합
  'legacy-action-control.js'   // 레거시 액션 제어
];

// 동적 로드 함수
export function loadBridgeModules(basePath = '/frontend/js/bridge/') {
  BRIDGE_MODULES.forEach(module => {
    const script = document.createElement('script');
    script.src = basePath + module;
    script.defer = true;
    document.head.appendChild(script);
  });
}

console.log('[AUTUS] Bridge modules index loaded');
