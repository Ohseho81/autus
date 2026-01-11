// ═══════════════════════════════════════════════════════════════════════════
// Scale Hook - 줌 레벨 ↔ 스케일 레벨 매핑
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import type { ScaleLevel } from '../types';
import { SCALE_LABELS } from '../types';

// 줌 레벨 → 스케일 레벨 매핑
const ZOOM_TO_SCALE: Record<number, ScaleLevel> = {
  0: 'L0', 1: 'L0', 2: 'L0', 3: 'L0',
  4: 'L1', 5: 'L1', 6: 'L1',
  7: 'L2', 8: 'L2', 9: 'L2', 10: 'L2',
  11: 'L3', 12: 'L3', 13: 'L3', 14: 'L3',
  15: 'L4', 16: 'L4', 17: 'L4', 18: 'L4', 19: 'L4', 20: 'L4',
};

/**
 * 현재 줌 레벨에 해당하는 스케일 레벨 반환
 */
export function useScale(zoom: number): ScaleLevel {
  return useMemo(() => {
    const rounded = Math.floor(zoom);
    return ZOOM_TO_SCALE[rounded] || 'L4';
  }, [zoom]);
}

/**
 * 스케일 레벨 라벨 반환
 */
export function getScaleLabel(level: ScaleLevel): string {
  return SCALE_LABELS[level];
}

/**
 * 줌 레벨에서 스케일 레벨 직접 계산
 */
export function getScaleLevelFromZoom(zoom: number): ScaleLevel {
  const rounded = Math.floor(zoom);
  return ZOOM_TO_SCALE[rounded] || 'L4';
}

/**
 * 스케일 레벨별 노드 표시 최소 크기 반환
 */
export function getNodeMinRadius(level: ScaleLevel): number {
  const minRadii: Record<ScaleLevel, number> = {
    'L0': 20,   // World - 큰 노드만
    'L1': 15,   // Country
    'L2': 10,   // City
    'L3': 8,    // District
    'L4': 5,    // Block - 작은 노드도 표시
  };
  return minRadii[level];
}

/**
 * 스케일 레벨별 최대 노드 수 반환
 */
export function getMaxNodesForLevel(level: ScaleLevel): number {
  const maxNodes: Record<ScaleLevel, number> = {
    'L0': 50,
    'L1': 100,
    'L2': 200,
    'L3': 300,
    'L4': 500,
  };
  return maxNodes[level];
}

