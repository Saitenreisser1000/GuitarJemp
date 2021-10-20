export const songStore = {
    state: {
        activeSong: {},
        allSongs: []
    },

    mutations: {
        setSongs(state, songs) {
            state.allSongs = songs;

        },
        activeSong(state, song) {
            state.activeSong = song;
            state.activeSong.songdata = JSON.parse(state.activeSong.songdata);

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