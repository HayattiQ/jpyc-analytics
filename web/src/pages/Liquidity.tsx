import { useMemo, useState } from 'react'
import config from '../config.json'
import { useJpycPools } from '../hooks/useJpycPools'
import type { FailedChain, LiquidityPool } from '../hooks/useJpycPools'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
})

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2
})

type ProviderConfig = {
  id: string
  label: string
  type: string
  chainId: string
  status?: string
}

const POOL_LINKS: Record<string, string> = {
  ethereum: 'https://www.geckoterminal.com/ja/eth/pools/',
  polygon: 'https://www.geckoterminal.com/ja/polygon_pos/pools/',
  avalanche: 'https://www.geckoterminal.com/ja/avalanche/pools/',
  'avalanche-pharaoh': 'https://www.geckoterminal.com/ja/avalanche/pools/',
  'polygon-univ3': 'https://www.geckoterminal.com/ja/polygon_pos/pools/'
}

const CHAIN_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  avalanche: 'Avalanche',
  'avalanche-pharaoh': 'Avalanche',
  'polygon-univ3': 'Polygon'
}

const formatUsd = (value: number) => currencyFormatter.format(value)
const formatAmount = (value: number) => numberFormatter.format(value)
const formatFee = (fee: number) => percentFormatter.format(fee / 100)
const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString('ja-JP', { timeZone: 'UTC' }) : '-'

const shorten = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

const providerTypeLabel = (type: string) => {
  if (type === 'pharaoh') return 'Pharaoh Exchange'
  if (type === 'uniswap_v4') return 'Uniswap v4'
  if (type === 'uniswap_v3') return 'Uniswap v3'
  return type
}

const buildProviderDisplayName = (provider?: ProviderConfig, pool?: LiquidityPool) => {
  if (provider) return provider.label
  if (pool) {
    const chainLabel = CHAIN_LABELS[pool.chainId] ?? pool.chainName ?? ''
    return `${providerTypeLabel(pool.providerType)}${chainLabel ? ` / ${chainLabel}` : ''}`
  }
  return 'Unknown'
}

const PoolRow = ({ pool, provider }: { pool: LiquidityPool; provider?: ProviderConfig }) => {
  const explorer = POOL_LINKS[pool.chainId]
  const link = explorer ? `${explorer}${pool.poolAddress}` : undefined
  const providerName = buildProviderDisplayName(provider, pool)
  const chainLabel =
    (provider && CHAIN_LABELS[provider.chainId]) || CHAIN_LABELS[pool.chainId] || pool.chainName
  const counterLabel = `${formatAmount(pool.counterTokenLiquidity)} ${pool.counterTokenSymbol}`
  return (
    <tr>
      <td className="py-2 px-2 border-b border-[var(--border)]">
        <div className="font-semibold">{providerName}</div>
        <div className="text-[color:var(--muted)] text-sm">{chainLabel}</div>
      </td>
      <td className="py-2 px-2 border-b border-[var(--border)]">
        <div className="font-semibold">{pool.pair}</div>
        <div className="text-[color:var(--muted)] text-sm">{formatFee(pool.feeTier)}</div>
      </td>
      <td className="py-2 px-2 border-b border-[var(--border)]">{formatUsd(pool.liquidityUSD)}</td>
      <td className="py-2 px-2 border-b border-[var(--border)]">{formatAmount(pool.jpycLiquidity)} JPYC</td>
      <td className="py-2 px-2 border-b border-[var(--border)]">{counterLabel}</td>
      <td className="py-2 px-2 border-b border-[var(--border)]">{formatUsd(pool.volume24hUSD)}</td>
      <td className="py-2 px-2 border-b border-[var(--border)]">{formatUsd(pool.fees24hUSD)}</td>
      <td className="py-2 px-2 border-b border-[var(--border)]">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--accent)] hover:underline"
          >
            {shorten(pool.poolAddress)}
          </a>
        ) : (
          shorten(pool.poolAddress)
        )}
      </td>
    </tr>
  )
}

const FailedChainBanner = ({ chains }: { chains: FailedChain[] }) => (
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
    <strong className="block mb-1 text-amber-900">一部チェーンの取得に失敗しました</strong>
    <ul className="list-disc pl-5 space-y-1">
      {chains.map((chain) => (
        <li key={chain.chainId}>
          <span className="font-semibold">{CHAIN_LABELS[chain.chainId] ?? chain.chainId}</span>:{' '}
          <span className="font-mono text-xs break-all">{chain.error}</span>
        </li>
      ))}
    </ul>
  </div>
)

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

