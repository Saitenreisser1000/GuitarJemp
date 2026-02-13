<script setup>
import FretboardEdit from '@/components/Fretboards/FretboardEdit/FretboardEdit.vue'
import ActiveTonesWindow from '@/components/ActiveTonesWindow/ActiveTonesWindow.vue'
import Timeline from '@/components/Timeline/Timeline.vue'
import AuthDialog from '@/components/Cloud/AuthDialog.vue'
import LibraryDialog from '@/components/Cloud/LibraryDialog.vue'
import ConnectionsDialog from '@/components/Cloud/ConnectionsDialog.vue'
import { computed, onMounted, ref } from 'vue'
import { useInstrumentStore } from '@/store/useInstrument'
import { useAuthStore } from '@/store/useAuth'
import { useNotesStore } from '@/store/useNotes'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { useLibraryStore } from '@/store/useLibrary'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { isSupabaseConfigured } from '@/infra/supabase/client'
import { useTheme } from 'vuetify'

const instrument = useInstrumentStore()
const auth = useAuthStore()
const notes = useNotesStore()
const timelineSettings = useTimelineSettingsStore()
const transport = useTransportStore()
const library = useLibraryStore()
const handPositions = useHandPositionsStore()

const authOpen = ref(false)
const libraryOpen = ref(false)
const connectionsOpen = ref(false)

const numFrets = ref(12)
const activeNotesVisible = ref(true)

const saveBusy = ref(false)
const saveError = ref('')

const saveAsNewOpen = ref(false)
const saveAsNewTitle = ref('')
const saveAsNewVisibility = ref('private')
const saveAsNewBusy = ref(false)

const THEME_STORAGE_KEY = 'guitarjemp.ui.theme'
const theme = useTheme()
const isDarkTheme = computed(() => Boolean(theme.global.current.value.dark))

function applyTheme(name) {
  const next = name === 'guitarjempDark' ? 'guitarjempDark' : 'guitarjemp'
  theme.global.name.value = next
  localStorage.setItem(THEME_STORAGE_KEY, next)
}

function toggleTheme() {
  applyTheme(isDarkTheme.value ? 'guitarjemp' : 'guitarjempDark')
}

onMounted(() => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'guitarjemp' || stored === 'guitarjempDark') {
    applyTheme(stored)
    return
  }

  const prefersDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  applyTheme(prefersDark ? 'guitarjempDark' : 'guitarjemp')
})

const hasNotes = computed(() => (notes.activeNotes?.length ?? 0) > 0)
const canUpdateCurrentItem = computed(() => {
  const item = library.currentItem
  const uid = auth.user?.id
  const ownerId = item?.owner_id
  return Boolean(uid && ownerId && uid === ownerId)
})

const canSave = computed(() => {
  if (!isSupabaseConfigured) return false
  if (!auth.isSignedIn) return false
  if (!hasNotes.value) return false
  if (!library.currentItem?.id) return false
  if (!canUpdateCurrentItem.value) return false
  return true
})

function makeSnapshot() {
  return {
    version: 1,
    instrument: {
      instrumentType: instrument.instrumentType,
      tuningId: instrument.tuningId,
      numStrings: instrument.numStrings,
    },
    transport: {
      tempo: transport.tempo,
    },
    timelineSettings: {
      selectedMode: timelineSettings.selectedMode,
      lastRhythmMode: timelineSettings.lastRhythmMode,
      snapEnabled: timelineSettings.snapEnabled,
      soundPreviewEnabled: timelineSettings.soundPreviewEnabled,
      loopEnabled: timelineSettings.loopEnabled,
      beatTop: timelineSettings.beatTop,
      beatBottom: timelineSettings.beatBottom,
      zoomPxPerBlock: timelineSettings.zoomPxPerBlock,
      selectedColor: timelineSettings.selectedColor,
    },
    notes: notes.activeNotes,
    handPositions: handPositions.handPositions,
  }
}

