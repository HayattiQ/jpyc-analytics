export const SUBGRAPH_QUERIES = {
  GLOBAL_STAT: `
    query GlobalStat($id: ID!) {
      globalStat(id: $id) {
        holderCount
        totalSupply
        updatedAtTimestamp
      }
    }
  `,
  GLOBAL_BUCKETS: `
    query GlobalBuckets($id: ID!) {
      globalStat(id: $id) {
        holderCount
        holdersLe10k
        holdersLe100k
        holdersLe1m
        holdersLe10m
        holdersGt10m
      }
    }
  `,
  LATEST_DAILY_HOLDER: `
    query LatestDailyHolder {
      dailyStats(first: 1, orderBy: dayStartTimestamp, orderDirection: desc) {
        holderCount
      }
    }
  `,
  GLOBAL_STAT_SIMPLE: `
    query GlobalStat($id: ID!) {
      globalStat(id: $id) {
        holderCount
      }
    }
  `,
  DAILY_STATS: `
    query DailyStats($days: Int!) {
      dailyStats(first: $days, orderBy: dayStartTimestamp, orderDirection: desc) {
        dayStartTimestamp
        totalSupply
        holderCount
      }
    }
  `,
  DAILY_STATS_FROM: `
    query DailyStatsFrom($from: BigInt!) {
      dailyStats(
        first: 1000,
        where: { dayStartTimestamp_gte: $from },
        orderBy: dayStartTimestamp,
        orderDirection: asc
      ) {
        dayStartTimestamp
        totalSupply
        holderCount
      }
    }
  `
} as const

export type SubgraphQueryId = keyof typeof SUBGRAPH_QUERIES

export const getSubgraphQuery = (id: SubgraphQueryId): string => SUBGRAPH_QUERIES[id]
