import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DECIMALS = 18n
const CSV_PATH = resolve(__dirname, 'export-token-0xe7c3d8c9a439fede00d2600032d5db0be71c3c29.csv')
const JSON_PATH = resolve(__dirname, 'fetchDailyStatsExport.json')
const COMPARE_START = process.env.COMPARE_START_DATE ?? '2025-11-01'
const COMPARE_END = process.env.COMPARE_END_DATE ?? '2025-11-10'

type DailyAggregate = {
  txCount: number
  txVolume: bigint
}

const decimalToWei = (value: string): bigint => {
  const sanitized = value.replace(/,/g, '').trim()
  if (sanitized.length === 0) return 0n
  const [rawInt, rawFrac = ''] = sanitized.split('.')
  const intPart = rawInt.length === 0 ? '0' : rawInt
  let fracPart = rawFrac.replace(/[^0-9]/g, '')
  if (fracPart.length > Number(DECIMALS)) {
    fracPart = fracPart.slice(0, Number(DECIMALS))
  } else {
    fracPart = fracPart.padEnd(Number(DECIMALS), '0')
  }
  const base = 10n ** DECIMALS
  const intValue = intPart === '' ? 0n : BigInt(intPart)
  const fracValue = fracPart === '' ? 0n : BigInt(fracPart)
  return intValue * base + fracValue
}

const parseCsv = (): Map<string, DailyAggregate> => {
  const content = readFileSync(CSV_PATH, 'utf-8')
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const aggregates = new Map<string, DailyAggregate>()

  for (const line of lines.slice(1)) {
    let current = line.trim()
    if (current.length === 0) continue
    if (!current.startsWith('"') || !current.endsWith('"')) {
      console.warn(`Skipping malformed CSV line: ${line}`)
      continue
    }
    current = current.slice(1, -1)
    const columns = current.split('","')
    if (columns.length < 8) {
      console.warn(`Skipping incomplete CSV line: ${line}`)
      continue
    }
    const dateTimeUtc = columns[3] // e.g. 2025-11-01 01:29:47
    const quantity = columns[6]
    const date = dateTimeUtc.split(' ')[0]
    const wei = decimalToWei(quantity)
    const agg = aggregates.get(date) ?? { txCount: 0, txVolume: 0n }
    agg.txCount += 1
    agg.txVolume += wei
    aggregates.set(date, agg)
  }

  return aggregates
}

type JsonDailyEntry = {
  date: string
  transactionCount?: string
  transactionVolume?: string
}

const parseJson = (): Map<string, DailyAggregate> => {
  let data: JsonDailyEntry[]
  try {
    data = JSON.parse(readFileSync(JSON_PATH, 'utf-8')) as JsonDailyEntry[]
  } catch (error) {
    console.error('JSON 読み込みに失敗しました:', (error as Error).message)
    process.exit(1)
  }
  const aggregates = new Map<string, DailyAggregate>()
  data.forEach((entry) => {
    const txCount = entry.transactionCount ? Number(entry.transactionCount) : 0
    const txVolume = entry.transactionVolume ? BigInt(entry.transactionVolume) : 0n
    aggregates.set(entry.date, { txCount, txVolume })
  })
  return aggregates
}

const csvStats = parseCsv()
const jsonStats = parseJson()

const mismatches: string[] = []
const inspectedDates: {
  date: string
  csv?: DailyAggregate
  json?: DailyAggregate
  isInRange: boolean
}[] = []

const formatWei = (value: bigint) => value.toString()

const isWithinRange = (date: string) => date >= COMPARE_START && date <= COMPARE_END

csvStats.forEach((csvValue, date) => {
  const jsonValue = jsonStats.get(date)
  if (!isWithinRange(date)) {
    if (jsonValue) {
      inspectedDates.push({ date, csv: csvValue, json: jsonValue, isInRange: false })
    }
    return
  }
  if (!jsonValue) {
    mismatches.push(`JSON 側に ${date} のデータが存在しません。CSV txCount=${csvValue.txCount}`)
    inspectedDates.push({ date, csv: csvValue, isInRange: true })
    return
  }
  if (csvValue.txCount !== jsonValue.txCount) {
    mismatches.push(
      `${date}: txCount mismatch CSV=${csvValue.txCount} JSON=${jsonValue.txCount}`
    )
  }
  if (csvValue.txVolume !== jsonValue.txVolume) {
    mismatches.push(
      `${date}: txVolume mismatch CSV=${formatWei(csvValue.txVolume)} JSON=${formatWei(
        jsonValue.txVolume
      )}`
    )
  }
  inspectedDates.push({ date, csv: csvValue, json: jsonValue, isInRange: true })
})

jsonStats.forEach((jsonValue, date) => {
  if (!isWithinRange(date)) return
  if (!csvStats.has(date)) {
    mismatches.push(`CSV 側に ${date} のデータが存在しません。JSON entry present.`)
    inspectedDates.push({ date, json: jsonValue, isInRange: true })
  }
})

if (mismatches.length > 0) {
  console.error('❌ 不一致が見つかりました:')
  mismatches.forEach((issue) => console.error(` - ${issue}`))
  console.log('\n=== 検算結果 (UTC 日付ごと) ===')
} else {
  console.log('✅ CSV と JSON の集計結果は一致しています。')
  console.log('\n=== 検算結果 (UTC 日付ごと) ===')
}

const sortedDates = inspectedDates.sort((a, b) => a.date.localeCompare(b.date))

if (sortedDates.length === 0) {
  console.log('比較対象期間に一致するデータがありません。')
} else {
  sortedDates.forEach((entry) => {
    const label = entry.isInRange ? entry.date : `${entry.date} (out of range)`
    const csvTxCount = entry.csv ? entry.csv.txCount : '—'
    const csvTxVolume = entry.csv ? formatWei(entry.csv.txVolume) : '—'
    const jsonTxCount = entry.json ? entry.json.txCount : '—'
    const jsonTxVolume = entry.json ? formatWei(entry.json.txVolume) : '—'
    console.log(
      `${label}: CSV(txCount=${csvTxCount}, txVolume=${csvTxVolume}) | JSON(txCount=${jsonTxCount}, txVolume=${jsonTxVolume})`
    )
  })
}
