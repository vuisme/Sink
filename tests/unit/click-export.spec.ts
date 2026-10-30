import type { H3Event } from 'h3'
import type { Compilable } from 'kysely'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWAEExport } from '../../server/utils/cloudflare'

const mocks = vi.hoisted(() => {
  const fetch = vi.fn()
  const useRuntimeConfig = vi.fn()
  Object.assign(globalThis, {
    fetch,
    useRuntimeConfig,
    compileAnalyticsQuery: () => 'select * from sink limit ALL',
    createError: (options: object) => Object.assign(new Error('Export failed'), options),
  })
  return { fetch, useRuntimeConfig }
})

const event = {} as H3Event
const query = {} as Compilable

beforeEach(() => {
  mocks.fetch.mockReset()
  mocks.useRuntimeConfig.mockReturnValue({ cfAccountId: 'account', cfApiToken: 'secret' })
})

describe('analytics Engine export transport', () => {
  it('requests all rows as a stream with server-side credentials', async () => {
    const response = new Response('{"slug":"test"}\n')
    mocks.fetch.mockResolvedValue(response)
    expect(await useWAEExport(event, query)).toBe(response.body)
    expect(mocks.fetch).toHaveBeenCalledWith('https://api.cloudflare.com/client/v4/accounts/account/analytics_engine/sql', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
      body: 'select * from sink limit ALL FORMAT JSONEachRow',
    })
  })

  it('rejects missing credentials rather than downloading an empty file', async () => {
    mocks.useRuntimeConfig.mockReturnValue({})
    await expect(useWAEExport(event, query)).rejects.toMatchObject({ status: 503 })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('rejects upstream failures without disclosing their response', async () => {
    mocks.fetch.mockResolvedValue(new Response('upstream details', { status: 500 }))
    await expect(useWAEExport(event, query)).rejects.toMatchObject({ status: 502 })
  })
})
