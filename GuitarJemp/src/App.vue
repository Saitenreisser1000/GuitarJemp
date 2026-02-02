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
import { isSupabaseConfigured } from '@/infra/supabase/client'

const instrument = useInstrumentStore()
const auth = useAuthStore()

const authOpen = ref(false)
const libraryOpen = ref(false)
const connectionsOpen = ref(false)
const instrumentType = computed({
  get: () => instrument.instrumentType,
  set: (v) => instrument.setInstrumentType(v),
})

const fretboardMode = ref('editor')
const numFrets = ref(12)
</script>

<template>
  <v-app>
    <v-main>
      <div class="app-shell">
        <v-container class="py-6">
          <header class="text-center text-white">
            <h1 class="app-title">GuitarJemp</h1>

            <div class="d-flex flex-wrap justify-center align-center ga-2 mt-2">
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

            <div class="d-flex flex-wrap justify-center align-center ga-3 mt-3">
              <v-btn-toggle v-model="instrumentType" mandatory divided>
                <v-btn value="guitar" variant="tonal">Guitar</v-btn>
                <v-btn value="bass" variant="tonal">Bass</v-btn>
                <v-btn value="ukulele" variant="tonal">Ukulele</v-btn>
              </v-btn-toggle>

              <v-btn-toggle v-model="fretboardMode" mandatory divided>
                <v-btn value="editor" variant="tonal">Editor</v-btn>
                <v-btn value="show" variant="tonal">Show</v-btn>
              </v-btn-toggle>
            </div>
          </header>

          <AuthDialog v-model="authOpen" />
          <LibraryDialog v-model="libraryOpen" />
          <ConnectionsDialog v-model="connectionsOpen" />

          <v-row class="mt-6" align="start" justify="center" dense>
            <v-col cols="12">
              <FretboardEdit v-if="fretboardMode === 'editor'" class="fretboard" :num-frets="numFrets"
                @update-frets="(n) => (numFrets = n)" />
              <FretboardShow v-else class="fretboard" :num-frets="numFrets" />
            </v-col>

            <v-col cols="12" md="8" lg="9">
              <Timeline class="timeline" />
            </v-col>
            <v-col cols="12" md="4" lg="3">
              <ActiveTonesWindow class="active-tones" />
            </v-col>
          </v-row>
        </v-container>
      </div>
    </v-main>
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
</style>
