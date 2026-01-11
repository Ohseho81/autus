// ═══════════════════════════════════════════════════════════════════════════
// Node Connections - 노드 연결 목록
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { Flow } from '../../types';
import { formatAmount } from '../../hooks/useFlow';

interface Props {
  inflows: Flow[];
  outflows: Flow[];
}

export function NodeConnections({ inflows, outflows }: Props) {
  const [showInflows, setShowInflows] = useState(false);
  const [showOutflows, setShowOutflows] = useState(false);

  const sortedInflows = [...inflows].sort((a, b) => b.amount - a.amount);
  const sortedOutflows = [...outflows].sort((a, b) => b.amount - a.amount);

  return (
    <div className="border-t border-gray-700">
      {/* Inflows */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => setShowInflows(!showInflows)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ArrowDownLeft size={16} className="text-green-400" />
            <span className="text-sm">Inflows</span>
            <span className="text-xs text-gray-500">({inflows.length})</span>
          </div>
          {showInflows ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </button>

        {showInflows && (
          <div className="px-3 pb-3 max-h-40 overflow-y-auto">
            {sortedInflows.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">유입 흐름 없음</p>
            ) : (
              <div className="space-y-1">
                {sortedInflows.map((flow) => (
                  <div
                    key={flow.id}
                    className="flex items-center justify-between p-2 bg-gray-800/30 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-gray-300">{flow.source_id}</span>
                    </div>
                    <span className="text-green-400 font-mono text-xs">
                      +{formatAmount(flow.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outflows */}
      <div>
        <button
          onClick={() => setShowOutflows(!showOutflows)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ArrowUpRight size={16} className="text-red-400" />
            <span className="text-sm">Outflows</span>
            <span className="text-xs text-gray-500">({outflows.length})</span>
          </div>
          {showOutflows ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </button>

        {showOutflows && (
          <div className="px-3 pb-3 max-h-40 overflow-y-auto">
            {sortedOutflows.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">유출 흐름 없음</p>
            ) : (
              <div className="space-y-1">
                {sortedOutflows.map((flow) => (
                  <div
                    key={flow.id}
                    className="flex items-center justify-between p-2 bg-gray-800/30 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="text-gray-300">{flow.target_id}</span>
                    </div>
                    <span className="text-red-400 font-mono text-xs">
                      -{formatAmount(flow.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

