// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Scale Demo Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ScaleDemo } from './components/Scale/ScaleDemo';
import './index.css';

// React 18 렌더링
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScaleDemo />
  </React.StrictMode>
);

// 콘솔 배너
console.log(`
%c🏛️ AUTUS v4.0 - Scale v2.0
%c"스케일은 '공간'이 아니라 '책임 반경'이다"

K1~K10 의사결정 고도 시스템
- 승인 주체 기반
- 실패 비용 시간축
- Ritual Gate
`, 
  'font-size: 16px; font-weight: bold; color: #FFD700;',
  'font-size: 12px; color: #94a3b8;'
);
