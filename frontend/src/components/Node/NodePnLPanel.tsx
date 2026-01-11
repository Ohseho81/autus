import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface PnLEntry {
  date: string;
  income: number;
  expense: number;
  category?: string;
}

interface NodePnLPanelProps {
  nodeId: string;
  nodeName: string;
  entries: PnLEntry[];
  currency?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

/**
 * 노드 손익 패널 컴포넌트
 * 특정 노드의 수익/비용 현황 표시
 */
export const NodePnLPanel: React.FC<NodePnLPanelProps> = ({
  nodeId,
  nodeName,
  entries,
  currency = '₩',
  period = 'monthly',
}) => {
  const summary = useMemo(() => {
    const totalIncome = entries.reduce((sum, e) => sum + e.income, 0);
    const totalExpense = entries.reduce((sum, e) => sum + e.expense, 0);
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return { totalIncome, totalExpense, netProfit, profitMargin };
  }, [entries]);

  const formatAmount = (amount: number) => {
    return `${currency}${Math.abs(amount).toLocaleString()}`;
  };

  const periodLabels = {
    daily: '일간',
    weekly: '주간',
    monthly: '월간',
  };

  // 최근 6개 항목만 표시
  const recentEntries = entries.slice(-6);

  // 간단한 차트용 최대값
  const maxValue = Math.max(...entries.map((e) => Math.max(e.income, e.expense)), 1);

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">{nodeName}</h3>
            <span className="text-xs text-gray-500">ID: {nodeId}</span>
          </div>
          <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
            {periodLabels[period]}
          </span>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
          <div className="text-green-400 text-xs mb-1">📈 수입</div>
          <div className="text-green-400 text-xl font-bold">
            {formatAmount(summary.totalIncome)}
          </div>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
          <div className="text-red-400 text-xs mb-1">📉 지출</div>
          <div className="text-red-400 text-xl font-bold">
            {formatAmount(summary.totalExpense)}
          </div>
        </div>
      </div>

      {/* 순이익 */}
      <div className="px-4 pb-4">
        <div
          className={`rounded-lg p-3 ${
            summary.netProfit >= 0
              ? 'bg-blue-500/10 border border-blue-500/20'
              : 'bg-orange-500/10 border border-orange-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-xs mb-1">💰 순이익</div>
              <div
                className={`text-2xl font-bold ${
                  summary.netProfit >= 0 ? 'text-blue-400' : 'text-orange-400'
                }`}
              >
                {summary.netProfit >= 0 ? '+' : '-'}
                {formatAmount(summary.netProfit)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-xs mb-1">이익률</div>
              <div
                className={`text-lg font-bold ${
                  summary.profitMargin >= 20
                    ? 'text-green-400'
                    : summary.profitMargin >= 0
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {summary.profitMargin.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 간단한 바 차트 */}
      <div className="px-4 pb-4">
        <div className="text-xs text-gray-500 mb-2">최근 추이</div>
        <div className="flex items-end gap-1 h-20">
          {recentEntries.map((entry, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              {/* 수입 바 */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(entry.income / maxValue) * 60}px` }}
                className="w-full bg-green-500/60 rounded-t"
              />
              {/* 지출 바 */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(entry.expense / maxValue) * 60}px` }}
                className="w-full bg-red-500/60 rounded-b"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {recentEntries.map((entry, index) => (
            <span key={index} className="text-[10px] text-gray-600 flex-1 text-center">
              {entry.date.slice(-5)}
            </span>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="px-4 pb-4 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500/60 rounded" />
          <span className="text-gray-500">수입</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500/60 rounded" />
          <span className="text-gray-500">지출</span>
        </div>
      </div>
    </div>
  );
};

export default NodePnLPanel;
