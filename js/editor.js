import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/inputrules/inputrules"
import "prosemirror/dist/menu/tooltipmenu"

let editor = document.querySelector("#editor")
let content = document.querySelector("#content")

let pm = new ProseMirror({
  place: editor,
  /*
  autoInput: true,
  doc: content,
  docFormat: "dom",
  */
  tooltipMenu: {selectedBlockMenu: true}
})

editor.style.display = "block"
content.style.display = "none"
