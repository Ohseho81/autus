/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS StatusIndicator - 상태 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { StatusType, getStatusConfig } from './role-config';

interface StatusIndicatorProps {
  status: StatusType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ 
  status, 
  showLabel = true, 
  size = 'md' 
}: StatusIndicatorProps) {
  const config = getStatusConfig(status);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <div 
      className={`
        flex items-center gap-2 rounded-full font-medium
        ${sizeClasses[size]}
      `}
      style={{ 
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      {/* Animated Dot */}
      <span className="relative flex">
        <span 
          className={`
            ${dotSizes[size]} rounded-full
            ${status === 'CRITICAL' ? 'animate-ping absolute' : ''}
          `}
          style={{ backgroundColor: config.color, opacity: 0.75 }}
        />
        <span 
          className={`${dotSizes[size]} rounded-full relative`}
          style={{ backgroundColor: config.color }}
        />
      </span>
      
      {showLabel && (
        <span>{config.nameKo}</span>
      )}
    </div>
  );
}

export default StatusIndicator;
