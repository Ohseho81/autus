/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 Progress Ring - 진행률 링
 * 도파민 트리거: 진행률 시각화 (채워지는 쾌감)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

interface ProgressRingProps {
  value: number;          // 0-100
  max?: number;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  showValue?: boolean;
  animate?: boolean;
  celebrateAt?: number;   // 축하 애니메이션 트리거 퍼센트
}

export default function ProgressRing({
  value,
  max = 100,
  label,
  sublabel,
  size = 'md',
  color = '#3B82F6',
  showValue = true,
  animate = true,
  celebrateAt = 100,
}: ProgressRingProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const shouldCelebrate = percentage >= celebrateAt;

  const sizes = {
    sm: { outer: 60, stroke: 4, fontSize: 'text-sm' },
    md: { outer: 80, stroke: 6, fontSize: 'text-lg' },
    lg: { outer: 120, stroke: 8, fontSize: 'text-2xl' },
    xl: { outer: 160, stroke: 10, fontSize: 'text-3xl' },
  };

  const { outer, stroke, fontSize } = sizes[size];
  const radius = (outer - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* SVG 링 */}
      <div className="relative" style={{ width: outer, height: outer }}>
        <svg className="transform -rotate-90" width={outer} height={outer}>
          {/* 배경 링 */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            className="text-slate-700"
          />
          {/* 진행 링 */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={animate ? 'transition-all duration-1000 ease-out' : ''}
          />
        </svg>

        {/* 중앙 값 */}
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold ${fontSize}`} style={{ color }}>
              {Math.round(percentage)}%
            </span>
          </div>
        )}

        {/* 축하 이펙트 */}
        {shouldCelebrate && (
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <span className="text-2xl">🎉</span>
          </div>
        )}
      </div>

      {/* 라벨 */}
      {label && (
        <div className="mt-2 text-center">
          <div className="font-medium text-white">{label}</div>
          {sublabel && (
            <div className="text-xs text-slate-400">{sublabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
