import type { H3Event } from 'h3'
import type { Compilable } from 'kysely'

export function useWAE(event: H3Event, query: Compilable) {
  const { cfAccountId, cfApiToken } = useRuntimeConfig(event)
  if (!cfAccountId || !cfApiToken)
    return { data: [] }

  const compiledQuery = compileAnalyticsQuery(query)

  if (import.meta.dev)
    console.info('useWAE', compiledQuery)

  return $fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfApiToken}`,
    },
    body: compiledQuery,
    retry: 1,
    retryDelay: 100, // ms
  })
}

export async function useWAEExport(event: H3Event, query: Compilable) {
  const { cfAccountId, cfApiToken } = useRuntimeConfig(event)
  if (!cfAccountId || !cfApiToken)
    throw createError({ status: 503, statusText: 'Analytics Engine is not configured' })

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfApiToken}` },
    body: `${compileAnalyticsQuery(query)} FORMAT JSONEachRow`,
  })
  if (!response.ok || !response.body) {
    await response.body?.cancel()
    throw createError({ status: 502, statusText: 'Analytics export failed' })
  }
  return response.body
}
