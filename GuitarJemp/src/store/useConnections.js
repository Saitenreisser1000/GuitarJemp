import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase, isSupabaseConfigured } from '@/infra/supabase/client'
import { useAuthStore } from '@/store/useAuth'

export const useConnectionsStore = defineStore('connections', () => {
  const incoming = ref([])
  const outgoing = ref([])
  const accepted = ref([])

  const searchResults = ref([])
  const loading = ref(false)
  const error = ref(null)

  const auth = useAuthStore()

  const userId = computed(() => auth.user?.id ?? null)

  function clearError() {
    error.value = null
  }

  function normalizeRows(rows) {
    return Array.isArray(rows) ? rows.filter(Boolean) : []
  }

  function splitConnections(rows) {
    const uid = userId.value
    const inc = []
    const out = []
    const acc = []

    for (const row of normalizeRows(rows)) {
      const status = row?.status
      const requesterId = row?.requester_id
      const addresseeId = row?.addressee_id

      if (!uid || !requesterId || !addresseeId) continue

      if (status === 'accepted') {
        acc.push(row)
      } else if (status === 'pending') {
        if (addresseeId === uid) inc.push(row)
        if (requesterId === uid) out.push(row)
      }
    }

    incoming.value = inc
    outgoing.value = out
    accepted.value = acc
  }

  function otherUserId(connectionRow) {
    const uid = userId.value
    if (!uid) return null
    const a = connectionRow?.requester_id
    const b = connectionRow?.addressee_id
    if (a === uid) return b
    if (b === uid) return a
    return null
  }

  const acceptedUserIds = computed(() => {
    const ids = new Set()
    for (const row of accepted.value) {
      const other = otherUserId(row)
      if (other) ids.add(other)
    }
    return [...ids]
  })

  async function refresh() {
    clearError()
    if (!isSupabaseConfigured || !supabase) return
    if (!userId.value) return

    loading.value = true
    const { data, error: err } = await supabase
      .from('connections')
      .select('id, requester_id, addressee_id, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200)

    loading.value = false

    if (err) {
      error.value = err
      return
    }

    splitConnections(data)
  }

  async function searchProfiles(query) {
    clearError()
    searchResults.value = []

    const q = String(query ?? '').trim()
    if (q.length < 2) return
    if (!isSupabaseConfigured || !supabase) return
    if (!userId.value) return

    loading.value = true
    const { data, error: err } = await supabase
      .from('profile_directory')
      .select('id, display_name, created_at')
      .ilike('display_name', `%${q}%`)
      .limit(20)

    loading.value = false

    if (err) {
      error.value = err
      return
    }

    const uid = userId.value
    const existing = new Set([
      ...incoming.value.map((r) => otherUserId(r)),
      ...outgoing.value.map((r) => otherUserId(r)),
      ...accepted.value.map((r) => otherUserId(r)),
    ])

    searchResults.value = normalizeRows(data).filter((p) => p.id !== uid && !existing.has(p.id))
  }

  async function sendRequest(addresseeId) {
    clearError()
    if (!isSupabaseConfigured || !supabase) return
    if (!userId.value) return

    const other = String(addresseeId ?? '')
    if (!other) return

    const { error: err } = await supabase.from('connections').insert({ addressee_id: other })

    if (err) {
      error.value = err
      return
    }

    await refresh()
  }

  async function acceptRequest(connectionId) {
    clearError()
    if (!isSupabaseConfigured || !supabase) return

    const id = Number(connectionId)
    if (!Number.isFinite(id)) return

    const { error: err } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', id)

    if (err) {
      error.value = err
      return
    }

    await refresh()
  }

  async function rejectRequest(connectionId) {
    clearError()
    if (!isSupabaseConfigured || !supabase) return

    const id = Number(connectionId)
    if (!Number.isFinite(id)) return

    const { error: err } = await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (err) {
      error.value = err
      return
    }

    await refresh()
  }

  async function removeConnection(connectionId) {
    clearError()
    if (!isSupabaseConfigured || !supabase) return

    const id = Number(connectionId)
    if (!Number.isFinite(id)) return

    const { error: err } = await supabase.from('connections').delete().eq('id', id)

    if (err) {
      error.value = err
      return
    }

    await refresh()
  }

  return {
    incoming,
    outgoing,
    accepted,
    acceptedUserIds,
    searchResults,
    loading,
    error,
    refresh,
    searchProfiles,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeConnection,
  }
})
