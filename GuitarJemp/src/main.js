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
          primary: '#C66A2B',
          secondary: '#1F3A5F',
          accent: '#2E7D6E',
          success: '#2E9E5B',
          warning: '#D18B1F',
          error: '#C0392B',
          background: '#F7F4EF',
          surface: '#FFFFFF',
        },
      },
      guitarjempDark: {
        dark: true,
        colors: {
          primary: '#E59A65',
          secondary: '#8FA9CC',
          accent: '#57A899',
          success: '#5BC67D',
          warning: '#E3B35B',
          error: '#E07166',
          background: '#12151B',
          surface: '#1A2029',
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
