/**
 * AUTUS Tooltip 컴포넌트
 * - 접근성 지원 (aria-describedby)
 * - 위치 자동 조정
 */

import React, { useState, useRef, useId } from 'react';
import { clsx } from 'clsx';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipId = useId();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-y-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-flex">
      {React.cloneElement(children, {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
        'aria-describedby': isVisible ? tooltipId : undefined,
      })}

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={clsx(
            'absolute z-50 px-2 py-1 text-xs text-white bg-slate-700 rounded shadow-lg',
            'whitespace-nowrap animate-fadeIn',
            positionStyles[position]
          )}
        >
          {content}
          <span
            className={clsx(
              'absolute w-0 h-0 border-4',
              arrowStyles[position]
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};

// AUTUS 용어 사전
export const AUTUS_GLOSSARY: Record<string, { title: string; description: string; emoji?: string; example?: string }> = {
  K: { title: 'K-Index (자본 지수)', description: '조직의 자본 상태를 나타내는 지표. 1.0이 안정 상태.', emoji: '📊', example: 'K=0.95: 안정적' },
  I: { title: 'I-Index (변화율)', description: '자본 지수의 변화 속도. 양수면 성장, 음수면 감소.', emoji: '📈', example: 'I=+0.02: 성장 중' },
  r: { title: 'r-Index (가속도)', description: '변화율의 변화. 추세의 전환점을 감지.', emoji: '🔄', example: 'r=-0.01: 감속 중' },
  psi: { title: 'ψ (비가역성)', description: '결정이 되돌릴 수 없는 정도 (0-1).', emoji: '⚡', example: 'ψ=0.8: 높은 비가역성' },
  entropy: { title: 'Entropy (엔트로피)', description: '시스템의 무질서도. 높을수록 불안정.', emoji: '🌀', example: 'S=0.3: 안정' },
  automation: { title: 'Automation Level', description: '업무 자동화 수준 (0-100%).', emoji: '🤖', example: '85%: 고도 자동화' },
  node: { title: 'Node (노드)', description: '업무 단위. 36개 표준 노드로 구성.', emoji: '🔵', example: 'N01: 계약 관리' },
  gate: { title: 'Gate (게이트)', description: '상태 전환 트리거. OBSERVE, RING, LOCK 상태.', emoji: '🚪', example: 'RING: 주의 필요' },
};

export default Tooltip;
