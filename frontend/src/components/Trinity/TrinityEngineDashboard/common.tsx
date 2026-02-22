import React from 'react';
import { motion } from 'framer-motion';
import type { ColorKey } from './types';
import { cardVariants, progressVariants } from './animations';

export const ProgressBar: React.FC<{
  value: number;
  color?: ColorKey;
  label?: string;
  showValue?: boolean;
}> = ({ value, color = 'blue', label, showValue = true }) => {
  const colorClasses: Record<ColorKey, string> = {
    blue: 'bg-gradient-to-r from-blue-600 to-cyan-500',
    green: 'bg-gradient-to-r from-green-600 to-emerald-500',
    yellow: 'bg-gradient-to-r from-yellow-600 to-amber-500',
    red: 'bg-gradient-to-r from-red-600 to-rose-500',
    purple: 'bg-gradient-to-r from-purple-600 to-violet-500',
    cyan: 'bg-gradient-to-r from-cyan-600 to-blue-500',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-gray-400">{label}</span>
          {showValue && <span className="text-gray-300 font-medium">{value}%</span>}
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClasses[color]}`}
          initial="hidden"
          animate="visible"
          custom={value}
          variants={progressVariants}
        />
      </div>
    </div>
  );
};

export const StatCard: React.FC<{
  icon: React.FC;
  label: string;
  value: number | string;
  unit?: string;
  color: ColorKey;
  trend?: number;
}> = ({ icon: Icon, label, value, unit, color, trend }) => {
  const colorClasses: Record<ColorKey, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <motion.div
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon />
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-xs">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{value}</span>
            {unit && <span className="text-gray-500 text-sm">{unit}</span>}
          </div>
        </div>
        {trend !== undefined && (
          <div className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' }> = ({
  children,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses[color]}`}>
      {children}
    </span>
  );
};
