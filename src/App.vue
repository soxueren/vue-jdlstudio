<template>
  <div id="app">
    <JdlStudio />
  </div>
</template>
<script>
import JdlStudio from "./components/JdlStudio.vue";

export default {
  name: "app",
  components: {
    JdlStudio
  }
};
</script>

<style>
html,
body,
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: Consolas, Menlo, monospace;
  text-align: left;
  color: #2c3e50;
  background: #151515;
  margin-top: -25px;
}
body {
  margin: 0px;
}
</style>
