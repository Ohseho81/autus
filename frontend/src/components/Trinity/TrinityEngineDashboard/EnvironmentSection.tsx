import React from 'react';
import { motion } from 'framer-motion';
import type { EnvironmentData } from './types';
import { Icons } from './Icons';
import { cardVariants, fadeInUp } from './animations';
import { ProgressBar, Badge } from './common';

export const EnvironmentSection: React.FC<{ data: EnvironmentData }> = ({ data }) => {
  const ertItems = [
    { key: 'eliminated', label: '삭제 (E)', icon: '🗑️', color: 'red' as const, count: data.eliminated },
    { key: 'automated', label: '자동화 (R)', icon: '🤖', color: 'blue' as const, count: data.automated },
    { key: 'parallelized', label: '병렬화 (T)', icon: '🔀', color: 'purple' as const, count: data.parallelized },
    { key: 'preserved', label: '보존', icon: '👤', color: 'green' as const, count: data.preserved },
  ];

  const totalERT = data.eliminated + data.automated + data.parallelized;
  const totalAll = totalERT + data.preserved;
  const optimizationRate = Math.round((totalERT / totalAll) * 100);

  return (
    <motion.div
      className="bg-gray-900/30 backdrop-blur-xl border border-gray-800 rounded-2xl p-6"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 text-emerald-400">
          <Icons.Environment />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">OPTIMIZED ENVIRONMENT</h2>
          <p className="text-sm text-gray-500">최적 환경</p>
        </div>
        <Badge color="green">Step 2</Badge>
      </div>

      {/* ERT 분류 원형 */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-40 h-40" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="url(#ertGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${optimizationRate * 2.51} 251`}
              transform="rotate(-90 50 50)"
              initial={{ strokeDasharray: '0 251' }}
              animate={{ strokeDasharray: `${optimizationRate * 2.51} 251` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="ertGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {optimizationRate}%
            </motion.span>
            <span className="text-xs text-gray-400">유령화</span>
          </div>
        </div>
      </div>

      {/* ERT 분류 리스트 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {ertItems.map((item, i) => (
          <motion.div
            key={item.key}
            className={`p-3 rounded-xl border ${
              item.color === 'red' ? 'bg-red-500/10 border-red-500/20' :
              item.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20' :
              item.color === 'purple' ? 'bg-purple-500/10 border-purple-500/20' :
              'bg-green-500/10 border-green-500/20'
            }`}
            custom={i}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-white font-bold">{item.count}건</p>
                <p className="text-xs text-gray-400">{item.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 효율 지표 */}
      <div className="space-y-4">
        <ProgressBar value={data.energyEfficiency} color="green" label="에너지 효율" />
        <ProgressBar value={data.cognitiveLeakage} color="yellow" label="인지 산란" />
        <ProgressBar value={data.friction} color="cyan" label="마찰 계수" />
      </div>

      {/* 환경 점수 */}
      <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">환경 점수</span>
          <div className="flex items-center gap-2">
            <motion.span
              className="text-3xl font-bold text-emerald-400"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
            >
              {data.environmentScore}
            </motion.span>
            <span className="text-gray-400">/100</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
