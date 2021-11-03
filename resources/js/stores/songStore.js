import { jempToneStore } from "./jempToneStore";

export const songStore = {
    state: {
        activeSong: {},
        allSongs: [],
        activeTones: []
    },

    mutations: {
        setSongs(state, songs) {
            state.allSongs = songs;

        },
        activeSong(state, song) {
            console.log(song)
            state.activeSong = song;
            state.activeSong.songdata = JSON.parse(state.activeSong.songdata);
        },

        prepareTempSong(state, activeTones){
            //console.log(activeTones)
            state.activeTones = jempToneStore.state.activeToneContainer;
            let song = {
                name:"",
                songdata: {
                    bpm:150,
                    name:"",
                    tones:state.activeTones,                  
                }
            }

            song.songdata = JSON.stringify(song.songdata)
                  
            this.commit('activeSong', song)
        }

    },

    actions: {
        fetchSongs({ commit }) {
            return axios
                .get('api/songs')
                .then(response => {
                    commit('setSongs', response.data);
                    commit('activeSong', response.data[0]);
                })
                .catch((error) => console.log(error));
        },
    },

    getters: {
        getActiveSong: (state) => { return state.activeSong },
        getAllSongs: (state) => { return state.allSongs }
    }
};