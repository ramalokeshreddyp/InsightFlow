import { useState, useEffect } from 'react'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'

export default function WorkspacesPage() {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace, fetchWorkspaces, isLoading } = useWorkspace()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchWorkspaces() }, []) // eslint-disable-line

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await createWorkspace(name.trim())
      setName('')
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Failed to create workspace.')
    } finally {
      setCreating(false)
    }
  }

  const roleColor = {
    admin: 'badge-admin',
    editor: 'badge-editor',
    viewer: 'badge-viewer',
  }

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Workspaces</h1>
              <p className="text-white/40 text-sm mt-1">Manage your tenants and team access</p>
            </div>
            <span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20">
              {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Create Workspace Form */}
          <div className="card mb-6">
            <h2 className="text-white font-semibold mb-4">Create New Workspace</h2>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                id="input-workspace-name-page"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Marketing Team, Product Analytics..."
                className="input flex-1"
              />
              <button
                id="btn-create-workspace-page"
                type="submit"
                disabled={creating || !name.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {creating ? 'Creating...' : '+ Create'}
              </button>
            </form>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          {/* Workspace Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-24 text-white/30">
              <p className="text-5xl mb-4">🏢</p>
              <p>No workspaces yet. Create your first one above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {workspaces.map(ws => (
                <div
                  key={ws.id}
                  onClick={() => switchWorkspace(ws)}
                  className={`card-hover cursor-pointer animate-slide-up transition-all duration-200
                    ${ws.id === activeWorkspace?.id ? 'border-brand-500/50 bg-brand-500/5' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center
                                    text-xl font-bold text-white shadow-lg shadow-brand-500/20">
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <span className={roleColor[ws.current_user_role] || 'badge'}>
                      {ws.current_user_role}
                    </span>
                  </div>

                  <h3 className="text-white font-semibold mb-1">{ws.name}</h3>
                  <p className="text-white/40 text-xs font-mono">{ws.slug}</p>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-white/30 text-xs">{ws.member_count} member{ws.member_count !== 1 ? 's' : ''}</span>
                    {ws.id === activeWorkspace?.id ? (
                      <span className="flex items-center gap-1.5 text-xs text-brand-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="text-xs text-white/20">Click to switch</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
