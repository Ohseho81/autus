// ═══════════════════════════════════════════════════════════════════════════
// Node Tooltip - 노드 호버 툴팁
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { ScaleNode } from '../../types';
import { formatAmount } from '../../hooks/useFlow';

interface Props {
  node: ScaleNode;
  x: number;
  y: number;
}

export function NodeTooltip({ node, x, y }: Props) {
  const getRankColor = (rank?: string) => {
    const colors: Record<string, string> = {
      'Sovereign': 'bg-yellow-500',
      'Archon': 'bg-gray-400',
      'Validator': 'bg-amber-600',
      'Operator': 'bg-blue-500',
      'Terminal': 'bg-gray-600',
    };
    return colors[rank || 'Terminal'];
  };

  return (
    <div
      className="absolute z-50 pointer-events-none animate-fade-in"
      style={{
        left: x + 15,
        top: y - 10,
        maxWidth: '280px',
      }}
    >
      <div className="panel p-3 shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${getRankColor(node.rank)}`} />
          <span className="font-bold text-white">{node.name}</span>
          <span className="text-xs text-gray-500 ml-auto">{node.level}</span>
        </div>

        {/* KI Score */}
        <div className="flex justify-between items-center py-1 border-t border-gray-700">
          <span className="text-xs text-gray-400">Keyman Index</span>
          <span className="text-cyan-400 font-mono font-bold">
            {node.ki_score?.toFixed(4) || '0.0000'}
          </span>
        </div>

        {/* Keyman Types */}
        {node.keyman_types && node.keyman_types.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {node.keyman_types.map(type => (
              <span
                key={type}
                className="px-1.5 py-0.5 text-[10px] bg-cyan-900/50 text-cyan-300 rounded"
              >
                {type}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-700">
          <div>
            <div className="text-[10px] text-gray-500">Total Mass</div>
            <div className="text-sm font-medium">{formatAmount(node.total_mass)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Total Flow</div>
            <div className="text-sm font-medium">{formatAmount(node.total_flow)}</div>
          </div>
        </div>

        {/* Rank */}
        {node.rank && (
          <div className="mt-2 pt-2 border-t border-gray-700 text-center">
            <span className={`badge ${
              node.rank === 'Sovereign' ? 'badge-gold' :
              node.rank === 'Archon' ? 'badge-silver' :
              node.rank === 'Validator' ? 'badge-bronze' :
              node.rank === 'Operator' ? 'badge-blue' :
              'badge-gray'
            }`}>
              {node.rank}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

