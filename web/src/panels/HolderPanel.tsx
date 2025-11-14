import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import config from '../config.json'
import type { DailySeriesPoint } from '../lib/dailySeries'
import { numberFormatter } from '../lib/format'

interface HolderPanelProps {
  data: DailySeriesPoint[]
  isLoading: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

export const HolderPanel: FC<HolderPanelProps> = ({ data, isLoading, errorMessage, onRetry }) => {
  const { t } = useTranslation()
  const series = config.chains
    .filter((c) => c.id === 'ethereum' || c.id === 'polygon' || c.id === 'avalanche')
    .map((c) => ({ name: c.name, accent: c.accent }))
  const hasError = typeof errorMessage === 'string' && errorMessage.length > 0
  const hasData = data.length > 0
  const showSkeleton = isLoading && !hasError
  const showChart = !showSkeleton && !hasError && hasData
  const showEmpty = !showSkeleton && !hasError && !hasData

  return (
    <section className="panel panel--holder rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="panel-header flex justify-between gap-4 items-start mb-6">
        <div>
          <h2 className="font-bold">{t('panels.holder.title')}</h2>
        </div>
        {hasData && (
          (() => {
            const latest = data[data.length - 1]
            const latestTotal = latest
              ? series.reduce((acc, s) => acc + Number(latest[s.name] ?? 0), 0)
              : 0
            return (
              <div className="total text-right text-[var(--muted)]">
                <span>{t('messages.total')}</span>
                <strong className="block text-[#0f172a] text-2xl mt-1">
                  {numberFormatter.format(Math.floor(latestTotal))}
                </strong>
              </div>
            )
          })()
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
