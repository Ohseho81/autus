/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌟 PremiumGauge - Dribbble + Awwwards 스타일 온도 게이지
 * 네온 글로우 + 글래스모피즘 + 인터랙티브 애니메이션
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface PremiumGaugeProps {
  value: number;
  maxValue?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PremiumGauge: React.FC<PremiumGaugeProps> = ({
  value,
  maxValue = 100,
  label = '전체 온도',
  size = 'lg',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const progress = useMotionValue(0);
  const percentage = (value / maxValue) * 100;
  
  // 온도에 따른 색상
  const getGradient = (temp: number) => {
    if (temp >= 70) return ['#10b981', '#14b8a6', '#06b6d4']; // 에메랄드 → 틸 → 시안
    if (temp >= 40) return ['#f59e0b', '#f97316', '#ef4444']; // 앰버 → 오렌지 → 레드
    return ['#ef4444', '#dc2626', '#b91c1c']; // 레드 계열
  };
  
  const colors = getGradient(value);
  const glowColor = colors[0];
  
  // 애니메이션
  useEffect(() => {
    const controls = animate(progress, percentage, {
      duration: 2,
      ease: [0.32, 0.72, 0, 1],
    });
    return controls.stop;
  }, [percentage]);

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = useTransform(
    progress,
    [0, 100],
    [circumference, circumference * 0.25]
  );

  const sizeMap = {
    sm: { width: 180, height: 180, fontSize: '2rem' },
    md: { width: 240, height: 240, fontSize: '3rem' },
    lg: { width: 300, height: 300, fontSize: '4rem' },
  };

  const dimensions = sizeMap[size];

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center"
      style={{ width: dimensions.width, height: dimensions.height }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
    >
      {/* 배경 글로우 */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ backgroundColor: glowColor }}
        animate={{
          opacity: isHovered ? 0.3 : 0.15,
          scale: isHovered ? 1.1 : 1,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* 글래스 배경 */}
      <div 
        className="absolute inset-4 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          boxShadow: `
            inset 0 2px 20px rgba(255, 255, 255, 0.05),
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 60px ${glowColor}22
          `,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      />

      {/* SVG 게이지 */}
      <svg
        className="absolute"
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 280 280"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="50%" stopColor={colors[1]} />
            <stop offset="100%" stopColor={colors[2]} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 배경 트랙 */}
        <circle
          cx="140"
          cy="140"
          r="120"
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="12"
          strokeLinecap="round"
          transform="rotate(-90 140 140)"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
        />

        {/* 진행 바 */}
        <motion.circle
          cx="140"
          cy="140"
          r="120"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          transform="rotate(-90 140 140)"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          style={{ strokeDashoffset }}
          filter="url(#glow)"
        />

        {/* 틱 마크 */}
        {[...Array(8)].map((_, i) => {
          const angle = -135 + i * (270 / 7);
          const radian = (angle * Math.PI) / 180;
          const x1 = 140 + 100 * Math.cos(radian);
          const y1 = 140 + 100 * Math.sin(radian);
          const x2 = 140 + 108 * Math.cos(radian);
          const y2 = 140 + 108 * Math.sin(radian);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* 중앙 텍스트 */}
      <div className="relative z-10 text-center">
        <motion.div
          className="font-bold text-white"
          style={{ 
            fontSize: dimensions.fontSize,
            textShadow: `0 0 30px ${glowColor}66`,
          }}
          animate={{ scale: isHovered ? 1.05 : 1 }}
        >
          {value.toFixed(1)}
          <span className="text-slate-400" style={{ fontSize: '0.5em' }}>°</span>
        </motion.div>
        <motion.div 
          className="text-slate-400 text-sm mt-1"
          animate={{ opacity: isHovered ? 1 : 0.7 }}
        >
          {label}
        </motion.div>
        
        {/* 상태 뱃지 */}
        <motion.div
          className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: `linear-gradient(135deg, ${colors[0]}22, ${colors[1]}22)`,
            border: `1px solid ${colors[0]}44`,
            color: colors[0],
            boxShadow: `0 0 20px ${colors[0]}22`,
          }}
          animate={{ y: isHovered ? -2 : 0 }}
        >
          {value >= 70 ? '양호' : value >= 40 ? '주의 필요' : '위험'}
        </motion.div>
      </div>

      {/* 파티클 효과 */}
      {isHovered && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{ backgroundColor: colors[0] }}
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: 0,
                y: 0,
              }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                x: Math.cos((i / 6) * Math.PI * 2) * 80,
                y: Math.sin((i / 6) * Math.PI * 2) * 80,
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                repeat: Infinity,
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
};

export default PremiumGauge;
