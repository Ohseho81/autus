/**
 * AUTUS Navigation Rules (LOCK)
 * 상태 기반 전이만 허용
 * URL은 결과일 뿐, 선택지가 아니다.
 */

export type Page = 'solar' | 'action' | 'audit';

export interface NavigationRule {
  from: Page;
  to: Page;
  condition: (state: any) => boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 네비게이션 규칙 (LOCK)
// ═══════════════════════════════════════════════════════════════════════════════

export const NAVIGATION_RULES: NavigationRule[] = [
  {
    from: 'solar',
    to: 'action',
    condition: (state) => state.risk >= 60 && state.gate !== 'RED',
  },
  {
    from: 'action',
    to: 'audit',
    condition: (state) => state.auditId !== null,
  },
  // audit에서 나가는 규칙 없음 (terminal)
];

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 특정 페이지로 이동 가능한지 확인
 */
export function canNavigate(from: Page, to: Page, state: any): boolean {
  const rule = NAVIGATION_RULES.find(r => r.from === from && r.to === to);
  return rule ? rule.condition(state) : false;
}

/**
 * 현재 페이지에서 다음 페이지 결정
 */
export function getNextPage(current: Page, state: any): Page | null {
  const rule = NAVIGATION_RULES.find(r => r.from === current && r.condition(state));
  return rule ? rule.to : null;
}

/**
 * 유효한 페이지인지 확인
 */
export function isValidPage(path: string): boolean {
  const validPages = ['/solar', '/action', '/audit', '/'];
  return validPages.includes(path);
}

/**
 * 기본 페이지
 */
export const DEFAULT_PAGE = '/solar';

/**
 * Terminal 페이지 (나갈 수 없음)
 */
export const TERMINAL_PAGE = '/audit';
