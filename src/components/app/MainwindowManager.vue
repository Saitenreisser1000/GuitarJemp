<template>
  <div ref="rootEl" class="window-manager">
    <section class="wm-pane wm-pane-a" :style="paneAStyle">
      <slot name="pane-a" />
    </section>
    <button
      class="wm-divider"
      type="button"
      aria-label="Resize split panes"
      @pointerdown="onDividerPointerDown"
    />
    <section class="wm-pane wm-pane-b" :style="paneBStyle">
      <slot name="pane-b" />
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const rootEl = ref(null)
const splitRatio = ref(0.5)
let activePointerId = null

const MIN_RATIO = 0.2
const MAX_RATIO = 0.8

const paneAStyle = computed(() => ({
  flexBasis: `${Math.round(splitRatio.value * 10000) / 100}%`,
}))

const paneBStyle = computed(() => ({
  flexBasis: `${Math.round((1 - splitRatio.value) * 10000) / 100}%`,
}))

function clampRatio(value) {
  return Math.max(MIN_RATIO, Math.min(MAX_RATIO, value))
}

function updateSplitFromClientY(clientY) {
  const root = rootEl.value
  if (!root) return
  const rect = root.getBoundingClientRect()
  if (!(rect.height > 0)) return
  const y = Number(clientY) - rect.top
  splitRatio.value = clampRatio(y / rect.height)
}

function stopPointerTracking() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  activePointerId = null
}

function onPointerMove(event) {
  if (activePointerId == null || event.pointerId !== activePointerId) return
  event.preventDefault()
  updateSplitFromClientY(event.clientY)
}

function onPointerUp(event) {
  if (activePointerId == null || event.pointerId !== activePointerId) return
  stopPointerTracking()
}

function onDividerPointerDown(event) {
  if (event.button !== 0) return
  activePointerId = event.pointerId
  updateSplitFromClientY(event.clientY)
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

onBeforeUnmount(() => {
  stopPointerTracking()
})
</script>

<style scoped>
.window-manager {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border: 1px solid var(--app-border, rgb(255 255 255 / 0.09));
  border-radius: 0;
  box-sizing: border-box;
  background: linear-gradient(180deg, var(--app-bg-panel, #202631), var(--app-bg-elevated, #1a1f27));
  overflow: hidden;
  box-shadow: 0 12px 30px rgb(0 0 0 / 0.22);
}

.wm-pane {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(32 38 49 / 0.94), rgb(26 31 39 / 0.96));
}

.wm-divider {
  display: block;
  width: 100%;
  flex: 0 0 5px;
  border: 0;
  padding: 0;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.04), rgb(0 0 0 / 0.18));
  cursor: ns-resize;
  touch-action: none;
}
</style>
