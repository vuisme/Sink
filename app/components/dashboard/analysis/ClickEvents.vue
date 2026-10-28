<script setup lang="ts">
import type { LogEvent } from '#shared/types/events'
import type { Link } from '@/types'

const props = defineProps<{ link: Link }>()
const { locale } = useI18n()
const analysisStore = useDashboardAnalysisStore()
const events = shallowRef<LogEvent[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const retryKey = shallowRef(0)

const query = computed(() => ({
  id: props.link.id,
  slug: props.link.slug,
  startAt: analysisStore.dateRange.startAt,
  endAt: analysisStore.dateRange.endAt,
  limit: 100,
}))

const dateFormatter = computed(() => new Intl.DateTimeFormat(locale.value, {
  dateStyle: 'short',
  timeStyle: 'medium',
}))

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
    </CardHeader>
    <CardContent>
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
              <TableHead>IP</TableHead>
              <TableHead>{{ $t('dashboard.metrics.country') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.region') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.city') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.os') }}</TableHead>
              <TableHead>{{ $t('dashboard.metrics.browser') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="event in events" :key="event.id">
              <TableCell>
                <time :datetime="new Date(event.timestamp * 1000).toISOString()">
                  {{ dateFormatter.format(event.timestamp * 1000) }}
                </time>
              </TableCell>
              <TableCell>{{ event.ip || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.country || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.region || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.city || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.os || $t('dashboard.none') }}</TableCell>
              <TableCell>{{ event.browser || $t('dashboard.none') }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</template>
