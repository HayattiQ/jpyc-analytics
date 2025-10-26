import config from '../config.json'
import type { ChainMetrics } from '../hooks/useChainMetrics'

const formatLabel = (date: Date) =>
  `${date.getMonth() + 1}/${date.getDate().toString().padStart(2, '0')}`

export type DailySeriesPoint = {
  label: string
  isoDate: string
  [key: string]: string | number
}

export interface NormalizedDailyStat {
  dayStartTimestamp: number
  totalSupply: number
}

export interface ChainDailySeries {
  chainId: string
  name: string
  accent: string
  stats: NormalizedDailyStat[]
}

const buildFromChainStats = (
  chainStats: ChainDailySeries[],
  days: number
): DailySeriesPoint[] => {
  const timestampSet = new Set<number>()
  chainStats.forEach((chain) => {
    chain.stats.forEach((stat) => timestampSet.add(stat.dayStartTimestamp))
  })

  const sortedTimestamps = Array.from(timestampSet).sort((a, b) => a - b)
  const selected = sortedTimestamps.slice(-days)

  if (selected.length === 0) return []

  const chainMaps = chainStats.map((chain) => ({
    name: chain.name,
    data: new Map(
      chain.stats.map((stat) => [stat.dayStartTimestamp, stat.totalSupply] as const)
    )
  }))

  return selected.map((timestamp) => {
    const date = new Date(timestamp * 1000)
    const point: DailySeriesPoint = {
      label: formatLabel(date),
      isoDate: date.toISOString().slice(0, 10)
    }

    chainMaps.forEach((chain) => {
      const value = chain.data.get(timestamp) ?? 0
      point[chain.name] = Number(value.toFixed(2))
    })

    return point
  })
}

const buildSyntheticSeries = (supplies: ChainMetrics[], days: number): DailySeriesPoint[] => {
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

export const buildDailySeries = (
  supplies: ChainMetrics[],
  chainStats: ChainDailySeries[] = [],
  days = 7
): DailySeriesPoint[] => {
  if (supplies.length === 0 || days <= 0) return []

  if (chainStats.length > 0) {
    const series = buildFromChainStats(chainStats, days)
    if (series.length > 0) {
      return series
    }
  }

  return buildSyntheticSeries(supplies, days)
}
