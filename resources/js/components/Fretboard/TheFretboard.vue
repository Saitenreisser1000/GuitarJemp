<template>
  <div>
    <br />
    <v-container>
      <v-row>
        <v-col>
          <v-card id="fbContainer" >
            <div
              id="respFretBoard"
              :style="{'width': getFbData.fbWidth + 'px', 'height':getFbData.fbHeight + 'px'}"
            >
              <fb-marker-point
                v-for="marker in getFbData.singleFbMarker"
                :key="marker+'marker'"
                :onFret="marker"
              ></fb-marker-point>

              <fb-marker-point
                v-for="marker in getFbData.doubleFbMarker"
                :key="marker+'doubleMarker1'"
                :onFret="marker"
                :doubleMarker="true"
                :doublePos="2.5"
              ></fb-marker-point>

              <fb-marker-point
                v-for="marker in getFbData.doubleFbMarker"
                :key="marker+'doubleMarker2'"
                :onFret="marker"
                :doubleMarker="true"
                :doublePos="6.5"
              ></fb-marker-point>

              <fb-saddle></fb-saddle>
              <fb-string v-for="fbStr in getFbData.stringAmount" :key="fbStr"></fb-string>
              <fb-fret v-for="fret in getFbData.fretAmount" :key="fret+'fret'" :fretNr="fret"></fb-fret>
            </div>
          </v-card>
        </v-col>
        <v-col>
          <v-card outlined class="scrollable pa-1" height="300">
            <Tone-Card @remove="remove(focusedDot)" @cardFocus="cardFocus" @changeColor=changeColor v-for="focusedDot in getFocusedDot.activeJemps" :key="focusedDot.jt_ID" :tone=focusedDot :time=focusedDot.time>             
            </Tone-Card>
          </v-card>
        </v-col>      
      </v-row>   
    </v-container>
  </div>
</template>

<script>
import fbString from "./components/FretboardString";
import fbSaddle from "./components/FretboardSaddle";
import fbFret from "./components/FretboardFret";
import FbMarkerPoint from "./components/FretboardMarkerPoint";
import ToneCard from "./components/ToneCard.vue";
import { mapGetters, mapActions } from "vuex";

export default {
  name: "Fretboard",
  computed: {
    ...mapGetters([
      "getSingleFbMarker",
      "getDoubleFbMarker",
      "getFbData",
      "getActiveSong",
      "getFocusedDot"
    ]),
  },
  methods: {
    ...mapActions(["removeTone", "changeToneColor", "setFocus"]),
    
    cardFocus(tone){
      this.setFocus(tone)
    },
    remove(tone){
      this.removeTone(tone);
    },
    changeColor(tone, color){
      this.changeToneColor(tone, color);
    }
  },
  
  components: {
    FbMarkerPoint,
    fbSaddle,
    fbString,
    fbFret,
    ToneCard
  },
};
</script>

<style scoped>
#respFretBoard {
  position: relative;
  background-color: wheat;

  -webkit-box-shadow: 3px 0 6px 0 rgba(0, 0, 0, 0.5);
  -moz-box-shadow: 3px 0 6px 0 rgba(0, 0, 0, 0.5);
  box-shadow: 0 16px 12px 0 rgba(0, 0, 0, 0.5);
}
#fbContainer {
  border-radius: 5px;
  /*margin: 20px auto;*/
  padding: 40px;
  min-height: 300px;
  /*width: 90%;*/
  overflow-x: auto;
  /*background: rgb(2, 0, 36);*/
  background: linear-gradient(
    210deg,
    rgba(210, 210, 210, 1) 0%,
    rgba(255, 255, 255, 1) 50%,
    rgba(255, 255, 255, 1) 100%
  );
}

.scrollable{
  overflow-y:scroll;
}
</style>