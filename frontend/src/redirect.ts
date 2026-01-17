// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS - URL 리다이렉트 핸들러
// 기존 URL 호환성 유지
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 기존 URL → 새 URL 매핑
 */
const REDIRECT_MAP: Record<string, string> = {
  '/galaxy.html': '/app.html?view=prediction&layer=1',
  '/scale.html': '/app.html?view=tasks&layer=6',
  '/command.html': '/app.html?view=automation&layer=4',
  '/autus.html': '/app.html',
  '/user-dashboard.html': '/app.html?view=tasks',
  '/admin-dashboard.html': '/app.html?view=automation',
  '/mypage.html': '/app.html?view=tasks',
  '/onboarding.html': '/app.html',
  '/test-dashboard.html': '/app.html',
  '/test-dashboard-realistic.html': '/app.html',
  '/gravity-system.html': '/app.html?view=prediction',
  '/autus_12laws.html': '/app.html',
};

/**
 * 현재 페이지가 리다이렉트 대상인지 확인하고 리다이렉트
 */
export function checkAndRedirect(): boolean {
  const currentPath = window.location.pathname;
  const redirectTo = REDIRECT_MAP[currentPath];
  
  if (redirectTo) {
    console.log(`[AUTUS] Redirecting: ${currentPath} → ${redirectTo}`);
    window.location.replace(redirectTo);
    return true;
  }
  
  return false;
}

/**
 * URL 파라미터 파싱
 */
export function parseUrlParams(): {
  view?: 'prediction' | 'automation' | 'tasks';
  layer?: number;
} {
  const params = new URLSearchParams(window.location.search);
  
  return {
    view: params.get('view') as 'prediction' | 'automation' | 'tasks' | undefined,
    layer: params.get('layer') ? parseInt(params.get('layer')!) : undefined,
  };
}

/**
 * URL 업데이트 (히스토리 유지)
 */
export function updateUrl(view: string, layer?: number): void {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  
  if (layer !== undefined) {
    url.searchParams.set('layer', layer.toString());
  }
  
  window.history.pushState({}, '', url.toString());
}

// 자동 리다이렉트 실행
if (typeof window !== 'undefined') {
  checkAndRedirect();
}
