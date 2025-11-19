import { useMemo, useState } from 'react'
import { useGeckoterminalPools } from '../hooks/useGeckoterminalPools'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
})
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 6
})
const jpycPerUsdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3
})

const formatUsd = (value: number) => currencyFormatter.format(value)
const shorten = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`
const JPYC_TOKEN = '0xe7c3d8c9a439fede00d2600032d5db0be71c3c29'.toLowerCase()
const NETWORK_LABELS: Record<string, string> = {
  eth: 'Ethereum',
  polygon_pos: 'Polygon',
  avax: 'Avalanche'
}
const GECKO_BASE_URL: Record<string, string> = {
  eth: 'https://www.geckoterminal.com/ja/eth/pools/',
  polygon_pos: 'https://www.geckoterminal.com/ja/polygon_pos/pools/',
  avax: 'https://www.geckoterminal.com/ja/avax/pools/'
}
type SortHeaderProps = {
  label: string
  active: boolean
  direction?: 'asc' | 'desc'
  onClick: () => void
}

const SortHeader = ({ label, active, direction, onClick }: SortHeaderProps) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'inline-flex items-center gap-1 font-semibold text-left',
      'text-[color:var(--muted)] hover:text-[color:var(--accent)] transition-colors'
    ].join(' ')}
    aria-pressed={active}
  >
    <span>{label}</span>
    {active && <span className="text-xs">{direction === 'asc' ? '▲' : '▼'}</span>}
  </button>
)

type GeckoSortKey = 'name' | 'dex' | 'tvl' | 'volume' | 'price' | 'change' | 'created'

export function LiquidityPage() {
  const gecko = useGeckoterminalPools()
  const [geckoSortKey, setGeckoSortKey] = useState<GeckoSortKey>('tvl')
  const [geckoSortDir, setGeckoSortDir] = useState<'asc' | 'desc'>('desc')
  const [geckoTvlFilter, setGeckoTvlFilter] = useState<number>(10000)
  const [geckoTvlInput, setGeckoTvlInput] = useState<string>('10000')

  const formatPercent = (value: number) => `${value.toFixed(2)}%`
  const isFiniteNumber = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value)
  const geckoRows = useMemo(() => {
    const rows = gecko.pools.map((pool) => {
      const networkId = pool.networkId?.toLowerCase()
      const jpycTokenId = networkId ? `${networkId}_${JPYC_TOKEN}` : undefined
      const jpycPrice =
        pool.baseTokenId?.toLowerCase() === jpycTokenId
          ? pool.baseTokenPriceUSD
          : pool.quoteTokenPriceUSD
      const jpycPerUsd = jpycPrice && jpycPrice > 0 ? 1 / jpycPrice : undefined
      return {
        ...pool,
        jpycPriceUSD: jpycPrice,
        jpycPerUsd,
        networkLabel: (networkId && NETWORK_LABELS[networkId]) || pool.networkId || '—'
      }
    }).filter((pool) => pool.tvlUSD >= geckoTvlFilter)
    const valueFor = (pool: (typeof rows)[number]) => {
      switch (geckoSortKey) {
        case 'name':
          return pool.name?.toLowerCase() ?? ''
        case 'dex':
          return pool.dex?.toLowerCase() ?? ''
        case 'volume':
          return pool.volume24hUSD ?? 0
        case 'price':
          return pool.jpycPerUsd ?? 0
        case 'change':
          return pool.priceChange24h ?? 0
        case 'created':
          return pool.poolCreatedAt ? new Date(pool.poolCreatedAt).getTime() : 0
        case 'tvl':
        default:
          return pool.tvlUSD ?? 0
      }
    }
    return rows.sort((a, b) => {
      const aValue = valueFor(a)
      const bValue = valueFor(b)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const diff = aValue.localeCompare(bValue)
        return geckoSortDir === 'asc' ? diff : -diff
      }
      const diff = (aValue as number) - (bValue as number)
      return geckoSortDir === 'asc' ? diff : -diff
    })
  }, [gecko.pools, geckoSortDir, geckoSortKey, geckoTvlFilter])
  const toggleGeckoSort = (key: GeckoSortKey) => {
    if (geckoSortKey === key) {
      setGeckoSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setGeckoSortKey(key)
      setGeckoSortDir('desc')
    }
  }

  return (
    <div className="liquidity-page flex flex-col gap-6">
      <section className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)] p-5">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">JPYC プール情報</h3>
            <p className="text-sm text-[color:var(--muted)]">
              JPYC プールそれぞれの価格や流動性情報。
            </p>
          </div>
          <form
            className="flex flex-col items-end gap-2 text-sm text-[color:var(--muted)]"
            onSubmit={(e) => {
              e.preventDefault()
              const parsed = Number(geckoTvlInput)
              if (Number.isFinite(parsed) && parsed >= 1) {
                setGeckoTvlFilter(parsed)
              }
            }}
          >
            <label className="flex items-center gap-2">
              <span>TVL 最小</span>
              <input
                type="number"
                min={1}
                step={1}
                value={geckoTvlInput}
                onChange={(e) => setGeckoTvlInput(e.target.value)}
                className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-right"
              />
              <span className="text-xs">USD</span>
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-1 text-[color:var(--accent)] hover:border-[color:var(--accent)]"
              >
                適用
              </button>
            </label>
            <span>
              {gecko.loading
                ? '取得中…'
                : gecko.error
                  ? '取得失敗'
                  : `${geckoRows.length} / ${gecko.pools.length} pools`}
            </span>
          </form>
        </header>
        {gecko.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 text-sm">
            {gecko.error}
          </div>
        ) : gecko.loading && gecko.pools.length === 0 ? (
          <div className="animate-pulse h-24 rounded-xl bg-[var(--surface-hover)]" aria-busy="true" />
        ) : geckoRows.length === 0 ? (
          <div className="text-center text-[color:var(--muted)] py-6">表示できるプールがありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--surface-hover)] text-[color:var(--muted)]">
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="Pool"
                      active={geckoSortKey === 'name'}
                      direction={geckoSortKey === 'name' ? geckoSortDir : undefined}
                      onClick={() => toggleGeckoSort('name')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    Chain
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="DEX"
                      active={geckoSortKey === 'dex'}
                      direction={geckoSortKey === 'dex' ? geckoSortDir : undefined}
                      onClick={() => toggleGeckoSort('dex')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="TVL (USD)"
                      active={geckoSortKey === 'tvl'}
                      direction={geckoSortKey === 'tvl' ? geckoSortDir : undefined}
                      onClick={() => toggleGeckoSort('tvl')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="24h Volume"
                      active={geckoSortKey === 'volume'}
                      direction={geckoSortKey === 'volume' ? geckoSortDir : undefined}
                      onClick={() => toggleGeckoSort('volume')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="JPYC per USD"
                      active={geckoSortKey === 'price'}
                      direction={geckoSortKey === 'price' ? geckoSortDir : undefined}
                      onClick={() => toggleGeckoSort('price')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="24h Change"
                      active={geckoSortKey === 'change'}
                      direction={geckoSortKey === 'change' ? geckoSortDir : undefined}
                      onClick={() => toggleGeckoSort('change')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="Created"
                      active={geckoSortKey === 'created'}
                      direction={geckoSortKey === 'created' ? geckoSortDir : undefined}
                      onClick={() => toggleGeckoSort('created')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {geckoRows.map((pool) => (
                  <tr key={pool.id}>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{pool.name ?? '—'}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{pool.networkLabel ?? '—'}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{pool.dex ?? '—'}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{formatUsd(pool.tvlUSD)}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{formatUsd(pool.volume24hUSD)}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      {isFiniteNumber(pool.jpycPerUsd)
                        ? `${jpycPerUsdFormatter.format(pool.jpycPerUsd)} JPYC`
                        : isFiniteNumber(pool.jpycPriceUSD)
                          ? priceFormatter.format(pool.jpycPriceUSD)
                          : '—'}
                    </td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      {isFiniteNumber(pool.priceChange24h) ? formatPercent(pool.priceChange24h ?? 0) : '—'}
                    </td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      {pool.poolCreatedAt ? pool.poolCreatedAt.split('T')[0] : '—'}
                    </td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      {pool.address ? (
                        <a
                          href={`${GECKO_BASE_URL[pool.networkId ?? 'eth'] ?? GECKO_BASE_URL.eth}${pool.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[color:var(--accent)] hover:underline"
                        >
                          {shorten(pool.address)}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <a
            href="https://www.geckoterminal.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <img
              src="/geckoterminal.png"
              width={440}
              height={47}
              alt="On-chain data powered by GeckoTerminal"
              loading="lazy"
            />
          </a>
        </div>
      </section>

    </div>
  )
}
