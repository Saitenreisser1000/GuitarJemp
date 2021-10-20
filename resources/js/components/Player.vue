<template>
  <div class="container">
    <div id="playerCard" class="card" style="width: 100%; height: 80px">
      <button @click="playToggle" class="btn btn-primary m-2">{{ playButton }}</button>
      <button @click="reset" class="btn btn-primary m-2">reset</button>
      <v-checkbox
        v-model="isLoop"
            label="Loop"
            color="primary"
            value="red"
      ></v-checkbox>
      <input
        class="transportFader"
        type="range"
        :min="0"
        :max="(this.endSongTime * transMulti)"
        value="transPos"
        @input="change(transPos)"
        @mousedown="onMouseDown()"
        @mouseup="onMouseUp(transPos)"
        v-model="transPos"
      />
      <div>
        <form>
          <input
            id="speedFader"
            class="transportFader"
            type="range"
            min="20"
            max="250"
            v-model="speed"
          />
          <span class="label">speed: {{ speed }}</span>
        </form>
        <form>
          <input
            id="volumeFader"
            class="transportFader"
            type="range"
            min="-50"
            max="0"
            v-model="volume"
          />
          <span class="label">volume:{{ parseInt(volume) + parseInt(50)}}</span>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import * as Tone from "tone";
import { mapGetters } from "vuex";

export default {
  data() {
    return {
      transport: Tone.Transport,
      animationRequest: "",
      playButton: "play",
      endSongOffset: 2,
      endSongTime: 0,
      speed: 60,
      volume: -20,
      transPos: 0,
      transMulti: 100,
      activeSong: "",
      dottsInSong: [],
      isLoop: true,

      sampler: new Tone.Sampler({
        urls: {
          A1: "A1.mp3",
          A2: "A2.mp3",
        },
        baseUrl: "./sounds/",
        volume: -5,
        onload: () => {},
      }).toDestination(),
    };
  },

  watch: {
    speed: {
      immediate: false,
      handler() {
        Tone.Transport.bpm.value = this.speed;
        this.setSongEndTime();
      },
    },
    volume: {
      immediate: true,
      handler() {
        this.sampler.volume.value = this.volume;
      },
    },
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
    }),
  },

  methods: {
    /************* Transport System ***************/
    performAnimation() {
      this.animationRequest = requestAnimationFrame(this.performAnimation);
      if (this.transPos > this.endSongTime * this.transMulti) {
        Tone.Transport.position = 0;
        this.pause();
      }
      this.transPos = Tone.Transport.seconds * this.transMulti;
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
    onMouseUp(transPos) {
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
          dot.isActive = true;

          /*******color activation ****/
          if (jempTone.color) {
            dot.color = jempTone.color;
          }

          /*doteffect after dot is set*/
          setInterval(() => {
            //dot = false;
          }, 1000);

          //play sound
          let t = this.getTones[jempTone.string - 1][jempTone.fret];
          this.sampler.triggerAttackRelease(t.tone, 0.6);
        }, jempTone.time);
      });
    },

    /**
     * activeSong manipulation
     */
    setSongEndTime() {
      this.endSongTime =
        Tone.Transport.toSeconds(this.getLastTone().time) + this.endSongOffset;
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
  },
};
</script>

<style>
.transportFader {
  margin: 2% 2%;
  width: 50%;
}

#speedFader {
  width: 50%;
}

#volumeFader {
  width: 50%;
}

.label {
  width: 10%;
}

#playerCard {
  flex-direction: row;
}

button {
  width: 100px;
}
</style>