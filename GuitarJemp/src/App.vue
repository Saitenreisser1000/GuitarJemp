<script setup>
import FretboardEdit from '@/components/Fretboards/FretboardEdit/FretboardEdit.vue'
import FretboardShow from '@/components/Fretboards/FretboardShow/FretboardShow.vue'
import ActiveTonesWindow from '@/components/ActiveTonesWindow/ActiveTonesWindow.vue'
import Timeline from '@/components/Timeline/Timeline.vue'
import AuthDialog from '@/components/Cloud/AuthDialog.vue'
import LibraryDialog from '@/components/Cloud/LibraryDialog.vue'
import ConnectionsDialog from '@/components/Cloud/ConnectionsDialog.vue'
import { computed, ref } from 'vue'
import { useInstrumentStore } from '@/store/useInstrument'
import { useAuthStore } from '@/store/useAuth'
import { useNotesStore } from '@/store/useNotes'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { useLibraryStore } from '@/store/useLibrary'
import { isSupabaseConfigured } from '@/infra/supabase/client'

const instrument = useInstrumentStore()
const auth = useAuthStore()
const notes = useNotesStore()
const timelineSettings = useTimelineSettingsStore()
const transport = useTransportStore()
const library = useLibraryStore()

const authOpen = ref(false)
const libraryOpen = ref(false)
const connectionsOpen = ref(false)

// Temporarily hide instrument type toggle (Guitar/Bass/Ukulele).
const showInstrumentTypeToggle = false

const instrumentType = computed({
  get: () => instrument.instrumentType,
  set: (v) => instrument.setInstrumentType(v),
})

const fretboardMode = ref('editor')
const numFrets = ref(12)

const saveBusy = ref(false)
const saveError = ref('')

const saveAsNewOpen = ref(false)
const saveAsNewTitle = ref('')
const saveAsNewVisibility = ref('private')
const saveAsNewBusy = ref(false)

const hasNotes = computed(() => (notes.activeNotes?.length ?? 0) > 0)
const canUpdateCurrentItem = computed(() => {
  const item = library.currentItem
  const uid = auth.user?.id
  const ownerId = item?.owner_id
  return Boolean(uid && ownerId && uid === ownerId)
})

const canSave = computed(() => {
  if (fretboardMode.value !== 'editor') return false
  if (!isSupabaseConfigured) return false
  if (!auth.isSignedIn) return false
  if (!hasNotes.value) return false
  if (!library.currentItem?.id) return false
  if (!canUpdateCurrentItem.value) return false
  return true
})

const saveDisabledReason = computed(() => {
  if (fretboardMode.value !== 'editor') return ''
  if (!isSupabaseConfigured) return 'Cloud ist nicht konfiguriert.'
  if (!auth.isSignedIn) return 'Bitte einloggen.'
  if (!hasNotes.value) return 'Erstelle zuerst Töne.'
  if (!library.currentItem?.id) return 'Lade zuerst ein Library-Item, das du besitzt.'
  if (!canUpdateCurrentItem.value) return 'Nur der Owner kann dieses Item aktualisieren.'
  return ''
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
}

const canSaveAsNew = computed(() => {
  if (fretboardMode.value !== 'editor') return false
  if (!isSupabaseConfigured) return false
  if (!auth.isSignedIn) return false
  if (!hasNotes.value) return false
  return true
})

const canReset = computed(() => {
  if (fretboardMode.value !== 'editor') return false
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
      <v-app-bar color="primary" density="compact">
        <v-toolbar-title>GuitarJemp</v-toolbar-title>

        <v-spacer />

        <div class="d-flex flex-wrap align-center ga-2">
          <v-btn-toggle v-model="fretboardMode" mandatory divided>
            <v-btn value="editor" size="small" variant="tonal">Editor</v-btn>
            <v-btn value="show" size="small" variant="tonal">Show</v-btn>
          </v-btn-toggle>

          <template v-if="fretboardMode === 'editor'">
            <v-btn size="small" variant="tonal" prepend-icon="mdi-restore" :disabled="!canReset"
              title="Änderungen verwerfen" @click="onResetChanges">
              Reset
            </v-btn>

            <v-btn size="small" variant="tonal" prepend-icon="mdi-content-save-plus" :disabled="!canSaveAsNew"
              title="Als neues Item speichern" @click="openSaveAsNew">
              Save as new
            </v-btn>

            <v-btn size="small" color="secondary" variant="flat" prepend-icon="mdi-content-save"
              :disabled="!canSave || saveBusy" :title="saveDisabledReason || 'In Cloud Library speichern'"
              @click="onSaveCloud">
              Save
            </v-btn>
          </template>

          <v-chip v-if="!isSupabaseConfigured" size="small" color="warning" variant="tonal">
            Cloud: nicht konfiguriert
          </v-chip>
          <v-chip v-else-if="auth.isSignedIn" size="small" color="success" variant="tonal">
            {{ auth.user?.email }}
          </v-chip>

          <v-btn size="small" variant="tonal" prepend-icon="mdi-account" @click="authOpen = true">
            Account
          </v-btn>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-cloud" :disabled="!auth.isSignedIn"
            @click="libraryOpen = true">
            Library
          </v-btn>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-account-multiple" :disabled="!auth.isSignedIn"
            @click="connectionsOpen = true">
            Freunde
          </v-btn>
        </div>
      </v-app-bar>

      <LibraryDialog v-model="libraryOpen" />

      <v-main>
        <div class="app-shell">
          <v-container fluid class="py-2">
            <header class="text-center text-white">
              <h1 class="app-title">GuitarJemp</h1>

              <div v-if="showInstrumentTypeToggle" class="d-flex flex-wrap justify-center align-center ga-3 mt-3">
                <v-btn-toggle v-model="instrumentType" mandatory divided>
                  <v-btn value="guitar" variant="tonal">Guitar</v-btn>
                  <v-btn value="bass" variant="tonal">Bass</v-btn>
                  <v-btn value="ukulele" variant="tonal">Ukulele</v-btn>
                </v-btn-toggle>
              </div>
            </header>

            <v-row class="mt-2" align="start" justify="center" dense>
              <v-col cols="12">
                <v-alert v-if="fretboardMode === 'editor' && saveError" type="error" variant="tonal" class="mb-2">
                  {{ saveError }}
                </v-alert>

                <FretboardEdit v-if="fretboardMode === 'editor'" class="fretboard" :num-frets="numFrets"
                  @update-frets="(n) => (numFrets = n)" />
                <div v-else class="fretboard-show-wrap">
                  <FretboardShow class="fretboard" :num-frets="numFrets" />
                </div>
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

              <v-col cols="12" :md="fretboardMode === 'show' ? 12 : 8" :lg="fretboardMode === 'show' ? 12 : 9">
                <Timeline class="timeline" :compact="fretboardMode === 'show'" :num-frets="numFrets"
                  @update-frets="(n) => (numFrets = n)" />
              </v-col>
              <v-col v-if="fretboardMode !== 'show'" cols="12" md="4" lg="3">
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
.app-shell {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 100%);
  font-family: Arial, sans-serif;
}

header {
  color: white;
}

.app-title {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.fretboard {
  width: 100%;
}

.fretboard-show-wrap {
  padding: 8px;
}
</style>
