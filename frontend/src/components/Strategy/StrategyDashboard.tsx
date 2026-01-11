import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'aggressive' | 'balanced' | 'conservative';
  status: 'active' | 'paused' | 'draft';
  performance: number; // -100 to 100
  risk: 'low' | 'medium' | 'high';
  createdAt: Date;
  metrics: {
    roi: number;
    winRate: number;
    avgGain: number;
    maxDrawdown: number;
  };
}

interface StrategyDashboardProps {
  strategies: Strategy[];
  onActivate?: (id: string) => void;
  onPause?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const typeConfig = {
  aggressive: { icon: '🔥', color: 'text-red-400', bg: 'bg-red-500/10' },
  balanced: { icon: '⚖️', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  conservative: { icon: '🛡️', color: 'text-green-400', bg: 'bg-green-500/10' },
};

const riskConfig = {
  low: { label: '낮음', color: 'text-green-400' },
  medium: { label: '중간', color: 'text-yellow-400' },
  high: { label: '높음', color: 'text-red-400' },
};

/**
 * 전략 대시보드 컴포넌트
 * 비즈니스/투자 전략 관리 및 성과 추적
 */
export const StrategyDashboard: React.FC<StrategyDashboardProps> = ({
  strategies,
  onActivate,
  onPause,
  onEdit,
  onDelete,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredStrategies = strategies.filter(
    (s) => filter === 'all' || s.status === filter
  );

  const selectedStrategy = strategies.find((s) => s.id === selectedId);

  const getPerformanceColor = (perf: number) => {
    if (perf >= 20) return 'text-green-400';
    if (perf >= 0) return 'text-blue-400';
    if (perf >= -20) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            📊 전략 대시보드
          </h3>
          <div className="flex gap-2">
            {['all', 'active', 'paused', 'draft'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {status === 'all'
                  ? '전체'
                  : status === 'active'
                  ? '활성'
                  : status === 'paused'
                  ? '일시정지'
                  : '초안'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* 전략 리스트 */}
        <div className="flex-1 max-h-[400px] overflow-y-auto border-r border-gray-700/50">
          {filteredStrategies.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-3xl mb-2">📭</div>
              전략이 없습니다
            </div>
          ) : (
            filteredStrategies.map((strategy) => {
              const typeConf = typeConfig[strategy.type];
              const isSelected = selectedId === strategy.id;

              return (
                <motion.div
                  key={strategy.id}
                  onClick={() => setSelectedId(strategy.id)}
                  className={`p-4 border-b border-gray-800/50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-500/10' : 'hover:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-2xl p-2 rounded-lg ${typeConf.bg}`}>
                      {typeConf.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {strategy.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            strategy.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : strategy.status === 'paused'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {strategy.status === 'active'
                            ? '활성'
                            : strategy.status === 'paused'
                            ? '일시정지'
                            : '초안'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {strategy.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className={getPerformanceColor(strategy.performance)}>
                          {strategy.performance > 0 ? '+' : ''}
                          {strategy.performance}%
                        </span>
                        <span className={riskConfig[strategy.risk].color}>
                          위험: {riskConfig[strategy.risk].label}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* 상세 패널 */}
        <AnimatePresence mode="wait">
          {selectedStrategy && (
            <motion.div
              key={selectedStrategy.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-80 p-4 bg-gray-800/30"
            >
              <h4 className="font-bold text-white mb-4">{selectedStrategy.name}</h4>
              <p className="text-sm text-gray-400 mb-4">
                {selectedStrategy.description}
              </p>

              {/* 메트릭스 */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">ROI</span>
                  <span
                    className={
                      selectedStrategy.metrics.roi >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }
                  >
                    {selectedStrategy.metrics.roi > 0 ? '+' : ''}
                    {selectedStrategy.metrics.roi.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">승률</span>
                  <span className="text-blue-400">
                    {selectedStrategy.metrics.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">평균 수익</span>
                  <span className="text-green-400">
                    {selectedStrategy.metrics.avgGain.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">최대 손실</span>
                  <span className="text-red-400">
                    {selectedStrategy.metrics.maxDrawdown.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="space-y-2">
                {selectedStrategy.status !== 'active' && onActivate && (
                  <button
                    onClick={() => onActivate(selectedStrategy.id)}
                    className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    ▶ 활성화
                  </button>
                )}
                {selectedStrategy.status === 'active' && onPause && (
                  <button
                    onClick={() => onPause(selectedStrategy.id)}
                    className="w-full py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
                  >
                    ⏸ 일시정지
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(selectedStrategy.id)}
                    className="w-full py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    ✏️ 편집
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(selectedStrategy.id)}
                    className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    🗑️ 삭제
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StrategyDashboard;
