import { useCallback, useEffect, useMemo, useState } from 'react'
import config from '../config.json'
import { formatSupplyUnits, numberFormatter } from '../lib/format'

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

const normalizeSupply = (hexValue: string, decimals: number) => {
  const raw = BigInt(hexValue)
  const divisor = 10n ** BigInt(decimals)
  const integerPart = Number(raw / divisor)
  const fractionPart = Number(raw % divisor) / Number(divisor)
  return integerPart + fractionPart
}

const getCovalentKey = () => config.holderApi?.apiKey ?? 'ckey_docs'

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

    return normalizeSupply(body.result, config.token.decimals)
  }, [])

  const fetchHolderCount = useCallback(async (chain: ChainConfig) => {
    const covalentChainId = chain.holder?.covalentChainId
    if (!covalentChainId) return null

    const apiKey = getCovalentKey()
    const url = `https://api.covalenthq.com/v1/${covalentChainId}/tokens/${chain.tokenAddress}/token_holders/?page-size=1&key=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Covalent error (${chain.name}): ${response.status}`)
    }

    const body = (await response.json()) as {
      data?: {
        pagination?: { total_count?: number }
      }
      error?: boolean
      error_message?: string
    }

    if (body.error) {
      throw new Error(body.error_message ?? `Unknown Covalent error for ${chain.name}`)
    }

    return body.data?.pagination?.total_count ?? null
  }, [])

  const loadSupplies = useCallback(async () => {
    setStatus('loading')
    setErrorMessage(null)

    try {
      const values = await Promise.all(
        config.chains.map(async (chain) => {
          const [supply, holderCount] = await Promise.all([
            fetchSupply(chain),
            fetchHolderCount(chain).catch((error) => {
              console.warn(error)
              return null
            })
          ])

          return {
            chainId: chain.id,
            name: chain.name,
            supply,
            formattedSupply: formatSupplyUnits(supply, config.token.symbol),
            accent: chain.accent,
            holderCount,
            formattedHolderCount:
              holderCount !== null ? numberFormatter.format(holderCount) : '—'
          }
        })
      )

      setSupplies(values)
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
