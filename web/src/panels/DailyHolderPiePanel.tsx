import type { FC } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useLatestHolderCounts } from '../hooks/useLatestHolderCounts'
import { numberFormatter } from '../lib/format'

export const DailyHolderPiePanel: FC = () => {
  const { data, loading } = useLatestHolderCounts()
  const slices = data
    .filter((d) => d.holderCount !== null)
    .map((d) => ({ name: d.name, value: d.holderCount as number, color: d.accent }))
  const total = slices.reduce((acc, s) => acc + s.value, 0)

  return (
    <section className="panel panel--compact">
      <div className="panel-header">
        <div>
          <h2>日次ホルダー数（円グラフ）</h2>
          <p className="panel-subtitle">エラーのチェーンは除外して表示</p>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{numberFormatter.format(total)}</strong>
        </div>
      </div>
      <div className="chart-wrapper">
        {loading ? (
          <div className="skeleton" aria-hidden />
        ) : slices.length === 0 ? (
          <div className="coming-soon-placeholder" aria-hidden>
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, payload) => {
                  const percent = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0'
                  return [`${numberFormatter.format(Number(value))} (${percent}%)`, payload?.payload?.name]
                }}
              />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

