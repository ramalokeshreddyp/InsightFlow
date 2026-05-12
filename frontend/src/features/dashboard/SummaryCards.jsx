import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../api'

const METRICS = [
  { key: 'total_events',    label: 'Total Events',      icon: '📊', color: 'brand'   },
  { key: 'page_views',      label: 'Page Views',         icon: '👁️',  color: 'violet'  },
  { key: 'unique_visitors', label: 'Unique Visitors',    icon: '👤', color: 'emerald' },
  { key: 'events_last_7d',  label: 'Events (7d)',        icon: '📈', color: 'pink'    },
]

const COLOR_MAP = {
  brand:   'from-brand-500/20 to-brand-500/5 border-brand-500/20 text-brand-400',
  violet:  'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  pink:    'from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-400',
}

function StatCard({ label, value, icon, color, isLoading }) {
  const colorClass = COLOR_MAP[color] || COLOR_MAP.brand
  return (
    <div className={`card bg-gradient-to-br ${colorClass} border animate-slide-up`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
          {isLoading ? (
            <div className="skeleton h-8 w-24 mt-1" />
          ) : (
            <p className="text-3xl font-bold text-white">{(value ?? 0).toLocaleString()}</p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

export default function SummaryCards({ workspaceSlug }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardSummary', workspaceSlug],
    queryFn: () => analyticsApi.summary(workspaceSlug),
    enabled: !!workspaceSlug,
  })

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {METRICS.map(m => (
        <StatCard
          key={m.key}
          label={m.label}
          icon={m.icon}
          color={m.color}
          value={data?.[m.key]}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
