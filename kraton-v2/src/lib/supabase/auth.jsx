/**
 * Supabase 인증 컨텍스트 및 훅
 * 
 * - AuthProvider: 인증 상태 관리
 * - useAuth: 인증 훅
 * - useUser: 사용자 정보 훅
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from './client';

// ============================================
// AUTUS 역할 정의 - 최종 구조
// ============================================

// 내부 역할 (3계층)
const INTERNAL_ROLES = {
  c_level: { 
    id: 'c_level', 
    name: 'C-Level', 
    role: 'Vision & Resource Director',
    icon: '👑', 
    desc: 'Owner / CEO', 
    color: 'yellow',
    automation: 20,
    tier: 1,
    type: 'internal',
  },
  fsd: { 
    id: 'fsd', 
    name: 'FSD', 
    role: 'Judgment & Allocation Lead',
    icon: '🎯', 
    desc: '중간 관리자 / 판단 AI', 
    color: 'cyan',
    automation: 80,
    tier: 2,
    type: 'internal',
  },
  optimus: { 
    id: 'optimus', 
    name: 'Optimus', 
    role: 'Execution Operator',
    icon: '⚡', 
    desc: '실무자 / KRATON 에이전트', 
    color: 'emerald',
    automation: 98,
    tier: 3,
    type: 'internal',
  },
};

// 외부 역할 (이용 주체)
const EXTERNAL_ROLES = {
  consumer: { 
    id: 'consumer', 
    name: 'Consumer', 
    role: 'Primary Service Consumer',
    icon: '👩‍🎓', 
    desc: '고객 / 사용자 / 학생', 
    color: 'purple',
    automation: 95,
    type: 'external',
  },
  regulatory: { 
    id: 'regulatory', 
    name: 'Regulatory', 
    role: 'Regulatory Participant',
    icon: '🏛️', 
    desc: '정부 담당자 / 행정 포털', 
    color: 'red',
    automation: 80,
    type: 'external',
  },
  partner: { 
    id: 'partner', 
    name: 'Partner', 
    role: 'Partner Collaborator',
    icon: '🤝', 
    desc: '공급자 / 파트너사', 
    color: 'orange',
    automation: 90,
    type: 'external',
  },
};

// 전체 역할 (통합)
const ROLES = { ...INTERNAL_ROLES, ...EXTERNAL_ROLES };

// ============================================
// Auth Context
// ============================================
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 프로필 가져오기
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Auth] 프로필 조회 실패:', err);
      return null;
    }
  }, []);

  // 최초 로그인 시 프로필 생성 (OAuth 카카오/구글/깃헙)
  const ensureProfile = useCallback(async (user) => {
    if (!supabase || !user) return null;

    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || meta.user_name || meta.nickname || user.email?.split('@')[0] || '사용자';
    const avatarUrl = meta.avatar_url || meta.profile_image;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            name: String(name).slice(0, 100),
            ...(avatarUrl && { avatar_url: avatarUrl }),
            role: 'coach',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) {
        console.warn('[Auth] 프로필 생성/갱신 실패 (RLS 또는 스키마 확인):', error);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[Auth] ensureProfile:', err);
      return null;
    }
  }, []);

  // 초기 세션 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!supabase) {
          // Mock 모드: localStorage에서 역할 복원
          const savedRole = localStorage.getItem('kraton_role');
          if (savedRole && ROLES[savedRole]) {
            setRole(ROLES[savedRole]);
          }
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          let profileData = await fetchProfile(session.user.id);
          if (!profileData) {
            profileData = await ensureProfile(session.user);
          }
          setProfile(profileData);
          if (profileData?.role && ROLES[profileData.role]) {
            setRole(ROLES[profileData.role]);
          }
        }
      } catch (err) {
        console.error('[Auth] 초기화 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Auth 상태 변경 구독
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('[Auth] 상태 변경:', event);
          
          if (session?.user) {
            setUser(session.user);
            let profileData = await fetchProfile(session.user.id);
            if (!profileData) {
              profileData = await ensureProfile(session.user);
            }
            setProfile(profileData);
            if (profileData?.role && ROLES[profileData.role]) {
              setRole(ROLES[profileData.role]);
            }
          } else {
            setUser(null);
            setProfile(null);
            setRole(null);
          }
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [fetchProfile, ensureProfile]);

  // 로그인 (이메일/비밀번호)
  const signIn = useCallback(async (email, password) => {
    if (!supabase) {
      setError('Supabase 미설정');
      return { error: 'Supabase not configured' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // 회원가입
  const signUp = useCallback(async (email, password, metadata = {}) => {
    if (!supabase) {
      return { error: 'Supabase not configured' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그아웃
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      // 로컬 상태 초기화
      setUser(null);
      setProfile(null);
      setRole(null);
      localStorage.removeItem('kraton_role');
    } catch (err) {
      console.error('[Auth] 로그아웃 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mock 로그인 (역할 선택)
  const selectRole = useCallback((roleId) => {
    if (ROLES[roleId]) {
      setRole(ROLES[roleId]);
      localStorage.setItem('kraton_role', roleId);
      return true;
    }
    return false;
  }, []);

  // OAuth 로그인
  const signInWithOAuth = useCallback(async (provider) => {
    if (!supabase) {
      return { error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    }
  }, []);

  // 컨텍스트 값 메모이제이션
  const value = useMemo(() => ({
    // 상태
    user,
    profile,
    role,
    loading,
    error,
    isAuthenticated: !!user || !!role,
    isSupabaseMode: isSupabaseConfigured,
    
    // 액션
    signIn,
    signUp,
    signOut,
    selectRole,
    signInWithOAuth,
    
    // 역할 목록
    roles: ROLES,
  }), [user, profile, role, loading, error, signIn, signUp, signOut, selectRole, signInWithOAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useUser() {
  const { user, profile, role } = useAuth();
  return { user, profile, role };
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export default AuthProvider;
