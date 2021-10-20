import Vuex from 'vuex';
import Vue from 'vue';

import { fbStore } from "./fbStore";
import { jempToneStore } from "./jempToneStore";
import { songStore } from "./songStore";

Vue.use(Vuex);

export const store = new Vuex.Store({
    modules: {
        fbStore,
        jempToneStore,
        songStore
    },
});

