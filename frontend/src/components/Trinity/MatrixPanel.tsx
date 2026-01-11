/**
 * AUTUS Trinity - MatrixPanel Component
 * Drilldown view for individual metrics
 */

import React, { memo } from 'react';
import { useTrinityStore, selectCurrentNode, selectCurrentMacro } from '../../stores/trinityStore';
import { MatrixPanelProps } from './types';

const MatrixPanel = memo(function MatrixPanel({ onBack, onAddTask }: MatrixPanelProps) {
  const node = useTrinityStore(selectCurrentNode);
  const macro = useTrinityStore(selectCurrentMacro);

  if (!node || !macro) return null;

  return (
    <div
      className="w-[540px] max-w-[calc(100vw-3rem)] bg-[rgba(12,12,18,0.98)] border border-[rgba(6,182,212,0.25)] rounded-2xl p-5 backdrop-blur-xl shadow-2xl max-h-[85vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={`${macro.name} 상세`}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border-none rounded-md text-white/60 text-[11px] cursor-pointer mb-3.5 hover:bg-[rgba(139,92,246,0.2)] hover:text-[#a78bfa] transition-colors focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/50"
      >
        ← 돌아가기
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-lg font-semibold">
          {node.icon} {macro.name}
        </span>
        <span
          className={`text-[9px] px-2 py-0.5 rounded font-semibold ${
            macro.ok
              ? 'bg-[rgba(74,222,128,0.2)] text-[#4ade80]'
              : 'bg-[rgba(248,113,113,0.2)] text-[#f87171]'
          }`}
        >
          {macro.ok ? 'OK' : '개선필요'}
        </span>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {/* Left column - Current value */}
        <div>
          <div className="p-4 bg-[rgba(139,92,246,0.08)] rounded-xl mb-3">
            <div className="text-[9px] text-white/40 mb-1.5">현재 값</div>
            <div
              className="text-[26px] font-bold"
              style={{ color: macro.ok ? '#4ade80' : '#f87171' }}
            >
              {macro.detail?.current || macro.val}
            </div>
            {macro.detail && (
              <div
                className={`text-[10px] mt-1.5 ${
                  macro.detail.change.startsWith('+') ? 'text-[#4ade80]' : 'text-[#f87171]'
                }`}
              >
                {macro.detail.change}
              </div>
            )}
          </div>

          {/* Target info */}
          {macro.detail && (
            <div className="mt-3.5">
              <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                <span className="text-[10px] text-white/40">목표</span>
                <span className="text-[10px] font-medium">{macro.detail.target}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                <span className="text-[10px] text-white/40">노드</span>
                <span className="text-[10px] font-medium">{node.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                <span className="text-[10px] text-white/40">상태</span>
                <span className={`text-[10px] font-medium ${macro.ok ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                  {macro.ok ? '정상' : '주의'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Related & Recommendation */}
        <div>
          {/* Related metrics */}
          {macro.detail?.related && (
            <div className="mb-4">
              <div className="text-[9px] text-white/40 mb-2">연관 지표</div>
              {macro.detail.related.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-md mb-1.5 cursor-pointer text-[10px] hover:bg-[rgba(139,92,246,0.1)] transition-colors"
                >
                  🔗 {r}
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className="p-3 bg-gradient-to-br from-[rgba(74,222,128,0.1)] to-[rgba(6,182,212,0.05)] border border-[rgba(74,222,128,0.2)] rounded-[10px]">
            <div className="text-[9px] text-white/40 mb-1">💡 권장</div>
            <div className="text-xs font-semibold text-[#4ade80]">
              {macro.ok ? '상태 유지' : `${macro.name} 개선`}
            </div>
            {!macro.ok && (
              <button
                onClick={() => onAddTask(`${macro.name} 개선`, node.icon)}
                className="mt-2.5 px-3.5 py-2 border-none rounded-md bg-gradient-to-br from-[#4ade80] to-[#22c55e] text-black text-[10px] font-semibold cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#4ade80]/50"
              >
                + 과제
              </button>
            )}
          </div>

          {/* Historical trend placeholder */}
          <div className="mt-3 p-3 bg-white/[0.02] rounded-[10px] border border-white/[0.05]">
            <div className="text-[9px] text-white/40 mb-2">📈 추이 (최근 7일)</div>
            <div className="h-[60px] flex items-end gap-1">
              {[65, 72, 68, 75, 70, 78, 82].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-[#a78bfa] to-[#8b5cf6] rounded-t opacity-60 hover:opacity-100 transition-opacity"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MatrixPanel;
