/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💓 ECGLine - 심전도 애니메이션 (Cycle 3)
 * 실시간 맥박/펄스 시각화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { COLORS } from '../design-system';

interface ECGLineProps {
  data: number[];
  color?: string;
  height?: number;
  animated?: boolean;
}

export const ECGLine: React.FC<ECGLineProps> = ({
  data,
  color = COLORS.caution.primary,
  height = 100,
  animated = true,
}) => {
  const [offset, setOffset] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  
  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setOffset(prev => (prev + 1) % data.length);
    }, 50);
    return () => clearInterval(interval);
  }, [animated, data.length]);
  
  const shiftedData = useMemo(() => {
    return [...data.slice(offset), ...data.slice(0, offset)];
  }, [data, offset]);
  
  const pathD = useMemo(() => {
    const width = 400;
    const points = shiftedData.map((y, i) => {
      const x = (i / (shiftedData.length - 1)) * width;
      const scaledY = height - (y / 100) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${scaledY}`;
    });
    return points.join(' ');
  }, [shiftedData, height]);

  const gradientId = `ecgGradient-${Math.random().toString(36).substr(2, 9)}`;
  const filterId = `ecgGlow-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg 
      width="100%" 
      height={height} 
      viewBox={`0 0 400 ${height}`} 
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="20%" stopColor={color} stopOpacity="1" />
          <stop offset="80%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Grid Lines */}
      {Array.from({ length: 5 }).map((_, i) => (
        <line
          key={i}
          x1="0"
          y1={(i + 1) * (height / 6)}
          x2="400"
          y2={(i + 1) * (height / 6)}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}
      
      {/* ECG Line */}
      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        filter={`url(#${filterId})`}
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ECGLine;
