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
import { numberFormatter } from '../lib/format'

interface HolderPanelProps {
  data: Array<{
    chainId: string
    name: string
    accent: string
    holderCount: number
  }>
  total: number
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => void
}

export const HolderPanel = ({
  data,
  total,
  isLoading,
  errorMessage,
  onRetry
}: HolderPanelProps) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>チェーン別ホルダー数</h2>
          <p className="panel-subtitle">各チェーンごとのリアルタイムでのJPYCホルダー数情報</p>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{numberFormatter.format(total)}</strong>
        </div>
      </div>

      {errorMessage && (
        <div className="error-banner">
          <div>
            <strong>ホルダー数の取得に失敗しました。</strong>
            <span>{errorMessage}</span>
          </div>
          <button className="ghost-button" onClick={onRetry}>
            リトライ
          </button>
        </div>
      )}

      <div className="chart-wrapper">
        {isLoading ? (
          <div className="skeleton" aria-hidden />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 80 }}
            >
              <CartesianGrid strokeDasharray="4 4" horizontal vertical={false} />
              <XAxis
                type="number"
                tickFormatter={(value) => numberFormatter.format(value)}
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
                formatter={(value: number) => `${numberFormatter.format(value)} wallets`}
              />
              <Bar dataKey="holderCount" radius={[0, 8, 8, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.chainId} fill={entry.accent} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
