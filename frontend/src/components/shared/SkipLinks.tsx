/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Skip Links
 * 접근성을 위한 건너뛰기 링크
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { DEFAULT_SKIP_LINKS } from '../../lib/accessibility';

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      {DEFAULT_SKIP_LINKS.map((link) => (
        <a
          key={link.id}
          href={link.target}
          className="
            fixed top-4 left-4 z-[100]
            px-4 py-3 rounded-lg
            bg-slate-900 text-white
            font-medium text-sm
            focus:outline-none focus:ring-2 focus:ring-white
            transform -translate-y-16 focus:translate-y-0
            transition-transform duration-200
          "
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export default SkipLinks;
