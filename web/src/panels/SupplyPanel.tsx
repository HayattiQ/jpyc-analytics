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
}: SupplyPanelProps) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <h2> リアルタイム チェーン別 発行量</h2>
      </div>
      <div className="total">
        <span>Total</span>
        <strong>{formatSupplyUnits(totalSupply, tokenSymbol)}</strong>
      </div>
    </div>

    {status === 'error' && (
      <div className="error-banner">
        <div>
          <strong>データ取得に失敗しました。</strong>
          <span>{errorMessage}</span>
        </div>
        <button className="ghost-button" onClick={onRetry}>
          リトライ
        </button>
      </div>
    )}

    <div className="chart-wrapper">
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

            return (
              <BarChart
                data={sortedSupplies}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 80 }}
              >
                <CartesianGrid strokeDasharray="4 4" horizontal vertical={false} />
                <XAxis
                  type="number"
                  tickFormatter={formatTick}
                  stroke="var(--muted)"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
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
