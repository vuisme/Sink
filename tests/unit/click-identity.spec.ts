import { createApp, defineEventHandler, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'
import { collectClickIdentity } from '../../server/utils/click-identity'

interface Identity {
  visitorId: string
  sessionId: string
  clientHints: string
}

const app = createApp().use(defineEventHandler(collectClickIdentity))
const handle = toWebHandler(app)

async function click(headers: Record<string, string> = {}, slug = 'first') {
  const response = await handle(new Request(`https://sink.example/${slug}`, { headers }))
  return { response, identity: await response.json() as Identity }
}

describe('click identity', () => {
  it('creates random IDs with secure host-only cookies and disables caching', async () => {
    const { identity, response } = await click()
    expect(identity.visitorId).toMatch(/^[\da-f-]{36}$/)
    expect(identity.sessionId).not.toBe(identity.visitorId)
    const cookies = response.headers.getSetCookie()
    expect(cookies).toHaveLength(2)
    for (const cookie of cookies) {
      expect(cookie).toContain('Path=/')
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('Secure')
      expect(cookie).toContain('SameSite=Lax')
      expect(cookie).not.toContain('Domain=')
    }
    expect(cookies[0]).toContain('Max-Age=7776000')
    expect(cookies[1]).toContain('Max-Age=1800')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('accept-ch')?.toLowerCase()).toContain('sec-ch-ua-platform-version')
    expect(response.headers.get('critical-ch')).toBeNull()
  })

  it('reuses visitor and session across different slugs', async () => {
    const first = await click()
    const cookie = first.response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    const second = await click({ cookie }, 'second')
    expect(second.identity).toEqual(first.identity)
    expect(second.response.headers.getSetCookie()[1]).toContain('Max-Age=1800')
  })

  it('keeps the visitor but starts a new session when the session cookie expires', async () => {
    const first = await click()
    const second = await click({ cookie: `__Host-sink_visitor=${first.identity.visitorId}` })
    expect(second.identity.visitorId).toBe(first.identity.visitorId)
    expect(second.identity.sessionId).not.toBe(first.identity.sessionId)
  })

  it('replaces invalid identifiers and resets the session without a valid visitor', async () => {
    const sessionId = crypto.randomUUID()
    const { identity } = await click({ cookie: `__Host-sink_visitor=invalid; __Host-sink_session=${sessionId}` })
    expect(identity.visitorId).not.toBe('invalid')
    expect(identity.sessionId).not.toBe(sessionId)
  })

  it('records only supported client hints and bounds untrusted header values', async () => {
    const { identity } = await click({
      'sec-ch-ua': '"Chromium";v="155"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-ua-platform-version': '"19.0.0"',
      'sec-ch-ua-model': 'x'.repeat(1000),
      'authorization': 'secret',
    })
    const hints = JSON.parse(identity.clientHints)
    expect(hints['sec-ch-ua']).toBe('"Chromium";v="155"')
    expect(hints['sec-ch-ua-platform-version']).toBe('"19.0.0"')
    expect(hints['sec-ch-ua-model']).toHaveLength(128)
    expect(hints).not.toHaveProperty('authorization')
  })

  it('leaves client hints empty when the browser does not provide them', async () => {
    expect((await click()).identity.clientHints).toBe('')
  })
})
