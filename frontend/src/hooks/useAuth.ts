/**
 * AUTUS Auth Hook
 * ================
 * 
 * Supabase Auth 또는 JWT 인증 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase, isSupabaseConfigured, getUser, signIn, signUp, signOut, onAuthStateChange } from '../services/supabase';

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// ============================================
// Local Storage Keys
// ============================================

const TOKEN_KEY = 'autus_token';
const USER_KEY = 'autus_user';

// ============================================
// JWT Auth (Fallback)
// ============================================

async function jwtSignIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { user: null, error: data.detail || 'Login failed' };
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    
    // Decode basic info from token (simplified)
    const user: User = {
      id: email,
      email: email,
      name: email.split('@')[0],
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { user, error: null };
  } catch (err) {
    return { user: null, error: 'Network error' };
  }
}

function jwtSignOut() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getJwtUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

function getJwtToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// ============================================
// Hook
// ============================================

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Initialize
  useEffect(() => {
    const initAuth = async () => {
      if (isSupabaseConfigured()) {
        // Supabase auth
        const { data } = await getUser();
        if (data?.user) {
          setState({
            user: {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name,
            },
            loading: false,
            error: null,
          });
        } else {
          setState({ user: null, loading: false, error: null });
        }

        // Subscribe to auth changes
        const { data: { subscription } } = onAuthStateChange((event, session) => {
          if (session?.user) {
            setState({
              user: {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name,
              },
              loading: false,
              error: null,
            });
          } else {
            setState({ user: null, loading: false, error: null });
          }
        });

        return () => subscription.unsubscribe();
      } else {
        // JWT auth (fallback)
        const user = getJwtUser();
        setState({ user, loading: false, error: null });
      }
    };

    initAuth();
  }, []);

  // Sign In
  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    if (isSupabaseConfigured()) {
      const { data, error } = await signIn(email, password);
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return false;
      }
      if (data?.user) {
        setState({
          user: {
            id: data.user.id,
            email: data.user.email || '',
          },
          loading: false,
          error: null,
        });
        return true;
      }
    } else {
      const { user, error } = await jwtSignIn(email, password);
      if (error) {
        setState(prev => ({ ...prev, loading: false, error }));
        return false;
      }
      setState({ user, loading: false, error: null });
      return true;
    }

    return false;
  }, []);

  // Sign Up
  const register = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    if (isSupabaseConfigured()) {
      const { data, error } = await signUp(email, password);
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return false;
      }
      if (data?.user) {
        setState({
          user: {
            id: data.user.id,
            email: data.user.email || '',
          },
          loading: false,
          error: null,
        });
        return true;
      }
    } else {
      // JWT doesn't support sign up in this simple implementation
      setState(prev => ({ ...prev, loading: false, error: 'Sign up not available' }));
      return false;
    }

    return false;
  }, []);

  // Sign Out
  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await signOut();
    } else {
      jwtSignOut();
    }
    setState({ user: null, loading: false, error: null });
  }, []);

  // Get Auth Header
  const getAuthHeader = useCallback((): Record<string, string> => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      // Supabase handles auth headers automatically
      return {};
    } else {
      const token = getJwtToken();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
    return {};
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.user,
    login,
    register,
    logout,
    getAuthHeader,
  };
}

export default useAuth;
