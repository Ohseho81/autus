/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Role Context Provider
 * 역할 기반 인증 및 권한 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useMemo, 
  useEffect,
  ReactNode 
} from 'react';
import {
  RoleId,
  RoleContextType,
  User,
  Permission,
  ThemeConfig,
  NavItem,
  ActionId,
  ViewId,
  ROLES,
  PERMISSIONS,
  ROLE_NAVIGATION,
} from '../types/roles';

// ─────────────────────────────────────────────────────────────────────────────
// Context Creation
// ─────────────────────────────────────────────────────────────────────────────

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Provider Props
// ─────────────────────────────────────────────────────────────────────────────

interface RoleProviderProps {
  children: ReactNode;
  initialRole?: RoleId;
  initialUser?: User | null;
  onRoleChange?: (role: RoleId) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

export function RoleProvider({
  children,
  initialRole = 'teacher',
  initialUser = null,
  onRoleChange,
}: RoleProviderProps) {
  const [currentRole, setCurrentRole] = useState<RoleId>(initialRole);
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);

  // Get permissions for current role
  const permissions = useMemo<Permission>(() => {
    return PERMISSIONS[currentRole];
  }, [currentRole]);

  // Get theme for current role
  const theme = useMemo<ThemeConfig>(() => {
    return ROLES[currentRole].theme;
  }, [currentRole]);

  // Get navigation items for current role
  const navigation = useMemo<NavItem[]>(() => {
    return ROLE_NAVIGATION[currentRole];
  }, [currentRole]);

  // Role change handler
  const setRole = useCallback((role: RoleId) => {
    setCurrentRole(role);
    onRoleChange?.(role);

    // Update user role if user exists
    if (user) {
      setUser({ ...user, role });
    }

    // Persist to localStorage for demo purposes
    if (typeof window !== 'undefined') {
      localStorage.setItem('autus-current-role', role);
    }
  }, [user, onRoleChange]);

  // Check if user has a specific permission
  const hasPermission = useCallback((action: ActionId): boolean => {
    return permissions.actions.includes(action);
  }, [permissions]);

  // Check if user can access a specific view
  const canAccessView = useCallback((view: ViewId): boolean => {
    return permissions.views.includes(view);
  }, [permissions]);

  // Load saved role on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedRole = localStorage.getItem('autus-current-role') as RoleId;
    if (savedRole && Object.keys(ROLES).includes(savedRole)) {
      setCurrentRole(savedRole);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.setAttribute('data-theme', theme.mode);
    root.setAttribute('data-role', currentRole);

    // Set CSS custom properties
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);
    root.style.setProperty('--color-background', theme.backgroundColor);
    root.style.setProperty('--color-card', theme.cardBackground);
    root.style.setProperty('--color-text-primary', theme.textPrimary);
    root.style.setProperty('--color-text-secondary', theme.textSecondary);
  }, [theme, currentRole]);

  // Context value
  const value = useMemo<RoleContextType>(() => ({
    currentRole,
    user,
    permissions,
    theme,
    navigation,
    setRole,
    hasPermission,
    canAccessView,
    isLoading,
  }), [
    currentRole, 
    user, 
    permissions, 
    theme, 
    navigation, 
    setRole, 
    hasPermission, 
    canAccessView, 
    isLoading
  ]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useRoleContext
// ─────────────────────────────────────────────────────────────────────────────

export function useRoleContext(): RoleContextType {
  const context = useContext(RoleContext);
  
  if (context === undefined) {
    throw new Error('useRoleContext must be used within a RoleProvider');
  }
  
  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useCurrentRole
// ─────────────────────────────────────────────────────────────────────────────

export function useCurrentRole(): RoleId {
  const { currentRole } = useRoleContext();
  return currentRole;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useRoleTheme
// ─────────────────────────────────────────────────────────────────────────────

export function useRoleTheme(): ThemeConfig {
  const { theme } = useRoleContext();
  return theme;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useRoleNavigation
// ─────────────────────────────────────────────────────────────────────────────

export function useRoleNavigation(): NavItem[] {
  const { navigation } = useRoleContext();
  return navigation;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePermissions
// ─────────────────────────────────────────────────────────────────────────────

export function usePermissions(): {
  permissions: Permission;
  hasPermission: (action: ActionId) => boolean;
  canAccessView: (view: ViewId) => boolean;
  dataScope: string;
} {
  const { permissions, hasPermission, canAccessView } = useRoleContext();
  
  return {
    permissions,
    hasPermission,
    canAccessView,
    dataScope: permissions.dataScope,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: ProtectedRoute
// ─────────────────────────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: RoleId[];
  requiredView?: ViewId;
  requiredAction?: ActionId;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredView,
  requiredAction,
  fallback = null,
}: ProtectedRouteProps) {
  const { currentRole, hasPermission, canAccessView } = useRoleContext();

  // Check role restriction
  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  // Check view access
  if (requiredView && !canAccessView(requiredView)) {
    return <>{fallback}</>;
  }

  // Check action permission
  if (requiredAction && !hasPermission(requiredAction)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: ViewGuard
// ─────────────────────────────────────────────────────────────────────────────

interface ViewGuardProps {
  children: ReactNode;
  view: ViewId;
  fallback?: ReactNode;
}

export function ViewGuard({
  children,
  view,
  fallback = null,
}: ViewGuardProps) {
  const { canAccessView } = useRoleContext();

  if (!canAccessView(view)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: ActionGuard
// ─────────────────────────────────────────────────────────────────────────────

interface ActionGuardProps {
  children: ReactNode;
  action: ActionId;
  fallback?: ReactNode;
}

export function ActionGuard({
  children,
  action,
  fallback = null,
}: ActionGuardProps) {
  const { hasPermission } = useRoleContext();

  if (!hasPermission(action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: RoleSwitch
// ─────────────────────────────────────────────────────────────────────────────

interface RoleSwitchProps {
  owner?: ReactNode;
  manager?: ReactNode;
  teacher?: ReactNode;
  parent?: ReactNode;
  student?: ReactNode;
  fallback?: ReactNode;
}

export function RoleSwitch({
  owner,
  manager,
  teacher,
  parent,
  student,
  fallback = null,
}: RoleSwitchProps) {
  const { currentRole } = useRoleContext();

  switch (currentRole) {
    case 'owner':
      return <>{owner ?? fallback}</>;
    case 'manager':
      return <>{manager ?? fallback}</>;
    case 'teacher':
      return <>{teacher ?? fallback}</>;
    case 'parent':
      return <>{parent ?? fallback}</>;
    case 'student':
      return <>{student ?? fallback}</>;
    default:
      return <>{fallback}</>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { RoleContext };
export default RoleProvider;
