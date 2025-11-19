import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const BASE_URL = "https://api.geckoterminal.com/api/v2"
const JPYC_TOKEN = "0xe7c3d8c9a439fede00d2600032d5db0be71c3c29"

const NETWORKS = [
  { id: "eth", label: "Ethereum" },
  { id: "polygon_pos", label: "Polygon" },
  { id: "avax", label: "Avalanche" },
] as const

type PriceChange = {
  h24?: string
}

type VolumeWindow = {
  h24?: string
}

type PoolAttributes = {
  address?: string
  name?: string
  pool_created_at?: string
  reserve_in_usd?: string
  base_token_price_usd?: string
  quote_token_price_usd?: string
  price_change_percentage?: PriceChange
  volume_usd?: VolumeWindow
}

type RelationshipRef = {
  data?: {
    id?: string
    type?: string
  }
}

type PoolRelationships = {
  base_token?: RelationshipRef
  quote_token?: RelationshipRef
  dex?: RelationshipRef
}

type GeckoPool = {
  id?: string
  type?: string
  attributes?: PoolAttributes
  relationships?: PoolRelationships
}

type GeckoPoolResponse = {
  data?: GeckoPool[]
  links?: Record<string, string>
}

type PoolRecord = {
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

const cacheHeaders = {
  "content-type": "application/json; charset=utf-8",
}

const getJwtPayload = (authorization?: string) => {
  if (!authorization?.startsWith("Bearer ")) return null
  const token = authorization.slice("Bearer ".length).trim()
  const segments = token.split(".")
  if (segments.length < 2) return null
  try {
    const payload = JSON.parse(atob(segments[1]))
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

const ensureServiceRole = (req: Request) => {
  const payload = getJwtPayload(req.headers.get("authorization") ?? undefined)
  if (payload?.role !== "service_role") {
    throw new Response(
      JSON.stringify({ error: "forbidden", message: "service role required" }),
      { status: 403, headers: cacheHeaders },
    )
  }
}

const numberFrom = (value?: string) => {
  if (typeof value !== "string") return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const buildHeaders = () =>
  new Headers({
    Accept: "application/json;version=20230203",
  })

const fetchNetworkPools = async (networkId: string, page: string) => {
  const upstreamUrl =
    `${BASE_URL}/networks/${networkId}/tokens/${JPYC_TOKEN}/pools?page=${encodeURIComponent(page)}`

  const upstreamResponse = await fetch(upstreamUrl, { headers: buildHeaders() })
  const text = await upstreamResponse.text()

  if (!upstreamResponse.ok) {
    throw new Error(
      `GeckoTerminal error for ${networkId}: ${upstreamResponse.status} ${upstreamResponse.statusText} ${text}`,
    )
  }

  const payload = JSON.parse(text) as GeckoPoolResponse
  const pools: PoolRecord[] =
    payload.data?.map((pool) => {
      const attrs = pool.attributes ?? {}
      const rel = pool.relationships ?? {}
      const priceDelta = attrs.price_change_percentage ?? {}
      const volume = attrs.volume_usd ?? {}
      return {
        id: pool.id,
        networkId,
        address: attrs.address,
        name: attrs.name,
        dex: rel.dex?.data?.id,
        baseTokenId: rel.base_token?.data?.id,
        quoteTokenId: rel.quote_token?.data?.id,
        poolCreatedAt: attrs.pool_created_at,
        tvlUSD: numberFrom(attrs.reserve_in_usd),
        baseTokenPriceUSD: numberFrom(attrs.base_token_price_usd),
        quoteTokenPriceUSD: numberFrom(attrs.quote_token_price_usd),
        priceChange24h: numberFrom(priceDelta.h24),
        volume24hUSD: numberFrom(volume.h24),
      }
    }) ?? []

  return { pools, links: payload.links }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  global: {
    headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` },
  },
})

const upsertPools = async (pools: PoolRecord[], fetchedAt: string) => {
  const rows = pools
    .filter((pool) => pool.id && pool.address && pool.networkId)
    .map((pool) => ({
      id: pool.id as string,
      network_id: pool.networkId as string,
      address: pool.address as string,
      name: pool.name ?? null,
      dex: pool.dex ?? null,
      base_token_id: pool.baseTokenId ?? null,
      quote_token_id: pool.quoteTokenId ?? null,
      pool_created_at: pool.poolCreatedAt ?? null,
      tvl_usd: pool.tvlUSD,
      base_token_price_usd: pool.baseTokenPriceUSD,
      quote_token_price_usd: pool.quoteTokenPriceUSD,
      price_change_24h: pool.priceChange24h,
      volume_24h_usd: pool.volume24hUSD,
      fetched_at: fetchedAt,
    }))

  if (rows.length === 0) return { count: 0 }

  const { error } = await supabaseAdmin.from("geckoterminal_pools").upsert(
    rows,
    { onConflict: "id", returning: "minimal" },
  )

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`)
  }

  return { count: rows.length }
}

const syncGeckoterminalPools = async (
  { page, networks }: {
    page: string
    networks: readonly { id: string; label: string }[]
  },
) => {
  const fetchedAt = new Date().toISOString()

  const results = await Promise.all(
    networks.map(async (network) => {
      try {
        const { pools, links } = await fetchNetworkPools(network.id, page)
        const { count } = await upsertPools(pools, fetchedAt)
        return {
          networkId: network.id,
          fetched: pools.length,
          saved: count,
          links,
        }
      } catch (error) {
        return { networkId: network.id, error: String(error) }
      }
    }),
  )

  const saved = results.reduce(
    (sum, res) => sum + (res.saved ?? 0),
    0,
  )

  return {
    page: Number(page) || 1,
    networks: networks.map((n) => n.id),
    saved,
    results,
  }
}

Deno.cron(
  "sync-geckoterminal",
  "*/1 * * * *",
  () => syncGeckoterminalPools({ page: "1", networks: NETWORKS })
    .then((result) =>
      console.log(
        `[geckoterminal] synced page ${result.page}, saved ${result.saved}`,
      )
    )
    .catch((error) =>
      console.error("[geckoterminal] sync failed:", error),
    ),
)

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const page = url.searchParams.get("page") ?? "1"
  const networkParam = url.searchParams.get("network")

  try {
    ensureServiceRole(req)
  } catch (resp) {
    if (resp instanceof Response) return resp
    return new Response(
      JSON.stringify({ error: "forbidden" }),
      { status: 403, headers: cacheHeaders },
    )
  }

  const targetNetworks = networkParam && NETWORKS.some((
    n,
  ) => n.id === networkParam)
    ? NETWORKS.filter((n) => n.id === networkParam)
    : NETWORKS

  try {
    const result = await syncGeckoterminalPools({
      page,
      networks: targetNetworks,
    })
    return new Response(JSON.stringify(result), { headers: cacheHeaders })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: cacheHeaders },
    )
  }
})
