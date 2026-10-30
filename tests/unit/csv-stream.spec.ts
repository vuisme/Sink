import { describe, expect, it } from 'vitest'
import { jsonLinesToCsv } from '../../server/utils/csv-stream'

function stream(parts: string[]) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts)
        controller.enqueue(encoder.encode(part))
      controller.close()
    },
  })
}

describe('click CSV streaming', () => {
  it('exports more than 100 clicks and preserves identical timestamps and duplicate rows', async () => {
    const rows = Array.from({ length: 1201 }, () => JSON.stringify({ timestamp: '2026-10-30 00:00:00', slug: 'same' }))
    const csv = await new Response(jsonLinesToCsv(stream([rows.join('\n')]), ['timestamp', 'slug'])).text()
    expect(csv.trim().split('\n')).toHaveLength(1202)
    expect(csv.match(/2026-10-30 00:00:00,same/g)).toHaveLength(1201)
  })

  it('handles split JSON, missing legacy fields, Unicode, quoting and formulas', async () => {
    const input = `${JSON.stringify({ slug: '=SUM(1,2)', ua: 'a,"b"\nc', city: 'Hồ Chí Minh' })}\n${JSON.stringify({ slug: 'old' })}`
    const csv = await new Response(jsonLinesToCsv(stream([input.slice(0, 9), input.slice(9, 35), input.slice(35)]), ['slug', 'ua', 'city'])).text()
    expect(csv).toContain('"\'=SUM(1,2)","a,""b""\nc",Hồ Chí Minh\nold,,\n')
  })

  it('returns a header for empty results', async () => {
    expect(await new Response(jsonLinesToCsv(stream([]), ['slug'])).text()).toBe('slug\n')
  })

  it('preserves Unicode characters split across byte chunks', async () => {
    const bytes = new TextEncoder().encode('{"city":"Hồ Chí Minh"}\n')
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes)
          controller.enqueue(new Uint8Array([byte]))
        controller.close()
      },
    })
    expect(await new Response(jsonLinesToCsv(source, ['city'])).text()).toBe('city\nHồ Chí Minh\n')
  })

  it('fails instead of presenting malformed upstream data as a complete export', async () => {
    await expect(new Response(jsonLinesToCsv(stream(['{"slug":']), ['slug'])).text()).rejects.toThrow()
  })
})
