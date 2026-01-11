import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PathStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
  estimatedTime?: string;
}

interface PathOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  steps: PathStep[];
  currentStepIndex: number;
  onStepClick?: (stepId: string) => void;
  onComplete?: () => void;
}

/**
 * PathFinder 오버레이 컴포넌트
 * 목표 달성 경로를 단계별로 안내
 */
export const PathOverlay: React.FC<PathOverlayProps> = ({
  isOpen,
  onClose,
  title,
  description,
  steps,
  currentStepIndex,
  onStepClick,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const completed = steps.filter((s) => s.status === 'completed').length;
    setProgress((completed / steps.length) * 100);
  }, [steps]);

  const getStatusIcon = (status: PathStep['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'current':
        return '🔵';
      case 'skipped':
        return '⏭️';
      default:
        return '⚪';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 백드롭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* 오버레이 패널 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl z-50 max-h-[80vh] overflow-hidden"
          >
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{title}</h2>
                  {description && (
                    <p className="text-gray-400 text-sm mt-1">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* 진행률 */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">진행률</span>
                  <span className="text-blue-400">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* 스텝 리스트 */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="relative">
                {/* 연결선 */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-800" />

                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onStepClick?.(step.id)}
                    className={`relative flex gap-4 p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                      index === currentStepIndex
                        ? 'bg-blue-500/10 border border-blue-500/30'
                        : 'hover:bg-gray-800/50'
                    }`}
                  >
                    {/* 스텝 아이콘 */}
                    <div className="relative z-10 w-10 h-10 flex items-center justify-center bg-gray-900 rounded-full border-2 border-gray-700">
                      <span className="text-lg">{getStatusIcon(step.status)}</span>
                    </div>

                    {/* 스텝 내용 */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-medium ${
                            step.status === 'completed'
                              ? 'text-gray-400 line-through'
                              : index === currentStepIndex
                              ? 'text-white'
                              : 'text-gray-300'
                          }`}
                        >
                          {step.title}
                        </span>
                        {step.estimatedTime && (
                          <span className="text-xs text-gray-500">
                            {step.estimatedTime}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 푸터 */}
            {progress === 100 && onComplete && (
              <div className="p-4 border-t border-gray-800">
                <motion.button
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  onClick={onComplete}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg"
                >
                  🎉 목표 완료!
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PathOverlay;
