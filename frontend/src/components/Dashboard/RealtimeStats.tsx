import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface StatItem {
  id: string;
  label: string;
  value: number;
  maxValue?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface RealtimeStatsProps {
  stats: StatItem[];
  refreshInterval?: number;
  onRefresh?: () => void;
}

/**
 * 실시간 통계 컴포넌트
 * 애니메이션 숫자와 프로그레스 바로 실시간 데이터 표시
 */
export const RealtimeStats: React.FC<RealtimeStatsProps> = ({
  stats,
  refreshInterval = 5000,
  onRefresh,
}) => {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!onRefresh) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      onRefresh();
      setLastUpdate(new Date());
      setTimeout(() => setIsRefreshing(false), 500);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, onRefresh]);

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-400">↗</span>;
      case 'down':
        return <span className="text-red-400">↘</span>;
      default:
        return <span className="text-gray-400">→</span>;
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          📊 실시간 통계
          {isRefreshing && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-blue-400"
            >
              ⟳
            </motion.span>
          )}
        </h3>
        <span className="text-xs text-gray-500">
          마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
        </span>
      </div>

      {/* 통계 그리드 */}
      <div className="space-y-4">
        {stats.map((stat, index) => {
          const percentage = stat.maxValue
            ? (stat.value / stat.maxValue) * 100
            : 100;

          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* 라벨 & 값 */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <motion.span
                    key={stat.value}
                    initial={{ scale: 1.2, color: '#60a5fa' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="font-mono font-bold"
                  >
                    {stat.value.toLocaleString()}
                    {stat.unit && (
                      <span className="text-gray-500 text-sm ml-1">
                        {stat.unit}
                      </span>
                    )}
                  </motion.span>
                  {getTrendIcon(stat.trend)}
                </div>
              </div>

              {/* 프로그레스 바 */}
              {stat.maxValue && (
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      percentage >= 90
                        ? 'bg-red-500'
                        : percentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RealtimeStats;
