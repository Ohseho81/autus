import React from 'react';
import { motion } from 'framer-motion';
import { Icons } from './Icons';
import { cardVariants, fadeInUp, pulseVariants } from './animations';

export const ActionCard: React.FC<{ actions: string[] }> = ({ actions }) => (
  <motion.div
    className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6"
    variants={cardVariants}
    initial="hidden"
    animate="visible"
  >
    <div className="flex items-center gap-3 mb-4">
      <motion.div
        className="p-2 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-400"
        variants={pulseVariants}
        animate="pulse"
      >
        <Icons.Zap />
      </motion.div>
      <div>
        <h3 className="text-lg font-semibold text-white">💡 지금 당신이 해야 할 것</h3>
        <p className="text-sm text-gray-400">단 3가지만 집중하세요</p>
      </div>
    </div>

    <div className="space-y-3">
      {actions.map((action, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50"
          custom={i}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          whileHover={{ x: 4 }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {i + 1}
          </div>
          <p className="text-white flex-1">{action}</p>
          <Icons.ArrowRight />
        </motion.div>
      ))}
    </div>

    <div className="mt-6 pt-4 border-t border-gray-700">
      <p className="text-center text-gray-400 italic text-sm">
        "인간의 의지와 아우투스의 지능이 만났습니다."
      </p>
    </div>
  </motion.div>
);

export const EmptyState: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => (
  <motion.div
    className="flex flex-col items-center justify-center py-20"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="p-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 mb-6">
      <Icons.Target />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">목표를 설정해주세요</h2>
    <p className="text-gray-400 mb-8 text-center max-w-md">
      당신의 욕망을 입력하면 AUTUS Trinity Engine이<br />
      실현 가능한 구체적 목표로 변환합니다.
    </p>
    <button
      onClick={onOpenModal}
      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-medium text-white hover:from-cyan-400 hover:to-blue-400 transition-all flex items-center gap-2"
    >
      <Icons.Plus />
      <span>목표 설정하기</span>
    </button>
  </motion.div>
);
