import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../api'

export default function TopPagesTable({ workspaceSlug }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardSummary', workspaceSlug],
    queryFn: () => analyticsApi.summary(workspaceSlug),
    enabled: !!workspaceSlug,
  })

  const pages = data?.top_pages || []
  const maxCount = pages[0]?.count || 1

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold">Top Pages</h3>
          <p className="text-white/40 text-xs mt-0.5">Most visited pages by event count</p>
        </div>
        <span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20">
          {pages.length} pages
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <p className="text-4xl mb-3">📭</p>
          <p>No page views recorded yet.</p>
          <p className="text-xs mt-1">Ingest some <code>page_view</code> events to see data here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="text-left pb-3 font-medium">#</th>
                <th className="text-left pb-3 font-medium">Page</th>
                <th className="text-right pb-3 font-medium">Views</th>
                <th className="text-right pb-3 font-medium w-32">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pages.map((page, i) => {
                const pct = Math.round((page.count / maxCount) * 100)
                return (
                  <tr key={i} className="hover:bg-white/2 transition-colors group">
                    <td className="py-3 pr-4 text-white/30 font-mono text-xs">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-500/60 group-hover:bg-brand-500 transition-colors" />
                        <span className="text-white/80 font-mono text-xs">{page.page}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-white">
                      {page.count.toLocaleString()}
                    </td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full
                                       transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-white/40 text-xs w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
