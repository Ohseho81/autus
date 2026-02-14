import React from 'react';
import { motion } from 'framer-motion';
import type { CrystallizationData, PainBreakdown, ColorKey } from './types';
import { Icons } from './Icons';
import { cardVariants, fadeInUp } from './animations';
import { ProgressBar, Badge } from './common';

export const CrystallizationSection: React.FC<{ data: CrystallizationData }> = ({ data }) => {
  const painTypes: { key: keyof PainBreakdown; label: string; icon: React.FC; color: ColorKey }[] = [
    { key: 'financial', label: '재무적 절제', icon: Icons.DollarSign, color: 'blue' },
    { key: 'cognitive', label: '인지적 집중', icon: Icons.Brain, color: 'purple' },
    { key: 'temporal', label: '시간적 희생', icon: Icons.Clock, color: 'yellow' },
    { key: 'emotional', label: '감정적 인내', icon: Icons.Heart, color: 'red' },
  ];

  return (
    <motion.div
      className="bg-gray-900/30 backdrop-blur-xl border border-gray-800 rounded-2xl p-6"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400">
          <Icons.Crystal />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">CRYSTALLIZATION</h2>
          <p className="text-sm text-gray-500">목표 결정질화</p>
        </div>
        <Badge color="blue">Step 1</Badge>
      </div>

      {/* 원본 욕망 */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <p className="text-gray-400 text-sm mb-1">원본 욕망</p>
        <p className="text-xl font-bold text-white">{data.rawDesire}</p>
        <div className="flex items-center gap-2 mt-2">
          <Icons.ArrowRight />
          <span className="text-cyan-400 text-sm">노드 목표로 변환됨</span>
        </div>
      </div>

      {/* 노드 목표 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {data.targetNodes.map((node, i) => (
          <motion.div
            key={node.id}
            className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
            custom={i}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-xs">{node.id}</span>
              <span className={`text-xs ${node.current > node.target ? 'text-red-400' : 'text-green-400'}`}>
                {node.current}% → {node.target}%
              </span>
            </div>
            <p className="text-sm text-white font-medium">{node.name}</p>
            <div className="h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${100 - node.target}%` }}
                transition={{ duration: 1, delay: i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 활성화 에너지 */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icons.Zap />
          <span className="text-cyan-400 font-medium">활성화 에너지 (Ea)</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-xs">필요 기간</p>
            <p className="text-2xl font-bold text-white">{data.requiredMonths}<span className="text-sm text-gray-400">개월</span></p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">필요 집중</p>
            <p className="text-2xl font-bold text-white">{data.requiredHours.toLocaleString()}<span className="text-sm text-gray-400">시간</span></p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">실현 가능성</p>
            <p className="text-2xl font-bold text-green-400">{data.feasibility}%</p>
          </div>
        </div>
      </div>

      {/* 고통 분포 */}
      <div>
        <p className="text-gray-400 text-sm mb-3">고통 지수 분포 (총 {data.totalPain}%)</p>
        <div className="space-y-3">
          {painTypes.map((pain, i) => (
            <motion.div
              key={pain.key}
              className="flex items-center gap-3"
              custom={i}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
            >
              <div className={`p-1.5 rounded ${
                pain.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                pain.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                pain.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                <pain.icon />
              </div>
              <div className="flex-1">
                <ProgressBar value={data.painBreakdown[pain.key]} color={pain.color} label={pain.label} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
