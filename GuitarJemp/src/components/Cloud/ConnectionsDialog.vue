<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/store/useAuth'
import { useConnectionsStore } from '@/store/useConnections'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const auth = useAuthStore()
const connections = useConnectionsStore()

const tab = ref('friends')
const query = ref('')

watch(
    () => open.value,
    async (v) => {
        if (!v) return
        if (auth.isSignedIn) await connections.refresh()
    },
)

watch(
    () => query.value,
    async (q) => {
        if (!open.value) return
        await connections.searchProfiles(q)
    },
)
</script>

<template>
    <v-dialog v-model="open" max-width="820">
        <v-card rounded="lg">
            <v-card-title class="d-flex align-center justify-space-between">
                <span>Freunde</span>
                <v-btn icon="mdi-close" variant="text" @click="open = false" />
            </v-card-title>

            <v-card-text>
                <v-alert v-if="!auth.isSignedIn" type="info" variant="tonal" class="mb-4">
                    Bitte einloggen, um Freunde hinzuzufügen.
                </v-alert>

                <v-alert v-if="connections.error" type="error" variant="tonal" class="mb-4">
                    {{ String(connections.error?.message ?? connections.error) }}
                </v-alert>

                <template v-if="auth.isSignedIn">
                    <v-tabs v-model="tab" density="compact" class="mb-3">
                        <v-tab value="friends">Freunde</v-tab>
                        <v-tab value="requests">Anfragen</v-tab>
                        <v-tab value="search">Suchen</v-tab>
                    </v-tabs>

                    <v-window v-model="tab">
                        <v-window-item value="friends">
                            <div class="d-flex align-center justify-space-between mb-2">
                                <div class="text-subtitle-1">Verbindungen</div>
                                <v-btn variant="tonal" @click="connections.refresh">Aktualisieren</v-btn>
                            </div>

                            <v-table density="compact">
                                <thead>
                                    <tr>
                                        <th>Connection</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in connections.accepted" :key="row.id">
                                        <td class="text-medium-emphasis">
                                            {{ row.requester_id }} ↔ {{ row.addressee_id }}
                                        </td>
                                        <td>accepted</td>
                                        <td class="text-right">
                                            <v-btn size="small" variant="tonal"
                                                @click="connections.removeConnection(row.id)">
                                                Entfernen
                                            </v-btn>
                                        </td>
                                    </tr>
                                    <tr v-if="connections.accepted.length === 0">
                                        <td colspan="3" class="text-medium-emphasis">Noch keine Freunde.</td>
                                    </tr>
                                </tbody>
                            </v-table>

                            <v-alert type="info" variant="tonal" class="mt-4">
                                Hinweis: Aktuell zeigen wir IDs. Als nächstes können wir die Anzeige mit
                                display_name aus dem Directory aufhübschen.
                            </v-alert>
                        </v-window-item>

                        <v-window-item value="requests">
                            <div class="text-subtitle-1 mb-2">Eingehend</div>
                            <v-table density="compact" class="mb-4">
                                <thead>
                                    <tr>
                                        <th>Von</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in connections.incoming" :key="row.id">
                                        <td class="text-medium-emphasis">{{ row.requester_id }}</td>
                                        <td class="text-right">
                                            <v-btn size="small" color="primary"
                                                @click="connections.acceptRequest(row.id)">
                                                Annehmen
                                            </v-btn>
                                            <v-btn size="small" variant="tonal"
                                                @click="connections.rejectRequest(row.id)">
                                                Ablehnen
                                            </v-btn>
                                        </td>
                                    </tr>
                                    <tr v-if="connections.incoming.length === 0">
                                        <td colspan="2" class="text-medium-emphasis">Keine eingehenden Anfragen.</td>
                                    </tr>
                                </tbody>
                            </v-table>

                            <div class="text-subtitle-1 mb-2">Ausgehend</div>
                            <v-table density="compact">
                                <thead>
                                    <tr>
                                        <th>An</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in connections.outgoing" :key="row.id">
                                        <td class="text-medium-emphasis">{{ row.addressee_id }}</td>
                                        <td class="text-right">
                                            <v-btn size="small" variant="tonal"
                                                @click="connections.removeConnection(row.id)">
                                                Zurückziehen
                                            </v-btn>
                                        </td>
                                    </tr>
                                    <tr v-if="connections.outgoing.length === 0">
                                        <td colspan="2" class="text-medium-emphasis">Keine ausgehenden Anfragen.</td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </v-window-item>

                        <v-window-item value="search">
                            <v-text-field v-model="query" label="Name suchen (min. 2 Zeichen)" density="compact"
                                prepend-inner-icon="mdi-magnify" class="mb-3" />

                            <v-table density="compact">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="p in connections.searchResults" :key="p.id">
                                        <td>{{ p.display_name || p.id }}</td>
                                        <td class="text-right">
                                            <v-btn size="small" color="primary" @click="connections.sendRequest(p.id)">
                                                Anfrage senden
                                            </v-btn>
                                        </td>
                                    </tr>
                                    <tr v-if="connections.searchResults.length === 0">
                                        <td colspan="2" class="text-medium-emphasis">Keine Treffer.</td>
                                    </tr>
                                </tbody>
                            </v-table>

                            <v-alert type="info" variant="tonal" class="mt-4">
                                Tipp: Jeder User sollte in seinem Profil einen display_name setzen, sonst wird die
                                UUID angezeigt.
                            </v-alert>
                        </v-window-item>
                    </v-window>
                </template>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
