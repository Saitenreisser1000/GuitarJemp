<script setup>
const props = defineProps({
  title: { type: String, default: '' },
  railClass: { type: [String, Array, Object], default: '' },
  hostId: { type: String, required: true },
  hostClass: { type: [String, Array, Object], required: true },
})
</script>

<template>
  <div class="fretboard-card-rail" :class="props.railClass">
    <div class="fretboard-rail-title">{{ props.title }}</div>
    <div :id="props.hostId" :class="props.hostClass" />
  </div>
</template>
