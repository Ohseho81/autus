/**
 * FSDHUD.jsx
 * Tesla FSD 스타일 Head-Up Display
 * 
 * 실시간 시스템 상태를 상단에 고정 표시
 * Truth Mode 토글로 감성/숫자 모드 전환
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VMiniSparkline } from './VSpiralGraph';

// State 설정
const STATE_CONFIG = {
  1: { label: 'OPTIMAL', color: '#22c55e', bg: 'bg-emerald-500', description: '최적 상태' },
  2: { label: 'STABLE', color: '#3b82f6', bg: 'bg-blue-500', description: '안정 상태' },
  3: { label: 'WATCH', color: '#eab308', bg: 'bg-yellow-500', description: '관찰 필요' },
  4: { label: 'ALERT', color: '#f97316', bg: 'bg-orange-500', description: '주의 필요' },
  5: { label: 'RISK', color: '#ef4444', bg: 'bg-red-500', description: '위험 감지' },
  6: { label: 'CRITICAL', color: '#b91c1c', bg: 'bg-red-700', description: '긴급 조치' },
};

export default function FSDHUD({
  systemState = 2,
  confidence = 94.2,
  vIndex = 847,
  automationRate = 78.5,
  nextAction = '모니터링 중...',
  truthMode = false,
  onTruthModeToggle,
  vHistory = [],
  role,
  onLogout,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const stateConfig = STATE_CONFIG[systemState] || STATE_CONFIG[2];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 상태별 감성 표현
  const getStateFeeling = () => {
    if (systemState <= 2) return { emoji: '✨', text: '순항 중' };
    if (systemState === 3) return { emoji: '👀', text: '지켜보는 중' };
    if (systemState === 4) return { emoji: '⚡', text: '대응 필요' };
    return { emoji: '🚨', text: '즉시 조치' };
  };

  const stateFeeling = getStateFeeling();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + Role + State */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <span className="text-lg font-bold text-white tracking-tight">KRATON</span>
          </div>

          <div className="h-6 w-px bg-white/20" />

          {/* Role (if provided) */}
          {role && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl">{role.icon}</span>
                <span className="text-sm text-gray-400">{role.name}</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
            </>
          )}

          {/* State Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">State</span>
            <motion.div
              animate={{
                boxShadow: systemState >= 5 
                  ? ['0 0 0 0 rgba(239,68,68,0)', '0 0 0 8px rgba(239,68,68,0.2)', '0 0 0 0 rgba(239,68,68,0)']
                  : 'none'
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
              style={{
                color: stateConfig.color,
                backgroundColor: `${stateConfig.color}20`,
                borderColor: `${stateConfig.color}50`,
                borderWidth: 1,
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ●
              </motion.span>
              {truthMode ? stateConfig.label : stateFeeling.text}
            </motion.div>
          </div>
        </div>

        {/* Center: Key Metrics */}
        <div className="flex items-center gap-8">
          {/* Confidence */}
          <div className="text-center min-w-[80px]">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Confidence</p>
            {truthMode ? (
              <p className={`font-mono text-lg font-bold ${
                confidence >= 90 ? 'text-emerald-400' :
                confidence >= 70 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {confidence.toFixed(1)}%
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      confidence >= 90 ? 'bg-emerald-500' :
                      confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-xs">
                  {confidence >= 90 ? '🎯' : confidence >= 70 ? '🔄' : '⚠️'}
                </span>
              </div>
            )}
          </div>

          {/* V-Index with Sparkline */}
          <div className="text-center min-w-[120px]">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">V-Index</p>
            <div className="flex items-center justify-center gap-2">
              {vHistory.length > 0 && (
                <VMiniSparkline history={vHistory} currentV={vIndex} size={60} />
              )}
              {truthMode ? (
                <p className="font-mono text-lg font-bold text-purple-400">{vIndex.toFixed(1)}</p>
              ) : (
                <p className="text-sm text-purple-400">
                  {vIndex > 800 ? '🚀 폭발' : vIndex > 500 ? '📈 성장' : '🌱 시작'}
                </p>
              )}
            </div>
          </div>

          {/* Automation Rate */}
          <div className="text-center min-w-[80px]">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Automation</p>
            {truthMode ? (
              <p className="font-mono text-lg font-bold text-cyan-400">{automationRate.toFixed(1)}%</p>
            ) : (
              <p className="text-sm text-cyan-400">
                {automationRate > 80 ? '⚡ 고도' : automationRate > 50 ? '🔄 진행' : '👋 수동'}
              </p>
            )}
          </div>

          {/* Next Action */}
          <div className="max-w-48 hidden lg:block">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Next Action</p>
            <p className="text-sm text-gray-300 truncate">{nextAction}</p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-4">
          {/* Truth Mode Toggle */}
          <button
            onClick={onTruthModeToggle}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300
              ${truthMode
                ? 'bg-purple-600/30 text-purple-400 border border-purple-500/50 shadow-lg shadow-purple-500/20'
                : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-gray-600'}
            `}
          >
            {truthMode ? '🔢 숫자 ON' : '✨ 감성'}
          </button>

          {/* Auto Button */}
          <button className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-600/30 transition-all">
            ▶ AUTO
          </button>

          {/* Time */}
          <div className="text-right">
            <span className="text-xs text-gray-600 block">
              {currentTime.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-sm text-gray-400 font-mono">
              {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Logout */}
          {onLogout && (
            <button 
              onClick={onLogout}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800 transition-all"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* 긴급 알림 바 (State 5 이상일 때) */}
      <AnimatePresence>
        {systemState >= 5 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-900/50 border-t border-red-500/50 px-4 py-2"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-xl"
                >
                  🚨
                </motion.span>
                <span className="text-red-300 font-medium">
                  {systemState === 6 ? 'CRITICAL: 즉시 조치가 필요합니다' : 'RISK: 위험 상황이 감지되었습니다'}
                </span>
              </div>
              <button className="px-4 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-medium transition-all">
                상세 보기 →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ============================================
// 컴팩트 HUD (모바일용)
// ============================================
export function FSDHUDCompact({
  systemState = 2,
  vIndex = 847,
  truthMode = false,
  onTruthModeToggle,
}) {
  const stateConfig = STATE_CONFIG[systemState] || STATE_CONFIG[2];

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-3">
        <span className="text-xl">🏛️</span>
        <div
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            color: stateConfig.color,
            backgroundColor: `${stateConfig.color}20`,
          }}
        >
          S{systemState}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono text-purple-400">
          V:{truthMode ? vIndex.toFixed(0) : (vIndex > 500 ? '📈' : '🌱')}
        </span>
        <button
          onClick={onTruthModeToggle}
          className="text-xs text-gray-500"
        >
          {truthMode ? '🔢' : '✨'}
        </button>
      </div>
    </div>
  );
}
