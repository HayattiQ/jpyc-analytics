import type { FC } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useEthHolderBuckets } from '../hooks/useEthHolderBuckets'
import { numberFormatter } from '../lib/format'

export const EthHolderBucketsPanel: FC = () => {
  const { data, loading, error, reload } = useEthHolderBuckets()
  const slices = data
    ? [
        { name: '<=10k', value: data.le10k, color: '#9CA3AF' },
        { name: '10k-100k', value: data.r10k_100k, color: '#60A5FA' },
        { name: '100k-1M', value: data.r100k_1m, color: '#34D399' },
        { name: '1M-10M', value: data.r1m_10m, color: '#A78BFA' },
        { name: '>10M', value: data.gt10m, color: '#F59E0B' }
      ]
    : []
  const total = data?.total ?? 0

  return (
    <section className="panel panel--compact">
      <div className="panel-header">
        <div>
          <h2>Ethereum 保有額別 割合</h2>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{numberFormatter.format(total)}</strong>
        </div>
      </div>
      {error && (
        <div className="error-banner">
          <div>
            <strong>データ取得に失敗しました。</strong>
            <span>{error}</span>
          </div>
          <button className="ghost-button" onClick={reload}>
            リトライ
          </button>
        </div>
      )}
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
