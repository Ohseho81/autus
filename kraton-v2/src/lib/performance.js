/**
 * performance.js
 * KRATON 전역 성능 최적화 유틸리티
 * 
 * GPU 가속, 메모이제이션, 애니메이션 최적화
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

// ============================================
// 1. useAnimationFrame - 최적화된 애니메이션 훅
// ============================================
export function useAnimationFrame(callback, fps = 60) {
  const requestRef = useRef(null);
  const previousTimeRef = useRef(0);
  const frameInterval = 1000 / fps;

  useEffect(() => {
    const animate = (currentTime) => {
      requestRef.current = requestAnimationFrame(animate);
      
      const deltaTime = currentTime - previousTimeRef.current;
      if (deltaTime < frameInterval) return;
      
      previousTimeRef.current = currentTime - (deltaTime % frameInterval);
      callback(deltaTime);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback, frameInterval]);
}

// ============================================
// 2. useThrottle - 쓰로틀링 훅
// ============================================
export function useThrottle(value, limit = 100) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

// ============================================
// 3. useDebounce - 디바운스 훅
// ============================================
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================
// 4. useIntersectionObserver - 뷰포트 감지 (Lazy Loading)
// ============================================
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options, hasIntersected]);

  return { ref, isIntersecting, hasIntersected };
}

// ============================================
// 5. CanvasRenderer - Canvas 최적화 유틸리티
// ============================================
export class CanvasRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: options.alpha ?? false });
    this.dpr = window.devicePixelRatio || 1;
    this.width = options.width || 600;
    this.height = options.height || 600;
    
    this.setupCanvas();
  }

  setupCanvas() {
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  clear(color = '#030712') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawCircle(x, y, radius, color) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  drawGlow(x, y, radius, color) {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawLine(x1, y1, x2, y2, color, width = 2) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.stroke();
  }

  drawText(text, x, y, options = {}) {
    const { color = '#fff', font = '14px system-ui', align = 'center' } = options;
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }
}

// ============================================
// 6. Performance Monitor
// ============================================
export function usePerformanceMonitor(enabled = false) {
  const [fps, setFps] = useState(60);
  const frames = useRef([]);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    let animationId;
    const measure = () => {
      const now = performance.now();
      const delta = now - lastTime.current;
      lastTime.current = now;

      frames.current.push(1000 / delta);
      if (frames.current.length > 60) frames.current.shift();

      const avgFps = frames.current.reduce((a, b) => a + b, 0) / frames.current.length;
      setFps(Math.round(avgFps));

      animationId = requestAnimationFrame(measure);
    };

    animationId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animationId);
  }, [enabled]);

  return fps;
}

// ============================================
// 7. CSS Performance Utilities
// ============================================
export const GPU_ACCELERATE = {
  transform: 'translateZ(0)',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
};

export const ANIMATION_PRESETS = {
  fast: { duration: '150ms', timing: 'ease-out' },
  normal: { duration: '300ms', timing: 'ease-out' },
  slow: { duration: '500ms', timing: 'ease-out' },
  spring: { duration: '400ms', timing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
};

// ============================================
// 8. Batch State Updates
// ============================================
export function useBatchedState(initialState) {
  const [state, setState] = useState(initialState);
  const updates = useRef({});
  const timeout = useRef(null);

  const batchUpdate = useCallback((key, value) => {
    updates.current[key] = value;

    if (timeout.current) clearTimeout(timeout.current);
    
    timeout.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...updates.current }));
      updates.current = {};
    }, 16); // ~60fps
  }, []);

  return [state, batchUpdate, setState];
}

// ============================================
// 9. Memoized Calculation Helper
// ============================================
export function useMemoizedCalculation(calculator, deps, cacheSize = 10) {
  const cache = useRef(new Map());

  return useMemo(() => {
    const key = JSON.stringify(deps);
    
    if (cache.current.has(key)) {
      return cache.current.get(key);
    }

    const result = calculator();
    cache.current.set(key, result);

    // LRU 캐시 제한
    if (cache.current.size > cacheSize) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }

    return result;
  }, deps);
}

export default {
  useAnimationFrame,
  useThrottle,
  useDebounce,
  useIntersectionObserver,
  CanvasRenderer,
  usePerformanceMonitor,
  GPU_ACCELERATE,
  ANIMATION_PRESETS,
  useBatchedState,
  useMemoizedCalculation,
};
