<template>
  <v-card>
    <v-container>
      <v-row>     
        <v-col 
          cols="2"        
        >
          <v-card outlined height="180" class="pa-6">
            <v-btn height="80" width="100" @click="playToggle" color="primary">{{ playButton }}</v-btn>
            <v-btn height="80" @click="reset" color="primary">reset</v-btn>
            <v-btn @click="loadSong" color="primary my-2">load</v-btn>
          </v-card>        
        </v-col>

        <v-col>
          <v-card outlined class="pa-6">
            <v-slider       
            :min="0"
            :max="(Math.floor(this.endSongTime * transMulti))"
            @input="change(transPos)"
            @mousedown="onMouseDown()"
            @mouseup="onMouseUp()"
            v-model="transPos"
            />
          <v-checkbox
            v-model="isLoop"
            color="primary"
            label="Loop"
            @change="loopSong(isLoop)">
          ></v-checkbox>

          <v-range-slider
            :max="(this.endSongTime * transMulti)"
            :min="0"
            v-model="loopRange"
          ></v-range-slider>
          </v-card>        
        </v-col>
        <v-col
          cols="2"
        >
          <v-card outlined height="180" class="pa-6">
            <v-slider
              label="Speed"
              :min="20"
              :max="250"
              v-model="speed"
              thumb-label="always"
          >   
          </v-slider>
          <v-slider
            :min="-50"
            :max="0"
            v-model="volume"
            thumb-label="always"
            prepend-icon="mdi-volume-high"
          >   
          </v-slider>
          </v-card>         
        </v-col>
      </v-row>      
    </v-container>  
  </v-card> 
</template>

<script>
import * as Tone from "tone";
import samplermixin from "../mixins/sampler";
import songWrapper from "../mixins/songWrapper";
import { mapGetters, mapActions } from "vuex";

