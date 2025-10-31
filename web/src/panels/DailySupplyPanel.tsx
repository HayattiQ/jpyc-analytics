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
import { formatSupplyUnits } from '../lib/format'

interface DailySupplyPanelProps {
  data: DailySeriesPoint[]
  isLoading: boolean
}

export const DailySupplyPanel: FC<DailySupplyPanelProps> = ({ data, isLoading }) => {
  const tokenSymbol = config.token.symbol
  const series = config.chains
    .filter((c) => c.id === 'ethereum' || c.id === 'polygon' || c.id === 'avalanche')
    .map((c) => ({ name: c.name, accent: c.accent }))

  return (
    <section className="panel panel--compact rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="panel-header flex justify-between gap-4 items-start mb-4">
        <div>
          <h2 className="font-bold">日次供給量</h2>
        </div>
      </div>
      <div className="chart-wrapper h-[320px]">
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
                { value: 1_000_000_000_000, suffix: 'T' },
                { value: 1_000_000_000, suffix: 'B' },
                { value: 1_000_000, suffix: 'M' },
                { value: 1_000, suffix: 'K' }
              ] as const
              const picked = units.find((u) => maxValue >= u.value)
              const divisor = picked ? picked.value : 1
              const suffix = picked ? picked.suffix : ''
              const formatTick = (value: number) => `${(value / divisor).toFixed(1)}${suffix}`
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
                    formatter={(value: number) => formatSupplyUnits(value, tokenSymbol)}
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
