export const fbInitStore = {
    state: {
        dotsPerString: [],

        toneNames: [
            { id: 0, name: 'E' },
            { id: 1, name: 'F' },
            { id: 2, name: 'F#' },
            { id: 3, name: 'G' },
            { id: 4, name: 'G#' },
            { id: 5, name: 'A' },
            { id: 6, name: 'Bb' },
            { id: 7, name: 'B' },
            { id: 8, name: 'C' },
            { id: 9, name: 'C#' },
            { id: 10, name: 'D' },
            { id: 11, name: 'D#' }
        ],

        tuning: ['E3', 'B2', 'G2', 'D2', 'A1', 'E1'],

        dotContainer: [],
    },
    
    mutations: {
        initJemps(state, stringNr) {

            let start = (stringNr - 1) * this.getters.getFretAmount;
            let end = stringNr * this.getters.getFretAmount;
            let fretNr = 0;

            for (let i = start; i <= end; i++) {
                state.dotContainer.push({
                    dotID: stringNr.toString() + '|' + fretNr.toString(),
                    jt_ID: stringNr.toString() + '|' + fretNr.toString(),
                    fret: fretNr,
                    string: stringNr,

                    color: state.defaultJempColor,
                    showName: '',
                    activeJemps: [],

                    isActive: false,
                    isFocused: false
                });
                fretNr++;
            }
        },

        initTuning(state) {
            for (let j = 0; j < 6; j++) {
                state.dotsPerString[j] = new Array(16);
                for (let i = 0; i < 16; i++) {

                    state.dotsPerString[j][i] = {};
                    state.dotsPerString[j][i].xPos = i;

                    switch (j) {

                        case 0: state.dotsPerString[0][i].string = 1;
                            state.dotsPerString[0][i].show = state.toneNames[(i) % 12].name;
                            state.dotsPerString[0][i].octave = parseInt((i + 4) / 12) + 3;
                            state.dotsPerString[0][i].tone = state.toneNames[(i) % 12].name + (parseInt((i + 4) / 12) + 3).toString();
                            break;

                        case 1: state.dotsPerString[1][i].string = 2;
                            state.dotsPerString[1][i].show = state.toneNames[(i + 7) % 12].name;
                            state.dotsPerString[1][i].octave = parseInt((i + 11) / 12) + 2;
                            state.dotsPerString[1][i].tone = state.toneNames[(i + 7) % 12].name + (parseInt((i + 11) / 12) + 2).toString();
                            break;
                        case 2: state.dotsPerString[2][i].string = 3;
                            state.dotsPerString[2][i].show = state.toneNames[(i + 3) % 12].name;
                            state.dotsPerString[2][i].octave = parseInt((i + 7) / 12) + 2;
                            state.dotsPerString[2][i].tone = state.toneNames[(i + 3) % 12].name + (parseInt((i + 7) / 12) + 2).toString();
                            break;
                        case 3: state.dotsPerString[3][i].string = 4;
                            state.dotsPerString[3][i].show = state.toneNames[(i + 10) % 12].name;
                            state.dotsPerString[3][i].octave = parseInt((i + 2) / 12) + 2;
                            state.dotsPerString[3][i].tone = state.toneNames[(i + 10) % 12].name + (parseInt((i + 2) / 12) + 2).toString();
                            break;
                        case 4: state.dotsPerString[4][i].string = 5;
                            state.dotsPerString[4][i].show = state.toneNames[(i + 5) % 12].name;
                            state.dotsPerString[4][i].octave = parseInt((i + 9) / 12) + 1;
                            state.dotsPerString[4][i].tone = state.toneNames[(i + 5) % 12].name + (parseInt((i + 9) / 12) + 1).toString();
                            break;
                        case 5: state.dotsPerString[5][i].string = 6;
                            state.dotsPerString[5][i].show = state.toneNames[(i) % 12].name;
                            state.dotsPerString[5][i].octave = parseInt((i + 4) / 12) + 1;
                            state.dotsPerString[5][i].tone = state.toneNames[(i) % 12].name + (parseInt((i + 4) / 12) + 1).toString();
                            break;
                    }
                }
            }
        },
    },
    actions: {
        initJemps: ({ commit }, stringNr) => { commit('initJemps', stringNr) },
        initTuning: ({ commit }) => { commit('initTuning') },
    },
    getters:{
        getAllJemps: (state) => { return state.dotContainer },
        getDotsPerString:(state) => {return state.dotsPerString},
        getToneNames: (state) => {return state.toneNames},
        getTones: (state) => { return state.dotsPerString },
        getDotContainer: (state) => {return state.dotContainer}
    }
}