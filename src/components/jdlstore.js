export default {
  state: {
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
    setEditor(state, editor) {
      state.editor = editor;
    },
    setEditorValue(state, value) {
      state.editor.setValue(value);
    },
    setJdlObject(state, value) {
      state.jdlObject = value;
    }
  }
};
