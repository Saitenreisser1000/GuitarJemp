<template>
  <v-hover v-slot:default="{ hover }">
    <v-card
      class="dot"
      :style="{'backgroundColor': dotInfo.color, 'borderRadius':'50%' }"
      :elevation="hover ? 20 : 4"
      :class="{'dotActive': dotInfo.isActive, 'isFocused': dotInfo.isFocused}"
      @click="onClick"
    ></v-card>
  </v-hover>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import samplermixin from "../../../mixins/sampler.js";

export default {
  name: "toneDot",
  props: ["dotInfo"],
  mixins: [samplermixin],
  data() {
    return {
      isEditable: true,      
    };
  },

  computed: {
    ...mapGetters({
      getTones: "getTones",
    }),
  },

  methods: {
    ...mapActions(["addTone", "removeTone", "removeOthersFocus"]),
    onClick() {
      //no jemp
      this.playTone(this.getTones[this.dotInfo.string - 1][this.dotInfo.fret].tone);
      
      if (this.isEditable) {
        if (!this.dotInfo.isActive) {
          this.addActiveJemp();
          this.removeOthersFocus(this.dotInfo);
        }
        //focused -> add new tone
        else if (this.dotInfo.isFocused) {
          this.addActiveJemp();
        }
        //now focused this others unfocused - this has at least on active jemp
        else {
          this.removeOthersFocus(this.dotInfo);
        }
      }
    },
    addActiveJemp() {
      this.addTone(this.dotInfo);
    },
    removeActiveJemp() {
      this.removeTone(this.dotInfo);
    },
  },
};
</script>

<style scoped>
.dot {
  position: absolute;
  opacity: 0;
  top: 5px;
  height: 30px;
  width: 30px;
  background-color: #cd5c5c;
  border-radius: 50%;
  transition: 0.15s ease-in-out;
  -moz-transition: 0.15s ease-in-out;
  -webkit-transition: 0.15s ease-in-out;
}

.dotDim {
}

.dot:hover {
  opacity: 0.6;
}
.dotActive {
  opacity: 1;
}
.isFocused {
   height: 35px;
   width: 35px;
}
</style>
