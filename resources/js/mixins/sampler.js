import * as Tone from "tone";

export default {
    data: function(){
        return {
            sampler: new Tone.Sampler({
                urls: {
                  A1: "A1.mp3",
                  A2: "A2.mp3",
                },
                baseUrl: "./sounds/",
                volume: -5,
                onload: () => {},
              }).toDestination(),
        }
    },
    methods: {
        playTone(note){
            this.sampler.triggerAttackRelease(note, 0.6)
        }
      }
}