import { useState, useRef, useEffect } from 'react'
import { useWorkspace } from './WorkspaceContext'

export default function WorkspaceSelector() {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createWorkspace(newName.trim())
      setNewName('')
      setShowCreate(false)
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        id="btn-workspace-selector"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-2 border border-white/5
                   hover:border-white/10 transition-all duration-200 text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {activeWorkspace?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {activeWorkspace?.name || 'Select workspace'}
          </p>
          <p className="text-white/30 text-xs truncate">
            {activeWorkspace?.current_user_role || 'No role'}
          </p>
        </div>
        <svg className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-2 border border-white/10 rounded-xl
                        shadow-2xl z-50 overflow-hidden animate-slide-up">
          <div className="py-1 max-h-64 overflow-y-auto">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left
                            ${ws.id === activeWorkspace?.id ? 'bg-brand-500/10' : ''}`}
              >
                <div className="w-6 h-6 rounded-md bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {ws.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{ws.name}</p>
                  <p className="text-white/30 text-xs">{ws.member_count} member{ws.member_count !== 1 ? 's' : ''}</p>
                </div>
                {ws.id === activeWorkspace?.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 p-2">
            {showCreate ? (
              <form onSubmit={handleCreate} className="flex gap-2">
                <input
                  id="input-new-workspace"
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Workspace name"
                  className="input py-1.5 text-xs flex-1"
                />
                <button type="submit" disabled={creating} className="btn-primary py-1.5 text-xs px-3">
                  {creating ? '...' : 'Add'}
                </button>
              </form>
            ) : (
              <button
                id="btn-new-workspace"
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/50
                           hover:text-white hover:bg-white/5 transition-colors text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
