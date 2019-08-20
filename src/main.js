import Vue from "vue";

import "element-ui/lib/theme-chalk/index.css";
import App from "./App.vue";
import VueBus from "vue-bus";
import store from "./store";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "./assets/css/show-hint-jdl.css";
import "./assets/css/solarized.jdl.css";

import "core-js";
import "jhipster-core";

Vue.config.productionTip = false;

Vue.use(VueBus);

new Vue({
  store,
  render: h => h(App)
}).$mount("#app");
