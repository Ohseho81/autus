// ═══════════════════════════════════════════════════════════════════════════
// Node Stats - 노드 통계
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import type { Flow } from '../../types';
import { formatAmount } from '../../hooks/useFlow';

interface Props {
  totalMass: number;
  totalFlow: number;
  inflows: Flow[];
  outflows: Flow[];
}

export function NodeStats({ totalMass, totalFlow, inflows, outflows }: Props) {
  const totalInflow = inflows.reduce((sum, f) => sum + f.amount, 0);
  const totalOutflow = outflows.reduce((sum, f) => sum + f.amount, 0);
  const netFlow = totalInflow - totalOutflow;

  return (
    <div className="p-4 grid grid-cols-2 gap-3">
      <div className="bg-gray-800/50 p-3 rounded">
        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
          <DollarSign size={14} />
          <span>Total Mass</span>
        </div>
        <p className="text-lg font-bold">{formatAmount(totalMass)}</p>
      </div>

      <div className="bg-gray-800/50 p-3 rounded">
        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
          <Activity size={14} />
          <span>Total Flow</span>
        </div>
        <p className="text-lg font-bold">{formatAmount(totalFlow)}</p>
      </div>

      <div className="bg-gray-800/50 p-3 rounded">
        <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
          <TrendingUp size={14} />
          <span>Inflow</span>
        </div>
        <p className="text-lg font-bold text-green-400">{formatAmount(totalInflow)}</p>
        <p className="text-[10px] text-gray-500">{inflows.length} flows</p>
      </div>

      <div className="bg-gray-800/50 p-3 rounded">
        <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
          <TrendingDown size={14} />
          <span>Outflow</span>
        </div>
        <p className="text-lg font-bold text-red-400">{formatAmount(totalOutflow)}</p>
        <p className="text-[10px] text-gray-500">{outflows.length} flows</p>
      </div>

      {/* Net Flow */}
      <div className="col-span-2 bg-gray-800/50 p-3 rounded">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Net Flow</span>
          <span
            className={`text-xl font-bold ${
              netFlow >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {netFlow >= 0 ? '+' : ''}
            {formatAmount(netFlow)}
          </span>
        </div>
        {/* Net Flow 바 */}
        <div className="mt-2 h-2 bg-gray-700 rounded overflow-hidden">
          {totalInflow + totalOutflow > 0 && (
            <div
              className={`h-full ${netFlow >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{
                width: `${Math.abs(netFlow) / Math.max(totalInflow, totalOutflow) * 100}%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

