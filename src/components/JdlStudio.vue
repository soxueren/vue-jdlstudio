<template>
  <div v-bind:class="[isActive? 'canvas-mode' : '', 'jdl-editor']">
    <canvas
      id="canvas"
      v-bind:style="{top: canvasStyle.t + 'px',left:canvasStyle.l+'px',width: canvasStyle.w+'px',height:canvasStyle.h+'px'}"
    ></canvas>
    <textarea id="textarea" ref="jdlcode" v-model="code"></textarea>
    <div
      id="canvas-panner"
      @mouseenter="isActive = true"
      @mousedown="mouseDown"
      @mouseup="mouseUp"
      @mouseleave="mouseUp"
      v-bind:style="{width:pannerStyle.w}"
    ></div>
  </div>
</template>
<script>
import "core-js";
import "codemirror/theme/base16-dark.css";
import _ from "lodash";
import CodeMirror from "../assets/js/codemirror/codemirror.custom";
import nomnoml from "../assets/js/nomnoml/nomnoml.custom";
import skanaar from "../assets/js/nomnoml/shannar.custom";

import "codemirror/addon/selection/active-line";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/hint/show-hint";

export default {
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
        extraKeys: {
          Ctrl: "autocomplete"
        }
      },
      code: `
entity Region {
  regionName String
}
entity Country {
	countryName String
}
relationship OneToOne {
	Country{region} to Region
}
            `,
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
      zoomLevel: 0,
      offset: {
        x: 0,
        y: 0
      },
      mouseDownPoint: false,
      editor: {}
    };
  },
  computed: {},
  created() {},
  mounted() {
    this.editor = CodeMirror.fromTextArea(this.$refs.jdlcode, this.cmOptions);
    this.canvasElement = document.getElementById("canvas");
    this.canvasPanner = document.getElementById("canvas-panner");
    this.editor.on("changes", _.debounce(this.sourceChanged, 300));
    this.editor.setSize(
      document.documentElement.clientWidth,
      document.documentElement.clientHeight * 0.95
    );
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
      var h = rect.height / superSampling - 60;
      var t =
        300 * (1 - h / document.documentElement.clientHeight) + offset.y + 50;
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
        let model = nomnoml.draw(
          this.canvasElement,
          this.editor.getValue(),
          scale
        );
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
    }
  }
};
</script>

<style lang="css">
#textarea {
  outline: none;
  position: absolute;
  z-index: 1;
  width: 100%;
  height: auto;
  background: rgba(0, 0, 0, 0);
  box-sizing: border-box;
  border: 0;
  font-family: Consolas, Menlo, monospace;
  color: #657b83;
  padding: 30px 0 0 40px;
  resize: none;
  opacity: 1;
  transition: opacity 0.3s;
}
.CodeMirror {
  height: auto;
  border: 0;
  width: 100%;
  margin: 60px 0 20px 0;
  line-height: 25px;
  font-size: 16px;
  font-family: Consolas, Monaco, monospace;
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
.tools > a {
  margin-left: 5px;
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
