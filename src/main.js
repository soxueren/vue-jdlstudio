import Vue from "vue";
import ElementUI from "element-ui";
import VueLocalStorage from "vue-localstorage";
import "element-ui/lib/theme-chalk/index.css";
import App from "./App.vue";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "./assets/css/show-hint-jdl.css";
import "./assets/css/solarized.jdl.css";

import "core-js";
import "jhipster-core";

Vue.config.productionTip = false;

Vue.use(ElementUI);
Vue.use(VueLocalStorage);

new Vue({
  render: h => h(App)
}).$mount("#app");
