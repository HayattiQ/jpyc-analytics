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
  holderCount?: number
  transactionVolume?: number
  inflowVolume?: number
  outflowVolume?: number
  netInflow?: number
  inflowCount?: number
  outflowCount?: number
}

export interface ChainDailySeries {
  chainId: string
  name: string
  accent: string
  stats: NormalizedDailyStat[]
}

const formatPoint = (timestamp: number): { label: string; isoDate: string } => {
  const date = new Date(timestamp * 1000)
  return {
    label: formatLabel(date),
    isoDate: date.toISOString().slice(0, 10)
  }
}

const buildTimestampUniverse = (chainStats: ChainDailySeries[]): number[] => {
  const timestampSet = new Set<number>()
  chainStats.forEach((chain) => {
    chain.stats.forEach((stat) => timestampSet.add(stat.dayStartTimestamp))
  })
  return Array.from(timestampSet).sort((a, b) => a - b)
}

const buildFromChainStats = (
  chainStats: ChainDailySeries[],
  days: number
): DailySeriesPoint[] => {
  const timestampUniverse = buildTimestampUniverse(chainStats)
  const selected = timestampUniverse.slice(-days)

  if (selected.length === 0) return []

  // 前日値でフォワードフィル（当日のエントリが無いチェーンは直近の値を使用）
  const chainSeries = chainStats.map((chain) => ({
    name: chain.name,
    entries: chain.stats
      .map((s) => [s.dayStartTimestamp, s.totalSupply] as const)
      .sort((a, b) => a[0] - b[0])
  }))

  // 選択済みタイムスタンプは昇順のはずだが、念のため昇順処理
  const sortedSelected = [...selected].sort((a, b) => a - b)

  // 各チェーンの現在インデックスと最後の既知値を保持して前方補完
  const cursors = chainSeries.map(() => ({ idx: 0, last: 0 }))

  return sortedSelected.map((timestamp) => {
    const point: DailySeriesPoint = formatPoint(timestamp)

    chainSeries.forEach((chain, i) => {
      const cursor = cursors[i]
      // 現在のタイムスタンプまで進める
      while (
        cursor.idx < chain.entries.length &&
        chain.entries[cursor.idx][0] <= timestamp
      ) {
        cursor.last = chain.entries[cursor.idx][1]
        cursor.idx++
      }
      const value = cursor.last
      point[chain.name] = Number(value.toFixed(2))
    })

    return point
  })
}

