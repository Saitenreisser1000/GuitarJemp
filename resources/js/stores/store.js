import Vuex from 'vuex';
import Vue from 'vue';

import { fbStore } from "./fbStore";
import { jempToneStore } from "./jempToneStore";
import { songStore } from "./songStore";
import { fbInitStore } from "./fbInitStore";

Vue.use(Vuex);

export const store = new Vuex.Store({
    modules: {
        fbStore,
        fbInitStore,
        jempToneStore,
        songStore,
    },
});

