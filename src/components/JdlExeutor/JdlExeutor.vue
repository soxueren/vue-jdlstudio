<template>
  <a href="javascript:void(0);" @click="executeHandle">
    <i class="el-icon-caret-right"></i>
  </a>
</template>
<script>
import { mapGetters } from "vuex";
export default {
  computed: {
    ...mapGetters({
      editorValue: "editorValue"
    })
  },
  methods: {
    executeHandle() {
      console.log(this.editorValue);
    }
  }
};
</script>
<style>
</style>