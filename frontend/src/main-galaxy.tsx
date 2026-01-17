// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galaxy Command Center Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GalaxyCommandCenter } from './components/Galaxy';
import './index.css';

// React 18 렌더링
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GalaxyCommandCenter />
  </React.StrictMode>
);

// 콘솔 배너
console.log(`
%c🏛️ AUTUS v4.0 - Galactic Command Center
%c"나는 개발자가 아니다. 너의 궤적을 보여줄 뿐이다."

570개 업무 노드 | 8개 Galaxy Cluster | K·I·Ω·r 메트릭

Commands:
  - ? : 키보드 단축키
  - 드래그 : 카메라 회전
  - 스크롤 : 줌 인/아웃
  - 클릭 : 노드 선택
`, 
  'font-size: 16px; font-weight: bold; color: #FFD700;',
  'font-size: 12px; color: #94a3b8;'
);
