import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { analyticsApi } from '../../api'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="text-white font-semibold text-sm">
        {payload[0].value.toLocaleString()} events
      </p>
    </div>
  )
}

export default function TimeSeriesChart({ workspaceSlug, period }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['dashboardTimeseries', workspaceSlug, period],
    queryFn: () => analyticsApi.timeseries(workspaceSlug, period),
    enabled: !!workspaceSlug,
  })

  const formatted = data.map(d => ({
    ...d,
    label: (() => {
      try { return format(parseISO(d.date), period === '90d' ? 'MMM d' : 'MMM d') }
      catch { return d.date }
    })(),
  }))

  return (
    <div className="card h-80">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold">Event Trend</h3>
          <p className="text-white/40 text-xs mt-0.5">Daily events over the last {period}</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="skeleton w-full h-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="h-48 flex items-center justify-center text-white/30 text-sm">
          Failed to load chart data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={formatted} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(formatted.length / 6)}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorEvents)"
              dot={false}
              activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
