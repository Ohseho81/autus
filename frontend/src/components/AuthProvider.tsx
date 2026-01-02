import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider










import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider










import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider










import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider










import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider




















import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider










import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider










import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider










import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider










import { createContext, useContext, ReactNode } from 'react'
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth'

// Context
interface AuthContextType {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useGoogleAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Login Button Component
interface LoginButtonProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
}

export function LoginButton({ className = '', variant = 'full' }: LoginButtonProps) {
  const { user, loading, signIn, signOut, isAuthenticated } = useGoogleAuth()

  if (loading) {
    return (
      <button 
        disabled 
        className={`flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-gray-400 ${className}`}
      >
        <span className="animate-pulse">로딩 중...</span>
      </button>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 사용자 정보 */}
        {variant !== 'icon' && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm">👤</span>
              </div>
            )}
            {variant === 'full' && (
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface hover:bg-surface-light rounded transition-colors"
        >
          🚪
          {variant === 'full' && <span>로그아웃</span>}
        </button>
      </div>
    )
  }

  // 로그인 버튼
  return (
    <button
      onClick={signIn}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-white text-gray-800 font-medium rounded-lg
        hover:bg-gray-100 transition-colors
        shadow-sm border border-gray-200
        ${className}
      `}
    >
      {/* Google 아이콘 */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {variant !== 'icon' && <span>Google로 로그인</span>}
    </button>
  )
}

// Google Sync 버튼
interface GoogleSyncButtonProps {
  onSync?: () => void
  disabled?: boolean
  className?: string
}

export function GoogleSyncButton({ onSync, disabled, className = '' }: GoogleSyncButtonProps) {
  const { isAuthenticated, signIn } = useGoogleAuth()

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          bg-blue-600 hover:bg-blue-700 text-white rounded-lg
          transition-colors
          ${className}
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        </svg>
        Google 연결
      </button>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        bg-surface hover:bg-surface-light text-white rounded-lg
        transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {disabled ? '동기화 중...' : 'Google 동기화'}
    </button>
  )
}

export default AuthProvider

























