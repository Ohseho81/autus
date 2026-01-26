/**
 * FailSafeOverlay.jsx
 * 긴급 상황 오버레이
 * 
 * 위기 시 전체 오버레이 + 긴급 버튼
 * 빨강 맥동 효과
 */

import { motion, AnimatePresence } from 'framer-motion';

export default function FailSafeOverlay({
  active,
  risk,
  onAction,
  onDismiss,
}) {
  return (
    <AnimatePresence>
      {active && risk && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop with red pulse */}
          <motion.div
            animate={{
              backgroundColor: ['rgba(127,29,29,0.85)', 'rgba(153,27,27,0.9)', 'rgba(127,29,29,0.85)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 backdrop-blur-md"
          />

          {/* Vignette effect */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)',
            }}
          />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative z-10 max-w-lg w-full mx-4 bg-gray-900/95 rounded-3xl p-8 border-2 border-red-500 shadow-2xl"
            style={{
              boxShadow: '0 0 60px rgba(239, 68, 68, 0.3)',
            }}
          >
            {/* Icon */}
            <div className="text-center mb-6">
              <motion.span
                animate={{ 
                  y: [0, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-7xl inline-block"
              >
                🚨
              </motion.span>
            </div>

            {/* Title */}
            <motion.h2 
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-3xl font-black text-center text-red-400 mb-2"
            >
              FailSafe 발동
            </motion.h2>
            <p className="text-center text-gray-400 mb-6">
              긴급 상황이 감지되었습니다. 즉시 조치가 필요합니다.
            </p>

            {/* Risk Info */}
            <div className="bg-red-900/30 rounded-xl p-5 mb-6 border border-red-500/30">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xl text-red-300 font-bold">{risk.student_name}</span>
                <span className="px-4 py-1.5 bg-red-600 rounded-full text-white text-sm font-bold animate-pulse">
                  CRITICAL
                </span>
              </div>
              
              {risk.signals && risk.signals.length > 0 && (
                <div className="space-y-2 mb-4">
                  {risk.signals.map((signal, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-red-200/80 text-sm">
                      <span>⚠️</span>
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-red-500/30">
                <p className="text-red-300/60 text-sm">
                  예상 가치 손실: <span className="text-red-300 font-bold">₩{risk.estimated_value?.toLocaleString() || '450,000'}</span>/월
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <motion.button
                onClick={() => onAction?.('call')}
                className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold text-lg transition-all flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl">📞</span>
                즉시 연락
              </motion.button>
              
              <motion.button
                onClick={() => onAction?.('schedule')}
                className="w-full py-3.5 bg-orange-600/50 hover:bg-orange-600 rounded-xl text-orange-300 font-medium transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-xl">📅</span>
                상담 예약
              </motion.button>
              
              <motion.button
                onClick={onDismiss}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 font-medium transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                나중에 처리 <span className="text-red-400 text-sm">(위험 증가)</span>
              </motion.button>
            </div>

            {/* Timer Warning */}
            <div className="mt-6 text-center">
              <motion.p 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-gray-500 text-sm"
              >
                ⏱️ 24시간 이내 조치 권장 · 미조치 시 State 악화 예상
              </motion.p>
            </div>
          </motion.div>

          {/* Corner decorations */}
          <div className="absolute top-6 left-6 text-red-500/50 font-mono text-xs">
            FAILSAFE MODE
          </div>
          <div className="absolute top-6 right-6 text-red-500/50 font-mono text-xs">
            STATE: CRITICAL
          </div>
          <div className="absolute bottom-6 left-6 text-red-500/30">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ● REC
            </motion.div>
          </div>
          <div className="absolute bottom-6 right-6 text-red-500/30 font-mono text-xs">
            {new Date().toLocaleTimeString()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * FailSafe 트리거 훅
 */
export function useFailSafe() {
  const [active, setActive] = useState(false);
  const [risk, setRisk] = useState(null);

  const trigger = (riskData) => {
    setRisk(riskData);
    setActive(true);
  };

  const dismiss = () => {
    setActive(false);
    setTimeout(() => setRisk(null), 300);
  };

  return { active, risk, trigger, dismiss };
}

import { useState } from 'react';
