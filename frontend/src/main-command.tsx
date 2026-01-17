// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Command Center Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import ReactDOM from 'react-dom/client';
import { CommandCenterV2 } from './components/CommandCenter';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CommandCenterV2 />
  </React.StrictMode>
);

console.log(`
%c🏛️ AUTUS v4.0 - Command Center
%cDecision Safety Interface

K-Scale Gauge | Network Graph | Irreversibility Alert
`, 
  'font-size: 16px; font-weight: bold; color: #FFD700;',
  'font-size: 12px; color: #94a3b8;'
);
