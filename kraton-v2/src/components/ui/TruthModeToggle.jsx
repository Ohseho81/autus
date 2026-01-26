/**
 * TruthModeToggle.jsx
 * Truth Mode 토글 - 감성/숫자 모드 전환
 * 
 * "감각으로 느끼게 하되, 신뢰를 위해 진실을 선택적으로 드러낸다"
 */

import { motion } from 'framer-motion';

export default function TruthModeToggle({ 
  enabled, 
  onToggle, 
  size = 'default',
  showLabel = true 
}) {
  const sizes = {
    small: { width: 48, height: 24, circle: 18, padding: 3 },
    default: { width: 64, height: 32, circle: 24, padding: 4 },
    large: { width: 80, height: 40, circle: 32, padding: 4 },
  };

  const s = sizes[size] || sizes.default;

  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <span className="text-sm text-gray-500">
          {enabled ? '🔢 숫자' : '✨ 감성'}
        </span>
      )}
      
      <button
        onClick={onToggle}
        className="relative focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-full"
        style={{ width: s.width, height: s.height }}
        aria-label="Truth Mode Toggle"
      >
        {/* Background */}
        <motion.div
          className="absolute inset-0 rounded-full transition-colors duration-300"
          animate={{
            backgroundColor: enabled ? 'rgba(139, 92, 246, 0.3)' : 'rgba(55, 65, 81, 1)',
            borderColor: enabled ? 'rgba(139, 92, 246, 0.5)' : 'rgba(75, 85, 99, 1)',
          }}
          style={{ borderWidth: 2 }}
        />

        {/* Glow effect when enabled */}
        {enabled && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              boxShadow: ['0 0 10px rgba(139,92,246,0.3)', '0 0 20px rgba(139,92,246,0.5)', '0 0 10px rgba(139,92,246,0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Circle */}
        <motion.div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: s.circle,
            height: s.circle,
            top: s.padding,
          }}
          animate={{
            left: enabled ? s.width - s.circle - s.padding : s.padding,
            backgroundColor: enabled ? '#8b5cf6' : '#6b7280',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <motion.span
            className="text-xs"
            animate={{ rotate: enabled ? 360 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {enabled ? '🔢' : '✨'}
          </motion.span>
        </motion.div>

        {/* Icons on background */}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs pointer-events-none">
          <span className={`transition-opacity ${enabled ? 'opacity-30' : 'opacity-0'}`}>✨</span>
          <span className={`transition-opacity ${enabled ? 'opacity-0' : 'opacity-30'}`}>🔢</span>
        </div>
      </button>
    </div>
  );
}

/**
 * TruthModeContext - 전역 상태 관리용
 */
import { createContext, useContext, useState } from 'react';

const TruthModeContext = createContext({ truthMode: false, setTruthMode: () => {} });

export function TruthModeProvider({ children }) {
  const [truthMode, setTruthMode] = useState(false);
  
  return (
    <TruthModeContext.Provider value={{ truthMode, setTruthMode }}>
      {children}
    </TruthModeContext.Provider>
  );
}

export function useTruthMode() {
  return useContext(TruthModeContext);
}
