/**
 * ObservationDashboard - 양자 관찰자 대시보드
 * (HexagonMap으로 대체됨 - 호환성 유지용)
 */

import React from 'react';

export function ObservationDashboard() {
  return (
    <div className="min-h-full h-full bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Quantum Observer</h1>
        <p className="text-slate-400">관찰자 모드가 HexagonMap으로 통합되었습니다.</p>
      </div>
    </div>
  );
}

export default ObservationDashboard;

