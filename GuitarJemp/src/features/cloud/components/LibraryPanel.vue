<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/store/useAuth'
import { useLibraryStore } from '@/store/useLibrary'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { useI18n } from '@/i18n'
import { supabase, isSupabaseConfigured } from '@/infra/supabase/client'

defineOptions({ name: 'LibraryPanel' })

const auth = useAuthStore()
const library = useLibraryStore()
const notes = useNotesStore()
const instrument = useInstrumentStore()
const timelineSettings = useTimelineSettingsStore()
const transport = useTransportStore()
const { t } = useI18n()

const listTab = ref('mine')
const ownerNamesById = ref({})

const userId = computed(() => auth.user?.id ?? null)

const myItems = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return (library.items ?? []).filter((i) => i?.owner_id === uid)
})

const connectionsItems = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return (library.items ?? []).filter((i) => i?.owner_id !== uid && i?.visibility === 'connections')
})

const publicItems = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return (library.items ?? []).filter((i) => i?.owner_id !== uid && i?.visibility === 'public')
})

const sharedItems = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return (library.items ?? []).filter((i) => i?.owner_id !== uid && i?.visibility === 'private')
})

const visibleItems = computed(() => {
  switch (listTab.value) {
    case 'connections':
      return connectionsItems.value
    case 'public':
      return publicItems.value
    case 'shared':
      return sharedItems.value
    case 'mine':
    default:
      return myItems.value
  }
})

function applySnapshot(snap) {
  if (!snap) return

  if (snap?.instrument?.instrumentType) instrument.setInstrumentType(snap.instrument.instrumentType)
  if (snap?.instrument?.tuningId) instrument.setTuningId(snap.instrument.tuningId)

  if (snap?.transport?.tempo != null) transport.setTempo(snap.transport.tempo)

  const s = snap?.timelineSettings
  if (s) {
    if (s.selectedMode) timelineSettings.setSelectedMode(s.selectedMode)
    if (s.snapEnabled != null) timelineSettings.setSnapEnabled(s.snapEnabled)
    if (s.soundPreviewEnabled != null) timelineSettings.setSoundPreviewEnabled(s.soundPreviewEnabled)
    if (s.clickEnabled != null) timelineSettings.setClickEnabled(s.clickEnabled)
    if (s.countInEnabled != null) timelineSettings.setCountInEnabled(s.countInEnabled)
    if (s.loopEnabled != null) timelineSettings.setLoopEnabled(s.loopEnabled)
    if (s.loopStartBlock != null) timelineSettings.setLoopStartBlock(s.loopStartBlock)
    if (s.loopEndBlock != null) timelineSettings.setLoopEndBlock(s.loopEndBlock)
    if (s.beatTop != null) timelineSettings.setBeatTop(s.beatTop)
    if (s.beatBottom != null) timelineSettings.setBeatBottom(s.beatBottom)
    if (s.pickupEnabled != null) timelineSettings.setPickupEnabled(s.pickupEnabled)
    if (s.pickupBeats != null) timelineSettings.setPickupBeats(s.pickupBeats)
    if (s.zoomPxPerBlock != null) timelineSettings.setZoomPxPerBlock(s.zoomPxPerBlock)
    if (s.timelineLengthBlocks != null) timelineSettings.setTimelineLengthBlocks(s.timelineLengthBlocks)
    if (s.selectedColor) timelineSettings.setSelectedColor(s.selectedColor)
  }

  if (Array.isArray(snap?.notes)) notes.setNotes(snap.notes)
}

function onLoad(item) {
  library.setCurrentItem(item)
  applySnapshot(item?.content)
}

async function refreshOwnerNames() {
  ownerNamesById.value = {}
  if (!isSupabaseConfigured || !supabase) return
  const ids = [...new Set((library.items ?? []).map((i) => String(i?.owner_id ?? '')).filter(Boolean))]
  if (!ids.length) return

  const { data, error } = await supabase
    .from('profile_directory')
    .select('id, display_name')
    .in('id', ids)
  if (error) return

  const next = {}
  for (const row of Array.isArray(data) ? data : []) {
    const id = String(row?.id ?? '')
    const name = String(row?.display_name ?? '').trim()
    if (!id || !name) continue
    next[id] = name
  }
  ownerNamesById.value = next
}

function ownerDisplayNameFor(item) {
  const ownerId = String(item?.owner_id ?? '')
  if (!ownerId) return '—'
  const fromMap = String(ownerNamesById.value?.[ownerId] ?? '').trim()
  if (fromMap) return fromMap
  const meId = String(auth.user?.id ?? '')
  if (meId && ownerId === meId) {
    const meName = String(auth.profile?.display_name ?? auth.user?.user_metadata?.display_name ?? '').trim()
    if (meName) return meName
  }
  return '—'
}

onMounted(async () => {
  await library.refresh()
  await refreshOwnerNames()
})
</script>

<template>
  <div class="library-panel">
    <v-alert v-if="!auth.isSignedIn" type="info" variant="tonal" class="mb-2" density="compact">
      {{ t('libraryDialog.signInHint') }}
    </v-alert>

    <v-alert v-if="library.error" type="error" variant="tonal" class="mb-2" density="compact">
      {{ String(library.error?.message ?? library.error) }}
    </v-alert>

    <template v-if="auth.isSignedIn">
      <div class="d-flex align-center justify-space-between mb-1">
        <v-tabs v-model="listTab" density="compact">
          <v-tab value="mine" class="px-2">{{ t('libraryDialog.mine') }}</v-tab>
          <v-tab value="connections" class="px-2">{{ t('libraryDialog.connections') }}</v-tab>
          <v-tab value="public" class="px-2">{{ t('libraryDialog.public') }}</v-tab>
          <v-tab value="shared" class="px-2">{{ t('libraryDialog.shared') }}</v-tab>
        </v-tabs>
        <v-btn variant="tonal" size="small" @click="library.refresh">{{ t('libraryDialog.refresh') }}</v-btn>
      </div>

      <v-table density="compact" class="library-table">
        <thead>
          <tr>
            <th>{{ t('libraryDialog.titleLabel') }}</th>
            <th>{{ t('libraryDialog.type') }}</th>
            <th>{{ t('libraryDialog.visibility') }}</th>
            <th>{{ t('libraryDialog.category') }}</th>
            <th>{{ t('libraryDialog.owner') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in visibleItems"
            :key="item.id"
            class="library-row"
            role="button"
            tabindex="0"
            @click="onLoad(item)"
            @keydown.enter.prevent="onLoad(item)"
            @keydown.space.prevent="onLoad(item)"
          >
            <td class="library-ellipsis">{{ item.title }}</td>
            <td>{{ item.kind }}</td>
            <td>{{ item.visibility }}</td>
            <td class="library-ellipsis">{{ item.category || '—' }}</td>
            <td class="text-medium-emphasis library-ellipsis">{{ ownerDisplayNameFor(item) }}</td>
          </tr>
          <tr v-if="visibleItems.length === 0">
            <td colspan="5" class="text-medium-emphasis">{{ t('libraryDialog.noItems') }}</td>
          </tr>
        </tbody>
      </v-table>
    </template>
  </div>
</template>

<style scoped>
.library-panel {
  height: 100%;
  overflow: auto;
}

.library-table {
  table-layout: fixed;
}

.library-table :deep(th),
.library-table :deep(td) {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}

.library-table :deep(.library-row) {
  cursor: pointer;
}

.library-table :deep(.library-row:hover) {
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
}

.library-table :deep(.library-row:focus-visible) {
  outline: 2px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
  outline-offset: -2px;
}

.library-ellipsis {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
