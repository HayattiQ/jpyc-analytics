import { useCallback, useEffect, useState } from 'react'

export type LiquidityPool = {
  chainId: string
  chainName: string
  providerType: string
  poolAddress: string
  pair: string
  feeTier: number
  liquidityUSD: number
  jpycSide: 'token0' | 'token1'
  jpycLiquidity: number
  counterTokenSymbol: string
  counterTokenLiquidity: number
  volume24hUSD: number
  fees24hUSD: number
  token0Price: number
  token1Price: number
  snapshotDate?: string
}

export type FailedChain = {
  chainId: string
  subgraphId: string
  error: string
}

type ApiResponse = {
  updatedAt?: string
  count?: number
  pools?: LiquidityPool[]
  failedChains?: FailedChain[]
}

type HookState = {
  pools: LiquidityPool[]
  failedChains: FailedChain[]
  updatedAt?: string
  loading: boolean
  error?: string
}

export function useJpycPools() {
  const [state, setState] = useState<HookState>({
    pools: [],
    failedChains: [],
    loading: true
  })

  const fetchPools = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      const response = await fetch('/api/jpyc-pool-list', { cache: 'no-cache' })
      if (!response.ok) {
        throw new Error(`Failed to load liquidity pools (${response.status})`)
      }
      const json = (await response.json()) as ApiResponse
      setState({
        pools: json.pools ?? [],
        failedChains: json.failedChains ?? [],
        updatedAt: json.updatedAt,
        loading: false,
        error: undefined
      })
    } catch (error) {
      setState({
        pools: [],
        failedChains: [],
        updatedAt: undefined,
        loading: false,
        error: (error as Error).message
      })
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
