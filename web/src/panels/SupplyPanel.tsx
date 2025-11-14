import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { ChainMetrics, SupplyStatus } from '../hooks/useChainMetrics'
import { formatSupplyUnits } from '../lib/format'

interface SupplyPanelProps {
  tokenSymbol: string
  totalSupply: number
  sortedSupplies: ChainMetrics[]
  status: SupplyStatus
  errorMessage: string | null
  onRetry: () => void
  isInitialLoading: boolean
}

export const SupplyPanel = ({
  tokenSymbol,
  totalSupply,
  sortedSupplies,
  status,
  errorMessage,
  onRetry,
  isInitialLoading
}: SupplyPanelProps) => {
  const { t } = useTranslation()
  return (
    <section className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="panel-header flex justify-between gap-4 items-start mb-6">
        <div>
          <h2 className="font-bold">{t('panels.supply.title')}</h2>
        </div>
        <div className="total text-right text-[var(--muted)]">
          <span>{t('messages.total')}</span>
          <strong className="block text-[#0f172a] text-2xl mt-1">
            {formatSupplyUnits(totalSupply, tokenSymbol)}
          </strong>
        </div>
      </div>

      {status === 'error' && (
        <div className="error-banner border border-red-200 bg-[var(--error-bg)] text-[var(--error-text)] rounded-xl px-4 py-3 flex justify-between items-center gap-4 mb-4">
          <div>
            <strong>{t('messages.genericError')}</strong>
            <span>{errorMessage}</span>
          </div>
          <button
            className="ghost-button border border-[var(--border)] rounded-full px-4 py-2 font-semibold"
            onClick={onRetry}
          >
            {t('messages.retry')}
          </button>
        </div>
      )}

      <div className="chart-wrapper h-[320px]">
        {isInitialLoading ? (
          <div className="skeleton" aria-hidden />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {(() => {
              const maxValue = sortedSupplies.reduce((m, c) => Math.max(m, c.supply), 0)
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
              const yAxisWidth = isMobile ? 64 : 80

              return (
                <BarChart
                  data={sortedSupplies}
                  layout="vertical"
                  margin={{ top: 8, right: rightMargin, bottom: 8, left: leftMargin }}
                >
                  <CartesianGrid strokeDasharray="4 4" horizontal vertical={false} />
                  <XAxis type="number" tickFormatter={formatTick} stroke="var(--muted)" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={yAxisWidth}
                    axisLine={false}
                    tickLine={false}
                    stroke="var(--muted)"
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-hover)' }}
                    formatter={(value: number) => formatSupplyUnits(value, tokenSymbol)}
                  />
                  <Bar dataKey="supply" radius={[0, 8, 8, 0]}>
                    {sortedSupplies.map((entry) => (
                      <Cell key={entry.chainId} fill={entry.accent} />
                    ))}
                  </Bar>
                </BarChart>
              )
            })()}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
