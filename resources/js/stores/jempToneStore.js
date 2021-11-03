import { Time } from "tone";
import { fbInitStore } from "./fbInitStore";

export const jempToneStore = {
    state: {
        
        //Not Used
        //dotsPerString:fbInitStore.state.getDotsPerString,
        //toneNames:fbInitStore.state.getToneNames,

        //get all dots from Fretboard
        allDots: fbInitStore.state.dotContainer,
        
        activeToneContainer: [],
        openDotXPos: 20,
        defaultJempColor: 'indianred',
        focusedDot: '',
        timing:'4n',
        startTime:0,
        seqBoxes: {
            xPos: 0,
            xPosAdd: 80,
            defaultWidth: 20,
        },
        //preparedSong:"",
    },

    mutations: {

        addTone(state, jempTone) {
            
            let fretboardDot = state.allDots.find(dot => dot.dotID === jempTone.dotID);
            
            //let time = "0:" + (parseInt(state.seqBoxes.xPos / 40) + 1);


            /******newTone********/
            let newTone = {
                boxData: {
                    xPos: state.seqBoxes.xPos,
                    width: state.seqBoxes.defaultWidth,
                    string: jempTone.string,
                },

                dotColor: state.defaultJempColor,
                time: state.startTime,
                isFocused: true,
                dotID: jempTone.dotID,
                jt_ID: jempTone.dotID + Date.now(), //Timestamp for jempTone

            };

            //add box to active tone of certain dot 
            fretboardDot.activeJemps.push(newTone)

            //set dot to active
            /*if (fretboardDot.activeJemps[0]) {
                jempTone.isActive = true
            }*/

            //add tone as active box
            state.activeToneContainer.push(newTone);

            //add time to boxPosition
            state.seqBoxes.xPos += state.seqBoxes.xPosAdd;
            state.startTime += Time(state.timing).toSeconds();
        },

        changeToneTime(jempTone, time){
            let jt = state.activeToneContainer.find(tone => jempTone.jt_ID == tone.jt_ID)
            jt.time = time;
        },

        changeToneColor(state, jempTone){
            let color = jempTone.color;
            jempTone = jempTone.tone;

            //change dotColor
            let dot = state.allDots.find(dot => jempTone.dotID == dot.dotID)
            dot.color = color;

            //change toneColor
            //let jt = state.activeToneContainer.find(tone => jempTone.jt_ID == tone.jt_ID);
            //jt.dotColor = color;
        },

        removeTone(state, dotInfo) {
            let t = state.allDots.find(dot => dot.dotID === dotInfo.dotID);          
            t.activeJemps = t.activeJemps.filter(aJemps => aJemps.time !== dotInfo.time);
            if (!t.activeJemps[0]) {
                t.isActive = false
            }
            state.activeToneContainer = state.activeToneContainer.filter(tones => tones.jt_ID !== dotInfo.jt_ID)
        },

        setFocus(state, tone){
            this.commit("removeOthersFocus", tone)
        },
        
        removeAllFocuses(state){
            for (let i of state.allDots) {
                i.isFocused = false;
            } 
        },

        removeOthersFocus(state, dot) {
            this.commit("removeAllFocuses");   
            dot.isFocused = true;
            state.focusedDot = dot;
            
        },

        changeTiming(state, newTime){
            console.log(newTime)
            state.timing = newTime;
        }
    },
    actions: {
        addTone: ({ commit }, dotInfo) => { commit('addTone', dotInfo) },
        removeTone: ({ commit }, dotInfo) => { commit('removeTone', dotInfo) },

        setActiveDot: () => {},
        setActiveTone: () => {},

        setFocus: ({ commit }, dotInfo) => { commit('setFocus', dotInfo) },
        removeOthersFocus: ({ commit }, dotInfo) => { commit('removeOthersFocus', dotInfo) },
        removeAllFocuses: ({ commit }) => { commit("removeAllFocuses")},

        changeBoxPos: ({ commit }, box) => { commit('changeBoxPos', box) },

        changeToneColor:({ commit }, jempTone) => { commit('changeToneColor', jempTone)},
        changeToneTime:({ commit }, jempTone, time) => { commit('changeToneTime', jempTone, time)},

        setSongActive:({ commit }) => { commit('prepareTempSong')},
        changeTimeRadio:({ commit }, newTime) => { commit('changeTiming', newTime)},

    },
    getters: {
        getActiveBoxes: (state) => { return state.activeToneContainer },
        getOpenJempXPos: (state) => { return state.openDotXPos },
        getFocusedDot: (state) => {return state.focusedDot},
        getPreparedSong: (state) => {return state.preparedSong}
    }
};
