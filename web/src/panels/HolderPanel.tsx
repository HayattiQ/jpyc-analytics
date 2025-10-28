import type { FC } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import config from '../config.json'
import type { DailySeriesPoint } from '../lib/dailySeries'

interface HolderPanelProps {
  data: DailySeriesPoint[]
  isLoading: boolean
}

export const HolderPanel: FC<HolderPanelProps> = ({ data, isLoading }) => {
  const series = config.chains
    .filter((c) => c.id === 'ethereum' || c.id === 'polygon' || c.id === 'avalanche')
    .map((c) => ({ name: c.name, accent: c.accent }))

  return (
    <section className="panel panel--compact">
      <div className="panel-header">
        <div>
          <h2>日次ホルダー数</h2>
        </div>
      </div>
      <div className="chart-wrapper">
        {isLoading ? (
          <div className="skeleton" aria-hidden />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {(() => {
              const maxValue = data.reduce((m, p) => {
                const sum = series.reduce((acc, s) => acc + Number(p[s.name] ?? 0), 0)
                return Math.max(m, sum)
              }, 0)
              const units = [
                { value: 1_000_000_000, suffix: 'B' },
                { value: 1_000_000, suffix: 'M' },
                { value: 1_000, suffix: 'K' }
              ] as const
              const picked = units.find((u) => maxValue >= u.value)
              const divisor = picked ? picked.value : 1
              const suffix = picked ? picked.suffix : ''
              const formatTick = (value: number) => `${Math.floor(value / divisor)}${suffix}`
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480
              const leftMargin = isMobile ? 24 : 40
              const rightMargin = isMobile ? 8 : 16

              return (
                <BarChart
                  data={data}
                  margin={{ top: 8, right: rightMargin, bottom: 8, left: leftMargin }}
                >
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" />
                  <YAxis tickFormatter={formatTick} stroke="var(--muted)" />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-hover)' }}
                    labelFormatter={(label: string, payload) => {
                      const iso = payload?.[0]?.payload?.isoDate as string | undefined
                      return iso ?? label
                    }}
                  />
                  {series.map((s, idx) => (
                    <Bar
                      key={s.name}
                      dataKey={s.name}
                      stackId="total"
                      fill={s.accent}
                      radius={idx === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              )
            })()}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
