<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/store/useAuth'
import { useLibraryStore } from '@/store/useLibrary'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const auth = useAuthStore()
const library = useLibraryStore()

const listTab = ref('mine')

const kind = ref('song')
const title = ref('')
const visibility = ref('private')
const category = ref('')

const notes = useNotesStore()
const instrument = useInstrumentStore()
const timelineSettings = useTimelineSettingsStore()
const transport = useTransportStore()

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

    // Heuristik: Items, die nicht dir gehören und nicht public/connections sind,
    // kommen typischerweise aus expliziten Shares.
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
            clickEnabled: timelineSettings.clickEnabled,
            loopEnabled: timelineSettings.loopEnabled,
            loopStartBlock: timelineSettings.loopStartBlock,
            loopEndBlock: timelineSettings.loopEndBlock,
            beatTop: timelineSettings.beatTop,
            beatBottom: timelineSettings.beatBottom,
            pickupEnabled: timelineSettings.pickupEnabled,
            pickupBeats: timelineSettings.pickupBeats,
            zoomPxPerBlock: timelineSettings.zoomPxPerBlock,
            timelineLengthBlocks: timelineSettings.timelineLengthBlocks,
            selectedColor: timelineSettings.selectedColor,
        },
        notes: notes.activeNotes,
    }
}

async function onSave() {
    const t = String(title.value ?? '').trim()
    if (!t) return

    await library.createItem({
        kind: kind.value,
        title: t,
        visibility: visibility.value,
        category: category.value,
        content: makeSnapshot(),
    })

    if (!library.error) {
        title.value = ''
        category.value = ''
    }
}

async function onLoad(item) {
    library.setCurrentItem(item)

    const snap = item?.content
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
        if (s.clickEnabled != null) timelineSettings.setClickEnabled(s.clickEnabled)
        if (s.loopEnabled != null) timelineSettings.setLoopEnabled(s.loopEnabled)
        if (s.loopStartBlock != null) timelineSettings.setLoopStartBlock(s.loopStartBlock)
        if (s.loopEndBlock != null) timelineSettings.setLoopEndBlock(s.loopEndBlock)
        if (s.beatTop != null) timelineSettings.setBeatTop(s.beatTop)
        if (s.beatBottom != null) timelineSettings.setBeatBottom(s.beatBottom)
        if (s.pickupEnabled != null) timelineSettings.setPickupEnabled(s.pickupEnabled)
        if (s.pickupBeats != null) timelineSettings.setPickupBeats(s.pickupBeats)
        if (s.zoomPxPerBlock != null) timelineSettings.setZoomPxPerBlock(s.zoomPxPerBlock)
        if (s.timelineLengthBlocks != null)
            timelineSettings.setTimelineLengthBlocks(s.timelineLengthBlocks)
        if (s.selectedColor) timelineSettings.setSelectedColor(s.selectedColor)
    }

    if (Array.isArray(snap?.notes)) notes.setNotes(snap.notes)
}

watch(
    () => open.value,
    async (v) => {
        if (!v) return
        await library.refresh()
    },
)
</script>

<template>
    <v-navigation-drawer v-model="open" location="right" temporary width="860">
        <div class="d-flex flex-column h-100">
            <div class="d-flex align-center justify-space-between px-4 py-3">
                <div class="text-h6">Cloud Library</div>
                <v-btn icon="mdi-close" variant="text" @click="open = false" />
            </div>

            <v-divider />

            <div class="pa-4 flex-grow-1" style="overflow: auto">
                <v-alert v-if="!auth.isSignedIn" type="info" variant="tonal" class="mb-4">
                    Bitte einloggen, um Songs/Übungen zu speichern und zu teilen.
                </v-alert>

                <v-alert v-if="library.error" type="error" variant="tonal" class="mb-4">
                    {{ String(library.error?.message ?? library.error) }}
                </v-alert>

                <template v-if="auth.isSignedIn">
                    <div class="d-flex flex-wrap ga-3 align-start mb-4">
                        <v-select v-model="kind" :items="[
                            { title: 'Song', value: 'song' },
                            { title: 'Übung', value: 'exercise' },
                        ]" label="Typ" style="min-width: 160px" density="compact" />

                        <v-text-field v-model="title" label="Titel" density="compact" style="min-width: 240px" />

                        <v-select v-model="visibility" :items="[
                            { title: 'Privat', value: 'private' },
                            { title: 'Connections', value: 'connections' },
                            { title: 'Öffentlich', value: 'public' },
                        ]" label="Sichtbarkeit" style="min-width: 180px" density="compact" />

                        <v-text-field v-model="category" label="Kategorie (optional)" density="compact"
                            style="min-width: 200px" />

                        <v-btn color="primary" @click="onSave">Speichern</v-btn>
                    </div>

                    <v-divider class="mb-4" />

                    <div class="d-flex align-center justify-space-between mb-2">
                        <v-tabs v-model="listTab" density="compact">
                            <v-tab value="mine">Meine</v-tab>
                            <v-tab value="connections">Connections</v-tab>
                            <v-tab value="public">Public</v-tab>
                            <v-tab value="shared">Geteilt</v-tab>
                        </v-tabs>
                        <v-btn variant="tonal" @click="library.refresh">Aktualisieren</v-btn>
                    </div>

                    <v-table density="compact">
                        <thead>
                            <tr>
                                <th>Titel</th>
                                <th>Typ</th>
                                <th>Sichtbarkeit</th>
                                <th>Kategorie</th>
                                <th>Owner</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in visibleItems" :key="item.id">
                                <td>{{ item.title }}</td>
                                <td>{{ item.kind }}</td>
                                <td>{{ item.visibility }}</td>
                                <td>{{ item.category || '—' }}</td>
                                <td class="text-medium-emphasis">{{ item.owner_id }}</td>
                                <td class="text-right">
                                    <v-btn size="small" variant="tonal" @click="onLoad(item)">Laden</v-btn>
                                </td>
                            </tr>
                            <tr v-if="visibleItems.length === 0">
                                <td colspan="6" class="text-medium-emphasis">Keine Items gefunden.</td>
                            </tr>
                        </tbody>
                    </v-table>

                    <v-alert type="info" variant="tonal" class="mt-4">
                        Hinweis: "Connections" zeigt Items mit Sichtbarkeit "connections" (nach akzeptierter
                        Freundschaft). "Geteilt" sind Items, die via Share-Tabelle sichtbar sind.
                    </v-alert>
                </template>
            </div>
        </div>
    </v-navigation-drawer>
</template>
