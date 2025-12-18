// ═══════════════════════════════════════════════════════════════
// AUTUS Core Modules
// 핵심 엔진 및 로직
// ═══════════════════════════════════════════════════════════════

// 순서 중요: 의존성 순서대로 로드
export const CORE_MODULES = [
  'autus-constitution.js',   // AUTUS 10조 (기본 원칙)
  'causality-log.js',        // 인과 로그
  'learning-loop.js',        // 학습 루프
  'strategic-mode.js',       // 전략 모드
  'future-simulator.js'      // 미래 시뮬레이터
];

// 동적 로드 함수
export function loadCoreModules(basePath = '/frontend/js/core/') {
  CORE_MODULES.forEach(module => {
    const script = document.createElement('script');
    script.src = basePath + module;
    script.defer = true;
    document.head.appendChild(script);
  });
}

console.log('[AUTUS] Core modules index loaded');
