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
        <h2>チェーン別供給量</h2>
        <p className="panel-subtitle">直接 RPC から totalSupply() を呼び出して取得</p>
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
          <BarChart
            data={sortedSupplies}
            layout="vertical"
            margin={{ top: 8, right: 24, bottom: 8, left: 80 }}
          >
            <CartesianGrid strokeDasharray="4 4" horizontal vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`}
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
        </ResponsiveContainer>
      )}
    </div>
  </section>
)
