<template>
  <div class="container">
    <v-card class="mx-auto" elevation="2">
      <form class="m-4">active song: {{selectedSong.name}}</form>
      <br />
      <v-tabs v-model="tab" background-color="grey lighten-2" grow color="black">
        <v-tab v-for="item in items" :key="item.tab">{{ item.tab }}</v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <v-tab-item v-for="item in items" :key="item.tab">
          <v-card-title>
            Songs
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Search"
              show-select
              single-line
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-data-table
            :headers="headers"
            :items="getAllSongs"
            :search="search"
            @click:row="setActiveSong"
            single-select
          ></v-data-table>
        </v-tab-item>
      </v-tabs-items>
    </v-card>
  </div>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from "vuex";

export default {
  props: ["user"],
  data() {
    return {
      tab: null,
      selectedSong: "",
      items: [
        { tab: "Pentatonics", content: "Tab 1 Content" },
        { tab: "Scales", content: "Tab 2 Content" },
        { tab: "Arpeggios", content: "Tab 3 Content" },
        { tab: "Licks", content: "Tab 4 Content" },
        { tab: "Solos", content: "Tab 5 Content" },
      ],
      search: "",
      headers: [
        {
          text: "Name",
          align: "start",
          value: "name",
        },
        { text: "Description", value: "description" },
        { text: "Creator", value: "" },
        { text: "Interpret", value: "" },
      ],
    };
  },

  created() {
    this.fetch();
  },

  computed: {
    ...mapGetters(["getAllSongs"]),
  },

  methods: {
    ...mapActions(["fetchSongs"]),
    ...mapMutations(["activeSong"]),
    fetch() {
      this.fetchSongs();
    },
    setActiveSong(song, row) {
      row.select(true);
      this.selectedSong = song;
      this.activeSong(song);
    },
  },
};
</script>

<style>
a:hover {
  background-color: darkgrey;
}

tr.v-data-table__selected {
  background: #0275d8 !important;
  color: white;
}
</style>