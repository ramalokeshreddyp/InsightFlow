import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from './WorkspaceContext'

export default function EmptyWorkspace() {
  const { createWorkspace } = useWorkspace()
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsCreating(true)
    setError('')
    try {
      await createWorkspace(name.trim())
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Failed to create workspace.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md animate-slide-up">
        <div className="text-6xl mb-6">🏢</div>
        <h2 className="text-2xl font-bold text-white mb-3">Create your first workspace</h2>
        <p className="text-white/40 text-sm mb-8">
          A workspace represents your organization or project. All analytics data is isolated per workspace.
        </p>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            id="input-workspace-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Acme Inc."
            className="input flex-1"
            autoFocus
          />
          <button
            id="btn-create-workspace"
            type="submit"
            disabled={isCreating || !name.trim()}
            className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
    </div>
  )
}
