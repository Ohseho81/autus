// AUTUS v4.0 - Main Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AutusMain } from './pages/AutusMain';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AutusMain />
  </React.StrictMode>
);

console.log(`
%c🏛️ AUTUS v4.0 - Decision Safety Interface
%c
5-Step Architecture:
1. The Soul   - Data Schema (K·Ω·F·A)
2. The World  - Altitude Engine (Zoom → Scale)
3. The Body   - LOD Components (K1-K3/K4-K6/K7-K10)
4. The Mind   - Gravity System (Auto Scale-up)
5. The Skin   - Visual Polish (Shaders)

Scroll to change altitude (K-Scale)
`, 'font-size:16px;font-weight:bold;color:#FFD700;', 'font-size:11px;color:#94a3b8;');
