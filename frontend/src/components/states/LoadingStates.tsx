/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⏳ LoadingStates - 로딩 상태 UI
 * 
 * 로딩 중일 때 표시하는 UI
 * - 스켈레톤
 * - 스피너
 * - 프로그레스
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 스피너 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'blue' | 'purple';
}

export function Spinner({ size = 'md', color = 'white' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  const colorClasses = {
    white: 'border-white/20 border-t-white',
    blue: 'border-blue-500/20 border-t-blue-500',
    purple: 'border-purple-500/20 border-t-purple-500',
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 로딩 오버레이
// ═══════════════════════════════════════════════════════════════════════════════

interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

export function LoadingOverlay({ message = '로딩 중...', isVisible }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="text-center">
        <Spinner size="lg" color="purple" />
        <p className="mt-4 text-slate-300">{message}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 스켈레톤 컴포넌트들
// ═══════════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-700/50 rounded ${className}`} />
  );
}

// 텍스트 스켈레톤
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array(lines).fill(0).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  );
}

// 카드 스켈레톤
export function SkeletonCard() {
  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// 학생 카드 스켈레톤
export function SkeletonStudentCard() {
  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

// 대시보드 스켈레톤
export function SkeletonDashboard() {
  return (
    <div className="p-4 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="w-16 h-16 rounded-xl" />
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-3 bg-slate-800/50 rounded-xl animate-pulse">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* 리스트 */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24 mb-3" />
        {[1, 2, 3].map(i => (
          <SkeletonStudentCard key={i} />
        ))}
      </div>
    </div>
  );
}

// 테이블 스켈레톤
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* 헤더 */}
      <div className="p-3 border-b border-slate-700/50 flex gap-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      
      {/* 행 */}
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="p-3 border-b border-slate-700/50 last:border-0 flex gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 로딩 페이지
// ═══════════════════════════════════════════════════════════════════════════════

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = '로딩 중...' }: LoadingPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="relative">
          <Spinner size="lg" color="purple" />
          <div className="absolute inset-0 animate-ping">
            <Spinner size="lg" color="purple" />
          </div>
        </div>
        <p className="mt-6 text-slate-400">{message}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 인라인 로딩
// ═══════════════════════════════════════════════════════════════════════════════

export function InlineLoading({ text = '로딩 중...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <Spinner size="sm" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// 버튼 로딩
interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ButtonLoading({ 
  isLoading, 
  children, 
  onClick, 
  className = '',
  disabled = false,
}: ButtonLoadingProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`relative ${className} ${isLoading ? 'cursor-wait' : ''}`}
    >
      <span className={isLoading ? 'invisible' : ''}>{children}</span>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      )}
    </button>
  );
}
