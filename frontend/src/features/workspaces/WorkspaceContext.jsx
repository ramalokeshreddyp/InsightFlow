import { createContext, useContext, useState, useEffect } from 'react'
import { workspacesApi } from '../../api'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspace, setActiveWorkspace] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchWorkspaces = async () => {
    setIsLoading(true)
    try {
      const data = await workspacesApi.list()
      setWorkspaces(data)
      // Restore last-used workspace from sessionStorage
      const lastSlug = sessionStorage.getItem('activeWorkspaceSlug')
      const last = data.find(w => w.slug === lastSlug)
      if (last) setActiveWorkspace(last)
      else if (data.length > 0) setActiveWorkspace(data[0])
      setError(null)
    } catch (err) {
      setError('Failed to load workspaces.')
    } finally {
      setIsLoading(false)
    }
  }

  const switchWorkspace = (workspace) => {
    setActiveWorkspace(workspace)
    sessionStorage.setItem('activeWorkspaceSlug', workspace.slug)
  }

  const createWorkspace = async (name) => {
    const ws = await workspacesApi.create(name)
    setWorkspaces(prev => [ws, ...prev])
    switchWorkspace(ws)
    return ws
  }

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      isLoading,
      error,
      fetchWorkspaces,
      switchWorkspace,
      createWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
