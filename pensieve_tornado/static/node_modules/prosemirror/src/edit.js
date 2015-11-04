var ProseMirror = require("prosemirror/dist/edit").ProseMirror
require("prosemirror/dist/menu/menubar") // Load menubar module

var editor = new ProseMirror({
  place: document.body,
  menuBar: true
})
