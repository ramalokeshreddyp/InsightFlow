import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import SummaryCards from '../features/dashboard/SummaryCards'
import TimeSeriesChart from '../features/dashboard/TimeSeriesChart'
import TopPagesTable from '../features/dashboard/TopPagesTable'
import TopEventsChart from '../features/dashboard/TopEventsChart'
import EmptyWorkspace from '../features/workspaces/EmptyWorkspace'

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeWorkspace, workspaces, isLoading: wsLoading, fetchWorkspaces } = useWorkspace()
  const [period, setPeriod] = useState('7d')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetchWorkspaces()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (wsLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-white/40">Loading workspaces...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-6 space-y-6 overflow-auto animate-fade-in">
          {!activeWorkspace || workspaces.length === 0 ? (
            <EmptyWorkspace />
          ) : (
            <>
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Dashboard
                  </h1>
                  <p className="text-white/40 text-sm mt-1">
                    Analytics for <span className="text-brand-400 font-medium">{activeWorkspace.name}</span>
                  </p>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1 border border-white/5">
                  {['7d', '30d', '90d'].map(p => (
                    <button
                      key={p}
                      id={`btn-period-${p}`}
                      onClick={() => setPeriod(p)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${period === p
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                          : 'text-white/50 hover:text-white'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI Cards */}
              <SummaryCards workspaceSlug={activeWorkspace.slug} />

              {/* Charts Row */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <TimeSeriesChart workspaceSlug={activeWorkspace.slug} period={period} />
                </div>
                <TopEventsChart workspaceSlug={activeWorkspace.slug} />
              </div>

              {/* Top Pages */}
              <TopPagesTable workspaceSlug={activeWorkspace.slug} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
