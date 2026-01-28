/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Role-Based Application
 * 역할 기반 통합 앱 진입점
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { Suspense, lazy } from 'react';
import { RoleProvider, useRoleContext, RoleSwitch } from '../contexts/RoleContext';
import { RoleBasedLayout } from '../components/shared/RoleBasedLayout';
import { useBreakpoint } from '../hooks/useResponsive';

// ─────────────────────────────────────────────────────────────────────────────
// Lazy Load Role Components
// ─────────────────────────────────────────────────────────────────────────────

const OwnerCockpit = lazy(() => 
  import('../components/role-specific/owner/OwnerCockpit').then(m => ({ default: m.OwnerCockpit }))
);

const TeacherHome = lazy(() => 
  import('../components/role-specific/teacher/TeacherHome').then(m => ({ default: m.TeacherHome }))
);

const ParentHome = lazy(() => 
  import('../components/role-specific/parent/ParentHome').then(m => ({ default: m.ParentHome }))
);

const StudentHome = lazy(() => 
  import('../components/role-specific/student/StudentHome').then(m => ({ default: m.StudentHome }))
);

// Manager Components
const ManagerCockpit = lazy(() => 
  import('../components/role-specific/manager/ManagerCockpit').then(m => ({ default: m.ManagerCockpit }))
);

// ─────────────────────────────────────────────────────────────────────────────
// Loading Spinner
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  const { theme } = useRoleContext();
  
  return (
    <div 
      className={`
        flex items-center justify-center min-h-screen
        ${theme.mode === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}
      `}
    >
      <div className="text-center">
        <div 
          className={`
            w-12 h-12 border-4 rounded-full animate-spin mx-auto
            ${theme.mode === 'dark' 
              ? 'border-white/20 border-t-white' 
              : 'border-slate-200 border-t-slate-600'
            }
          `}
        />
        <p className="mt-4 text-sm opacity-60">로딩 중...</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Router Component
// ─────────────────────────────────────────────────────────────────────────────

function RoleRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RoleSwitch
        owner={<OwnerCockpit />}
        manager={<ManagerCockpit />}
        teacher={<TeacherHome />}
        parent={<ParentHome />}
        student={<StudentHome />}
        fallback={<TeacherHome />}
      />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────────────────────

function RoleAppContent() {
  const { currentRole } = useRoleContext();
  const { isMobile } = useBreakpoint();

  // Some roles have their own full-page layouts (parent, student)
  // Others use the shared layout with navigation
  const useSharedLayout = currentRole === 'owner' || currentRole === 'manager' || currentRole === 'teacher';

  if (useSharedLayout) {
    return (
      <RoleBasedLayout showNavigation={true}>
        <RoleRouter />
      </RoleBasedLayout>
    );
  }

  // Parent and Student have custom full layouts
  return <RoleRouter />;
}

// ─────────────────────────────────────────────────────────────────────────────
// App Export
// ─────────────────────────────────────────────────────────────────────────────

export function RoleApp() {
  return (
    <RoleProvider initialRole="teacher">
      <RoleAppContent />
    </RoleProvider>
  );
}

export default RoleApp;
