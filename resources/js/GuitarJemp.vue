<template>
  <div>
    <fretboard></fretboard>
    <guitarroll></guitarroll>
    <player></player>
    <songlist></songlist>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";

import fretboard from "./components/Fretboard/TheFretboard.vue";
import songlist from "./components/SongList.vue";
import player from "./components/Player.vue";
import guitarroll from "./components/Guitarroll/TheGuitarroll.vue"

export default {
  components: { fretboard, songlist, player, guitarroll },
  data() {
    return {};
  },
  computed: {
    ...mapGetters(["getActiveSong", "getAllSongs"]),
  },
};
</script>

<style>
</style>