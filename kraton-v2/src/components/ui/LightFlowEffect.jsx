/**
 * LightFlowEffect.jsx
 * 빛 퍼짐 효과 - 성공/기여/실행 시 시각적 피드백 (GPU 최적화)
 * 
 * CSS 애니메이션으로 GPU 가속 + 중앙→외곽 확산
 */

import { useEffect, useState, memo, useCallback } from 'react';

const COLORS = {
  cyan: 'rgba(34, 211, 238, 0.4)',
  purple: 'rgba(139, 92, 246, 0.4)',
  emerald: 'rgba(34, 197, 94, 0.4)',
  yellow: 'rgba(234, 179, 8, 0.4)',
  pink: 'rgba(236, 72, 153, 0.4)',
};

const SIZE_CLASSES = {
  small: 'w-32 h-32',
  medium: 'w-64 h-64',
  large: 'w-96 h-96',
  full: 'w-full h-full min-w-[400px] min-h-[400px]',
};

const LightFlowEffect = memo(function LightFlowEffect({ 
  trigger = 0, 
  color = 'cyan',
  duration = 1500,
  size = 'full',
}) {
  const [show, setShow] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger > 0) {
      setShow(true);
      setKey(prev => prev + 1); // 새로운 애니메이션 트리거
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  const colorValue = COLORS[color] || COLORS.cyan;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.full;
  const durationSec = duration / 1000;

  if (!show) return null;

  return (
    <div 
      key={key}
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden"
      style={{ '--light-color': colorValue, '--duration': `${durationSec}s` }}
    >
      {/* Main radial pulse - CSS 애니메이션 */}
      <div
        className={`absolute rounded-full ${sizeClass} light-pulse-main`}
        style={{
          background: `radial-gradient(circle, ${colorValue} 0%, transparent 70%)`,
        }}
      />

      {/* Secondary pulse - CSS 애니메이션 */}
      <div
        className={`absolute rounded-full ${sizeClass} light-pulse-secondary`}
        style={{
          background: `radial-gradient(circle, ${colorValue} 0%, transparent 60%)`,
        }}
      />

      {/* Ring effect - CSS 애니메이션 */}
      <div
        className="absolute w-32 h-32 rounded-full border-2 light-ring"
        style={{ borderColor: colorValue }}
      />

      <style>{`
        .light-pulse-main {
          animation: lightPulseMain var(--duration) ease-out forwards;
          will-change: transform, opacity;
        }
        .light-pulse-secondary {
          animation: lightPulseSecondary var(--duration) ease-out 0.1s forwards;
          will-change: transform, opacity;
        }
        .light-ring {
          animation: lightRing calc(var(--duration) * 0.8) ease-out forwards;
          will-change: transform, opacity;
        }
        
        @keyframes lightPulseMain {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes lightPulseSecondary {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes lightRing {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
});

export default LightFlowEffect;

/**
 * useLightFlow - 빛 퍼짐 효과 훅 (최적화)
 */
export function useLightFlow() {
  const [trigger, setTrigger] = useState(0);

  const flash = useCallback(() => {
    setTrigger(prev => prev + 1);
  }, []);

  return { trigger, flash };
}
