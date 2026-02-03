/**
 * AUTUS Keybindings
 * LOCKED: Global shortcuts only
 * 
 * Global:
 * A = APPROVE (P1 only)
 * K = KILL (global)
 * D = DEFER (P1 only)
 * ESC = Go to P1
 * 
 * Direct pages:
 * 1 = P1
 * 2 = P2
 * 3 = P3
 * 5 = P5
 * 6 = P6
 * 
 * Blocked: P4, P7, P8, P9
 */

import type { PageId } from './router';

export type KeyAction = 
  | { type: 'APPROVE' }
  | { type: 'KILL' }
  | { type: 'DEFER' }
  | { type: 'GOTO'; pageId: PageId }
  | { type: 'NONE' };

export interface KeyBinding {
  key: string;
  code: string;
  action: KeyAction;
  description: string;
  globalEnabled: boolean;
  pageRestriction?: PageId;
}

export const KEY_BINDINGS: KeyBinding[] = [
  // Actions
  { 
    key: 'a', 
    code: 'KeyA', 
    action: { type: 'APPROVE' }, 
    description: 'Approve decision',
    globalEnabled: false,
    pageRestriction: 'P1',
  },
  { 
    key: 'k', 
    code: 'KeyK', 
    action: { type: 'KILL' }, 
    description: 'Kill rule/decision',
    globalEnabled: true,
  },
  { 
    key: 'd', 
    code: 'KeyD', 
    action: { type: 'DEFER' }, 
    description: 'Defer decision',
    globalEnabled: false,
    pageRestriction: 'P1',
  },
  { 
    key: 'Escape', 
    code: 'Escape', 
    action: { type: 'GOTO', pageId: 'P1' }, 
    description: 'Go to Decision Inbox',
    globalEnabled: true,
  },
  
  // Page Navigation
  { 
    key: '1', 
    code: 'Digit1', 
    action: { type: 'GOTO', pageId: 'P1' }, 
    description: 'Go to P1 Decision Inbox',
    globalEnabled: true,
  },
  { 
    key: '2', 
    code: 'Digit2', 
    action: { type: 'GOTO', pageId: 'P2' }, 
    description: 'Go to P2 Friction Delta',
    globalEnabled: true,
  },
  { 
    key: '3', 
    code: 'Digit3', 
    action: { type: 'GOTO', pageId: 'P3' }, 
    description: 'Go to P3 Kill Board',
    globalEnabled: true,
  },
  { 
    key: '5', 
    code: 'Digit5', 
    action: { type: 'GOTO', pageId: 'P5' }, 
    description: 'Go to P5 Eligibility Engine',
    globalEnabled: true,
  },
  { 
    key: '6', 
    code: 'Digit6', 
    action: { type: 'GOTO', pageId: 'P6' }, 
    description: 'Go to P6 Fact Ledger',
    globalEnabled: true,
  },
];

export function getKeyAction(event: KeyboardEvent, currentPage: PageId): KeyAction {
  // Ignore if typing in input
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return { type: 'NONE' };
  }

  const binding = KEY_BINDINGS.find(
    (b) => b.key.toLowerCase() === event.key.toLowerCase() || b.code === event.code
  );

  if (!binding) {
    return { type: 'NONE' };
  }

  // Check page restriction
  if (binding.pageRestriction && binding.pageRestriction !== currentPage) {
    return { type: 'NONE' };
  }

  // Check if global or on correct page
  if (!binding.globalEnabled && binding.pageRestriction !== currentPage) {
    return { type: 'NONE' };
  }

  return binding.action;
}

export function getShortcutHint(action: 'APPROVE' | 'KILL' | 'DEFER'): string {
  const binding = KEY_BINDINGS.find(
    (b) => b.action.type === action
  );
  return binding?.key.toUpperCase() || '';
}

export function getAllShortcuts(): Array<{ key: string; description: string }> {
  return KEY_BINDINGS.map((b) => ({
    key: b.key,
    description: b.description,
  }));
}
