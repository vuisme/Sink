import type { H3Event } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import handler from '../../server/api/logs/events.get'
import { blobs2logs, blobsMap, doubles2logs, doublesMap } from '../../server/utils/access-log'

const mocks = vi.hoisted(() => {
  const useWAE = vi.fn()
  Object.assign(globalThis, {
    useRuntimeConfig: () => ({ listQueryLimit: '500' }),
    eventHandler: (handler: unknown) => handler,
    getValidatedQuery: async () => ({ limit: 10 }),
    buildEventsQuery: () => 'events query',
    useWAE,
  })
  return { useWAE }
})

Object.assign(globalThis, { blobs2logs, blobsMap, doubles2logs, doublesMap })

describe('access-log events response', () => {
  it.each(['192.0.2.42', '2001:db8::1234', ''])('preserves the recorded IP %j for each click', async (ip) => {
    mocks.useWAE.mockResolvedValue({
      data: [{ blob1: 'example', blob4: ip, timestamp: '2026-10-28 12:00:00' }],
    })

    const events = await handler({} as H3Event)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      slug: 'example',
      ip,
      timestamp: Date.parse('2026-10-28T12:00:00Z') / 1000,
    })
  })
})
