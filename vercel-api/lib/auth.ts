// ============================================
// AUTUS Authentication Utilities
// JWT 검증, API Key 인증, 역할 기반 접근 제어
// ============================================

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// 타입 정의
// ============================================
export interface AuthUser {
  id: string;
  email: string;
  role: 'c_level' | 'fsd' | 'optimus' | 'consumer' | 'regulatory' | 'partner';
  tier: 1 | 2 | 3 | null;
  org_id?: string;
  permissions: string[];
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthUser;
  error?: string;
}

export type Permission = 
  | 'read:all'
  | 'write:all'
  | 'read:physics'
  | 'write:physics'
  | 'read:risk'
  | 'write:risk'
  | 'read:value'
  | 'write:value'
  | 'manage:users'
  | 'manage:org'
  | 'approve:fsd'
  | 'approve:optimus';

// ============================================
// 역할별 권한 매핑
// ============================================
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  c_level: [
    'read:all', 'write:all', 'manage:users', 'manage:org', 
    'approve:fsd', 'approve:optimus', 'read:physics', 'write:physics',
    'read:risk', 'write:risk', 'read:value', 'write:value'
  ],
  fsd: [
    'read:all', 'read:physics', 'write:physics', 'read:risk', 'write:risk',
    'read:value', 'approve:optimus'
  ],
  optimus: [
    'read:physics', 'read:risk', 'read:value', 'write:physics'
  ],
  consumer: ['read:value'],
  regulatory: ['read:value', 'read:risk'],
  partner: ['read:value'],
};

// ============================================
// 승인 코드 검증 (환경변수 기반)
// ============================================
export function verifyApprovalCode(role: string, code: string): boolean {
  // 환경변수에서 승인 코드 확인
  const envKey = `AUTUS_APPROVAL_CODE_${role.toUpperCase()}`;
  const expectedCode = process.env[envKey];
  
  // 환경변수가 설정되어 있으면 그 값으로 검증
  if (expectedCode) {
    return code === expectedCode;
  }
  
  // 개발 환경: 4자리 이상이면 허용
  if (process.env.NODE_ENV !== 'production') {
    return code.length >= 4;
  }
  
  // 프로덕션에서 환경변수가 없으면 거부
  return false;
}

// ============================================
// 마스터 비밀번호 검증 (환경변수 기반)
// ============================================
export function verifyMasterPassword(password: string): boolean {
  const masterPassword = process.env.AUTUS_MASTER_PASSWORD;
  
  // 환경변수가 설정되어 있으면 그 값으로 검증
  if (masterPassword) {
    return password === masterPassword;
  }
  
  // 개발 환경: 4자리 이상이면 허용
  if (process.env.NODE_ENV !== 'production') {
    return password.length >= 4;
  }
  
  // 프로덕션에서 환경변수가 없으면 거부
  return false;
}

// ============================================
// JWT 토큰에서 사용자 정보 추출
// ============================================
export async function getUserFromToken(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'No authorization header' };
    }

    const token = authHeader.substring(7);
    
    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { authenticated: false, error: 'Supabase not configured' };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 토큰으로 사용자 정보 가져오기
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { authenticated: false, error: 'Invalid token' };
    }

    // 사용자 메타데이터에서 역할 정보 추출
    const role = user.user_metadata?.role || 'consumer';
    const tier = user.user_metadata?.tier || null;
    const org_id = user.user_metadata?.org_id;
    
    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      role,
      tier,
      org_id,
      permissions: ROLE_PERMISSIONS[role] || [],
    };

    return { authenticated: true, user: authUser };
  } catch (error) {
    console.error('[Auth Error]', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

// ============================================
// API Key 인증
// ============================================
export async function authenticateApiKey(request: NextRequest): Promise<AuthResult> {
  try {
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return { authenticated: false, error: 'No API key provided' };
    }

    // 환경변수에서 API 키 확인
    const validApiKey = process.env.AUTUS_API_KEY;
    
    if (!validApiKey) {
      // 개발 환경에서는 demo 키 허용
      if (process.env.NODE_ENV !== 'production' && apiKey.startsWith('demo_')) {
        return {
          authenticated: true,
          user: {
            id: 'api_demo_user',
            email: 'api@demo.autus.ai',
            role: 'fsd',
            tier: 2,
            permissions: ROLE_PERMISSIONS['fsd'],
          },
        };
      }
      return { authenticated: false, error: 'API key not configured' };
    }

    if (apiKey !== validApiKey) {
      return { authenticated: false, error: 'Invalid API key' };
    }

    // API 키로 인증된 사용자 (시스템 레벨 접근)
    return {
      authenticated: true,
      user: {
        id: 'api_system_user',
        email: 'system@autus.ai',
        role: 'c_level',
        tier: 1,
        permissions: ROLE_PERMISSIONS['c_level'],
      },
    };
  } catch (error) {
    console.error('[API Key Auth Error]', error);
    return { authenticated: false, error: 'API key authentication failed' };
  }
}

// ============================================
// 복합 인증 (JWT 또는 API Key)
// ============================================
export async function authenticate(request: NextRequest): Promise<AuthResult> {
  // API Key 우선 시도
  if (request.headers.has('X-API-Key')) {
    return authenticateApiKey(request);
  }
  
  // JWT 토큰 시도
  if (request.headers.has('Authorization')) {
    return getUserFromToken(request);
  }
  
  return { authenticated: false, error: 'No authentication provided' };
}

// ============================================
// 권한 확인
// ============================================
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  return user.permissions.includes(permission) || user.permissions.includes('read:all') || user.permissions.includes('write:all');
}

export function hasAnyPermission(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

export function hasAllPermissions(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

// ============================================
// 역할 계층 확인
// ============================================
const ROLE_HIERARCHY: Record<string, number> = {
  c_level: 1,
  fsd: 2,
  optimus: 3,
  consumer: 4,
  regulatory: 4,
  partner: 4,
};

export function canApprove(approverRole: string, targetRole: string): boolean {
  const approverLevel = ROLE_HIERARCHY[approverRole] || 999;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 999;
  return approverLevel < targetLevel;
}

export function isInternalRole(role: string): boolean {
  return ['c_level', 'fsd', 'optimus'].includes(role);
}

export function isExternalRole(role: string): boolean {
  return ['consumer', 'regulatory', 'partner'].includes(role);
}

// ============================================
// 동적 승인 코드 관리 (메모리 기반)
// ============================================
const dynamicApprovalCodes: Map<string, {
  code: string;
  targetRole: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}> = new Map();

export function validateDynamicApprovalCode(code: string, targetRole: string): boolean {
  const entries = Array.from(dynamicApprovalCodes.entries());
  for (const [_, data] of entries) {
    if (
      data.code === code &&
      data.targetRole === targetRole &&
      !data.used &&
      new Date(data.expiresAt) > new Date()
    ) {
      data.used = true; // 일회용
      return true;
    }
  }
  return false;
}

export function storeDynamicApprovalCode(
  id: string,
  codeData: {
    code: string;
    targetRole: string;
    createdBy: string;
    createdAt: string;
    expiresAt: string;
    used: boolean;
  }
): void {
  dynamicApprovalCodes.set(id, codeData);
}

export function getDynamicApprovalCodes(role?: string) {
  return Array.from(dynamicApprovalCodes.entries())
    .filter(([_, data]) => !role || data.targetRole === role)
    .filter(([_, data]) => new Date(data.expiresAt) > new Date())
    .map(([id, data]) => ({
      id,
      ...data,
    }));
}

export function deleteDynamicApprovalCode(codeId: string): boolean {
  return dynamicApprovalCodes.delete(codeId);
}
