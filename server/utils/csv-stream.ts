import { generateCsv, generateCsvRow } from '#shared/utils/csv'

/** Convert Analytics Engine JSONEachRow to CSV without buffering the full export. */
export function jsonLinesToCsv(source: ReadableStream<Uint8Array>, columns: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let pending = ''

  function row(line: string) {
    const record = JSON.parse(line) as Record<string, unknown>
    return encoder.encode(`${generateCsvRow(columns.map(column => record[column]))}\n`)
  }

  return source.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(generateCsv(columns, [])))
    },
    transform(chunk, controller) {
      pending += decoder.decode(chunk, { stream: true })
      let end = pending.indexOf('\n')
      while (end !== -1) {
        const line = pending.slice(0, end)
        pending = pending.slice(end + 1)
        if (line.trim())
          controller.enqueue(row(line))
        end = pending.indexOf('\n')
      }
    },
    flush(controller) {
      pending += decoder.decode()
      if (pending.trim())
        controller.enqueue(row(pending))
    },
  }))
}