export const buildDailyHolderSeries = (
  chainStats: ChainDailySeries[],
  days: number
): DailySeriesPoint[] => {
  const timestampUniverse = buildTimestampUniverse(chainStats)
  const selected = timestampUniverse.slice(-days)
  if (selected.length === 0) return []

  // 前日値でフォワードフィル（当日のエントリが無いチェーンは直近の値を使用）
  const chainSeries = chainStats.map((chain) => ({
    name: chain.name,
    entries: chain.stats
      .map((s) => [s.dayStartTimestamp, s.holderCount ?? 0] as const)
      .sort((a, b) => a[0] - b[0])
  }))

  const sortedSelected = [...selected].sort((a, b) => a - b)
  const cursors = chainSeries.map(() => ({ idx: 0, last: 0 }))

  return sortedSelected.map((timestamp) => {
    const point: DailySeriesPoint = formatPoint(timestamp)

    chainSeries.forEach((chain, i) => {
      const cursor = cursors[i]
      while (
        cursor.idx < chain.entries.length &&
        chain.entries[cursor.idx][0] <= timestamp
      ) {
        cursor.last = chain.entries[cursor.idx][1]
        cursor.idx++
      }
      const value = cursor.last
      point[chain.name] = Math.max(0, Math.floor(Number(value)))
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

type MetricKey = 'transactionVolume' | 'inflowVolume' | 'outflowVolume' | 'netInflow'

const getStatMetric = (stat: NormalizedDailyStat, metric: MetricKey): number => {
  const value = stat[metric]
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return value
}

const roundValue = (value: number) => Number(value.toFixed(2))

export const buildDailyStackedMetricSeries = (
  chainStats: ChainDailySeries[],
  days: number,
  metric: MetricKey
): DailySeriesPoint[] => {
  if (chainStats.length === 0 || days <= 0) return []
  const timestampUniverse = buildTimestampUniverse(chainStats)
  const selected = timestampUniverse.slice(-days)
  if (selected.length === 0) return []

  const metricMaps = chainStats.map((chain) => {
    const map = new Map<number, number>()
    chain.stats.forEach((stat) => {
      map.set(stat.dayStartTimestamp, getStatMetric(stat, metric))
    })
    return { name: chain.name, map }
  })

  const sortedSelected = [...selected].sort((a, b) => a - b)
  return sortedSelected.map((timestamp) => {
    const point: DailySeriesPoint = formatPoint(timestamp)
    metricMaps.forEach(({ name, map }) => {
      point[name] = roundValue(map.get(timestamp) ?? 0)
    })
    return point
  })
}

export const buildCumulativeStackedMetricSeries = (
  chainStats: ChainDailySeries[],
  days: number,
  metric: MetricKey
): DailySeriesPoint[] => {
  if (chainStats.length === 0 || days <= 0) return []
  const timestampUniverse = buildTimestampUniverse(chainStats)
  const selected = timestampUniverse.slice(-days)
  if (selected.length === 0) return []

  const metricMaps = chainStats.map((chain) => {
    const map = new Map<number, number>()
    chain.stats.forEach((stat) => {
      map.set(stat.dayStartTimestamp, getStatMetric(stat, metric))
    })
    return { name: chain.name, map }
  })

  const cumulativeTotals = new Map(metricMaps.map(({ name }) => [name, 0]))
  const sortedSelected = [...selected].sort((a, b) => a - b)

  return sortedSelected.map((timestamp) => {
    const point: DailySeriesPoint = formatPoint(timestamp)
    metricMaps.forEach(({ name, map }) => {
      const previousTotal = cumulativeTotals.get(name) ?? 0
      const nextTotal = roundValue(previousTotal + (map.get(timestamp) ?? 0))
      cumulativeTotals.set(name, nextTotal)
      point[name] = nextTotal
    })
    return point
  })
}

export interface FlowSeriesPoint {
  label: string
  isoDate: string
  inflow: number
  outflow: number
  inflowAbs: number
  outflowAbs: number
  netInflow: number
  inflowCount: number
  outflowCount: number
}

const createFlowBucket = () => ({
  inflow: 0,
  outflow: 0,
  inflowCount: 0,
  outflowCount: 0
})

export const buildDailyFlowSeries = (
  chainStats: ChainDailySeries[],
  days: number
): FlowSeriesPoint[] => {
  if (chainStats.length === 0 || days <= 0) return []
  const aggregate = new Map<number, ReturnType<typeof createFlowBucket>>()

  chainStats.forEach((chain) => {
    chain.stats.forEach((stat) => {
      const bucket = aggregate.get(stat.dayStartTimestamp) ?? createFlowBucket()
      bucket.inflow += stat.inflowVolume ?? 0
      bucket.outflow += stat.outflowVolume ?? 0
      bucket.inflowCount += stat.inflowCount ?? 0
      bucket.outflowCount += stat.outflowCount ?? 0
      aggregate.set(stat.dayStartTimestamp, bucket)
    })
  })

  const timestamps = Array.from(aggregate.keys()).sort((a, b) => a - b)
  const selected = timestamps.slice(-days)
  if (selected.length === 0) return []

  return selected.map((timestamp) => {
    const bucket = aggregate.get(timestamp) ?? createFlowBucket()
    const inflow = roundValue(bucket.inflow)
    const outflow = roundValue(bucket.outflow)
    const net = roundValue(bucket.inflow - bucket.outflow)
    return {
      ...formatPoint(timestamp),
      inflow,
      outflow: -outflow,
      inflowAbs: inflow,
      outflowAbs: outflow,
      netInflow: net,
      inflowCount: bucket.inflowCount,
      outflowCount: bucket.outflowCount
    }
  })
}
