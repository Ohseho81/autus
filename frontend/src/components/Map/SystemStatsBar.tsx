import React from 'react';
import { motion } from 'framer-motion';

interface SystemStat {
  id: string;
  label: string;
  value: number | string;
  icon: string;
  status?: 'good' | 'warning' | 'critical';
}

interface SystemStatsBarProps {
  stats: SystemStat[];
  className?: string;
}

const statusColors = {
  good: 'text-green-400',
  warning: 'text-yellow-400',
  critical: 'text-red-400',
};

/**
 * 시스템 통계 바 컴포넌트
 * 맵 하단에 핵심 시스템 지표 표시
 */
export const SystemStatsBar: React.FC<SystemStatsBarProps> = ({
  stats,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`bg-gray-900/90 backdrop-blur-md border-t border-gray-700/50 ${className}`}
    >
      <div className="flex items-center justify-around py-3 px-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2"
          >
            <span className="text-lg">{stat.icon}</span>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs">{stat.label}</span>
              <span
                className={`font-mono font-bold ${
                  stat.status ? statusColors[stat.status] : 'text-white'
                }`}
              >
                {typeof stat.value === 'number'
                  ? stat.value.toLocaleString()
                  : stat.value}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SystemStatsBar;
