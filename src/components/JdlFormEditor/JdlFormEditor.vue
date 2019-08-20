<template>
  <a href="javascript:void(0);" @click="addHandle">
    <i class="el-icon-plus"></i>
  </a>
</template>
<script>
import Vue from "vue";
import { mapState, mapGetters } from "vuex";
import parser from "jhipster-core/lib/dsl/api";

import ElementUI from "element-ui";
Vue.use(ElementUI);

export default {
  computed: {
    ...mapState({
      jdlObject: state => state.jdl.jdlObject
    }),
    ...mapGetters({
      editorValue: "editorValue"
    })
  },
  mounted() {},
  methods: {
    addHandle() {
      console.log(this.jdlObject, this.editorValue);
    }
  }
};
</script>
<style>
.el-form-item__label {
  color: #fdf6e3;
  font-weight: 600;
}
.el-form-item a {
  color: #fdf6e3;
}
.el-input--mini .el-input__inner {
  background: rgb(0, 0, 0, 0);
  border: 1px solid rgb(40, 44, 52);
  color: aliceblue;
}
.el-dialog__body {
  padding: 10px 20px;
}
.el-dialog__headerbtn {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;
}
</style>