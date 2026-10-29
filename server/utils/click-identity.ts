import type { H3Event } from 'h3'
import { getCookie, getHeader, setCookie, setHeader } from 'h3'

const VISITOR_COOKIE = '__Host-sink_visitor'
const SESSION_COOKIE = '__Host-sink_session'
const VISITOR_MAX_AGE = 90 * 24 * 60 * 60
const SESSION_MAX_AGE = 30 * 60
const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i

const CLIENT_HINT_HEADERS = [
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-ch-ua-full-version-list',
  'sec-ch-ua-platform-version',
  'sec-ch-ua-arch',
  'sec-ch-ua-bitness',
  'sec-ch-ua-model',
] as const

export function collectClickIdentity(event: H3Event) {
  const existingVisitor = getCookie(event, VISITOR_COOKIE)
  const existingSession = getCookie(event, SESSION_COOKIE)
  const validVisitor = existingVisitor && UUID_PATTERN.test(existingVisitor)
  const visitorId = validVisitor ? existingVisitor : crypto.randomUUID()
  const sessionId = validVisitor && existingSession && UUID_PATTERN.test(existingSession)
    ? existingSession
    : crypto.randomUUID()

  const cookieOptions = { path: '/', secure: true, httpOnly: true, sameSite: 'lax' } as const
  setCookie(event, VISITOR_COOKIE, visitorId, { ...cookieOptions, maxAge: VISITOR_MAX_AGE })
  setCookie(event, SESSION_COOKIE, sessionId, { ...cookieOptions, maxAge: SESSION_MAX_AGE })
  setHeader(event, 'Cache-Control', 'private, no-store')

  // Accept-CH applies to subsequent requests; Critical-CH could replay a click.
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-CH
  setHeader(event, 'Accept-CH', CLIENT_HINT_HEADERS.join(', '))
  const hints: Record<string, string> = {}
  for (const header of CLIENT_HINT_HEADERS) {
    const value = getHeader(event, header)
    if (value)
      hints[header] = value.slice(0, 128)
  }

  return {
    visitorId,
    sessionId,
    clientHints: Object.keys(hints).length ? JSON.stringify(hints) : '',
  }
}
