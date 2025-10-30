export const buildGraphHeaders = (): HeadersInit => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env
  const bearer = (env?.VITE_GRAPH_API_BEARER as string | undefined) ?? undefined
  const studioKey = (env?.VITE_GRAPH_API_KEY as string | undefined) ?? undefined
  if (bearer && bearer.length > 0) headers['Authorization'] = `Bearer ${bearer}`
  if (studioKey && studioKey.length > 0) headers['X-API-KEY'] = studioKey
  return headers
}
