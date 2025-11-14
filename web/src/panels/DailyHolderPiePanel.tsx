import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useLatestHolderCounts } from '../hooks/useLatestHolderCounts'
import { numberFormatter } from '../lib/format'

export const DailyHolderPiePanel: FC = () => {
  const { t } = useTranslation()
  const { data, loading } = useLatestHolderCounts()
  const slices = data
    .filter((d) => d.holderCount !== null)
    .map((d) => ({ name: d.name, value: d.holderCount as number, color: d.accent }))
  const total = slices.reduce((acc, s) => acc + s.value, 0)

  return (
    <section className="panel panel--compact rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="panel-header flex justify-between gap-4 items-start mb-4">
        <div>
          <h2 className="font-bold">{t('panels.dailyHolderPie.title')}</h2>
          <p className="panel-subtitle">{t('panels.dailyHolderPie.subtitle')}</p>
        </div>
        <div className="total text-right text-[var(--muted)]">
          <span>{t('messages.total')}</span>
          <strong className="block text-[#0f172a] text-2xl mt-1">{numberFormatter.format(total)}</strong>
        </div>
      </div>
      <div className="chart-wrapper h-[320px]">
        {loading ? (
          <div className="skeleton" aria-hidden />
        ) : slices.length === 0 ? (
          <div className="coming-soon-placeholder" aria-hidden>
            {t('messages.noData')}
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
