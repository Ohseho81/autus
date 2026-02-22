import React from 'react';
import { motion } from 'framer-motion';
import type { ProgressData } from './types';
import { Icons } from './Icons';
import { cardVariants } from './animations';
import { ProgressBar, Badge } from './common';

export const ProgressSection: React.FC<{ data: ProgressData }> = ({ data }) => {
  const checkpoints = [1, 2, 3, 4, 5];

  return (
    <motion.div
      className="bg-gray-900/30 backdrop-blur-xl border border-gray-800 rounded-2xl p-6"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-400">
          <Icons.Radar />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">NAVIGATION & CERTAINTY</h2>
          <p className="text-sm text-gray-500">불확실성 제거</p>
        </div>
        <Badge color="purple">Step 3</Badge>
      </div>

      {/* 핵심 메시지 */}
      <div className="mb-6 p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
        <p className="text-violet-300 text-center italic">
          "끝을 아는 고통은 견딜 수 있다"
        </p>
      </div>

      {/* 진행률 원형 */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-48 h-48" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1f2937" strokeWidth="6" />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${data.progress * 2.64} 264`}
              transform="rotate(-90 50 50)"
              initial={{ strokeDasharray: '0 264' }}
              animate={{ strokeDasharray: `${data.progress * 2.64} 264` }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />

            {checkpoints.map((cp, i) => {
              const angle = ((i + 1) / 5) * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const x = 50 + 42 * Math.cos(rad);
              const y = 50 + 42 * Math.sin(rad);
              const isPassed = data.currentCheckpoint > cp;
              const isCurrent = data.currentCheckpoint === cp;

              return (
                <motion.circle
                  key={cp}
                  cx={x}
                  cy={y}
                  r={isCurrent ? 4 : 3}
                  fill={isPassed ? '#a78bfa' : isCurrent ? '#8b5cf6' : '#374151'}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                />
              );
            })}

            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {data.progress}%
            </motion.span>
            <span className="text-xs text-gray-400">진행률</span>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-violet-400 text-sm font-medium">
                {data.currentCheckpoint}/{data.totalCheckpoints}
              </span>
              <span className="text-gray-500 text-xs">체크포인트</span>
            </div>
          </div>
        </div>
      </div>

      {/* 남은 고통 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Icons.Clock />
            <span>남은 고통</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.remainingDays}<span className="text-sm text-gray-400">일</span></p>
          <p className="text-sm text-gray-500">{data.remainingHours.toLocaleString()}시간 집중</p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Icons.Target />
            <span>종료 예상</span>
          </div>
          <p className="text-xl font-bold text-white">{data.painEndDate}</p>
          <p className="text-sm text-gray-500">
            {data.onTrack ? (
              <span className="text-green-400">✓ 정상 진행</span>
            ) : (
              <span className="text-yellow-400">⚠ {data.deviation > 0 ? '+' : ''}{data.deviation}일 이탈</span>
            )}
          </p>
        </div>
      </div>

      {/* 불확실성 지표 */}
      <div className="space-y-4">
        <ProgressBar value={data.uncertainty} color="yellow" label="불확실성 지수 (낮을수록 좋음)" />
        <ProgressBar value={data.confidence} color="purple" label="확신 수준" />
      </div>
    </motion.div>
  );
};
