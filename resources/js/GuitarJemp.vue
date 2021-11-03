<template>
  <v-app>
    <fretboard></fretboard>  
    <guitarroll></guitarroll>
    <player class="stickyCard"></player>
    <songlist></songlist>
  </v-app>
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
    return {
    };
  },
  computed: {
    ...mapGetters(["getActiveSong", "getAllSongs"]),
  },
};
</script>

<style>
  .stickyCard{
    z-index: 10;
    position:fixed;
    bottom:0;
    width: 100%;
  }
</style>