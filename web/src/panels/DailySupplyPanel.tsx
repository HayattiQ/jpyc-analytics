import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
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
  errorMessage?: string | null
  onRetry?: () => void
}

export const DailySupplyPanel: FC<DailySupplyPanelProps> = ({
  data,
  isLoading,
  errorMessage,
  onRetry
}) => {
  const { t } = useTranslation()
  const tokenSymbol = config.token.symbol
  const series = config.chains
    .filter((c) => c.id === 'ethereum' || c.id === 'polygon' || c.id === 'avalanche')
    .map((c) => ({ name: c.name, accent: c.accent }))
  const hasError = typeof errorMessage === 'string' && errorMessage.length > 0
  const showSkeleton = isLoading && !hasError
  const showChart = !showSkeleton && !hasError && data.length > 0
  const showEmpty = !showSkeleton && !hasError && data.length === 0
  const confirmedSummary =
    data.length > 0
      ? (() => {
          const index = data.length > 1 ? data.length - 2 : data.length - 1
          const confirmed = data[Math.max(index, 0)]
          const total = series.reduce((acc, s) => acc + Number(confirmed[s.name] ?? 0), 0)
          return { isoDate: confirmed.isoDate, total }
        })()
      : null

  return (
    <section className="panel panel--compact rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="panel-header flex justify-between gap-4 items-start mb-4">
        <div>
          <h2 className="font-bold">{t('panels.dailySupply.title')}</h2>
        </div>
        {confirmedSummary && (
          <div className="total text-right text-[color:var(--muted)]">
            <span className="text-xs uppercase tracking-wide">
              {t('messages.latestConfirmed', { date: confirmedSummary.isoDate })}
            </span>
            <strong className="block text-2xl text-[#0f172a]">
              {formatSupplyUnits(confirmedSummary.total, tokenSymbol)}
            </strong>
          </div>
        )}
      </div>
      {hasError && (
        <div className="error-banner border border-red-200 bg-[var(--error-bg)] text-[var(--error-text)] rounded-xl px-4 py-3 flex justify-between items-center gap-4 mb-4">
          <div>
            <strong className="block">{t('messages.subgraphError')}</strong>
            <span>{errorMessage}</span>
          </div>
          {typeof onRetry === 'function' && (
            <button
              type="button"
              className="ghost-button border border-[var(--border)] rounded-full px-4 py-2 font-semibold"
              onClick={() => onRetry()}
            >
              {t('messages.retry')}
            </button>
          )}
        </div>
      )}
      <div className="chart-wrapper h-[320px]">
        {showSkeleton ? (
          <div className="skeleton" aria-hidden />
        ) : showChart ? (
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
        ) : showEmpty ? (
          <div className="flex h-full items-center justify-center text-[color:var(--muted)]">
            {t('messages.noData')}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[color:var(--muted)]">
            {t('messages.refetch')}
          </div>
        )}
      </div>
    </section>
  )
}
