"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 Lazy Loading Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 코드 스플리팅으로 초기 로딩 최적화
 */

import dynamic from "next/dynamic";
import { ComponentType, Suspense } from "react";

// 로딩 스피너
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-green-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// 무거운 컴포넌트 지연 로딩
export const LazyChart = dynamic(
  () => import("recharts").then((mod) => ({
    default: mod.ResponsiveContainer,
  })),
  { loading: () => <LoadingSpinner />, ssr: false }
);

export const LazyD3 = dynamic(
  () => import("d3").then((mod) => ({ default: () => null })),
  { loading: () => <LoadingSpinner />, ssr: false }
);

// HOC: 지연 로딩 래퍼
export function withLazyLoad<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = dynamic(importFn, {
    loading: () => <>{fallback ?? <LoadingSpinner />}</>,
    ssr: false,
  });

  return LazyComponent;
}

// Suspense 래퍼
export function LazyWrapper({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense fallback={fallback ?? <LoadingSpinner />}>
      {children}
    </Suspense>
  );
}
