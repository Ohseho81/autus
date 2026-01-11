/**
 * Zustand Selector 최적화 훅
 * 
 * 불필요한 리렌더링 방지
 */

import { useMemo } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

/**
 * 최적화된 selector 사용
 * 
 * @example
 * const scale = useOptimizedSelector(scaleStore, (s) => s.scale);
 */
export function useOptimizedSelector<T, U>(
  store: StoreApi<T>,
  selector: (state: T) => U,
  equalityFn?: (a: U, b: U) => boolean
): U {
  const selected = useStore(store, selector, equalityFn);
  
  // useMemo로 추가 최적화 (필요 시)
  return useMemo(() => selected, [selected]);
}

/**
 * 다중 selector 최적화
 */
export function useOptimizedSelectors<T, U extends Record<string, any>>(
  store: StoreApi<T>,
  selectors: { [K in keyof U]: (state: T) => U[K] }
): U {
  const result = {} as U;
  
  for (const key in selectors) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    result[key] = useOptimizedSelector(store, selectors[key]);
  }
  
  return result;
}

