import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 bg-surface-1/80 backdrop-blur border-b border-white/5 px-6 py-3 flex items-center justify-between">
      {/* Left: Hamburger + Breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          id="btn-sidebar-toggle"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-sm text-white/40">
          <span className="text-white/60 font-medium">{activeWorkspace?.name || 'No Workspace'}</span>
          {activeWorkspace && (
            <>
              <span>/</span>
              <span>Dashboard</span>
            </>
          )}
        </div>
      </div>

      {/* Right: User menu */}
      <div className="relative">
        <button
          id="btn-user-menu"
          onClick={() => setMenuOpen(m => !m)}
          className="flex items-center gap-2.5 hover:bg-white/5 rounded-xl px-3 py-2 transition-colors"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <span className="text-sm text-white/70 hidden sm:block max-w-32 truncate">{user?.name || user?.email}</span>
          <svg className={`w-4 h-4 text-white/40 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 card shadow-2xl border border-white/10 py-1 z-50 animate-slide-up">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-white/40 text-xs truncate">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-white/30 capitalize">{user?.provider}</span>
              </div>
            </div>

            <button
              id="btn-logout"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
