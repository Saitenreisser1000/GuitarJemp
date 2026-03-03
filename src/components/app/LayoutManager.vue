<template>
  <div class="layout-manager">
    <MainwindowManager class="layout-manager-main">
      <template #pane-a>
        <slot name="pane-a" />
      </template>
      <template #pane-b>
        <slot name="pane-b" />
      </template>
    </MainwindowManager>
    <aside class="layout-sidebar" aria-label="Right sidebar">
      <slot name="sidebar">
        <div class="layout-sidebar-title">Sidebar</div>
      </slot>
    </aside>
  </div>
</template>

<script setup>
import MainwindowManager from '@/components/app/MainwindowManager.vue'
</script>

<style scoped>
.layout-manager {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.layout-manager-main {
  min-height: 0;
}

.layout-sidebar {
  border-top: 5px solid #000;
  border-right: 5px solid #000;
  border-bottom: 5px solid #000;
  background: #f6f6f6;
  padding: 10px;
  min-height: 0;
  overflow: auto;
}

.layout-sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: #333;
}
</style>
