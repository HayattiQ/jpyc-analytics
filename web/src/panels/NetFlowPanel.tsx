import type { FC } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import config from '../config.json'
import type { FlowSeriesPoint } from '../lib/dailySeries'
import { formatSupplyUnits, numberFormatter } from '../lib/format'

interface NetFlowPanelProps {
  data: FlowSeriesPoint[]
  isLoading: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

const INFLOW_COLOR = '#16a34a'
const OUTFLOW_COLOR = '#f97316'
const UNIT_STEPS = [
  { value: 1_000_000_000_000, suffix: 'T' },
  { value: 1_000_000_000, suffix: 'B' },
  { value: 1_000_000, suffix: 'M' },
  { value: 1_000, suffix: 'K' }
] as const

export const NetFlowPanel: FC<NetFlowPanelProps> = ({ data, isLoading, errorMessage, onRetry }) => {
  const tokenSymbol = config.token.symbol
  const hasError = typeof errorMessage === 'string' && errorMessage.length > 0
  const hasData = data.length > 0
  const showSkeleton = isLoading && !hasError
  const showChart = !showSkeleton && !hasError && hasData
  const showEmpty = !showSkeleton && !hasError && !hasData

  const confirmedSummary = hasData
    ? (() => {
        const index = data.length > 1 ? data.length - 2 : data.length - 1
        const latest = data[Math.max(index, 0)]
        return {
          isoDate: latest.isoDate,
          netInflow: latest.netInflow,
          inflowCount: latest.inflowCount,
          outflowCount: latest.outflowCount
        }
      })()
    : null

  return (
    <section className="panel panel--flow rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="panel-header flex justify-between gap-4 items-start mb-6">
        <div>
          <h2 className="font-bold">日次 Inflow / Outflow</h2>
          <p className="panel-subtitle text-sm text-[color:var(--muted)]">
            Issuer からの供給と Redeem への回収
          </p>
        </div>
        {confirmedSummary && (
          <div className="text-right text-[color:var(--muted)]">
            <span className="text-xs uppercase tracking-wide">
              最新（確定） {confirmedSummary.isoDate}
            </span>
            <strong
              className={`block text-2xl ${
                confirmedSummary.netInflow >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'
              }`}
            >
              {formatSupplyUnits(confirmedSummary.netInflow, tokenSymbol)}
            </strong>
            <span className="text-sm block mt-1">
              {`件数 ${numberFormatter.format(confirmedSummary.inflowCount)} / ${numberFormatter.format(
                confirmedSummary.outflowCount
              )}`}
            </span>
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
      <div className="chart-wrapper h-[320px]">
        {showSkeleton ? (
          <div className="skeleton" aria-hidden />
        ) : showChart ? (
          <ResponsiveContainer width="100%" height={320}>
            {(() => {
              const maxAbs = data.reduce((max, point) => {
                const absIn = Math.abs(point.inflow)
                const absOut = Math.abs(point.outflow)
                return Math.max(max, absIn, absOut)
              }, 0)
              const picked = UNIT_STEPS.find((step) => maxAbs >= step.value)
              const divisor = picked ? picked.value : 1
              const suffix = picked ? picked.suffix : ''
              const paddedMax = Math.max(1, Math.ceil(maxAbs / divisor) * divisor)
              const domain = [-paddedMax, paddedMax]
              const ticks = [domain[0], domain[0] / 2, 0, domain[1] / 2, domain[1]]
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480
              const leftMargin = isMobile ? 32 : 48
              const rightMargin = isMobile ? 8 : 16

              return (
                <BarChart
                  data={data}
                  stackOffset="sign"
                  margin={{ top: 8, right: rightMargin, bottom: 8, left: leftMargin }}
                >
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" />
                  <YAxis
                    domain={domain}
                    ticks={ticks}
                    tickFormatter={(value) => `${(value / divisor).toFixed(1)}${suffix}`}
                    stroke="var(--muted)"
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-hover)' }}
                    formatter={(_value: number, name: string, payload) => {
                      const base =
                        name === 'inflow' ? payload.payload.inflowAbs : payload.payload.outflowAbs
                      return [
                        formatSupplyUnits(base, tokenSymbol),
                        name === 'inflow' ? 'Inflow' : 'Outflow'
                      ]
                    }}
                    labelFormatter={(label: string, payload) => {
                      const iso = payload?.[0]?.payload?.isoDate as string | undefined
                      return iso ?? label
                    }}
                  />
                  <Bar dataKey="inflow" stackId="flow" fill={INFLOW_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" stackId="flow" fill={OUTFLOW_COLOR} radius={[0, 0, 4, 4]} />
                </BarChart>
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
