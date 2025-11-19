import { useCallback, useEffect, useState } from 'react'

type GeckoPool = {
  id?: string
  networkId?: string
  address?: string
  name?: string
  dex?: string
  baseTokenId?: string
  quoteTokenId?: string
  poolCreatedAt?: string
  tvlUSD: number
  baseTokenPriceUSD: number
  quoteTokenPriceUSD: number
  priceChange24h: number
  volume24hUSD: number
}

type ApiResponse = {
  network?: string
  tokenAddress?: string
  page?: number
  count?: number
  pools?: GeckoPool[]
  errors?: { networkId?: string; error?: string }[]
  networks?: string[]
}

type HookState = {
  pools: GeckoPool[]
  networks: string[]
  network?: string
  tokenAddress?: string
  page: number
  loading: boolean
  error?: string
}

export function useGeckoterminalPools() {
  const [state, setState] = useState<HookState>({
    pools: [],
    networks: [],
    page: 1,
    loading: true
  })

  const fetchPools = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      const res = await fetch('/api/geckoterminal', { cache: 'no-cache' })
      if (!res.ok) {
        throw new Error(`Failed to fetch GeckoTerminal pools (${res.status})`)
      }
      const json = (await res.json()) as ApiResponse
      setState({
        pools: json.pools ?? [],
        networks: json.networks ?? [],
        network: json.network,
        tokenAddress: json.tokenAddress,
        page: json.page ?? 1,
        loading: false,
        error: undefined
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        pools: [],
        networks: [],
        loading: false,
        error: (error as Error).message
      }))
    }
  }, [])

  useEffect(() => {
    fetchPools()
  }, [fetchPools])

  return {
    ...state,
    reload: fetchPools
  }
}
