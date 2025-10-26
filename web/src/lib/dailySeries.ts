import config from '../config.json'
import type { ChainMetrics } from '../hooks/useChainMetrics'
import type { NormalizedDailyStat } from '../hooks/useSubgraphStats'

const formatLabel = (date: Date) =>
  `${date.getMonth() + 1}/${date.getDate().toString().padStart(2, '0')}`

export type DailySeriesPoint = {
  label: string
  isoDate: string
  [key: string]: string | number
}

const buildPoint = (date: Date, supplies: ChainMetrics[], totalSupply: number) => {
  const point: DailySeriesPoint = {
    label: formatLabel(date),
    isoDate: date.toISOString().slice(0, 10)
  }

  const denominator = supplies.reduce((acc, chain) => acc + chain.supply, 0)
  supplies.forEach((chain) => {
    const ratio = denominator > 0 ? chain.supply / denominator : 1 / supplies.length
    point[chain.name] = Number((totalSupply * ratio).toFixed(2))
  })

  return point
}

export const buildDailySeries = (
  supplies: ChainMetrics[],
  stats: NormalizedDailyStat[] = [],
  days = 7
): DailySeriesPoint[] => {
  if (supplies.length === 0 || days <= 0) return []

  if (stats.length > 0) {
    const limited = stats.slice(-days)
    return limited.map((stat) => {
      const date = new Date(stat.dayStartTimestamp * 1000)
      return buildPoint(date, supplies, stat.totalSupply)
    })
  }

  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))

  const baseMap = new Map<string, number>()
  supplies.forEach((chain) => {
    baseMap.set(chain.name, chain.supply)
  })

  const points: DailySeriesPoint[] = []

  for (let i = 0; i < days; i++) {
    const current = new Date(start)
    current.setDate(start.getDate() + i)
    const seriesPoint: DailySeriesPoint = {
      label: formatLabel(current),
      isoDate: current.toISOString().slice(0, 10)
    }

    config.chains.forEach((chain, index) => {
      const base = baseMap.get(chain.name) ?? 0
      const dampener = 1 - (days - 1 - i) * 0.01 - index * 0.005
      const value = Math.max(base * dampener, 0)
      seriesPoint[chain.name] = Number(value.toFixed(2))
    })

    points.push(seriesPoint)
  }

  return points
}
