import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import LoadingScreen from '../../components/LoadingScreen'

/**
 * Handles the OAuth callback for a given provider.
 * Extracts the `code` from the URL, sends it to the backend, then redirects.
 */
export default function OAuthCallback({ provider }) {
  const [searchParams] = useSearchParams()
  const { loginWithGoogle, loginWithGitHub } = useAuth()
  const navigate = useNavigate()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    const doLogin = provider === 'google' ? loginWithGoogle : loginWithGitHub
    doLogin(code)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => navigate('/login?error=login_failed', { replace: true }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <LoadingScreen />
}
