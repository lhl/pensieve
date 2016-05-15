var ProseMirror = require("../dist/edit").ProseMirror
require("../dist/inputrules/autoinput")
require("../dist/menu/tooltipmenu")
require("../dist/menu/menubar")

var pm = window.pm = new ProseMirror({
  place: document.querySelector(".full"),
  autoInput: true,
  tooltipMenu: {selectedBlockMenu: true},
  menuBar: {float: true},
  doc: document.querySelector("#content"),
  docFormat: "dom"
})

pm.setTextSelection(21)
pm.focus()

document.querySelector("#mark").addEventListener("mousedown", function(e) {
  pm.markRange(pm.selection.from, pm.selection.to, {className: "marked"})
  e.preventDefault()
})
