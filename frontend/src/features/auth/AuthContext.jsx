import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUser = useCallback(async () => {
    try {
      const userData = await authApi.me()
      setUser(userData)
      setError(null)
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setUser(null)
      } else {
        setError('Failed to check authentication status.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const loginWithGoogle = useCallback(async (code) => {
    setIsLoading(true)
    try {
      const userData = await authApi.loginWithGoogle(code)
      setUser(userData)
      setError(null)
      return userData
    } catch (err) {
      const msg = err.response?.data?.error || 'Google login failed.'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loginWithGitHub = useCallback(async (code) => {
    setIsLoading(true)
    try {
      const userData = await authApi.loginWithGitHub(code)
      setUser(userData)
      setError(null)
      return userData
    } catch (err) {
      const msg = err.response?.data?.error || 'GitHub login failed.'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  // Dev login — uses the seeded demo user via session
  const devLogin = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/dev-login/', { method: 'POST', credentials: 'include' })
      if (res.ok) {
        await fetchUser()
      }
    } catch {
      console.warn('Dev login not available')
    }
  }, [fetchUser])

  return (
    <AuthContext.Provider value={{ user, isLoading, error, loginWithGoogle, loginWithGitHub, logout, devLogin, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
