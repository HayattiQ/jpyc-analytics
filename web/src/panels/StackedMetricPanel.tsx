import type { FC } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { DailySeriesPoint } from '../lib/dailySeries'
import { formatSupplyUnits } from '../lib/format'

interface SeriesDescriptor {
  name: string
  accent: string
}

interface StackedMetricPanelProps {
  title: string
  subtitle: string
  data: DailySeriesPoint[]
  series: SeriesDescriptor[]
  tokenSymbol: string
  isLoading: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

const UNIT_STEPS = [
  { value: 1_000_000_000_000, suffix: 'T' },
  { value: 1_000_000_000, suffix: 'B' },
  { value: 1_000_000, suffix: 'M' },
  { value: 1_000, suffix: 'K' }
] as const

export const StackedMetricPanel: FC<StackedMetricPanelProps> = ({
  title,
  subtitle,
  data,
  series,
  tokenSymbol,
  isLoading,
  errorMessage,
  onRetry
}) => {
  const chartHeight = 260
  const hasError = typeof errorMessage === 'string' && errorMessage.length > 0
  const hasData = data.length > 0
  const showSkeleton = isLoading && !hasError
  const showChart = !showSkeleton && !hasError && hasData
  const showEmpty = !showSkeleton && !hasError && !hasData

  const confirmedSummary = hasData
    ? (() => {
        const index = data.length > 1 ? data.length - 2 : data.length - 1
        const confirmed = data[Math.max(index, 0)]
        const confirmedTotal = series.reduce((acc, s) => acc + Number(confirmed[s.name] ?? 0), 0)
        return {
          isoDate: confirmed.isoDate,
          total: confirmedTotal
        }
      })()
    : null

  return (
    <section className="panel panel--stacked rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="panel-header flex justify-between gap-4 items-start mb-6">
        <div>
          <h2 className="font-semibold text-lg leading-tight">{title}</h2>
          <p className="panel-subtitle text-xs md:text-sm text-[color:var(--muted)] leading-snug">
            {subtitle}
          </p>
        </div>
        {confirmedSummary && (
          <div className="total text-right text-[color:var(--muted)] text-xs">
            <span className="uppercase tracking-wide">
              最新（確定） {confirmedSummary.isoDate}
            </span>
            <strong className="block text-xl text-[#0f172a]">
              {formatSupplyUnits(confirmedSummary.total, tokenSymbol)}
            </strong>
          </div>
        )}
      </div>
      {hasError && (
        <div className="error-banner border border-red-200 bg-[var(--error-bg)] text-[var(--error-text)] rounded-xl px-4 py-3 flex justify-between items-center gap-4 mb-4">
          <div>
            <strong className="block">サブグラフからの取得に失敗しました。</strong>
            <span>{errorMessage}</span>
          </div>
          {typeof onRetry === 'function' && (
            <button
              type="button"
              className="ghost-button border border-[var(--border)] rounded-full px-4 py-2 font-semibold"
              onClick={() => onRetry()}
            >
              リトライ
            </button>
          )}
        </div>
      )}
      <div className="chart-wrapper h-[260px]">
        {showSkeleton ? (
          <div className="skeleton" aria-hidden />
        ) : showChart ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            {(() => {
              const maxValue = data.reduce((max, point) => {
                const total = series.reduce((sum, s) => sum + Number(point[s.name] ?? 0), 0)
                return Math.max(max, total)
              }, 0)
              const picked = UNIT_STEPS.find((step) => maxValue >= step.value)
              const divisor = picked ? picked.value : 1
              const suffix = picked ? picked.suffix : ''
              const formatTick = (value: number) => `${(value / divisor).toFixed(1)}${suffix}`
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480
              const leftMargin = isMobile ? 24 : 40
              const rightMargin = isMobile ? 8 : 16

              return (
                <AreaChart data={data} margin={{ top: 8, right: rightMargin, bottom: 8, left: leftMargin }}>
                  <defs>
                    {series.map((s) => (
                      <linearGradient key={s.name} id={`stacked-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.accent} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={s.accent} stopOpacity={0.1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" />
                  <YAxis tickFormatter={formatTick} stroke="var(--muted)" />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-hover)' }}
                    formatter={(value: number) => formatSupplyUnits(Number(value), tokenSymbol)}
                    labelFormatter={(label: string, payload) => {
                      const iso = payload?.[0]?.payload?.isoDate as string | undefined
                      return iso ?? label
                    }}
                  />
                  {series.map((s) => (
                    <Area
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stackId="metric"
                      stroke={s.accent}
                      fill={`url(#stacked-${s.name})`}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
              )
            })()}
          </ResponsiveContainer>
        ) : showEmpty ? (
          <div className="flex h-full items-center justify-center text-[color:var(--muted)]">
            データはまだありません
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[color:var(--muted)]">
            取得をやり直してください
          </div>
        )}
      </div>
    </section>
  )
}
