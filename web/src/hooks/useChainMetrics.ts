import { useCallback, useEffect, useMemo, useState } from 'react'
import config from '../config.json'
import { formatSupplyUnits, numberFormatter } from '../lib/format'
import { buildGraphHeaders } from '../lib/graphHeaders'

export type SupplyStatus = 'idle' | 'loading' | 'success' | 'error'

export type ChainConfig = (typeof config.chains)[number]

export interface ChainMetrics {
  chainId: string
  name: string
  supply: number
  formattedSupply: string
  accent: string
  holderCount: number | null
  formattedHolderCount: string
}

const TOTAL_SUPPLY_SELECTOR = '0x18160ddd'
const BALANCE_OF_SELECTOR = '0x70a08231'

const buildRpcPayload = (chain: ChainConfig) => ({
  jsonrpc: '2.0',
  id: `${chain.id}-total-supply`,
  method: 'eth_call',
  params: [
    {
      to: chain.tokenAddress,
      data: TOTAL_SUPPLY_SELECTOR
    },
    'latest'
  ]
})

const encodeBalanceOfData = (address: string) => {
  const addr = address.toLowerCase().replace(/^0x/, '')
  const padded = addr.padStart(64, '0')
  return `${BALANCE_OF_SELECTOR}${padded}`
}

const buildBalanceOfPayload = (chain: ChainConfig, holder: string) => ({
  jsonrpc: '2.0',
  id: `${chain.id}-balance-of-${holder}`,
  method: 'eth_call',
  params: [
    {
      to: chain.tokenAddress,
      data: encodeBalanceOfData(holder)
    },
    'latest'
  ]
})

const normalizeSupply = (hexValue: string, decimals: number) => {
  const raw = BigInt(hexValue)
  const divisor = 10n ** BigInt(decimals)
  const integerPart = Number(raw / divisor)
  const fractionPart = Number(raw % divisor) / Number(divisor)
  return integerPart + fractionPart
}

