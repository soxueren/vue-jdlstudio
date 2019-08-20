<template>
  <div v-bind:class="[isActive? 'canvas-mode' : '', 'jdl-editor']">
    <textarea id="textarea" ref="jdlcode" v-model="code"></textarea>
    <canvas
      id="canvas"
      v-bind:style="{top: canvasStyle.t + 'px',left:canvasStyle.l+'px',width: canvasStyle.w+'px',height:canvasStyle.h+'px'}"
    ></canvas>
    <div
      id="canvas-panner"
      @mouseenter="isActive = true"
      @mousedown="mouseDown"
      @mouseup="mouseUp"
      @mouseleave="mouseUp"
      v-bind:style="{width:pannerStyle.w}"
    ></div>
    <div class="tools">
      <JdIImportor />
      <JdlFormEditor />
      <JdlExeutor />
      <a href="javascript:void(0);" @click="downHandle">
        <i class="el-icon-download"></i>
      </a>
      <a href="javascript:void(0);" @click="delHandle">
        <i class="el-icon-delete"></i>
      </a>
    </div>
  </div>
</template>
<script>
import { mapState, mapGetters } from "vuex";
import CodeMirror from "./lib/codemirror/codemirror.custom";
import nomnoml from "./lib/nomnoml/nomnoml.custom";
import skanaar from "./lib/nomnoml/shannar.custom";
import parser from "jhipster-core/lib/dsl/api";

import "codemirror/theme/base16-dark.css";
import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/scroll/simplescrollbars.css";

import "./css/show-hint-jdl.css";
import "./css/solarized.jdl.css";

import _ from "lodash";
import saveAs from "file-saver";

import "codemirror/addon/selection/active-line";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/scroll/simplescrollbars";

import JdIImportor from "./JdIImportor/JdIImportor.vue";
import JdlFormEditor from "./JdlFormEditor/JdlFormEditor.vue";
import JdlExeutor from "./JdlExeutor/JdlExeutor.vue";
export default {
  name: "jdlstudio",
  components: {
    JdIImportor,
    JdlFormEditor,
    JdlExeutor
  },
  data() {
    return {
      cmOptions: {
        // codemirror options
        tabSize: 4,
        mode: "jdl",
        theme: "solarized base16-dark",
        lineNumbers: true,
        line: true,
        matchBrackets: true,
        smartIndent: true,
        fullScreen: true,
        extraKeys: {
          Ctrl: "autocomplete"
        },
        scrollbarStyle: "simple"
      },
      canvasElement: {},
      canvasStyle: {
        t: 0,
        l: 0,
        h: 0,
        w: 0
      },
      pannerStyle: {
        w: "45%"
      },
      isActive: false,
      pannerwidth: "45%",
      canvasPanner: {},
      vm: {},
      zoomLevel: 1,
      offset: {
        x: 0,
        y: 0
      },
      mouseDownPoint: false
    };
  },
  computed: {
    ...mapState({
      code: state => state.jdl.code,
      filename: state => state.jdl.filename,
      editor: state => state.jdl.editor
    }),
    ...mapGetters({
      editorValue: "editorValue"
    })
  },
  created() {},
  mounted() {
    let editor = CodeMirror.fromTextArea(this.$refs.jdlcode, this.cmOptions);
    this.canvasElement = document.getElementById("canvas");
    this.canvasPanner = document.getElementById("canvas-panner");
    editor.on("changes", _.debounce(this.sourceChanged, 300));
    editor.setSize(
      document.documentElement.clientWidth,
      document.documentElement.clientHeight * 0.95
    );
    //更新editor
    this.$store.commit("setEditor", editor);
    //更新jdlObject
    let jdlObject = parser.parse(this.editorValue);
    this.$store.commit("setJdlObject", jdlObject);

    this.vm = skanaar.vector;
    window.addEventListener(
      "resize",
      _.throttle(this.sourceChanged, 750, { leading: true })
    );
    this.canvasPanner.addEventListener("wheel", _.throttle(this.magnify, 50));
    this.canvasPanner.addEventListener(
      "mousemove",
      _.throttle(this.mouseMove, 50)
    );
  },
  methods: {
    magnifyViewport(diff) {
      this.zoomLevel = Math.min(10, this.zoomLevel + diff);
      this.sourceChanged();
    },
    resetViewport() {
      this.zoomLevel = 0;
      this.offset = {
        x: 0,
        y: 0
      };
      this.sourceChanged();
    },
    magnify(e) {
      this.zoomLevel = Math.min(10, this.zoomLevel - (e.deltaY < 0 ? -1 : 1));
      this.sourceChanged();
    },
    positionCanvas(rect, superSampling, offset) {
      var w = rect.width / superSampling;
      var h = rect.height / superSampling;
      var t = 300 * (1 - h / document.documentElement.clientHeight) + offset.y;
      var l = 150 + (document.documentElement.clientWidth - w) / 2 + offset.x;
      this.canvasStyle = {
        t: t,
        l: l,
        w: w,
        h: h
      };
    },
    sourceChanged() {
      try {
        let superSampling = window.devicePixelRatio || 1;
        let scale = superSampling * Math.exp(this.zoomLevel / 10);
        let model = nomnoml.draw(this.canvasElement, this.editorValue, scale);
        this.positionCanvas(this.canvasElement, superSampling, this.offset);
      } catch (e) {
        console.error(e);
      }
    },
    mouseDown(e) {
      this.pannerStyle.w = "100%";
      this.mouseDownPoint = this.vm.diff(
        {
          x: e.pageX,
          y: e.pageY
        },
        this.offset
      );
    },
    mouseMove(e) {
      if (this.mouseDownPoint) {
        this.offset = this.vm.diff(
          {
            x: e.pageX,
            y: e.pageY
          },
          this.mouseDownPoint
        );
        this.sourceChanged();
      }
    },
    mouseUp() {
      this.isActive = false;
      this.mouseDownPoint = false;
      this.pannerStyle.w = "45%";
    },
    downHandle() {
      let blob = new Blob([this.editorValue], {
        type: "text/plain;charset=utf-8"
      });
      saveAs(blob, this.filename);
    },
    delHandle() {
      this.$store.commit("setEditorValue", "");
      this.$store.commit("setJdlObject", {});
    },
    handleClose() {
      this.settingdialogVisiable = false;
    }
  }
};
</script>

