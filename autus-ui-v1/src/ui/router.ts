/**
 * AUTUS Router
 * LOCKED: 9 pages, entry always P1
 * P4/P7/P8/P9 not reachable via manual navigation
 */

export type PageId = 
  | 'P1' // Decision Inbox
  | 'P2' // Friction Delta
  | 'P3' // Kill Board
  | 'P4' // Approval Filter (system-only)
  | 'P5' // Eligibility Engine
  | 'P6' // Fact Ledger
  | 'P7' // Long-Term Check (forced)
  | 'P8' // Decision Cost Budget (forced)
  | 'P9'; // Input Channel Rule (system-only)

export interface PageConfig {
  id: PageId;
  name: string;
  manualAccess: boolean;
  systemOnly: boolean;
  forced: boolean;
}

export const PAGES: Record<PageId, PageConfig> = {
  P1: { id: 'P1', name: 'Decision Inbox', manualAccess: true, systemOnly: false, forced: false },
  P2: { id: 'P2', name: 'Friction Delta', manualAccess: true, systemOnly: false, forced: false },
  P3: { id: 'P3', name: 'Kill Board', manualAccess: true, systemOnly: false, forced: false },
  P4: { id: 'P4', name: 'Approval Filter', manualAccess: false, systemOnly: true, forced: false },
  P5: { id: 'P5', name: 'Eligibility Engine', manualAccess: true, systemOnly: false, forced: false },
  P6: { id: 'P6', name: 'Fact Ledger', manualAccess: true, systemOnly: false, forced: false },
  P7: { id: 'P7', name: 'Long-Term Check', manualAccess: false, systemOnly: false, forced: true },
  P8: { id: 'P8', name: 'Decision Cost Budget', manualAccess: false, systemOnly: false, forced: true },
  P9: { id: 'P9', name: 'Input Channel Rule', manualAccess: false, systemOnly: true, forced: false },
};

export const ENTRY_PAGE: PageId = 'P1';

export const MANUALLY_ACCESSIBLE_PAGES: PageId[] = ['P1', 'P2', 'P3', 'P5', 'P6'];

export function canNavigateManually(pageId: PageId): boolean {
  return PAGES[pageId].manualAccess;
}

export function isSystemOnly(pageId: PageId): boolean {
  return PAGES[pageId].systemOnly;
}

export function isForced(pageId: PageId): boolean {
  return PAGES[pageId].forced;
}

export function getPageName(pageId: PageId): string {
  return PAGES[pageId].name;
}
