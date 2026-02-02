import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/store/useAuth'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'guitarjemp',
    themes: {
      guitarjemp: {
        dark: false,
        colors: {
          primary: '#667eea',
          secondary: '#764ba2',
          success: '#4caf50',
          error: '#d32f2f',
        },
      },
    },
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(vuetify)

// Boot auth early so password-recovery links work.
useAuthStore(pinia).init()

app.mount('#app')
