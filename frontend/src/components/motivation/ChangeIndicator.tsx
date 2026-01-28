/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 Change Indicator - 변화량 표시 (관리자용)
 * 도파민 트리거: 숫자 개선 시각화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

interface ChangeIndicatorProps {
  label: string;
  currentValue: number | string;
  previousValue?: number | string;
  change?: number;
  changePercent?: number;
  unit?: string;
  goodDirection?: 'up' | 'down'; // 어느 방향이 좋은 건지
  size?: 'sm' | 'md' | 'lg';
  showCelebration?: boolean;
}

export default function ChangeIndicator({
  label,
  currentValue,
  previousValue,
  change,
  changePercent,
  unit = '',
  goodDirection = 'up',
  size = 'md',
  showCelebration = true,
}: ChangeIndicatorProps) {
  // 변화량 계산
  const actualChange = change ?? (
    typeof currentValue === 'number' && typeof previousValue === 'number'
      ? currentValue - previousValue
      : 0
  );

  const isPositive = actualChange > 0;
  const isGood = goodDirection === 'up' ? isPositive : !isPositive;
  const absChange = Math.abs(actualChange);

  // 크기별 스타일
  const sizes = {
    sm: { value: 'text-lg', label: 'text-xs', change: 'text-sm' },
    md: { value: 'text-2xl', label: 'text-sm', change: 'text-base' },
    lg: { value: 'text-4xl', label: 'text-base', change: 'text-lg' },
  };

  const { value: valueSize, label: labelSize, change: changeSize } = sizes[size];

  // 색상
  const changeColor = isGood ? 'text-green-400' : 'text-red-400';
  const bgColor = isGood ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <div className={`p-4 rounded-xl ${bgColor} border border-slate-700`}>
      {/* 라벨 */}
      <div className={`${labelSize} text-slate-400 mb-1`}>{label}</div>

      {/* 값 & 변화량 */}
      <div className="flex items-end gap-3">
        {/* 현재 값 */}
        <div className={`${valueSize} font-bold text-white`}>
          {typeof currentValue === 'number' 
            ? currentValue.toLocaleString() 
            : currentValue}
          {unit && <span className="text-slate-400 ml-1">{unit}</span>}
        </div>

        {/* 변화량 */}
        {absChange > 0 && (
          <div className={`flex items-center gap-1 ${changeSize} ${changeColor} font-medium`}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>{absChange.toLocaleString()}</span>
            {changePercent !== undefined && (
              <span className="text-sm">({changePercent > 0 ? '+' : ''}{changePercent}%)</span>
            )}
            
            {/* 축하 이모지 */}
            {showCelebration && isGood && absChange > 0 && (
              <span className="ml-1">
                {absChange >= 10 ? '🔥' : '🎉'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 이전 값 참고 */}
      {previousValue !== undefined && (
        <div className="mt-2 text-xs text-slate-500">
          이전: {typeof previousValue === 'number' 
            ? previousValue.toLocaleString() 
            : previousValue}{unit}
        </div>
      )}
    </div>
  );
}
