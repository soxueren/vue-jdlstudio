import Vue from "vue";
import App from "./App.vue";
import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "./assets/css/show-hint-jdl.css";
import "./assets/css/solarized.jdl.css";

import "jhipster-core";

Vue.config.productionTip = false;

Vue.use(ElementUI);

new Vue({
  render: h => h(App)
}).$mount("#app");
