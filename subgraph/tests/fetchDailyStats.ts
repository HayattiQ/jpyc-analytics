/**
 * サブグラフから 11/1〜11/10 (UTC) の DailyStat を取得する簡易スクリプト。
 * 実行例: `npx tsx subgraph/tests/fetchDailyStats.ts`
 *
 * 必要な環境変数:
 *   - GRAPH_API_BEARER: The Graph Gateway の Bearer トークン
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SUBGRAPH_URL =
  process.env.SUBGRAPH_URL ??
  'https://gateway.thegraph.com/api/subgraphs/id/4VHKVn3U9Zr9Mw2q6fzb6VkzQAY4zeA2MzCefV5o4Ygs'

const { GRAPH_API_BEARER } = process.env

if (!GRAPH_API_BEARER) {
  console.error('GRAPH_API_BEARER が設定されていません。')
  process.exit(1)
}

const start = Date.parse('2024-11-01T00:00:00Z') / 1000
const end = Date.parse('2024-11-10T23:59:59Z') / 1000

const query = /* GraphQL */ `
  query DailyStats($from: BigInt!, $to: BigInt!) {
    dailyStats(
      first: 100
      orderBy: dayStartTimestamp
      orderDirection: asc
    ) {
      dayStartTimestamp
      holderCount
      totalSupply
      transactionCount
      transactionVolume
      inflowVolume
      outflowVolume
      netInflow
      inflowCount
      outflowCount
    }
  }
`

const fetchDailyStats = async () => {
  const response = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GRAPH_API_BEARER}`
    },
    body: JSON.stringify({
      query,
      variables: {
        from: String(start),
        to: String(end)
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`)
  }

  const body = (await response.json()) as {
    data?: {
      dailyStats?: Array<Record<string, string>>
    }
    errors?: { message?: string }[]
  }

  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors[0].message ?? 'Unknown subgraph error')
  }

  return body.data?.dailyStats ?? []
}

fetchDailyStats()
  .then((stats) => {
    const payload = stats.map((stat) => ({
      date: new Date(Number(stat.dayStartTimestamp) * 1000).toISOString().slice(0, 10),
      holderCount: stat.holderCount,
      totalSupply: stat.totalSupply,
      transactionCount: stat.transactionCount,
      transactionVolume: stat.transactionVolume,
      inflowVolume: stat.inflowVolume,
      outflowVolume: stat.outflowVolume,
      netInflow: stat.netInflow,
      inflowCount: stat.inflowCount,
      outflowCount: stat.outflowCount
    }))
    const json = JSON.stringify(payload, null, 2)
    console.log(json)
    const outputPath = resolve(process.cwd(),  'fetchDailyStatsExport.json')
    writeFileSync(outputPath, json, { encoding: 'utf-8' })
    console.log(`Saved ${payload.length} entries to ${outputPath}`)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
