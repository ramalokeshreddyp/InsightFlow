import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { analyticsApi } from '../../api'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']

export default function TopEventsChart({ workspaceSlug }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardSummary', workspaceSlug],
    queryFn: () => analyticsApi.summary(workspaceSlug),
    enabled: !!workspaceSlug,
  })

  const events = (data?.top_events || []).slice(0, 6)

  return (
    <div className="card h-80 flex flex-col">
      <div className="mb-4">
        <h3 className="text-white font-semibold">Event Breakdown</h3>
        <p className="text-white/40 text-xs mt-0.5">Top event types</p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="skeleton w-full h-40 rounded-xl" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
          No events yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={events} layout="vertical" margin={{ left: 0, right: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="event"
              type="category"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={({ payload, label }) => {
                if (!payload?.length) return null
                return (
                  <div className="bg-surface-2 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
                    <p className="text-white/50 text-xs mb-1">{label}</p>
                    <p className="text-white font-semibold text-sm">{payload[0].value.toLocaleString()} events</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {events.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-2 gap-1">
        {events.slice(0, 4).map((e, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-white/40">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
            <span className="truncate">{e.event}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
