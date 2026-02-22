import { useState, useMemo } from 'react';
import {
  INVESTOR_TYPES,
  BUSINESS_TYPES,
  LABOR_TYPES,
  getTypeById
} from '../data/node72Types';
import {
  calculateInteraction,
  INTERACTION_COLORS,
  INTERACTION_LABELS,
} from '../data/interactionMatrix';

export interface MatrixViewProps {
  matrixCategory: { row: 'T' | 'B' | 'L'; col: 'T' | 'B' | 'L' };
  setMatrixCategory: (c: { row: 'T' | 'B' | 'L'; col: 'T' | 'B' | 'L' }) => void;
  setSelectedType: (id: string | null) => void;
  setView: (v: 'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype') => void;
}

export function MatrixView({
  matrixCategory,
  setMatrixCategory,
  setSelectedType,
  setView
}: MatrixViewProps) {
  const getTypes = (cat: 'T' | 'B' | 'L') => {
    switch (cat) {
      case 'T': return INVESTOR_TYPES;
      case 'B': return BUSINESS_TYPES;
      case 'L': return LABOR_TYPES;
    }
  };

  const rowTypes = getTypes(matrixCategory.row);
  const colTypes = getTypes(matrixCategory.col);

  const catNames = { T: '투자자', B: '사업가', L: '근로자' };
  const catColors = { T: 'amber', B: 'purple', L: 'cyan' };

  // 매트릭스 데이터 계산
  const matrixData = useMemo(() => {
    return rowTypes.map(rowType =>
      colTypes.map(colType => calculateInteraction(rowType, colType))
    );
  }, [rowTypes, colTypes]);

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const hoveredInteraction = hoveredCell
    ? matrixData[hoveredCell.row][hoveredCell.col]
    : null;

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 매트릭스 선택 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">행:</span>
          {(['T', 'B', 'L'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setMatrixCategory({ ...matrixCategory, row: cat })}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                matrixCategory.row === cat
                  ? `bg-${catColors[cat]}-500/20 text-${catColors[cat]}-400`
                  : 'bg-white/5 text-white/50'
              }`}
            >
              {catNames[cat]}
            </button>
          ))}
        </div>
        <span className="text-white/20">×</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">열:</span>
          {(['T', 'B', 'L'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setMatrixCategory({ ...matrixCategory, col: cat })}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                matrixCategory.col === cat
                  ? `bg-${catColors[cat]}-500/20 text-${catColors[cat]}-400`
                  : 'bg-white/5 text-white/50'
              }`}
            >
              {catNames[cat]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2 text-[10px]">
          {Object.entries(INTERACTION_LABELS).map(([type, label]) => (
            <span key={type} className={`px-2 py-1 rounded ${INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS].bg} ${INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS].text}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* 매트릭스 */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* 매트릭스 그리드 */}
        <div className="flex-1 overflow-auto">
          <div className="inline-block">
            {/* 헤더 행 */}
            <div className="flex">
              <div className="w-16 h-8" /> {/* 코너 */}
              {colTypes.map((type, i) => (
                <div
                  key={i}
                  className="w-8 h-8 flex items-center justify-center text-[8px] text-white/40 -rotate-45 origin-center"
                  title={type.name}
                >
                  {type.id}
                </div>
              ))}
            </div>

            {/* 데이터 행 */}
            {rowTypes.map((rowType, rowIdx) => (
              <div key={rowIdx} className="flex">
                <div
                  className="w-16 h-8 flex items-center text-[10px] text-white/50 pr-2 truncate"
                  title={rowType.name}
                >
                  {rowType.id}
                </div>
                {colTypes.map((colType, colIdx) => {
                  const interaction = matrixData[rowIdx][colIdx];
                  const colors = INTERACTION_COLORS[interaction.type];

                  return (
                    <div
                      key={colIdx}
                      className={`w-8 h-8 flex items-center justify-center text-[9px] cursor-pointer transition-all hover:scale-125 hover:z-10 ${colors.bg} ${colors.text} border border-transparent hover:${colors.border}`}
                      onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => {
                        setSelectedType(rowType.id);
                        setView('detail');
                      }}
                      title={`${rowType.id} × ${colType.id}: ${interaction.coefficient}`}
                    >
                      {interaction.coefficient > 0 ? '+' : ''}{(interaction.coefficient * 10).toFixed(0)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 호버 정보 */}
        <div className="w-80 p-4 rounded-2xl bg-white/[0.02] border border-white/5 overflow-y-auto">
          {hoveredInteraction ? (
            <>
              <div className="text-xs text-white/40 mb-2">상호작용 분석</div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{getTypeById(hoveredInteraction.nodeA)?.id}</span>
                <span className="text-white/30">×</span>
                <span className="text-lg">{getTypeById(hoveredInteraction.nodeB)?.id}</span>
              </div>

              <div className={`inline-block px-3 py-1 rounded-full text-sm mb-4 ${INTERACTION_COLORS[hoveredInteraction.type].bg} ${INTERACTION_COLORS[hoveredInteraction.type].text}`}>
                {INTERACTION_LABELS[hoveredInteraction.type]} ({hoveredInteraction.coefficient > 0 ? '+' : ''}{hoveredInteraction.coefficient})
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-white/40 mb-1">결과값 (Outcome)</div>
                  <div className="text-sm">{hoveredInteraction.outcome}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-1">연결 통제 액션</div>
                  <div className="text-sm text-cyan-400">{hoveredInteraction.action}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-[10px] text-white/40 mb-2">노드 A: {getTypeById(hoveredInteraction.nodeA)?.name}</div>
                <div className="text-[10px] text-white/30">{getTypeById(hoveredInteraction.nodeA)?.desc}</div>

                <div className="text-[10px] text-white/40 mb-2 mt-3">노드 B: {getTypeById(hoveredInteraction.nodeB)?.name}</div>
                <div className="text-[10px] text-white/30">{getTypeById(hoveredInteraction.nodeB)?.desc}</div>
              </div>
            </>
          ) : (
            <div className="text-white/30 text-sm text-center py-8">
              셀 위에 마우스를 올리면<br />상호작용 분석이 표시됩니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
