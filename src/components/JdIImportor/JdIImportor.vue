<template>
  <a href="#" class="upload-input">
    <i class="el-icon-upload"></i>
    <input type="file" @change="importHandle" />
  </a>
</template>
<script>
import parser from "jhipster-core/lib/dsl/api";
export default {
  name: "JdIImportor",
  data() {
    return {
      fileList: []
    };
  },
  methods: {
    importHandle(event) {
      let file = event.target.files[0];
      var reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = e => {
        let data = e.currentTarget.result;
        this.$store.commit("setFilename", file.name);
        if (_.endsWith(file.name, ".json")) {
          console.log(data);
        }
        if (_.endsWith(file.name, ".jdl")) {
          this.$store.commit("setEditorValue", data);
          //data->jdlobject
          data = data.replace(/\/\/[^\n\r]*/gm, "");
          let jdlObject = parser.parse(data);
          this.$store.commit("setJdlObject", jdlObject);
        }
        this.fileList = [];
      };
    }
  }
};
</script>
<style>
.el-upload-list {
  display: none;
}
.upload-input {
  position: relative;
  padding: 2px 2px;
  overflow: hidden;
  text-decoration: none;
  text-indent: 0;
  line-height: 20px;
}
.upload-input input {
  position: absolute;
  font-size: 100px;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  opacity: 0;
}
</style>