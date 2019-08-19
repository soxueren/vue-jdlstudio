import Vue from "vue";
import vuex from "vuex";

Vue.use(vuex);

import jdlstore from "../components/jdlstore.js";

export default new vuex.Store({
  modules: {
    jdl: jdlstore
  }
});
