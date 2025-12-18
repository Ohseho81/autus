// ═══════════════════════════════════════════════════════════════
// AUTUS Debug Modules
// 개발 및 디버깅 전용 (프로덕션에서 비활성화 가능)
// ═══════════════════════════════════════════════════════════════

export const DEBUG_MODULES = [
  'learning-debug.js',  // 학습 디버그
  'cleanup-final.js'    // 클린업 유틸리티
];

// 동적 로드 함수 (개발 모드에서만)
export function loadDebugModules(basePath = '/frontend/js/debug/') {
  if (window.AUTUS_DEBUG !== true) {
    console.log('[AUTUS] Debug modules skipped (production mode)');
    return;
  }
  
  DEBUG_MODULES.forEach(module => {
    const script = document.createElement('script');
    script.src = basePath + module;
    script.defer = true;
    document.head.appendChild(script);
  });
}

// 개발 모드 활성화
window.AUTUS_DEBUG = true;

console.log('[AUTUS] Debug modules index loaded');
