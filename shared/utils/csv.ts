function escapeCsvCell(value: unknown): string {
  let text = String(value ?? '')

  if (/^[=+\-@\t\r]/.test(text))
    text = `'${text}`

  if (/[",\n\r]/.test(text))
    return `"${text.replaceAll('"', '""')}"`

  return text
}

export function generateCsvRow(values: unknown[]): string {
  return values.map(escapeCsvCell).join(',')
}

export function generateCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    generateCsvRow(headers),
    ...rows.map(generateCsvRow),
  ]

  return `\uFEFF${lines.join('\n')}\n`
}