export const useChainMetrics = () => {
  const [supplies, setSupplies] = useState<ChainMetrics[]>([])
  const [status, setStatus] = useState<SupplyStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchSupply = useCallback(async (chain: ChainConfig) => {
    const response = await fetch(chain.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRpcPayload(chain))
    })

    if (!response.ok) {
      throw new Error(`RPC error (${chain.name}): ${response.status}`)
    }

    const body = (await response.json()) as {
      result?: string
      error?: { message?: string }
    }

    if (body.error) {
      throw new Error(body.error.message ?? `Unknown RPC error for ${chain.name}`)
    }

    if (!body.result) {
      throw new Error(`Empty RPC result for ${chain.name}`)
    }

    const totalSupply = normalizeSupply(body.result, config.token.decimals)

    let circulating = totalSupply

    const issuer = (chain as { issuerAddress?: string }).issuerAddress
    if (issuer) {
      const balRes = await fetch(chain.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBalanceOfPayload(chain, issuer))
      })

      if (!balRes.ok) {
        throw new Error(`RPC error (balanceOf ${chain.name}): ${balRes.status}`)
      }

      const balBody = (await balRes.json()) as { result?: string; error?: { message?: string } }
      if (balBody.error) {
        throw new Error(balBody.error.message ?? `Unknown RPC error for balanceOf ${chain.name}`)
      }
      if (!balBody.result) {
        throw new Error(`Empty RPC result for balanceOf ${chain.name}`)
      }

      const issuerBalance = normalizeSupply(balBody.result, config.token.decimals)
      circulating = Math.max(circulating - issuerBalance, 0)
    }

    // Subtract redeem address balance if provided (optional)
    const redeem = (chain as { redeemAddress?: string }).redeemAddress
    if (redeem) {
      const redeemRes = await fetch(chain.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBalanceOfPayload(chain, redeem))
      })
      if (!redeemRes.ok) {
        throw new Error(`RPC error (balanceOf redeem ${chain.name}): ${redeemRes.status}`)
      }
      const redeemBody = (await redeemRes.json()) as { result?: string; error?: { message?: string } }
      if (redeemBody.error) {
        throw new Error(
          redeemBody.error.message ?? `Unknown RPC error for balanceOf redeem ${chain.name}`
        )
      }
      if (!redeemBody.result) {
        throw new Error(`Empty RPC result for balanceOf redeem ${chain.name}`)
      }
      const redeemBalance = normalizeSupply(redeemBody.result, config.token.decimals)
      circulating = Math.max(circulating - redeemBalance, 0)
    }

    return circulating
  }, [])

  const fetchHolderCount = useCallback(async (chain: ChainConfig) => {
    if (!chain.subgraphUrl || !chain.globalStatId) {
      return null
    }

    const response = await fetch(chain.subgraphUrl, {
      method: 'POST',
      headers: buildGraphHeaders(),
      body: JSON.stringify({
        query: `
          query GlobalStat($id: ID!) {
            globalStat(id: $id) {
              holderCount
            }
          }
        `,
        variables: { id: chain.globalStatId }
      })
    })

    if (!response.ok) {
      throw new Error(`Subgraph error (${chain.name}): ${response.status}`)
    }

    const payload = (await response.json()) as {
      data?: { globalStat?: { holderCount: string } | null }
      errors?: { message: string }[]
    }

    if (payload.errors && payload.errors.length > 0) {
      const msg = payload.errors[0].message ?? 'Subgraph error'
      // The Graph Studio returns `indexing_error` while indexing is in progress or failed.
      // Treat it as temporarily unavailable and return null to avoid noisy logs.
      if (msg.includes('indexing_error')) {
        console.error(`[holderCount] ${chain.name}: indexing_error`)
        return null
      }
      console.error(`[holderCount] ${chain.name}: ${msg}`)
      throw new Error(msg)
    }

    const holderCount = payload.data?.globalStat?.holderCount
    return typeof holderCount === 'string' ? Number(holderCount) : null
  }, [])

  const loadSupplies = useCallback(async () => {
    setStatus('loading')
    setErrorMessage(null)

    try {
      const results = await Promise.all(
        config.chains.map(async (chain) => {
          // Per-chain fetch with explicit logging
          try {
            const supply = await fetchSupply(chain)
            let holderCount: number | null = null
            try {
              holderCount = await fetchHolderCount(chain)
            } catch (e) {
              console.error(`[holderCount] ${chain.name} failed: ${(e as Error).message}`)
              holderCount = null
            }

            return {
              ok: true as const,
              chainId: chain.id,
              name: chain.name,
              supply,
              formattedSupply: formatSupplyUnits(supply, config.token.symbol),
              accent: chain.accent,
              holderCount,
              formattedHolderCount:
                holderCount !== null ? numberFormatter.format(holderCount) : '—'
            }
          } catch (e) {
            console.error(`[supply] ${chain.name} failed: ${(e as Error).message}`)
            return { ok: false as const, chainId: chain.id, name: chain.name }
          }
        })
      )

      const ok = results.filter((r) => r.ok) as Array<
        {
          ok: true
          chainId: string
          name: string
          supply: number
          formattedSupply: string
          accent: string
          holderCount: number | null
          formattedHolderCount: string
        }
      >
      const failed = results.filter((r) => !r.ok).map((r) => r.name)

      // Summary log
      console.error(
        `[useChainMetrics] summary ok=[${ok.map((r) => r.name).join(", ")}] failed=[${failed.join(", ")}]`
      )

      if (ok.length === 0) {
        throw new Error('All chains failed to load')
      }

      setSupplies(ok)
      setStatus('success')
      setLastUpdated(new Date())
    } catch (error) {
      console.error(error)
      setStatus('error')
      setErrorMessage((error as Error).message)
    }
  }, [fetchHolderCount, fetchSupply])

  useEffect(() => {
    void loadSupplies()
    const interval = setInterval(() => {
      void loadSupplies()
    }, 60_000)

    return () => {
      clearInterval(interval)
    }
  }, [loadSupplies])

  const sortedSupplies = useMemo(
    () => [...supplies].sort((a, b) => b.supply - a.supply),
    [supplies]
  )

  const totalSupply = useMemo(
    () => supplies.reduce((acc, item) => acc + item.supply, 0),
    [supplies]
  )

  const isInitialLoading = status === 'loading' && supplies.length === 0

  return {
    supplies,
    sortedSupplies,
    totalSupply,
    status,
    errorMessage,
    lastUpdated,
    reload: loadSupplies,
    isInitialLoading
  }
}
