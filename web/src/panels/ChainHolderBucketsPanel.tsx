import type { FC } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useChainHolderBuckets } from '../hooks/useChainHolderBuckets'
import { numberFormatter } from '../lib/format'

interface Props {
  chainId: string
}

export const ChainHolderBucketsPanel: FC<Props> = ({ chainId }) => {
  const { data, loading, error, reload, chain } = useChainHolderBuckets(chainId)
  const slices = data
    ? [
        { name: '<=10k', value: data.le10k, color: '#F59E0B' },
        { name: '10k-100k', value: data.r10k_100k, color: '#60A5FA' },
        { name: '100k-1M', value: data.r100k_1m, color: '#34D399' },
        { name: '1M-10M', value: data.r1m_10m, color: '#A78BFA' },
        { name: '>10M', value: data.gt10m, color: '#EF4444' }
      ]
    : []
  const total = data?.total ?? 0
  const RADIAN = Math.PI / 180
  const renderLabel = (props: unknown) => {
    const p = props as {
      cx: number
      cy: number
      midAngle: number
      innerRadius: number
      outerRadius: number
      percent: number
      name: string
    }
    if (!p || p.percent < 0.03) return null // 3%未満はラベル省略
    const r = p.innerRadius + (p.outerRadius - p.innerRadius) * 0.62
    const x = p.cx + r * Math.cos(-p.midAngle * RADIAN)
    const y = p.cy + r * Math.sin(-p.midAngle * RADIAN)
    const pct = (p.percent * 100).toFixed(0)
    return (
      <text x={x} y={y} fill="#0f172a" textAnchor="middle" dominantBaseline="central" fontSize={12}>
        {`${p.name} ${pct}%`}
      </text>
    )
  }

  return (
    <section className="panel panel--bucket">
      <div className="panel-header">
        <div>
          <h2>ホルダー数 保有額別割合（{chain?.name ?? chainId}）</h2>
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
          <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth <= 480 ? 200 : 260}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={90}
                paddingAngle={2}
                labelLine={false}
                label={renderLabel}
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
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* bottom percentage summary reverted as requested */}
    </section>
  )
}
