// ═══════════════════════════════════════════════════════════════════════════
// Map Controls - 줌/레이어 컨트롤
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Play, Pause, Route, Layers } from 'lucide-react';
import type { ScaleLevel } from '../../types';

interface Props {
  scale: ScaleLevel;
  scaleLabel: string;
  zoom: number;
  isAnimating: boolean;
  onToggleAnimation: () => void;
  onTogglePathFinder: () => void;
}

export function MapControls({
  scale,
  scaleLabel,
  zoom,
  isAnimating,
  onToggleAnimation,
  onTogglePathFinder,
}: Props) {
  return (
    <div className="absolute top-20 right-4 z-10 space-y-2">
      {/* 줌/스케일 정보 */}
      <div className="panel p-3 text-center">
        <div className="text-2xl font-bold text-cyan-400">{Math.floor(zoom)}</div>
        <div className="text-[10px] text-gray-500 tracking-wider">ZOOM</div>
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-sm font-medium">{scale}</div>
          <div className="text-[10px] text-gray-500">{scaleLabel}</div>
        </div>
      </div>

      {/* 컨트롤 버튼들 */}
      <div className="panel p-2 flex flex-col gap-1">
        {/* 애니메이션 토글 */}
        <button
          onClick={onToggleAnimation}
          className={`p-2 rounded transition-colors ${
            isAnimating 
              ? 'bg-cyan-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
          title={isAnimating ? '애니메이션 정지' : '애니메이션 시작'}
        >
          {isAnimating ? <Pause size={18} /> : <Play size={18} />}
        </button>

        {/* Path Finder 토글 */}
        <button
          onClick={onTogglePathFinder}
          className="p-2 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
          title="경로 탐색"
        >
          <Route size={18} />
        </button>

        {/* 레이어 토글 (추후 구현) */}
        <button
          className="p-2 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
          title="레이어 설정"
        >
          <Layers size={18} />
        </button>
      </div>
    </div>
  );
}