function applySnapshot(snap) {
  if (!snap) return

  if (snap?.instrument?.instrumentType) instrument.setInstrumentType(snap.instrument.instrumentType)
  if (snap?.instrument?.tuningId) instrument.setTuningId(snap.instrument.tuningId)

  if (snap?.transport?.tempo != null) transport.setTempo(snap.transport.tempo)

  const s = snap?.timelineSettings
  if (s) {
    if (s.selectedMode) timelineSettings.setSelectedMode(s.selectedMode)
    if (s.snapEnabled != null) timelineSettings.setSnapEnabled(s.snapEnabled)
    if (s.soundPreviewEnabled != null)
      timelineSettings.setSoundPreviewEnabled(s.soundPreviewEnabled)
    if (s.loopEnabled != null) timelineSettings.setLoopEnabled(s.loopEnabled)
    if (s.beatTop != null) timelineSettings.setBeatTop(s.beatTop)
    if (s.beatBottom != null) timelineSettings.setBeatBottom(s.beatBottom)
    if (s.zoomPxPerBlock != null) timelineSettings.setZoomPxPerBlock(s.zoomPxPerBlock)
    if (s.selectedColor) timelineSettings.setSelectedColor(s.selectedColor)
  }

  if (Array.isArray(snap?.notes)) notes.setNotes(snap.notes)
  else notes.setNotes([])

  if (Array.isArray(snap?.handPositions)) handPositions.setHandPositions(snap.handPositions)
  else handPositions.setHandPositions([])
}

const canSaveAsNew = computed(() => {
  if (!isSupabaseConfigured) return false
  if (!auth.isSignedIn) return false
  if (!hasNotes.value) return false
  return true
})

const canReset = computed(() => {
  if (!library.currentItemContent) return false
  return true
})

function openSaveAsNew() {
  const base = String(library.currentItem?.title ?? '').trim()
  saveAsNewTitle.value = base ? `${base} (copy)` : 'Neue Aufnahme'
  saveAsNewVisibility.value = 'private'
  saveAsNewOpen.value = true
}

async function onSaveAsNewConfirm() {
  if (!canSaveAsNew.value || saveAsNewBusy.value) return

  const title = String(saveAsNewTitle.value ?? '').trim()
  if (!title) return

  saveError.value = ''
  saveAsNewBusy.value = true
  try {
    const base = library.currentItem
    const kind = String(base?.kind ?? 'song')
    const category = base?.category ? String(base.category) : ''
    const created = await library.createItem({
      kind,
      title,
      visibility: String(saveAsNewVisibility.value ?? 'private'),
      category,
      content: makeSnapshot(),
    })

    if (!created) {
      saveError.value = String(
        library.error?.message ?? library.error ?? 'Speichern fehlgeschlagen.',
      )
      return
    }

    saveAsNewOpen.value = false
  } finally {
    saveAsNewBusy.value = false
  }
}

function onResetChanges() {
  if (!canReset.value) return
  const ok = window.confirm(
    'Alle Änderungen verwerfen und auf den zuletzt geladenen Stand zurücksetzen?',
  )
  if (!ok) return
  saveError.value = ''
  applySnapshot(library.currentItemContent)
}

async function onSaveCloud() {
  if (!canSave.value || saveBusy.value) return

  saveError.value = ''
  saveBusy.value = true
  try {
    const updated = await library.updateCurrentItemContent(makeSnapshot())
    if (!updated) {
      saveError.value = String(
        library.error?.message ?? library.error ?? 'Speichern fehlgeschlagen.',
      )
    }
  } finally {
    saveBusy.value = false
  }
}
</script>

