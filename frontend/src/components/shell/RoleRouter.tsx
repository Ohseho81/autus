/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS RoleRouter - 역할 기반 라우터
 * 역할에 따라 다른 UI를 렌더링
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { Suspense, lazy } from 'react';
import { useRole } from './RoleShell';
import { RoleType } from './role-config';

// ═══════════════════════════════════════════════════════════════════════════════
// Lazy Load Role Views
// ═══════════════════════════════════════════════════════════════════════════════

const DeciderView = lazy(() => import('./views/DeciderView'));
const OperatorView = lazy(() => import('./views/OperatorView'));
const ExecutorView = lazy(() => import('./views/ExecutorView'));
const ConsumerView = lazy(() => import('./views/ConsumerView'));
const ApproverView = lazy(() => import('./views/ApproverView'));

// ═══════════════════════════════════════════════════════════════════════════════
// Loading Skeleton
// ═══════════════════════════════════════════════════════════════════════════════

function CardSkeleton() {
  return (
    <div className="w-full max-w-lg mx-auto animate-pulse">
      <div className="bg-gray-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 bg-gray-700/50">
          <div className="h-5 w-24 bg-gray-600 rounded" />
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="h-6 w-3/4 bg-gray-700 rounded" />
          <div className="h-4 w-1/2 bg-gray-700 rounded" />
          <div className="h-20 bg-gray-700 rounded-xl" />
          <div className="h-12 bg-gray-700 rounded-xl" />
          <div className="h-12 bg-gray-600 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Role View Map
// ═══════════════════════════════════════════════════════════════════════════════

const ROLE_VIEWS: Record<RoleType, React.LazyExoticComponent<React.FC>> = {
  DECIDER: DeciderView,
  OPERATOR: OperatorView,
  EXECUTOR: ExecutorView,
  CONSUMER: ConsumerView,
  APPROVER: ApproverView,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleRouterProps {
  fallback?: React.ReactNode;
}

export function RoleRouter({ fallback }: RoleRouterProps) {
  const { currentRole } = useRole();
  const RoleView = ROLE_VIEWS[currentRole];

  return (
    <Suspense fallback={fallback || <CardSkeleton />}>
      <RoleView />
    </Suspense>
  );
}

export default RoleRouter;
