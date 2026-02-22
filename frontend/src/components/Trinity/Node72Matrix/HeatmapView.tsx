import { useState, useMemo } from 'react';
import {
  ALL_72_TYPES,
  getTypeById
} from '../data/node72Types';
import {
  calculateInteraction,
  INTERACTION_COLORS,
  INTERACTION_LABELS,
} from '../data/interactionMatrix';

export interface HeatmapViewProps {
  setSelectedType: (id: string | null) => void;
  setView: (v: 'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype') => void;
  myType: string | null;
}

export function HeatmapView({
  setSelectedType,
  setView,
  myType
}: HeatmapViewProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  // 전체 72x72 매트릭스 계산 (메모이제이션)
  const fullMatrix = useMemo(() => {
    return ALL_72_TYPES.map(rowType =>
      ALL_72_TYPES.map(colType => calculateInteraction(rowType, colType))
    );
  }, []);

  // 호버된 상호작용
  const hoveredInteraction = hoveredCell
    ? fullMatrix[hoveredCell.row][hoveredCell.col]
    : null;

  // 계수를 색상으로 변환
  const getColor = (coefficient: number): string => {
    if (coefficient >= 0.7) return '#fbbf24'; // 금색 - 공명
    if (coefficient >= 0.3) return '#4ade80'; // 초록 - 안정
    if (coefficient >= -0.3) return '#6b7280'; // 회색 - 중립
    if (coefficient >= -0.7) return '#fbbf24'; // 노랑 - 마찰
    return '#ef4444'; // 빨강 - 충돌
  };

  // 셀 크기 (줌에 따라)
  const cellSize = Math.max(4, 8 * zoom);

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 컨트롤 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50">72×72 = 5,184 상호작용</span>

          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">줌:</span>
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="w-6 h-6 rounded bg-white/10 text-xs hover:bg-white/20"
            >
              -
            </button>
            <span className="text-xs w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="w-6 h-6 rounded bg-white/10 text-xs hover:bg-white/20"
            >
              +
            </button>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#fbbf24' }} />
            공명 ≥0.7
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#4ade80' }} />
            안정 0.3~0.7
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#6b7280' }} />
            중립 ±0.3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} />
            마찰 -0.3~-0.7
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
            충돌 ≤-0.7
          </span>
        </div>
      </div>

      {/* 히트맵 + 정보 패널 */}
      <div className="flex-1 flex gap-4 overflow-hidden">

        {/* 히트맵 */}
        <div className="flex-1 overflow-auto border border-white/10 rounded-xl bg-black/40">
          <div className="inline-block p-2">
            {/* 카테고리 구분선 라벨 */}
            <div className="flex">
              <div style={{ width: 40, height: 20 }} /> {/* 코너 */}
              <div className="flex">
                <div style={{ width: cellSize * 24 }} className="text-[8px] text-amber-400 text-center border-b border-amber-500/30">T (투자자)</div>
                <div style={{ width: cellSize * 24 }} className="text-[8px] text-purple-400 text-center border-b border-purple-500/30">B (사업가)</div>
                <div style={{ width: cellSize * 24 }} className="text-[8px] text-cyan-400 text-center border-b border-cyan-500/30">L (근로자)</div>
              </div>
            </div>

            {/* 매트릭스 */}
            <div className="flex">
              {/* 행 라벨 */}
              <div className="flex flex-col" style={{ width: 40 }}>
                <div style={{ height: cellSize * 24 }} className="flex items-center justify-center">
                  <span className="text-[8px] text-amber-400 -rotate-90 whitespace-nowrap">T (투자자)</span>
                </div>
                <div style={{ height: cellSize * 24 }} className="flex items-center justify-center">
                  <span className="text-[8px] text-purple-400 -rotate-90 whitespace-nowrap">B (사업가)</span>
                </div>
                <div style={{ height: cellSize * 24 }} className="flex items-center justify-center">
                  <span className="text-[8px] text-cyan-400 -rotate-90 whitespace-nowrap">L (근로자)</span>
                </div>
              </div>

              {/* 셀 그리드 */}
              <div>
                {ALL_72_TYPES.map((rowType, rowIdx) => {
                  const isMyRow = myType === rowType.id;

                  return (
                    <div key={rowIdx} className="flex">
                      {ALL_72_TYPES.map((colType, colIdx) => {
                        const interaction = fullMatrix[rowIdx][colIdx];
                        const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
                        const isMyCol = myType === colType.id;
                        const isMyCell = isMyRow || isMyCol;

                        // 카테고리 경계선
                        const isRowBoundary = rowIdx === 24 || rowIdx === 48;
                        const isColBoundary = colIdx === 24 || colIdx === 48;

                        return (
                          <div
                            key={colIdx}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: getColor(interaction.coefficient),
                              opacity: isMyCell ? 1 : 0.3 + Math.abs(interaction.coefficient) * 0.7,
                              borderTop: isRowBoundary ? '1px solid rgba(255,255,255,0.3)' : undefined,
                              borderLeft: isColBoundary ? '1px solid rgba(255,255,255,0.3)' : undefined,
                              boxShadow: isMyCell ? '0 0 4px rgba(251,191,36,0.5)' : undefined,
                            }}
                            className={`cursor-pointer transition-all ${isHovered ? 'ring-2 ring-white z-10' : ''} ${isMyCell ? 'z-5' : ''}`}
                            onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                              setSelectedType(rowType.id);
                              setView('detail');
                            }}
                            title={`${rowType.id} × ${colType.id}: ${interaction.coefficient}${isMyCell ? ' (내 타입 관련)' : ''}`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 정보 패널 */}
        <div className="w-80 p-4 rounded-2xl bg-white/[0.02] border border-white/5 overflow-y-auto flex flex-col">
          {hoveredInteraction ? (
            <>
              <div className="text-xs text-white/40 mb-3">상호작용 분석</div>

              {/* 노드 정보 */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-black/30">
                <div className="text-center">
                  <div className="text-lg font-bold">{getTypeById(hoveredInteraction.nodeA)?.id}</div>
                  <div className="text-[10px] text-white/40">{getTypeById(hoveredInteraction.nodeA)?.name}</div>
                </div>
                <div className="text-white/30 text-xl">×</div>
                <div className="text-center">
                  <div className="text-lg font-bold">{getTypeById(hoveredInteraction.nodeB)?.id}</div>
                  <div className="text-[10px] text-white/40">{getTypeById(hoveredInteraction.nodeB)?.name}</div>
                </div>
              </div>

              {/* 계수 표시 */}
              <div
                className={`text-center p-4 rounded-xl mb-4 ${INTERACTION_COLORS[hoveredInteraction.type].bg} ${INTERACTION_COLORS[hoveredInteraction.type].border} border`}
              >
                <div className={`text-3xl font-bold ${INTERACTION_COLORS[hoveredInteraction.type].text}`}>
                  {hoveredInteraction.coefficient > 0 ? '+' : ''}{hoveredInteraction.coefficient}
                </div>
                <div className={`text-sm ${INTERACTION_COLORS[hoveredInteraction.type].text}`}>
                  {INTERACTION_LABELS[hoveredInteraction.type]}
                </div>
              </div>

              {/* 결과 & 액션 */}
              <div className="space-y-3 flex-1">
                <div className="p-3 rounded-xl bg-black/20">
                  <div className="text-[10px] text-white/40 mb-1">📊 결과값 (Outcome)</div>
                  <div className="text-sm">{hoveredInteraction.outcome}</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="text-[10px] text-cyan-400 mb-1">⚡ 연결 통제 액션</div>
                  <div className="text-sm text-cyan-300">{hoveredInteraction.action}</div>
                </div>
              </div>

              {/* 상세 보기 버튼 */}
              <button
                onClick={() => {
                  setSelectedType(hoveredInteraction.nodeA);
                  setView('detail');
                }}
                className="mt-4 w-full py-2 rounded-xl bg-white/10 text-sm hover:bg-white/20 transition-colors"
              >
                상세 분석 보기 →
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30">
              <div className="text-4xl mb-4">🔥</div>
              <div className="text-sm text-center">
                셀 위에 마우스를 올리면<br />
                상호작용 분석이 표시됩니다
              </div>
              <div className="mt-4 text-xs text-white/20">
                클릭하면 상세 분석으로 이동
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="mt-4 flex gap-4">
        {(() => {
          const stats = { resonance: 0, stable: 0, neutral: 0, friction: 0, conflict: 0 };
          fullMatrix.forEach(row => row.forEach(cell => stats[cell.type]++));
          const total = 72 * 72;

          return Object.entries(stats).map(([type, count]) => (
            <div
              key={type}
              className={`flex-1 p-3 rounded-xl ${INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS].bg}`}
            >
              <div className={`text-lg font-bold ${INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS].text}`}>
                {count}
              </div>
              <div className="text-xs text-white/50">
                {INTERACTION_LABELS[type as keyof typeof INTERACTION_LABELS]} ({((count / total) * 100).toFixed(1)}%)
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
