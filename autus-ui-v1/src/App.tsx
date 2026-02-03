/**
 * AUTUS App - Main Component
 * Entry always P1, one page visible at a time
 */

import React, { useEffect, useState } from 'react';
import { useAutusStore, selectCurrentPage } from './ui/store';
import { getKeyAction } from './ui/keybindings';
import { injectTokens, tokens } from './ui/tokens';
import { getPageName } from './ui/router';
import type { PageId } from './ui/router';
import { initializeDemoData } from './demo-data';

// Pages
import {
  P1DecisionInbox,
  P2FrictionDelta,
  P3KillBoard,
  P4ApprovalFilter,
  P5EligibilityEngine,
  P6FactLedger,
  P7LongTermCheck,
  P8DecisionCostBudget,
  P9InputChannelRule,
} from './ui/pages';

const PAGE_COMPONENTS: Record<PageId, React.ComponentType> = {
  P1: P1DecisionInbox,
  P2: P2FrictionDelta,
  P3: P3KillBoard,
  P4: P4ApprovalFilter,
  P5: P5EligibilityEngine,
  P6: P6FactLedger,
  P7: P7LongTermCheck,
  P8: P8DecisionCostBudget,
  P9: P9InputChannelRule,
};

const globalStyles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: tokens.colors.neutral.bg,
    color: tokens.colors.neutral.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  pageIndicator: {
    position: 'fixed' as const,
    top: tokens.spacing.lg,
    left: tokens.spacing.lg,
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.75rem',
    zIndex: 1000,
  },
  shortcutHint: {
    position: 'fixed' as const,
    bottom: tokens.spacing.lg,
    right: tokens.spacing.lg,
    ...tokens.typography.mono,
    color: tokens.colors.neutral.textMuted,
    fontSize: '0.625rem',
    zIndex: 1000,
    textAlign: 'right' as const,
    lineHeight: '1.5',
    opacity: 0.5,
  },
};

export function App() {
  const currentPage = useAutusStore(selectCurrentPage);
  const navigate = useAutusStore((s) => s.navigate);
  const approve = useAutusStore((s) => s.approve);
  const deny = useAutusStore((s) => s.deny);
  const defer = useAutusStore((s) => s.defer);
  const checkExpiredDecisions = useAutusStore((s) => s.checkExpiredDecisions);
  const [initialized, setInitialized] = useState(false);

  // Inject CSS tokens and demo data
  useEffect(() => {
    injectTokens();
    if (!initialized) {
      initializeDemoData(useAutusStore);
      setInitialized(true);
    }
  }, [initialized]);

  // Global keybindings
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = getKeyAction(event, currentPage);
      
      switch (action.type) {
        case 'APPROVE':
          approve();
          break;
        case 'KILL':
          deny();
          break;
        case 'DEFER':
          defer();
          break;
        case 'GOTO':
          navigate({ type: 'GOTO', pageId: action.pageId });
          break;
        case 'NONE':
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, navigate, approve, deny, defer]);

  // TTL check interval
  useEffect(() => {
    const interval = setInterval(() => {
      checkExpiredDecisions();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkExpiredDecisions]);

  const PageComponent = PAGE_COMPONENTS[currentPage];

  return (
    <div style={globalStyles.app}>
      <div style={globalStyles.pageIndicator}>
        {currentPage} · {getPageName(currentPage)}
      </div>
      
      <PageComponent />
      
      <div style={globalStyles.shortcutHint}>
        A=Approve K=Kill D=Defer ESC=Home<br />
        1-3,5-6=Pages
      </div>
    </div>
  );
}