<style lang="css">
.isFixed {
  position: fixed;
  height: 25px;
  left: 33%;
  top: 5px;
  transform: translate(-50%, -50%);
  z-index: 999;
  background: rgba(0, 0, 0, 0);
  transition: all 1s;
  color: #657b83;
}
#textarea {
  outline: none;
  position: absolute;
  z-index: 1;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0);
  box-sizing: border-box;
  border: 0;
  font-family: Consolas, Menlo, monospace;
  color: #657b83;
  resize: none;
  opacity: 1;
  margin: 60px 0 20px 0;
  transition: opacity 0.3s;
}
.CodeMirror {
  height: 100%;
  border: 0;
  width: 100%;
  margin: 60px 0 20px 0;
  line-height: 25px;
  font-size: 16px;
  font-family: Consolas, Monaco, monospace;
  font-weight: 500;
  opacity: 1;
  transition: opacity 0.3s;
}

.CodeMirror .CodeMirror-linenumber {
  color: #3e4350;
  padding-left: 12px;
}
.canvas-mode .CodeMirror {
  opacity: 0;
  transition: opacity 1s;
}
.tools i {
  color: #fdf6e3;
  font-size: 1.2em;
}
.tools .tool-btn {
  padding-left: 2px;
}
.canvas-tools i {
  font-size: 1.5em;
}
.canvas-tools a {
  line-height: 2.5em;
}

#canvas-panner {
  position: absolute;
  z-index: 3;
  width: 33%;
  height: 100%;
  background: rgba(0, 0, 0, 0);
  top: 0;
  right: 20px;
  bottom: 0;
  cursor: move;
}
#canvas {
  position: absolute;
  z-index: 2;
  cursor: move;
}
.canvas-mode .CodeMirror {
  opacity: 0;
  transition: opacity 1s;
}
.canvas-mode .canvas-tools {
  opacity: 1;
  transition: opacity 0.3s;
}

.tools {
  display: block;
  position: absolute;
  z-index: 4;
  top: 10px;
  right: 20px;
  font-family: Calibri, Helvetica, sans-serif;
  font-weight: bold;
  background: transparent;
  border-radius: 5px;
}
.tools.left {
  left: 20px;
}
.tools .canvas-tools {
  display: block;
  position: absolute;
  top: 60px;
  right: 0;
  width: 24px;
  opacity: 0;
  transition: opacity 1s;
}
.canvas-mode .canvas-tools {
  opacity: 1;
  transition: opacity 0.3s;
}
.tools i {
  width: 24px;
  height: 24px;
  margin-bottom: 5px;
}

.tools > .logo {
  color: #fdf6e3;
  font-size: 150%;
}
.tools > #tooltip {
  font-size: 90%;
  color: #807c72;
  position: fixed;
  top: 7px;
  right: 20px;
  text-align: right;
  background: rgb(40, 44, 52);
  border-radius: 2px;
  padding: 0 5px;
}
.tools > #storage-status {
  color: #fdf6e3;
  opacity: 0.5;
  font-style: italic;
  position: fixed;
  top: 7px;
  right: 0;
  width: 100%;
  text-align: center;
}
.tools > #storage-status a {
  border: 2px solid rgba(255, 246, 223, 0.63);
  padding: 0 5px;
  border-radius: 4px;
  font-style: normal;
  opacity: 1;
}

.tools .seperator {
  color: white;
  font-size: 25px;
  margin: 0 10px;
}
</style>
