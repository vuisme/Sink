<script setup lang="ts">
import type { LogEvent } from '#shared/types/events'
import type { Link } from '@/types'
import { Download, Loader } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { createExportFilename } from '#shared/utils/export-file'

const props = defineProps<{ link?: Link | null }>()
const { locale, t } = useI18n()
const analysisStore = useDashboardAnalysisStore()
const events = shallowRef<LogEvent[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const retryKey = shallowRef(0)
const visitorId = shallowRef<string>()
const sessionId = shallowRef<string>()
const exporting = shallowRef(false)
const exportController = new AbortController()
onBeforeUnmount(() => exportController.abort())

const filters = computed(() => ({
  ...analysisStore.filters,
  id: props.link?.id,
  slug: props.link?.slug ?? analysisStore.filters.slug,
  visitorId: visitorId.value,
  sessionId: sessionId.value,
  startAt: analysisStore.dateRange.startAt,
  endAt: analysisStore.dateRange.endAt,
}))
const query = computed(() => ({ ...filters.value, limit: 100 }))

const dateFormatter = computed(() => new Intl.DateTimeFormat(locale.value, {
  dateStyle: 'short',
  timeStyle: 'medium',
}))

async function exportClicks() {
  if (exporting.value)
    return
  exporting.value = true
  const exportFilters = { ...filters.value }
  try {
    const csv = await useAPI<string>('/api/logs/export', {
      responseType: 'text',
      query: exportFilters,
      signal: exportController.signal,
    })
    if (!exportController.signal.aborted)
      saveAsCsv(csv, createExportFilename('sink-clicks', 'csv'))
  }
  catch {
    if (!exportController.signal.aborted)
      toast.error(t('dashboard.analysis.clicks_export_error'))
  }
  finally {
    exporting.value = false
  }
}

watch([query, retryKey], async ([currentQuery], _previous, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  events.value = []
  loading.value = true
  error.value = false
  try {
    const result = await useAPI<LogEvent[]>('/api/logs/events', {
      signal: controller.signal,
      query: currentQuery,
    })
    if (!controller.signal.aborted)
      events.value = result
  }
  catch {
    if (!controller.signal.aborted)
      error.value = true
  }
  finally {
    if (!controller.signal.aborted)
      loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <Card :aria-busy="loading">
    <CardHeader>
      <CardTitle>{{ $t('dashboard.analysis.clicks_title') }}</CardTitle>
      <CardDescription>{{ $t('dashboard.analysis.clicks_description') }}</CardDescription>
      <div>
        <Button type="button" variant="outline" :disabled="exporting" :aria-busy="exporting" @click="exportClicks">
          <Loader
            v-if="exporting" aria-hidden="true" class="
              size-4
              motion-safe:animate-spin
            "
          />
          <Download v-else aria-hidden="true" class="size-4" />
          {{ $t(exporting ? 'dashboard.analysis.clicks_exporting' : 'dashboard.analysis.clicks_export') }}
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div
        v-if="visitorId || sessionId" class="
          mb-4 flex flex-wrap items-center gap-2
        "
      >
        <Badge v-if="visitorId" variant="secondary">
          Visitor ID: {{ visitorId }}
        </Badge>
        <Badge v-if="sessionId" variant="secondary">
          Session ID: {{ sessionId }}
        </Badge>
        <Button type="button" variant="outline" size="sm" @click="visitorId = undefined; sessionId = undefined">
          {{ $t('dashboard.clear_selection') }}
        </Button>
      </div>
      <div
        v-if="error" role="alert" class="
          flex items-center gap-2 text-sm text-destructive
        "
      >
        {{ $t('dashboard.analysis.clicks_error') }}
        <Button type="button" variant="link" class="text-destructive" @click="retryKey++">
          {{ $t('common.try_again') }}
        </Button>
      </div>
      <p v-else-if="loading" role="status" class="text-sm text-muted-foreground">
        {{ $t('dashboard.loading') }}
      </p>
      <p
        v-else-if="!events.length" role="status" class="
          text-sm text-muted-foreground
        "
      >
        {{ $t('dashboard.no_data') }}
      </p>
      <div v-else class="max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ $t('dashboard.date') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.slug') }}</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Visitor ID</TableHead>
              <TableHead>Session ID</TableHead>
              <TableHead>{{ $t('dashboard.metrics.country') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.region') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.city') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.os') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.browser') }}</TableHead>
              <TableHead>User-Agent</TableHead>
              <TableHead>Client Hints</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="event in events" :key="event.id">
              <TableCell>
                <time :datetime="new Date(event.timestamp * 1000).toISOString()">
                  {{ dateFormatter.format(event.timestamp * 1000) }}
                </time>
              </TableCell>
              <TableCell>
                <NuxtLink :to="getDashboardLinkDetailLocation(event.slug)">
                  {{ event.slug }}
                </NuxtLink>
              </TableCell>
              <TableCell>{{ event.ip || $t('dashboard.none') }}</TableCell>
              <TableCell>
                <Button
                  v-if="event.visitorId" type="button" variant="link" size="sm"
                  :title="event.visitorId"
                  :aria-label="`Filter by visitor ${event.visitorId}`"
                  @click="visitorId = event.visitorId; sessionId = undefined"
                >
                  {{ event.visitorId }}
                </Button>
                <span v-else>{{ $t('dashboard.none') }}</span>
              </TableCell>
              <TableCell>
                <Button
                  v-if="event.sessionId" type="button" variant="link" size="sm"
                  :title="event.sessionId"
                  :aria-label="`Filter by session ${event.sessionId}`"
                  @click="sessionId = event.sessionId; visitorId = event.visitorId || undefined"
                >
                  {{ event.sessionId }}
                </Button>
                <span v-else>{{ $t('dashboard.none') }}</span>
              </TableCell>
              <TableCell>{{ event.country || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.region || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.city || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.os || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.browser || $t('dashboard.none') }}</TableCell>
              <TableCell
                class="max-w-sm min-w-64 wrap-anywhere whitespace-normal"
              >
                {{ event.ua || $t('dashboard.none') }}
              </TableCell>
              <TableCell
                class="max-w-sm min-w-64 wrap-anywhere whitespace-normal"
              >
                {{ event.clientHints || $t('dashboard.none') }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</template>