<template>
  <v-app>
    <AuthDialog v-model="authOpen" />
    <ConnectionsDialog v-model="connectionsOpen" />

    <v-layout>
      <v-app-bar class="app-bar-sticky app-topbar" density="compact" elevation="0">
        <v-toolbar-title>GuitarJemp</v-toolbar-title>

        <v-spacer />

        <div class="d-flex flex-wrap align-center ga-2">
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" size="small" color="secondary" variant="flat" prepend-icon="mdi-content-save">
                Save
              </v-btn>
            </template>

            <v-list density="compact" min-width="220">
              <v-list-item prepend-icon="mdi-content-save" title="Save" :disabled="!canSave || saveBusy"
                @click="onSaveCloud" />
              <v-list-item prepend-icon="mdi-content-save-plus" title="Save as new" :disabled="!canSaveAsNew"
                @click="openSaveAsNew" />
              <v-list-item prepend-icon="mdi-restore" title="Reset" :disabled="!canReset" @click="onResetChanges" />
            </v-list>
          </v-menu>

          <v-chip v-if="!isSupabaseConfigured" size="small" color="warning" variant="tonal">
            Cloud: nicht konfiguriert
          </v-chip>
          <v-chip v-else-if="auth.isSignedIn" size="small" color="success" variant="tonal">
            {{ auth.user?.email }}
          </v-chip>

          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" size="small" variant="tonal" prepend-icon="mdi-account">
                Account
              </v-btn>
            </template>

            <v-list density="compact" min-width="180">
              <v-list-item
                :prepend-icon="auth.isSignedIn ? 'mdi-logout' : 'mdi-login'"
                :title="auth.isSignedIn ? 'Logout' : 'Login'"
                @click="auth.isSignedIn ? auth.signOut() : (authOpen = true)"
              />
              <v-list-item
                prepend-icon="mdi-account-multiple"
                title="Freunde"
                :disabled="!auth.isSignedIn"
                @click="connectionsOpen = true"
              />
            </v-list>
          </v-menu>
        </div>
      </v-app-bar>

      <LibraryDialog v-model="libraryOpen" />

      <v-main>
        <div class="app-shell">
          <v-container fluid class="app-content with-main-menu py-3">
            <v-row class="mt-2" align="start" justify="center" dense>
              <v-col cols="12">
                <v-alert v-if="saveError" type="error" variant="tonal" class="mb-2">
                  {{ saveError }}
                </v-alert>

                <FretboardEdit class="fretboard" :num-frets="numFrets" @update-frets="(n) => (numFrets = n)" />
              </v-col>

              <v-dialog v-model="saveAsNewOpen" max-width="520">
                <v-card rounded="lg">
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>Save as new</span>
                    <v-btn icon="mdi-close" variant="text" @click="saveAsNewOpen = false" />
                  </v-card-title>

                  <v-card-text>
                    <v-text-field v-model="saveAsNewTitle" label="Titel" density="compact" variant="outlined"
                      autofocus />

                    <v-select v-model="saveAsNewVisibility" :items="[
                      { title: 'Privat', value: 'private' },
                      { title: 'Connections', value: 'connections' },
                      { title: 'Öffentlich', value: 'public' },
                    ]" label="Sichtbarkeit" density="compact" variant="outlined" />
                  </v-card-text>

                  <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="saveAsNewOpen = false">Abbrechen</v-btn>
                    <v-btn color="primary" variant="flat" :disabled="!canSaveAsNew || !String(saveAsNewTitle ?? '').trim() || saveAsNewBusy
                      " @click="onSaveAsNewConfirm">
                      Speichern
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-dialog>

              <v-col cols="12">
                <Timeline class="timeline" :compact="false" :num-frets="numFrets"
                  :library-enabled="auth.isSignedIn"
                  :active-notes-visible="activeNotesVisible"
                  :is-dark-theme="isDarkTheme"
                  @open-library="libraryOpen = true"
                  @toggle-theme="toggleTheme"
                  @update-active-notes-visible="(v) => (activeNotesVisible = Boolean(v))"
                  @update-frets="(n) => (numFrets = n)" />
              </v-col>

              <v-col v-if="activeNotesVisible" cols="12">
                <ActiveTonesWindow class="active-tones" />
              </v-col>
            </v-row>
          </v-container>
        </div>
      </v-main>
    </v-layout>
  </v-app>
</template>

<style scoped>
.app-bar-sticky {
  position: fixed !important;
  top: 0 !important;
  left: 0;
  right: 0;
  z-index: 1000;
}

.app-topbar {
  background: color-mix(in srgb, var(--color-surface) 84%, transparent) !important;
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
}

.app-topbar :deep(.v-toolbar-title) {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-primary-2);
}

.app-shell {
  --main-menu-w: 84px;
  min-height: 100vh;
  background:
    radial-gradient(1200px 500px at 10% -5%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 60%),
    radial-gradient(1100px 450px at 90% 0%, color-mix(in srgb, var(--color-primary-2) 16%, transparent), transparent 62%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2) 12%) 0%, var(--color-surface-2) 100%);
  font-family: var(--font-ui);
}

.app-content {
  max-width: 1280px;
  margin: 0 auto;
}

.app-content.with-main-menu {
  padding-left: calc(var(--main-menu-w) + var(--space-4));
}

.fretboard {
  width: 100%;
  border-radius: var(--radius-lg);
  overflow: clip;
}

.timeline,
.active-tones {
  border-radius: var(--radius-lg);
  overflow: clip;
}

@media (max-width: 860px) {
  .app-content.with-main-menu {
    padding-left: 0;
  }
}
</style>
