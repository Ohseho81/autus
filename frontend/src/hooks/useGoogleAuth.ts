/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth










/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth










/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth










/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth










/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth




















/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth










/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth










/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth










/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth










/**
 * AUTUS-PRIME: Google OAuth Hook
 * 
 * Google Identity Services를 사용한 OAuth 인증
 * - 로그인/로그아웃
 * - 토큰 관리
 * - 사용자 정보 조회
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  refreshToken?: string
}

interface UseGoogleAuthReturn {
  user: GoogleUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
}

// Google Client ID (환경변수에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 로컬 스토리지 키
const STORAGE_KEY = 'autus_user'

/**
 * Google OAuth 훅
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: 저장된 사용자 복원
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Google Identity Services 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[Auth] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    // Google Identity Services 스크립트 로드
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // 구글 로그인 응답 처리
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // JWT 디코딩 (간단한 방식)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        accessToken: response.credential,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      setError(null)

      // 백엔드에 토큰 전송
      sendTokenToBackend(response.credential)
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.')
      console.error('[Auth] Credential response error:', err)
    }
  }, [])

  // 백엔드에 토큰 전송
  const sendTokenToBackend = async (idToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!response.ok) {
        throw new Error('Backend authentication failed')
      }

      const data = await response.json()
      console.log('[Auth] Backend login success:', data)
    } catch (err) {
      console.error('[Auth] Backend login error:', err)
      // 백엔드 실패해도 프론트 로그인은 유지 (오프라인 대비)
    }
  }

  // 로그인
  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Google Client ID가 없으면 데모 모드
      const demoUser: GoogleUser = {
        id: 'demo_user_001',
        email: 'demo@autus.prime',
        name: '데모 사용자',
        picture: '',
        accessToken: 'demo_token',
      }
      setUser(demoUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Google One Tap 프롬프트 표시
      window.google?.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap이 표시되지 않으면 팝업 방식 사용
          window.google?.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                fetchUserInfo(tokenResponse.access_token)
              }
            },
          }).requestAccessToken()
        }
      })
    } catch (err) {
      setError('로그인에 실패했습니다.')
      console.error('[Auth] Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용자 정보 가져오기 (OAuth2 토큰 방식)
  const fetchUserInfo = async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch user info')

      const userInfo = await response.json()
      
      const googleUser: GoogleUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: accessToken,
      }

      setUser(googleUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
      sendTokenToBackend(accessToken)
    } catch (err) {
      setError('사용자 정보를 가져오는데 실패했습니다.')
      console.error('[Auth] Fetch user info error:', err)
    }
  }

  // 로그아웃
  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    
    // Google 로그아웃
    window.google?.accounts.id.disableAutoSelect()
    
    // 백엔드 로그아웃
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}

// Google 타입 선언
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          disableAutoSelect: () => void
          renderButton: (element: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export default useGoogleAuth


























