<template>
  <div>
    <div
      id="string"
      :style="{
                width: this.getFbData.fbWidth + 'px',
                top  : this.yPosition + 'px',
                height: this.getFbData.stringHeight + 'px',
                backgroundColor: this.getFbData.stringColor,
             }"
    >
      <tone-dot
        v-for="jt in getJTforString(this.$vnode.key)"
        :key="jt.jt_ID"
        :style="{'left': calcXPos(jt) + 'px', 'top': '-14px' }"
        :dotInfo="jt"
        @playTone="playSound"
      ></tone-dot>
    </div>
  </div>
</template>

<script>
import ToneDot from "./FretboardTonedot";
import { mapGetters, mapActions } from "vuex";

export default {
  name: "fbString",

  created() {
    this.initJemps(this.$vnode.key);
    this.initTuning();
  },

  methods: {
    ...mapActions(["playTone", "initJemps", "initTuning"]),

    playSound: function (dotInfo) {
      this.playTone(dotInfo);
    },

    getJTforString(stringNr) {
      return this.getAllJemps.filter((jt) => jt.string === stringNr);
    },

    calcXPos: function (jt) {
      //position for open string
      if (jt.fret === 0) {
        return this.getOpenJempXPos;
      } else {
        return (
          jt.fret * this.getFretSpace +
          this.getCalcSaddleOffset -
          this.getFretSpace / 2 -
          10
        );
      }
    },
  },

  computed: {
    ...mapGetters([
      "getCalcSaddleOffset",
      "getFretSpace",
      "getFbData",
      "getAllJemps",
      "getOpenJempXPos",
    ]),

    yPosition() {
      let outerFBDistance = parseInt(this.getFbData.fbHeight) / 14;
      return parseInt(
        ((parseInt(this.getFbData.fbHeight) - outerFBDistance) /
          (this.getFbData.stringAmount - 1)) *
          (this.$vnode.key - 1) +
          outerFBDistance / 2
      );
    },
  },

  components: {
    ToneDot,
  },
};
</script>

<style scoped>
#string {
  position: absolute;
  -webkit-box-shadow: 0 3px 6px 0 rgba(0, 0, 0, 0.5);
  -moz-box-shadow: 0 3px 6px 0 rgba(0, 0, 0, 0.5);
  box-shadow: 0 5px 6px 0 rgba(0, 0, 0, 0.5);
}
</style>
