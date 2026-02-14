import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DesireCategory } from '../../../api/trinity';
import { Icons } from './Icons';
import { modalVariants } from './animations';

const DESIRE_PRESETS: Array<{ label: string; value: string; icon: string; category: DesireCategory }> = [
  { label: '부자가 되고 싶다', value: '부자가 되고 싶다', icon: '💰', category: 'WEALTH' },
  { label: '건강하게 살고 싶다', value: '건강하게 살고 싶다', icon: '💪', category: 'HEALTH' },
  { label: '자유롭게 살고 싶다', value: '자유롭게 살고 싶다', icon: '🦅', category: 'FREEDOM' },
  { label: '영향력을 갖고 싶다', value: '영향력을 갖고 싶다', icon: '⭐', category: 'INFLUENCE' },
  { label: '전문가가 되고 싶다', value: '전문가가 되고 싶다', icon: '🎯', category: 'MASTERY' },
  { label: '평화롭게 살고 싶다', value: '평화롭게 살고 싶다', icon: '🕊️', category: 'PEACE' },
];

export const InputModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (desire: string) => void;
  isLoading?: boolean;
}> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [desire, setDesire] = useState('');

  const handleSubmit = () => {
    if (desire.trim()) {
      onSubmit(desire.trim());
    }
  };

  const handlePresetClick = (value: string) => {
    setDesire(value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-400">
                  <Icons.Sparkles />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">목표 설정</h2>
                  <p className="text-sm text-gray-400">당신의 욕망을 입력하세요</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            {/* Presets */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">빠른 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {DESIRE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      desire === preset.value
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <span className="mr-2">{preset.icon}</span>
                    <span className="text-sm">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">또는 직접 입력</p>
              <textarea
                value={desire}
                onChange={(e) => setDesire(e.target.value)}
                placeholder="예: 5년 안에 순자산 10억 달성"
                className="w-full h-24 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!desire.trim() || isLoading}
              className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                desire.trim() && !isLoading
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <Icons.Zap />
                  <span>목표 결정질화</span>
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
