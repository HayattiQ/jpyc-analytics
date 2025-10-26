import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import type { DailySeriesPoint } from '../lib/dailySeries'
import config from '../config.json'

interface DailySupplyPanelProps {
  data: DailySeriesPoint[]
  isLoading: boolean
}

export const DailySupplyPanel = ({ data, isLoading }: DailySupplyPanelProps) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <h2>日別チェーン別発行量</h2>
        <p className="panel-subtitle">過去 7 日間のチェーン別供給推移（サンプルデータ）</p>
      </div>
    </div>
    <div className="chart-wrapper wide">
      {isLoading ? (
        <div className="skeleton" aria-hidden />
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={data} margin={{ top: 20, right: 24, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="4 4" />
            <XAxis dataKey="label" stroke="var(--muted)" />
            <YAxis
              stroke="var(--muted)"
              tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`}
            />
            <Tooltip
              formatter={(value: number | string) => {
                const numeric = typeof value === 'number' ? value : Number(value)
                return `${(numeric / 1_000_000_000).toFixed(2)}B ${config.token.symbol}`
              }}
            />
            <Legend />
            {config.chains.map((chain) => (
              <Line
                key={chain.id}
                type="monotone"
                dataKey={chain.name}
                stroke={chain.accent}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  </section>
)