type SortKey = 'tvl' | 'volume' | 'fees' | 'jpyc' | 'feeTier'

export function LiquidityPage() {
  const { pools, failedChains, updatedAt, loading, error } = useJpycPools()
  const providers = useMemo<ProviderConfig[]>(() => (config.liquidityProviders ?? []) as ProviderConfig[], [])
  const providerIndex = useMemo(() => {
    const map = new Map<string, ProviderConfig>()
    providers.forEach((provider) => {
      map.set(`${provider.chainId}:${provider.type}`, provider)
    })
    return map
  }, [providers])
  const [chainFilter, setChainFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('tvl')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const chainOptions = useMemo(() => {
    const map = new Map<string, string>()
    pools.forEach((pool) => {
      if (!map.has(pool.chainId)) {
        map.set(pool.chainId, CHAIN_LABELS[pool.chainId] ?? pool.chainName)
      }
    })
    return Array.from(map.entries())
  }, [pools])

  const filteredPools = useMemo(() => {
    const sorted = [...pools].sort((a, b) => {
      const valueFor = (pool: LiquidityPool) => {
        switch (sortKey) {
          case 'volume':
            return pool.volume24hUSD
          case 'fees':
            return pool.fees24hUSD
          case 'jpyc':
            return pool.jpycLiquidity
          case 'feeTier':
            return pool.feeTier
          case 'tvl':
          default:
            return pool.liquidityUSD
        }
      }
      const diff = valueFor(a) - valueFor(b)
      return sortDir === 'asc' ? diff : -diff
    })
    if (chainFilter === 'all') return sorted
    return sorted.filter((pool) => pool.chainId === chainFilter)
  }, [pools, chainFilter, sortDir, sortKey])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const providerStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        providerId: string
        label: string
        type: string
        chainName: string
        poolCount: number
        tvl: number
        jpyc: number
        volume: number
        fees: number
        failing?: boolean
      }
    >()
    providers.forEach((provider) => {
      stats.set(provider.id, {
        providerId: provider.id,
        label: provider.label,
        type: provider.type,
        chainName: CHAIN_LABELS[provider.chainId] ?? provider.chainId,
        poolCount: 0,
        tvl: 0,
        jpyc: 0,
        volume: 0,
        fees: 0,
        failing: provider.status === 'inactive' ? true : undefined
      })
    })

    pools.forEach((pool) => {
      const provider = providerIndex.get(`${pool.chainId}:${pool.providerType}`)
      const key = provider?.id ?? `${pool.chainId}:${pool.providerType}`
      const entry =
        stats.get(key) ??
        {
          providerId: key,
          label: buildProviderDisplayName(provider, pool),
          type: pool.providerType,
          chainName: CHAIN_LABELS[pool.chainId] ?? pool.chainName,
          poolCount: 0,
          tvl: 0,
          jpyc: 0,
          volume: 0,
          fees: 0
        }
      entry.poolCount += 1
      entry.tvl += pool.liquidityUSD
      entry.jpyc += pool.jpycLiquidity
      entry.volume += pool.volume24hUSD
      entry.fees += pool.fees24hUSD
      stats.set(key, entry)
    })

    failedChains.forEach((failed) => {
      providers
        .filter((provider) => provider.chainId === failed.chainId)
        .forEach((provider) => {
          const entry =
            stats.get(provider.id) ??
            {
              providerId: provider.id,
              label: provider.label,
              type: provider.type,
              chainName: CHAIN_LABELS[provider.chainId] ?? provider.chainId,
              poolCount: 0,
              tvl: 0,
              jpyc: 0,
              volume: 0,
              fees: 0
            }
          entry.failing = true
          stats.set(provider.id, entry)
        })
    })

    return Array.from(stats.values()).sort((a, b) => b.tvl - a.tvl)
  }, [pools, failedChains, providers, providerIndex])

  return (
    <div className="liquidity-page flex flex-col gap-6">
      <section className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">JPYC 流動性監視</h2>
            <p className="text-sm text-[color:var(--muted)]">
              Uniswap v4 / Pharaoh Exchange など主要 DEX の JPYC プールを横断的にモニタリングします。
            </p>
            <dl className="flex flex-wrap gap-4 text-sm mt-2">
              <div>
                <dt className="text-[color:var(--muted)]">プール数</dt>
                <dd className="font-semibold">{pools.length}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">最終更新</dt>
                <dd className="font-semibold">
                  {updatedAt ? formatDate(updatedAt) : loading ? '更新中…' : '未取得'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <label className="text-sm text-[color:var(--muted)] flex flex-col gap-1">
              チェーンフィルタ
              <select
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base"
              >
                <option value="all">All Chains</option>
                {chainOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 text-sm">
            取得に失敗しました: {error}
          </div>
        )}
        {!error && failedChains.length > 0 && (
          <div className="mt-4">
            <FailedChainBanner chains={failedChains} />
          </div>
        )}
      </section>

      <section className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)] p-4">
        {loading && pools.length === 0 ? (
          <div className="animate-pulse h-32 rounded-xl bg-[var(--surface-hover)]" aria-busy="true" />
        ) : filteredPools.length === 0 ? (
          <div className="text-center text-[color:var(--muted)] py-10">表示できるプールがありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--surface-hover)] text-[color:var(--muted)]">
                  <th className="text-left py-2 px-2">Provider / チェーン</th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="ペア / Fee"
                      active={sortKey === 'feeTier'}
                      direction={sortKey === 'feeTier' ? sortDir : undefined}
                      onClick={() => toggleSort('feeTier')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="TVL (USD)"
                      active={sortKey === 'tvl'}
                      direction={sortKey === 'tvl' ? sortDir : undefined}
                      onClick={() => toggleSort('tvl')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="JPYC 残高"
                      active={sortKey === 'jpyc'}
                      direction={sortKey === 'jpyc' ? sortDir : undefined}
                      onClick={() => toggleSort('jpyc')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">対向トークン残高</th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="24h Volume"
                      active={sortKey === 'volume'}
                      direction={sortKey === 'volume' ? sortDir : undefined}
                      onClick={() => toggleSort('volume')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader
                      label="24h Fees"
                      active={sortKey === 'fees'}
                      direction={sortKey === 'fees' ? sortDir : undefined}
                      onClick={() => toggleSort('fees')}
                    />
                  </th>
                  <th className="text-left py-2 px-2">Pool</th>
                </tr>
              </thead>
              <tbody>
                {filteredPools.map((pool) => {
                  const provider = providerIndex.get(`${pool.chainId}:${pool.providerType}`)
                  return (
                    <PoolRow
                      key={`${pool.providerType}-${pool.poolAddress}`}
                      pool={pool}
                      provider={provider}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)] p-5">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Provider Summary</h3>
            <p className="text-sm text-[color:var(--muted)]">
              Uniswap v4 / Pharaoh Exchange など登録済みプロバイダ単位で TVL と 24h 指標を集計しています。
            </p>
          </div>
          <div className="text-sm text-[color:var(--muted)]">
            合計 TVL:{' '}
            <span className="font-semibold text-black">
              {formatUsd(pools.reduce((sum, pool) => sum + pool.liquidityUSD, 0))}
            </span>
          </div>
        </header>
        {providerStats.length === 0 ? (
          <div className="text-center text-[color:var(--muted)] py-6">統計情報がありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--surface-hover)] text-[color:var(--muted)]">
                  <th className="text-left py-2 px-2">Provider</th>
                  <th className="text-left py-2 px-2">チェーン</th>
                  <th className="text-left py-2 px-2">プール数</th>
                  <th className="text-left py-2 px-2">TVL (USD)</th>
                  <th className="text-left py-2 px-2">JPYC 残高</th>
                  <th className="text-left py-2 px-2">24h Volume</th>
                  <th className="text-left py-2 px-2">24h Fees</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {providerStats.map((stat) => (
                  <tr key={stat.providerId} className={stat.failing ? 'text-rose-900 bg-rose-50' : ''}>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{stat.label}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{stat.chainName}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{stat.poolCount}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{formatUsd(stat.tvl)}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{formatAmount(stat.jpyc)} JPYC</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{formatUsd(stat.volume)}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">{formatUsd(stat.fees)}</td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      {stat.failing ? '取得失敗' : 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
