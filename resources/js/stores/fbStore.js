
export const fbStore = {
    state: {

        fbData: {
            fbColor: 'wheat',
            fbWidth: '1200',
            fbHeight: '205',

            fretColor: 'black',
            fretAmount: 16,
            fretWidth: '2',

            stringColor: 'black',
            stringAmount: 6,
            stringHeight: '1',

            saddleColor: 'black',
            saddleLeftOffset: 50,
            saddleWidth: 13,

            singleFbMarker: [3, 5, 7, 9, 15],
            doubleFbMarker: [12],
        },
    },

    mutations: {
        setFbColor:(state, color)   => {state.fbData.fbColor = color},
        setFbWidth:(state, width)   => {state.fbData.fbWidth = width},
        setFbHeight:(state, height) => {state.fbData.fbHeight = height},

        setFretAmount:(state, frets) => {state.fbData.fretAmount = frets},
        setFretWidth:(state, width)  => {state.fbData.fretWidth = width},

        setStringAmount:(state, strings) => {state.fbData.stringAmount = strings},
        setStringHeight:(state, height)  => {state.fbData.stringHeight = height},

        setSaddleColor:(state, color) =>    {state.fbData.saddleColor = color},
        setSaddleLeftOffset:(state, offset) => {state.fbData.saddleLeftOffset = offset},
        setSaddleWidth:(state, width) =>    {state.fbData.saddleWidth = width},
    },

    actions: {
        setFbColor:({commit}, color)   => {commit('setFbColor', color)},
        setFbWidth:({commit}, width)   => {commit('setFbWidth', width)},
        setFbHeight:({commit}, height) => {commit('setFbHeight', height)},

        setFretAmount:({commit}, frets) => {commit('setFretAmount', frets)},
        setFretWidth:({commit}, width)  => {commit('setFretWidth', width)},

        setStringAmount:({commit}, strings) => {commit('setStringAmount', strings)},
        setStringHeight:({commit}, height)  => {commit('setStringHeight', height)},

        setSaddleColor:({commit}, color) => {commit('setSaddleColor', color)},
        setSaddleLeftOffset:({commit}, offset) => {commit('setSaddleLeftOffset', offset)},
        setSaddleWidth:({commit}, width) => {commit('setSaddleWidth', width)},

    },

    getters: {
        getFretAmount:(state) => {return state.fbData.fretAmount},

        getCalcSaddleOffset: (state) => {return state.fbData.saddleWidth + state.fbData.saddleLeftOffset},

        getActualFbWidth:(state) => {return parseInt(state.fbData.fbWidth) - (state.fbData.saddleLeftOffset + state.fbData.saddleWidth)},

        getFretSpace:(state) => {return parseInt((parseInt(state.fbData.fbWidth) - (state.fbData.saddleLeftOffset + state.fbData.saddleWidth)) / state.fbData.fretAmount)},

        getSingleFbMarker:(state) => {return state.fbData.singleFbMarker},

        getDoubleFbMarker:(state) => {return state.fbData.doubleFbMarker},

        getFbData:(state) => {return state.fbData},

    }
};
