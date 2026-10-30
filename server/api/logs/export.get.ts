import { createExportFilename } from '#shared/utils/export-file'
import { blobsMap, doublesMap } from '../../utils/access-log'
import { jsonLinesToCsv } from '../../utils/csv-stream'

const columns = ['timestamp_utc', 'linkId', ...Object.values(blobsMap), ...Object.values(doublesMap), 'sample_interval']

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, StatsExportQuerySchema.parse)
  const source = await useWAEExport(event, buildClickExportQuery(query, event))

  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${createExportFilename('sink-clicks', 'csv')}"`)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return sendStream(event, jsonLinesToCsv(source, columns))
})
