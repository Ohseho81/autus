// ═══════════════════════════════════════════════════════════════════════════
// Flow Hook - 흐름 애니메이션 상태 관리
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import type { Flow } from '../types';

interface UseFlowAnimationResult {
  animationPhase: number;
  isAnimating: boolean;
  toggleAnimation: () => void;
  setAnimationSpeed: (speed: number) => void;
}

/**
 * 흐름 애니메이션 상태 관리 훅
 */
export function useFlowAnimation(enabled: boolean = true): UseFlowAnimationResult {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isAnimating, setIsAnimating] = useState(enabled);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 0.02 * speed) % 1);
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, speed]);

  const toggleAnimation = () => setIsAnimating(prev => !prev);
  const setAnimationSpeed = (newSpeed: number) => setSpeed(newSpeed);

  return {
    animationPhase,
    isAnimating,
    toggleAnimation,
    setAnimationSpeed,
  };
}

/**
 * 위치 보간 (Arc 형태)
 */
export function interpolatePosition(
  source: [number, number],
  target: [number, number],
  t: number
): [number, number] {
  const midLat = (source[1] + target[1]) / 2;
  const midLng = (source[0] + target[0]) / 2;

  // 곡선 높이 - 거리에 비례
  const dist = Math.sqrt(
    Math.pow(target[0] - source[0], 2) +
    Math.pow(target[1] - source[1], 2)
  );
  const height = dist * 0.2;

  // Bezier 곡선
  const lat = (1 - t) * (1 - t) * source[1] +
              2 * (1 - t) * t * (midLat + height) +
              t * t * target[1];
  const lng = (1 - t) * (1 - t) * source[0] +
              2 * (1 - t) * t * midLng +
              t * t * target[0];

  return [lng, lat];
}

/**
 * 흐름 파티클 생성
 */
export function useFlowParticles(flows: Flow[], animationPhase: number) {
  return useMemo(() => {
    return flows.flatMap((flow, idx) => {
      const phase = (animationPhase + idx * 0.1) % 1;
      const position = interpolatePosition(
        [flow.source_lng, flow.source_lat],
        [flow.target_lng, flow.target_lat],
        phase
      );

      return [{
        ...flow,
        phase,
        position,
      }];
    });
  }, [flows, animationPhase]);
}

/**
 * 금액 포맷팅
 */
export function formatAmount(amount: number): string {
  if (amount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

