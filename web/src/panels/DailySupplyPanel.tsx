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
  const valueKey = 'Ethereum'
  const eth = config.chains.find((c) => c.id === 'ethereum')
  const accent = eth?.accent ?? '#627eea'
  const tokenSymbol = config.token.symbol

  return (
    <section className="panel panel--compact">
      <div className="panel-header">
        <div>
          <h2>日次供給量（Ethereum）</h2>
        </div>
      </div>
      <div className="chart-wrapper">
        {isLoading ? (
          <div className="skeleton" aria-hidden />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {(() => {
              const maxValue = data.reduce((m, p) => Math.max(m, Number(p[valueKey] ?? 0)), 0)
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
                  <Bar dataKey={valueKey} stackId="total" fill={accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              )
            })()}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
