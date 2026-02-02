import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, isSupabaseConfigured } from '@/infra/supabase/client'

function isMissingTableError(err) {
  const code = err?.code
  const msg = String(err?.message ?? '')
  return code === '42P01' || msg.includes('does not exist')
}

export const useLibraryStore = defineStore('library', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function refresh() {
    error.value = null
    items.value = []

    if (!isSupabaseConfigured || !supabase) return

    loading.value = true
    const { data, error: err } = await supabase
      .from('library_items')
      .select('id, kind, title, visibility, category, content, created_at, updated_at, owner_id')
      .order('updated_at', { ascending: false })
      .limit(100)

    loading.value = false

    if (err) {
      if (isMissingTableError(err)) return
      error.value = err
      return
    }

    items.value = Array.isArray(data) ? data : []
  }

  async function createItem({ kind, title, visibility, category, content } = {}) {
    error.value = null

    if (!isSupabaseConfigured || !supabase) {
      error.value = new Error('Supabase ist nicht konfiguriert.')
      return null
    }

    const payload = {
      kind: String(kind ?? 'song'),
      title: String(title ?? '').trim(),
      visibility: String(visibility ?? 'private'),
      category: category ? String(category).trim() : null,
      content: content ?? {},
    }

    const { data, error: err } = await supabase
      .from('library_items')
      .insert(payload)
      .select('id, kind, title, visibility, category, content, created_at, updated_at, owner_id')
      .single()

    if (err) {
      error.value = err
      return null
    }

    await refresh()
    return data ?? null
  }

  return { items, loading, error, refresh, createItem }
})
