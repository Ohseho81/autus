/**
 * Viewport-based Loading Hook
 * 
 * 뷰포트 내에 있는 항목만 로드
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { isInViewport, virtualSlice } from '../utils/perf';

interface UseViewportLoadingOptions<T> {
  items: T[];
  itemHeight?: number;
  containerRef: React.RefObject<HTMLElement>;
  overscan?: number; // 뷰포트 밖 몇 개 더 로드할지
  enabled?: boolean;
}

/**
 * 뷰포트 기반 가상화 로딩
 */
export function useViewportLoading<T>({
  items,
  itemHeight = 50,
  containerRef,
  overscan = 5,
  enabled = true,
}: UseViewportLoadingOptions<T>) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 뷰포트 계산
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current || !enabled) {
      return { start: 0, end: Math.min(items.length, 20) };
    }

    const container = containerRef.current;
    const scrollTop = container.scrollTop || 0;
    const containerHeight = container.clientHeight || window.innerHeight;

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { start, end };
  }, [containerRef, itemHeight, overscan, items.length, enabled]);

  // 스크롤 이벤트 핸들러
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const handleScroll = () => {
      const range = calculateVisibleRange();
      setVisibleRange(range);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 초기 계산

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, calculateVisibleRange, enabled]);

  // Intersection Observer 사용 (더 정확하지만 복잡)
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // 필요 시 더 정밀한 계산
      },
      { root: container, rootMargin: `${overscan * itemHeight}px` }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [containerRef, overscan, itemHeight, enabled]);

  // 가시 영역 아이템
  const visibleItems = useMemo(() => {
    return virtualSlice(items, visibleRange.start, visibleRange.end - visibleRange.start);
  }, [items, visibleRange]);

  // 총 높이 (가상 스크롤용)
  const totalHeight = items.length * itemHeight;

  // 오프셋 (가상 스크롤용)
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    isVirtualized: items.length > 50, // 50개 이상일 때만 가상화
  };
}

