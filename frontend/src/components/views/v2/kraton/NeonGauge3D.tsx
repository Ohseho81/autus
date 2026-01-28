/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌟 NeonGauge3D - 3D 네온 게이지 (Cycle 1)
 * Dribbble + Awwwards 스타일 메인 게이지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useMemo } from 'react';
import { COLORS, getTemperatureColor } from '../design-system';

interface NeonGauge3DProps {
  value?: number;
  maxValue?: number;
  label?: string;
  status?: string;
}

export const NeonGauge3D: React.FC<NeonGauge3DProps> = ({
  value = 68.5,
  maxValue = 100,
  label = '전체 온도',
  status,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const color = getTemperatureColor(value);
  
  // Animated value
  useEffect(() => {
    setIsAnimating(true);
    const duration = 1500;
    const start = displayValue;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(start + (value - start) * eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  const percentage = (displayValue / maxValue) * 100;
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;
  
  // Generate tick marks
  const ticks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const angle = -225 + (i * 270 / 59);
      const rad = (angle * Math.PI) / 180;
      const isMain = i % 10 === 0;
      const innerR = isMain ? 115 : 125;
      const outerR = 135;
      return {
        x1: 160 + Math.cos(rad) * innerR,
        y1: 160 + Math.sin(rad) * innerR,
        x2: 160 + Math.cos(rad) * outerR,
        y2: 160 + Math.sin(rad) * outerR,
        isMain,
      };
    });
  }, []);

  const autoStatus = status || (value > 70 ? '주의 필요' : '안정');

  return (
    <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
      {/* Outer Glow Ring */}
      <div 
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle at center, transparent 45%, ${color.glow} 50%, transparent 55%)`,
          filter: 'blur(20px)',
        }}
      />
      
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {value > 60 && Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-bounce"
            style={{
              background: color.primary,
              left: `${50 + Math.cos((i * 30) * Math.PI / 180) * 45}%`,
              top: `${50 + Math.sin((i * 30) * Math.PI / 180) * 45}%`,
              opacity: 0.4,
              animationDelay: `${i * 0.1}s`,
              animationDuration: `${2 + i * 0.2}s`,
            }}
          />
        ))}
      </div>
      
      <svg width="320" height="320" viewBox="0 0 320 320" className="relative z-10">
        <defs>
          {/* Gauge Gradient */}
          <linearGradient id="gaugeGradient3D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.safe.primary} />
            <stop offset="50%" stopColor={COLORS.caution.primary} />
            <stop offset="100%" stopColor={COLORS.danger.primary} />
          </linearGradient>
          
          {/* Glow Filter */}
          <filter id="glow3D" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background Circle */}
        <circle
          cx="160"
          cy="160"
          r="150"
          fill={COLORS.surface}
          stroke={COLORS.border}
          strokeWidth="1"
        />
        
        {/* Inner Ring */}
        <circle
          cx="160"
          cy="160"
          r="100"
          fill={COLORS.background}
          stroke={COLORS.borderLight}
          strokeWidth="1"
        />
        
        {/* Tick Marks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.isMain ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}
            strokeWidth={tick.isMain ? 2 : 1}
            strokeLinecap="round"
          />
        ))}
        
        {/* Background Arc */}
        <circle
          cx="160"
          cy="160"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform="rotate(-225 160 160)"
        />
        
        {/* Active Arc with Glow */}
        <circle
          cx="160"
          cy="160"
          r={radius}
          fill="none"
          stroke={color.primary}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-225 160 160)"
          filter="url(#glow3D)"
          style={{
            transition: isAnimating ? 'none' : 'stroke-dashoffset 0.5s ease-out',
          }}
        />
        
        {/* Center Value */}
        <text
          x="160"
          y="150"
          textAnchor="middle"
          fill={COLORS.text}
          fontSize="52"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          filter="url(#glow3D)"
        >
          {displayValue.toFixed(1)}°
        </text>
        
        {/* Label */}
        <text
          x="160"
          y="185"
          textAnchor="middle"
          fill={COLORS.textMuted}
          fontSize="14"
          fontWeight="500"
        >
          {label}
        </text>
        
        {/* Status Badge */}
        <rect
          x="100"
          y="200"
          width="120"
          height="28"
          rx="14"
          fill={color.bg}
          stroke={color.primary}
          strokeWidth="1"
          opacity="0.8"
        />
        <text
          x="160"
          y="219"
          textAnchor="middle"
          fill={color.primary}
          fontSize="12"
          fontWeight="600"
        >
          {autoStatus}
        </text>
      </svg>
    </div>
  );
};

export default NeonGauge3D;
