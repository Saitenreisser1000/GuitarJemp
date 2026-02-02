import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase, isSupabaseConfigured } from '@/infra/supabase/client'

function isMissingTableError(err) {
  const code = err?.code
  const msg = String(err?.message ?? '')
  return code === '42P01' || msg.includes('does not exist')
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  const initializing = ref(true)
  const recoveryMode = ref(false)
  const error = ref(null)

  const user = computed(() => session.value?.user ?? null)
  const isSignedIn = computed(() => Boolean(user.value))

  let unsubscribe = null

  async function fetchProfile() {
    profile.value = null
    if (!supabase || !user.value) return

    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at')
      .eq('id', user.value.id)
      .maybeSingle()

    if (err) {
      // Allow the app to run even before the DB schema exists.
      if (isMissingTableError(err)) return
      error.value = err
      return
    }

    profile.value = data ?? null
  }

  async function init() {
    initializing.value = true
    error.value = null

    if (!isSupabaseConfigured || !supabase) {
      session.value = null
      profile.value = null
      initializing.value = false
      return
    }

    const { data, error: err } = await supabase.auth.getSession()
    if (err) error.value = err
    session.value = data?.session ?? null
    await fetchProfile()

    if (!unsubscribe) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        session.value = nextSession ?? null

        if (event === 'PASSWORD_RECOVERY') {
          recoveryMode.value = true
        }
        if (event === 'SIGNED_OUT') {
          profile.value = null
          recoveryMode.value = false
        }

        // Best-effort: refresh profile when auth changes.
        await fetchProfile()
      })
      unsubscribe = listener?.subscription?.unsubscribe ?? null
    }

    initializing.value = false
  }

  async function signIn(email, password) {
    error.value = null
    if (!supabase) {
      error.value = new Error('Supabase ist nicht konfiguriert.')
      return
    }

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: String(email ?? ''),
      password: String(password ?? ''),
    })

    if (err) {
      error.value = err
      return
    }

    session.value = data?.session ?? null
    await fetchProfile()
  }

  async function signUp({ email, password, displayName } = {}) {
    error.value = null
    if (!supabase) {
      error.value = new Error('Supabase ist nicht konfiguriert.')
      return
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: String(email ?? ''),
      password: String(password ?? ''),
    })

    if (err) {
      error.value = err
      return
    }

    session.value = data?.session ?? null

    // Profile wird serverseitig per Trigger angelegt.
    // displayName setzen wir nur, wenn es bereits eine Session gibt (ohne Confirmation-Flow).
    if (session.value && displayName) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ display_name: String(displayName) })
        .eq('id', session.value.user.id)

      if (updateErr && !isMissingTableError(updateErr)) {
        error.value = updateErr
      }
    }

    await fetchProfile()
  }

  async function signOut() {
    error.value = null
    if (!supabase) return
    const { error: err } = await supabase.auth.signOut()
    if (err) error.value = err
    session.value = null
    profile.value = null
    recoveryMode.value = false
  }

  async function requestPasswordReset(email) {
    error.value = null
    if (!supabase) {
      error.value = new Error('Supabase ist nicht konfiguriert.')
      return
    }

    const redirectTo = window.location.origin
    const { error: err } = await supabase.auth.resetPasswordForEmail(String(email ?? ''), {
      redirectTo,
    })
    if (err) error.value = err
  }

  async function updatePassword(newPassword) {
    error.value = null
    if (!supabase) {
      error.value = new Error('Supabase ist nicht konfiguriert.')
      return
    }

    const { error: err } = await supabase.auth.updateUser({
      password: String(newPassword ?? ''),
    })

    if (err) {
      error.value = err
      return
    }

    recoveryMode.value = false
  }

  return {
    session,
    user,
    profile,
    initializing,
    recoveryMode,
    error,
    isSignedIn,
    init,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
  }
})