export default {
  mixins: [samplermixin, songWrapper],
  data() {
    return {
      transport: Tone.Transport,
      animationRequest: "",
      playButton: "play",
      endSongOffset: 2,
      endSongTime: 0,
      defaultspeed: 60,
      defaultvolume: -20,
      transPos: 0,
      transMulti: 100,
      activeSong: "",
      dottsInSong: [],
      isLoop: false,
      loopRange: [20, 100],
    };
  },

  watch: {
    jempSong: function () {
      this.scheduleSong(this.jempSong);
      this.reset();
    },
  },

  computed: {
    ...mapGetters({
      allJemps: "getAllJemps",
      jempSong: "getActiveSong",
      getTones: "getTones",
      getActiveBoxes: "getActiveBoxes"
    }),
    speed:{
      get(){
        if(this.activeSong.speed){ return this.activeSong.speed }
        else { return this.defaultspeed }
      },
      set(value){
        Tone.Transport.bpm.value = value;
        this.setSongEndTime();
      }
    },
    volume:{
      get(){
        if(this.activeSong.volume){ return this.activeSong.volume }
        else { return this.defaultvolume }
          

      },
      set(value){
        this.sampler.volume.value = value;
      }
    }
  },

  methods: {
    ...mapActions(["removeAllFocuses", "setSongActive"]),

    /************* Transport System ***************/
    performAnimation() {
      this.animationRequest = requestAnimationFrame(this.performAnimation);
      this.transPos = Tone.Transport.seconds * this.transMulti;
      if (this.transPos >= (this.endSongTime * this.transMulti)-0.1) {
      this.songEndPos();
        //cancelAnimationFrame(this.animationRequest);
      }
      
    },

    onMouseDown() {
      this.pause();
    },

    change(transPos) {
      //iterate over jempSong.songdata to find dots that should be removed regarding higher timeschedule
      Tone.Transport.seconds = transPos / this.transMulti;

      //remove dots when fader is dragged towards left
      this.activeSong.songdata.tones.forEach((dot) => {
        if (Tone.Transport.toSeconds(dot.time) > Tone.Transport.seconds) {
          let higherDot = (this.dottsInSong.find(
            (d) => d.jt_ID === dot.dotID
          ).isActive = false);
        }
        //set dots when fader is dragged towards right
        if (Tone.Transport.toSeconds(dot.time) < Tone.Transport.seconds) {
          let lowerDot = (this.dottsInSong.find(
            (d) => d.jt_ID === dot.dotID
          ).isActive = true);
        }
      });
    },

    onMouseUp() {
      this.play();
    },

    /**
     * extracting and scheduling
     * fetched activeSong is passed to this.activeSong to get access, extract and manipulate data 
     */
    scheduleSong(activeSong) {
      //extract dot position from dot_ID ("5|3") => string = 5, fret = 3
      activeSong.songdata.tones.forEach((dot) => {
        dot.string = dot.dotID.match(/[^\|]*/)[0];
        dot.fret = dot.dotID.match(/[^|]*$/)[0];
      });
      this.activeSong = activeSong;
      this.setSongEndTime();

      //reset dots
      this.dottsInSong.forEach((dots) => (dots.isActive = false));
      //find and store all needed dotts to activate them when played
      this.activeSong.songdata.tones.forEach((jempTone) => {
        let dot = this.allJemps.find((dot) => dot.jt_ID === jempTone.dotID);
        this.dottsInSong.push(dot);
      });

      //scheduling
      Tone.Transport.cancel();
      if(this.activeSong.songdata.bpm){
        this.speed = this.activeSong.songdata.bpm;
      }
      this.activeSong.songdata.tones.forEach((jempTone) => {
        Tone.Transport.schedule(() => {
          //activate dot
          let dot = this.dottsInSong.find(
            (dot) => dot.jt_ID === jempTone.dotID
          );

          //dot.isActive = true;    Test

          /*******color activation ****/
          if (jempTone.color) {
            //dot.color = jempTone.color;
          }

          /*doteffect after dot is set*/
          setInterval(() => {
            //dot = false;
          }, 1000);

          //play sound
          let t = this.getTones[jempTone.string - 1][jempTone.fret];
          this.playTone(t.tone);
        }, jempTone.time);
      });
    },

    /**
     * activeSong manipulation
     */
    setSongEndTime() {
      this.endSongTime = Tone.Transport.toSeconds(this.getLastTone().time) + this.endSongOffset;
      Tone.Transport.setLoopPoints(0,this.endSongTime-0.1);
    },

    getLastTone() {
      let lastTone = this.activeSong.songdata.tones[0];
      this.activeSong.songdata.tones.forEach((jempTone) => {
        lastTone = lastTone.time < jempTone.time ? jempTone : lastTone;
      });
      return lastTone;
    },

    /**
     * playersection
     */
    playToggle(time) {
      if (
        Tone.Transport.state === "paused" ||
        Tone.Transport.state === "stopped"
      ) {
        this.playButton = "pause";
        this.play(time);
      } else {
        this.playButton = "play";
        this.pause();
      }
    },

    play() {
      Tone.start();
      Tone.Transport.start();
      requestAnimationFrame(this.performAnimation);
    },

    pause() {
      Tone.Transport.pause();
      cancelAnimationFrame(this.animationRequest);
    },

    reset() {
      this.playButton = "play";
      Tone.Transport.stop();
      cancelAnimationFrame(this.animationRequest);
      this.transPos = 0;
      this.change(this.transPos);
    },

    //song ended but dots are still on the fretboard
    songEndPos(){
      this.playButton = "play";
      Tone.Transport.stop();
      cancelAnimationFrame(this.animationRequest);
      this.transPos = 0;
    },

    loopSong(loopIt){
      Tone.Transport.loop = loopIt;
    },

    loadSong(){
      this.removeAllFocuses();
      this.setSongActive(this.getActiveBoxes);
      //this.scheduleSong(this.prepareSong(this.getActiveBoxes))
    }
  },
};
</script>