export default {
  state: {
    filename: "test.jdl",
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
    editor: {},
    jdlObject: {}
  },
  getters: {
    editorValue: state => {
      return state.editor.getValue();
    }
  },
  actions: {},
  mutations: {
    setEditor(state, value) {
      state.editor = value;
    },
    setFilename(state, value) {
      state.filename = value;
    },
    setEditorValue(state, value) {
      state.editor.setValue(value);
    },
    setJdlObject(state, value) {
      console.log(value);
      state.jdlObject = value;
    }
  }
};
