import type { FC } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import config from '../config.json'
import type { DailySeriesPoint } from '../lib/dailySeries'
import { numberFormatter } from '../lib/format'

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
        {(() => {
          const latest = data[data.length - 1]
          const latestTotal = latest
            ? series.reduce((acc, s) => acc + Number(latest[s.name] ?? 0), 0)
            : 0
          return (
            <div className="total">
              <span>Total</span>
              <strong>{numberFormatter.format(Math.floor(latestTotal))}</strong>
            </div>
          )
        })()}
      </div>
      <div className="chart-wrapper">
        {isLoading ? (
          <div className="skeleton" aria-hidden />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {(() => {
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480
              const leftMargin = isMobile ? 24 : 40
              const rightMargin = isMobile ? 8 : 16

              const step = 500
              const maxTotal = data.reduce((m, p) => {
                const sum = series.reduce((acc, s) => acc + Number(p[s.name] ?? 0), 0)
                return Math.max(m, sum)
              }, 0)
              const maxTick = Math.max(step, Math.ceil(maxTotal / step) * step)
              const tickCount = Math.floor(maxTick / step) + 1
              const ticks = Array.from({ length: tickCount }, (_, i) => i * step)

              return (
                <BarChart
                  data={data}
                  margin={{ top: 8, right: rightMargin, bottom: 8, left: leftMargin }}
                >
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" />
                  <YAxis
                    tickFormatter={(v) => numberFormatter.format(v)}
                    allowDecimals={false}
                    domain={[0, maxTick]}
                    ticks={ticks}
                    stroke="var(--muted)"
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-hover)' }}
                    formatter={(value: number) => numberFormatter.format(Math.floor(Number(value)))}
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
