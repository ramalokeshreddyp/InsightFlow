import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />

  return user
    ? <Outlet />
    : <Navigate to="/login" state={{ from: location }} replace />
}
