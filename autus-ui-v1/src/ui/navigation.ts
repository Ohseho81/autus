/**
 * AUTUS Navigation
 * LOCKED: Auto transitions enforced
 * 
 * Flow:
 * - APPROVE: P1 → P7 (must choose) → P8 (budget check) → DONE → P1
 * - DEFER: P1 → set TTL(24h) → TTL expiry → AUTO KILL → P1
 * - KILL: anywhere → P3 (confirm) → DONE → P1
 * - RISK: on escalation.raised OR Δ threshold → P2 → back to P1
 */

import type { PageId } from './router';
import { ENTRY_PAGE, canNavigateManually } from './router';

export type NavigationAction = 
  | { type: 'GOTO'; pageId: PageId; force?: boolean }
  | { type: 'APPROVE_START' }
  | { type: 'APPROVE_LONG_TERM_DONE' }
  | { type: 'APPROVE_BUDGET_DONE' }
  | { type: 'DEFER' }
  | { type: 'KILL' }
  | { type: 'RISK_SPIKE' }
  | { type: 'RISK_CLEARED' }
  | { type: 'TTL_EXPIRED'; decisionId: string };

export interface NavigationState {
  currentPage: PageId;
  previousPage: PageId | null;
  approveFlow: {
    active: boolean;
    longTermDone: boolean;
    budgetDone: boolean;
    decisionId: string | null;
  };
  riskJump: {
    active: boolean;
    returnTo: PageId | null;
  };
}

export function createInitialNavigationState(): NavigationState {
  return {
    currentPage: ENTRY_PAGE,
    previousPage: null,
    approveFlow: {
      active: false,
      longTermDone: false,
      budgetDone: false,
      decisionId: null,
    },
    riskJump: {
      active: false,
      returnTo: null,
    },
  };
}

export function navigationReducer(
  state: NavigationState, 
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case 'GOTO': {
      // Block manual navigation to non-accessible pages
      if (!action.force && !canNavigateManually(action.pageId)) {
        console.warn(`Cannot manually navigate to ${action.pageId}`);
        return state;
      }
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: action.pageId,
      };
    }

    case 'APPROVE_START': {
      // P1 → P7 (Long-Term Check)
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: 'P7',
        approveFlow: {
          active: true,
          longTermDone: false,
          budgetDone: false,
          decisionId: null,
        },
      };
    }

    case 'APPROVE_LONG_TERM_DONE': {
      // P7 → P8 (Budget Check)
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: 'P8',
        approveFlow: {
          ...state.approveFlow,
          longTermDone: true,
        },
      };
    }

    case 'APPROVE_BUDGET_DONE': {
      // P8 → P1 (Done)
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: 'P1',
        approveFlow: {
          active: false,
          longTermDone: false,
          budgetDone: false,
          decisionId: null,
        },
      };
    }

    case 'DEFER': {
      // Stay on P1, TTL is set in store
      return state;
    }

    case 'KILL': {
      // → P3 (Kill Board)
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: 'P3',
      };
    }

    case 'RISK_SPIKE': {
      // Auto-jump to P2
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: 'P2',
        riskJump: {
          active: true,
          returnTo: state.currentPage,
        },
      };
    }

    case 'RISK_CLEARED': {
      // Return to previous page
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: state.riskJump.returnTo || 'P1',
        riskJump: {
          active: false,
          returnTo: null,
        },
      };
    }

    case 'TTL_EXPIRED': {
      // Auto KILL → P3
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: 'P3',
      };
    }

    default:
      return state;
  }
}
