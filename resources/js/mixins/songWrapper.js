export default {
    methods:{
        prepareSong(tones){
            let song = {
                name:"",
                songdata: {
                    bpm:150,
                    name:"",
                    tones: tones,
                }
            }          
            return song;
        }

    }
}