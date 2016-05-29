(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.elt = elt;
exports.requestAnimationFrame = requestAnimationFrame;
exports.cancelAnimationFrame = cancelAnimationFrame;
exports.contains = contains;
exports.insertCSS = insertCSS;
exports.ensureCSSAdded = ensureCSSAdded;
function elt(tag, attrs) {
  var result = document.createElement(tag);
  if (attrs) for (var name in attrs) {
    if (name == "style") result.style.cssText = attrs[name];else if (attrs[name] != null) result.setAttribute(name, attrs[name]);
  }

  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  for (var i = 0; i < args.length; i++) {
    add(args[i], result);
  }return result;
}

function add(value, target) {
  if (typeof value == "string") value = document.createTextNode(value);

  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      add(value[i], target);
    }
  } else {
    target.appendChild(value);
  }
}

var reqFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
var cancelFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;

function requestAnimationFrame(f) {
  if (reqFrame) return reqFrame(f);else return setTimeout(f, 10);
}

function cancelAnimationFrame(handle) {
  if (reqFrame) return cancelFrame(handle);else clearTimeout(handle);
}

var ie_upto10 = /MSIE \d/.test(navigator.userAgent);
var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);

var browser = exports.browser = {
  mac: /Mac/.test(navigator.platform),
  ie: ie_upto10 || !!ie_11up,
  ie_version: ie_upto10 ? document.documentMode || 6 : ie_11up && +ie_11up[1],
  gecko: /gecko\/\d/i.test(navigator.userAgent),
  ios: /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent)
};

// : (DOMNode, DOMNode) → bool
// Check whether a DOM node is an ancestor of another DOM node.
function contains(parent, child) {
  // Android browser and IE will return false if child is a text node.
  if (child.nodeType != 1) child = child.parentNode;
  return child && parent.contains(child);
}

var accumulatedCSS = "",
    cssNode = null;

function insertCSS(css) {
  if (cssNode) cssNode.textContent += css;else accumulatedCSS += css;
}

// This is called when a ProseMirror instance is created, to ensure
// the CSS is in the DOM.
function ensureCSSAdded() {
  if (!cssNode) {
    cssNode = document.createElement("style");
    cssNode.textContent = "/* ProseMirror CSS */\n" + accumulatedCSS;
    document.head.insertBefore(cssNode, document.head.firstChild);
  }
}
},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.baseCommands = undefined;

var _dom = require("../dom");

var _transform = require("../transform");

var _model = require("../model");

var _char = require("./char");

var _selection = require("./selection");

// :: Object<CommandSpec>
// The set of default commands defined by the core library. They are
// included in the [default command set](#CommandSet.default).
var baseCommands = exports.baseCommands = Object.create(null);

// ;; #kind=command
// Delete the selection, if there is one.
//
// **Keybindings:** Backspace, Delete, Mod-Backspace, Mod-Delete,
// **Ctrl-H (Mac), Alt-Backspace (Mac), Ctrl-D (Mac),
// **Ctrl-Alt-Backspace (Mac), Alt-Delete (Mac), Alt-D (Mac)
baseCommands.deleteSelection = {
  label: "Delete the selection",
  run: function run(pm) {
    return pm.tr.replaceSelection().apply(pm.apply.scroll);
  },

  keys: {
    all: ["Backspace(10)", "Delete(10)", "Mod-Backspace(10)", "Mod-Delete(10)"],
    mac: ["Ctrl-H(10)", "Alt-Backspace(10)", "Ctrl-D(10)", "Ctrl-Alt-Backspace(10)", "Alt-Delete(10)", "Alt-D(10)"]
  }
};

function deleteBarrier(pm, cut) {
  var $cut = pm.doc.resolve(cut),
      before = $cut.nodeBefore,
      after = $cut.nodeAfter;
  if ((0, _transform.joinable)(pm.doc, cut)) {
    var tr = pm.tr.join(cut);
    if (tr.steps.length && before.content.size == 0 && !before.sameMarkup(after) && $cut.parent.canReplace($cut.index() - 1, $cut.index())) tr.setNodeType(cut - before.nodeSize, after.type, after.attrs);
    if (tr.apply(pm.apply.scroll) !== false) return;
  }

  var conn = void 0;
  if (after.isTextblock && (conn = before.contentMatchAt($cut.index()).findWrapping(after.type, after.attrs))) {
    var end = cut + after.nodeSize,
        wrap = _model.Fragment.empty;
    for (var i = conn.length - 1; i >= 0; i--) {
      wrap = _model.Fragment.from(conn[i].type.create(conn[i].attrs, wrap));
    }wrap = _model.Fragment.from(before.copy(wrap));
    return pm.tr.step(new _transform.ReplaceAroundStep(cut - 1, end, cut, end, new _model.Slice(wrap, 1, 0), conn.length, true)).join(end + 2 * conn.length, 1, true).apply(pm.apply.scroll);
  }

  var selAfter = (0, _selection.findSelectionFrom)(pm.doc, cut, 1);
  return pm.tr.lift(selAfter.from, selAfter.to, true).apply(pm.apply.scroll);
}

// ;; #kind=command
// If the selection is empty and at the start of a textblock, move
// that block closer to the block before it, by lifting it out of its
// parent or, if it has no parent it doesn't share with the node
// before it, moving it into a parent of that node, or joining it with
// that.
//
// **Keybindings:** Backspace, Mod-Backspace
baseCommands.joinBackward = {
  label: "Join with the block above",
  run: function run(pm) {
    var _pm$selection = pm.selection;
    var head = _pm$selection.head;
    var empty = _pm$selection.empty;

    if (!empty) return false;

    var $head = pm.doc.resolve(head);
    if ($head.parentOffset > 0) return false;

    // Find the node before this one
    var before = void 0,
        cut = void 0;
    for (var i = $head.depth - 1; !before && i >= 0; i--) {
      if ($head.index(i) > 0) {
        cut = $head.before(i + 1);
        before = $head.node(i).child($head.index(i) - 1);
      }
    } // If there is no node before this, try to lift
    if (!before) return pm.tr.lift(head, head, true).apply(pm.apply.scroll);

    // If the node below has no content and the node above is
    // selectable, delete the node below and select the one above.
    if (before.type.isLeaf && before.type.selectable && $head.parent.content.size == 0) {
      var tr = pm.tr.delete(cut, cut + $head.parent.nodeSize).apply(pm.apply.scroll);
      pm.setNodeSelection(cut - before.nodeSize);
      return tr;
    }

    // If the node doesn't allow children, delete it
    if (before.type.isLeaf) return pm.tr.delete(cut - before.nodeSize, cut).apply(pm.apply.scroll);

    // Apply the joining algorithm
    return deleteBarrier(pm, cut);
  },

  keys: ["Backspace(30)", "Mod-Backspace(30)"]
};

// Get an offset moving backward from a current offset inside a node.
function moveBackward(doc, pos, by) {
  if (by != "char" && by != "word") throw new RangeError("Unknown motion unit: " + by);

  var $pos = doc.resolve(pos);
  var parent = $pos.parent,
      offset = $pos.parentOffset;

  var cat = null,
      counted = 0;
  for (;;) {
    if (offset == 0) return pos;

    var _parent$childBefore = parent.childBefore(offset);

    var start = _parent$childBefore.offset;
    var node = _parent$childBefore.node;

    if (!node) return pos;
    if (!node.isText) return cat ? pos : pos - 1;

    if (by == "char") {
      for (var i = offset - start; i > 0; i--) {
        if (!(0, _char.isExtendingChar)(node.text.charAt(i - 1))) return pos - 1;
        offset--;
        pos--;
      }
    } else if (by == "word") {
      // Work from the current position backwards through text of a singular
      // character category (e.g. "cat" of "#!*") until reaching a character in a
      // different category (i.e. the end of the word).
      for (var _i = offset - start; _i > 0; _i--) {
        var nextCharCat = (0, _char.charCategory)(node.text.charAt(_i - 1));
        if (cat == null || counted == 1 && cat == "space") cat = nextCharCat;else if (cat != nextCharCat) return pos;
        offset--;
        pos--;
        counted++;
      }
    }
  }
}

// ;; #kind=command
// Delete the character before the cursor, if the selection is empty
// and the cursor isn't at the start of a textblock.
//
// **Keybindings:** Backspace, Ctrl-H (Mac)
baseCommands.deleteCharBefore = {
  label: "Delete a character before the cursor",
  run: function run(pm) {
    if (_dom.browser.ios) return false;
    var _pm$selection2 = pm.selection;
    var head = _pm$selection2.head;
    var empty = _pm$selection2.empty;

    if (!empty || pm.doc.resolve(head).parentOffset == 0) return false;
    var dest = moveBackward(pm.doc, head, "char");
    return pm.tr.delete(dest, head).apply(pm.apply.scroll);
  },

  keys: {
    all: ["Backspace(60)"],
    mac: ["Ctrl-H(40)"]
  }
};

// ;; #kind=command
// Delete the word before the cursor, if the selection is empty and
// the cursor isn't at the start of a textblock.
//
// **Keybindings:** Mod-Backspace, Alt-Backspace (Mac)
baseCommands.deleteWordBefore = {
  label: "Delete the word before the cursor",
  run: function run(pm) {
    var _pm$selection3 = pm.selection;
    var head = _pm$selection3.head;
    var empty = _pm$selection3.empty;

    if (!empty || pm.doc.resolve(head).parentOffset == 0) return false;
    var dest = moveBackward(pm.doc, head, "word");
    return pm.tr.delete(dest, head).apply(pm.apply.scroll);
  },

  keys: {
    all: ["Mod-Backspace(40)"],
    mac: ["Alt-Backspace(40)"]
  }
};

// ;; #kind=command
// If the selection is empty and the cursor is at the end of a
// textblock, move the node after it closer to the node with the
// cursor (lifting it out of parents that aren't shared, moving it
// into parents of the cursor block, or joining the two when they are
// siblings).
//
// **Keybindings:** Delete, Mod-Delete
baseCommands.joinForward = {
  label: "Join with the block below",
  run: function run(pm) {
    var _pm$selection4 = pm.selection;
    var head = _pm$selection4.head;
    var empty = _pm$selection4.empty;var $head = void 0;
    if (!empty || ($head = pm.doc.resolve(head)).parentOffset < $head.parent.content.size) return false;

    // Find the node after this one
    var after = void 0,
        cut = void 0;
    for (var i = $head.depth - 1; !after && i >= 0; i--) {
      var parent = $head.node(i);
      if ($head.index(i) + 1 < parent.childCount) {
        after = parent.child($head.index(i) + 1);
        cut = $head.after(i + 1);
      }
    }

    // If there is no node after this, there's nothing to do
    if (!after) return false;

    // If the node doesn't allow children, delete it
    if (after.type.isLeaf) return pm.tr.delete(cut, cut + after.nodeSize).apply(pm.apply.scroll);

    // Apply the joining algorithm
    return deleteBarrier(pm, cut);
  },

  keys: ["Delete(30)", "Mod-Delete(30)"]
};

function moveForward(doc, pos, by) {
  if (by != "char" && by != "word") throw new RangeError("Unknown motion unit: " + by);

  var $pos = doc.resolve(pos);
  var parent = $pos.parent,
      offset = $pos.parentOffset;

  var cat = null,
      counted = 0;
  for (;;) {
    if (offset == parent.content.size) return pos;

    var _parent$childAfter = parent.childAfter(offset);

    var start = _parent$childAfter.offset;
    var node = _parent$childAfter.node;

    if (!node) return pos;
    if (!node.isText) return cat ? pos : pos + 1;

    if (by == "char") {
      for (var i = offset - start; i < node.text.length; i++) {
        if (!(0, _char.isExtendingChar)(node.text.charAt(i + 1))) return pos + 1;
        offset++;
        pos++;
      }
    } else if (by == "word") {
      for (var _i2 = offset - start; _i2 < node.text.length; _i2++) {
        var nextCharCat = (0, _char.charCategory)(node.text.charAt(_i2));
        if (cat == null || counted == 1 && cat == "space") cat = nextCharCat;else if (cat != nextCharCat) return pos;
        offset++;
        pos++;
        counted++;
      }
    }
  }
}

// ;; #kind=command
// Delete the character after the cursor, if the selection is empty
// and the cursor isn't at the end of its textblock.
//
// **Keybindings:** Delete, Ctrl-D (Mac)
baseCommands.deleteCharAfter = {
  label: "Delete a character after the cursor",
  run: function run(pm) {
    var _pm$selection5 = pm.selection;
    var head = _pm$selection5.head;
    var empty = _pm$selection5.empty;var $head = void 0;
    if (!empty || ($head = pm.doc.resolve(head)).parentOffset == $head.parent.content.size) return false;
    var dest = moveForward(pm.doc, head, "char");
    return pm.tr.delete(head, dest).apply(pm.apply.scroll);
  },

  keys: {
    all: ["Delete(60)"],
    mac: ["Ctrl-D(60)"]
  }
};

// ;; #kind=command
// Delete the word after the cursor, if the selection is empty and the
// cursor isn't at the end of a textblock.
//
// **Keybindings:** Mod-Delete, Ctrl-Alt-Backspace (Mac), Alt-Delete
// (Mac), Alt-D (Mac)
baseCommands.deleteWordAfter = {
  label: "Delete a word after the cursor",
  run: function run(pm) {
    var _pm$selection6 = pm.selection;
    var head = _pm$selection6.head;
    var empty = _pm$selection6.empty;var $head = void 0;
    if (!empty || ($head = pm.doc.resolve(head)).parentOffset == $head.parent.content.size) return false;
    var dest = moveForward(pm.doc, head, "word");
    return pm.tr.delete(head, dest).apply(pm.apply.scroll);
  },

  keys: {
    all: ["Mod-Delete(40)"],
    mac: ["Ctrl-Alt-Backspace(40)", "Alt-Delete(40)", "Alt-D(40)"]
  }
};

function joinPointAbove(pm) {
  var _pm$selection7 = pm.selection;
  var node = _pm$selection7.node;
  var from = _pm$selection7.from;

  if (node) return (0, _transform.joinable)(pm.doc, from) ? from : null;else return (0, _transform.joinPoint)(pm.doc, from, -1);
}

// ;; #kind=command
// Join the selected block or, if there is a text selection, the
// closest ancestor block of the selection that can be joined, with
// the sibling above it.
//
// **Keybindings:** Alt-Up
baseCommands.joinUp = {
  label: "Join with above block",
  run: function run(pm) {
    var point = joinPointAbove(pm),
        selectNode = void 0;
    if (!point) return false;
    if (pm.selection.node) selectNode = point - pm.doc.resolve(point).nodeBefore.nodeSize;
    pm.tr.join(point).apply();
    if (selectNode != null) pm.setNodeSelection(selectNode);
  },
  select: function select(pm) {
    return joinPointAbove(pm);
  },

  menu: {
    group: "block", rank: 80,
    display: {
      type: "icon",
      width: 800, height: 900,
      path: "M0 75h800v125h-800z M0 825h800v-125h-800z M250 400h100v-100h100v100h100v100h-100v100h-100v-100h-100z"
    }
  },
  keys: ["Alt-Up"]
};

function joinPointBelow(pm) {
  var _pm$selection8 = pm.selection;
  var node = _pm$selection8.node;
  var to = _pm$selection8.to;

  if (node) return (0, _transform.joinable)(pm.doc, to) ? to : null;else return (0, _transform.joinPoint)(pm.doc, to, 1);
}

// ;; #kind=command
// Join the selected block, or the closest ancestor of the selection
// that can be joined, with the sibling after it.
//
// **Keybindings:** Alt-Down
baseCommands.joinDown = {
  label: "Join with below block",
  run: function run(pm) {
    var node = pm.selection.node,
        nodeAt = pm.selection.from;
    var point = joinPointBelow(pm);
    if (!point) return false;
    pm.tr.join(point).apply();
    if (node) pm.setNodeSelection(nodeAt);
  },
  select: function select(pm) {
    return joinPointBelow(pm);
  },

  keys: ["Alt-Down"]
};

// ;; #kind=command
// Lift the selected block, or the closest ancestor block of the
// selection that can be lifted, out of its parent node.
//
// **Keybindings:** Ctrl-[
baseCommands.lift = {
  label: "Lift out of enclosing block",
  run: function run(pm) {
    var _pm$selection9 = pm.selection;
    var from = _pm$selection9.from;
    var to = _pm$selection9.to;

    return pm.tr.lift(from, to, true).apply(pm.apply.scroll);
  },
  select: function select(pm) {
    var _pm$selection10 = pm.selection;
    var from = _pm$selection10.from;
    var to = _pm$selection10.to;

    return (0, _transform.canLift)(pm.doc, from, to);
  },

  menu: {
    group: "block", rank: 75,
    display: {
      type: "icon",
      width: 1024, height: 1024,
      path: "M219 310v329q0 7-5 12t-12 5q-8 0-13-5l-164-164q-5-5-5-13t5-13l164-164q5-5 13-5 7 0 12 5t5 12zM1024 749v109q0 7-5 12t-12 5h-987q-7 0-12-5t-5-12v-109q0-7 5-12t12-5h987q7 0 12 5t5 12zM1024 530v109q0 7-5 12t-12 5h-621q-7 0-12-5t-5-12v-109q0-7 5-12t12-5h621q7 0 12 5t5 12zM1024 310v109q0 7-5 12t-12 5h-621q-7 0-12-5t-5-12v-109q0-7 5-12t12-5h621q7 0 12 5t5 12zM1024 91v109q0 7-5 12t-12 5h-987q-7 0-12-5t-5-12v-109q0-7 5-12t12-5h987q7 0 12 5t5 12z"
    }
  },
  keys: ["Mod-["]
};

// ;; #kind=command
// If the selection is in a node whose type has a truthy `isCode`
// property, replace the selection with a newline character.
//
// **Keybindings:** Enter
baseCommands.newlineInCode = {
  label: "Insert newline",
  run: function run(pm) {
    var _pm$selection11 = pm.selection;
    var from = _pm$selection11.from;
    var to = _pm$selection11.to;
    var node = _pm$selection11.node;

    if (node) return false;
    var $from = pm.doc.resolve(from);
    if (!$from.parent.type.isCode || to >= $from.end()) return false;
    return pm.tr.typeText("\n").apply(pm.apply.scroll);
  },

  keys: ["Enter(10)"]
};

// ;; #kind=command
// If a block node is selected, create an empty paragraph before (if
// it is its parent's first child) or after it.
//
// **Keybindings:** Enter
baseCommands.createParagraphNear = {
  label: "Create a paragraph near the selected block",
  run: function run(pm) {
    var _pm$selection12 = pm.selection;
    var from = _pm$selection12.from;
    var to = _pm$selection12.to;
    var node = _pm$selection12.node;

    if (!node || !node.isBlock) return false;
    var $from = pm.doc.resolve(from),
        side = $from.parentOffset ? to : from;
    var type = $from.parent.defaultContentType($from.indexAfter());
    pm.tr.insert(side, type.create()).apply(pm.apply.scroll);
    pm.setTextSelection(side + 1);
  },

  keys: ["Enter(20)"]
};

// ;; #kind=command
// If the cursor is in an empty textblock that can be lifted, lift the
// block.
//
// **Keybindings:** Enter
baseCommands.liftEmptyBlock = {
  label: "Move current block up",
  run: function run(pm) {
    var _pm$selection13 = pm.selection;
    var head = _pm$selection13.head;
    var empty = _pm$selection13.empty;var $head = void 0;
    if (!empty || ($head = pm.doc.resolve(head)).parent.content.size) return false;
    if ($head.depth > 1 && $head.after() != $head.end(-1)) {
      var before = $head.before();
      if ((0, _transform.canSplit)(pm.doc, before)) return pm.tr.split(before).apply(pm.apply.scroll);
    }
    return pm.tr.lift(head, head, true).apply(pm.apply.scroll);
  },

  keys: ["Enter(30)"]
};

// ;; #kind=command
// Split the parent block of the selection. If the selection is a text
// selection, delete it.
//
// **Keybindings:** Enter
baseCommands.splitBlock = {
  label: "Split the current block",
  run: function run(pm) {
    var _pm$selection14 = pm.selection;
    var from = _pm$selection14.from;
    var to = _pm$selection14.to;
    var node = _pm$selection14.node;var $from = pm.doc.resolve(from);
    if (node && node.isBlock) {
      if (!$from.parentOffset || !(0, _transform.canSplit)(pm.doc, from)) return false;
      return pm.tr.split(from).apply(pm.apply.scroll);
    } else {
      var $to = pm.doc.resolve(to),
          atEnd = $to.parentOffset == $to.parent.content.size;
      var tr = pm.tr.delete(from, to);
      var deflt = $from.node(-1).defaultContentType($from.indexAfter(-1)),
          type = atEnd ? deflt : null;
      if ((0, _transform.canSplit)(tr.doc, from, 1, type)) {
        tr.split(from, 1, type);
        if (!atEnd && !$from.parentOffset && $from.parent.type != deflt) tr.setNodeType($from.before(), deflt);
      }
      return tr.apply(pm.apply.scroll);
    }
  },

  keys: ["Enter(60)"]
};

function nodeAboveSelection(pm) {
  var sel = pm.selection;
  if (sel.node) {
    var $from = pm.doc.resolve(sel.from);
    return !!$from.depth && $from.before();
  }
  var $head = pm.doc.resolve(sel.head);
  var same = $head.sameDepth(pm.doc.resolve(sel.anchor));
  return same == 0 ? false : $head.before(same);
}

// ;; #kind=command
// Move the selection to the node wrapping the current selection, if
// any. (Will not select the document node.)
//
// **Keybindings:** Esc
baseCommands.selectParentNode = {
  label: "Select parent node",
  run: function run(pm) {
    var node = nodeAboveSelection(pm);
    if (node === false) return false;
    pm.setNodeSelection(node);
  },
  select: function select(pm) {
    return nodeAboveSelection(pm);
  },

  menu: {
    group: "block", rank: 90,
    display: { type: "icon", text: "⬚", style: "font-weight: bold" }
  },
  keys: ["Esc"]
};

// ;; #kind=command
// Undo the most recent change event, if any.
//
// **Keybindings:** Mod-Z
baseCommands.undo = {
  label: "Undo last change",
  run: function run(pm) {
    pm.scrollIntoView();return pm.history.undo();
  },
  select: function select(pm) {
    return pm.history.undoDepth > 0;
  },

  menu: {
    group: "history", rank: 10,
    display: {
      type: "icon",
      width: 1024, height: 1024,
      path: "M761 1024c113-206 132-520-313-509v253l-384-384 384-384v248c534-13 594 472 313 775z"
    }
  },
  keys: ["Mod-Z"]
};

// ;; #kind=command
// Redo the most recently undone change event, if any.
//
// **Keybindings:** Mod-Y, Shift-Mod-Z
baseCommands.redo = {
  label: "Redo last undone change",
  run: function run(pm) {
    pm.scrollIntoView();return pm.history.redo();
  },
  select: function select(pm) {
    return pm.history.redoDepth > 0;
  },

  menu: {
    group: "history", rank: 20,
    display: {
      type: "icon",
      width: 1024, height: 1024,
      path: "M576 248v-248l384 384-384 384v-253c-446-10-427 303-313 509-280-303-221-789 313-775z"
    }
  },
  keys: ["Mod-Y", "Shift-Mod-Z"]
};
},{"../dom":1,"../model":26,"../transform":33,"./char":4,"./selection":18}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.captureKeys = undefined;

var _browserkeymap = require("browserkeymap");

var _browserkeymap2 = _interopRequireDefault(_browserkeymap);

var _selection = require("./selection");

var _dom = require("../dom");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function nothing() {}

function moveSelectionBlock(pm, dir) {
  var _pm$selection = pm.selection;
  var from = _pm$selection.from;
  var to = _pm$selection.to;
  var node = _pm$selection.node;

  var side = pm.doc.resolve(dir > 0 ? to : from);
  return (0, _selection.findSelectionFrom)(pm.doc, node && node.isBlock ? side.pos : dir > 0 ? side.after(side.depth) : side.before(side.depth), dir);
}

function selectNodeHorizontally(pm, dir) {
  var _pm$selection2 = pm.selection;
  var empty = _pm$selection2.empty;
  var node = _pm$selection2.node;
  var from = _pm$selection2.from;
  var to = _pm$selection2.to;

  if (!empty && !node) return false;

  if (node && node.isInline) {
    pm.setTextSelection(dir > 0 ? to : from);
    return true;
  }

  if (!node) {
    var $from = pm.doc.resolve(from);

    var _ref = dir > 0 ? $from.parent.childAfter($from.parentOffset) : $from.parent.childBefore($from.parentOffset);

    var nextNode = _ref.node;
    var offset = _ref.offset;

    if (nextNode) {
      if (nextNode.type.selectable && offset == $from.parentOffset - (dir > 0 ? 0 : nextNode.nodeSize)) {
        pm.setNodeSelection(dir < 0 ? from - nextNode.nodeSize : from);
        return true;
      }
      return false;
    }
  }

  var next = moveSelectionBlock(pm, dir);
  if (next && (next instanceof _selection.NodeSelection || node)) {
    pm.setSelection(next);
    return true;
  }
  return false;
}

function horiz(dir) {
  return function (pm) {
    var done = selectNodeHorizontally(pm, dir);
    if (done) pm.scrollIntoView();
    return done;
  };
}

// : (ProseMirror, number)
// Check whether vertical selection motion would involve node
// selections. If so, apply it (if not, the result is left to the
// browser)
function selectNodeVertically(pm, dir) {
  var _pm$selection3 = pm.selection;
  var empty = _pm$selection3.empty;
  var node = _pm$selection3.node;
  var from = _pm$selection3.from;
  var to = _pm$selection3.to;

  if (!empty && !node) return false;

  var leavingTextblock = true;
  if (!node || node.isInline) {
    pm.flush(); // verticalMotionLeavesTextblock needs an up-to-date DOM
    leavingTextblock = (0, _selection.verticalMotionLeavesTextblock)(pm, dir > 0 ? to : from, dir);
  }

  if (leavingTextblock) {
    var next = moveSelectionBlock(pm, dir);
    if (next && next instanceof _selection.NodeSelection) {
      pm.setSelection(next);
      return true;
    }
  }

  if (!node || node.isInline) return false;

  var beyond = (0, _selection.findSelectionFrom)(pm.doc, dir < 0 ? from : to, dir);
  if (beyond) pm.setSelection(beyond);
  return true;
}

function vert(dir) {
  return function (pm) {
    var done = selectNodeVertically(pm, dir);
    if (done !== false) pm.scrollIntoView();
    return done;
  };
}

// A backdrop keymap used to make sure we always suppress keys that
// have a dangerous default effect, even if the commands they are
// bound to return false, and to make sure that cursor-motion keys
// find a cursor (as opposed to a node selection) when pressed. For
// cursor-motion keys, the code in the handlers also takes care of
// block selections.

var keys = {
  "Esc": nothing,
  "Enter": nothing,
  "Ctrl-Enter": nothing,
  "Mod-Enter": nothing,
  "Shift-Enter": nothing,
  "Backspace": _dom.browser.ios ? undefined : nothing,
  "Delete": nothing,
  "Mod-B": nothing,
  "Mod-I": nothing,
  "Mod-Backspace": nothing,
  "Mod-Delete": nothing,
  "Shift-Backspace": nothing,
  "Shift-Delete": nothing,
  "Shift-Mod-Backspace": nothing,
  "Shift-Mod-Delete": nothing,
  "Mod-Z": nothing,
  "Mod-Y": nothing,
  "Shift-Mod-Z": nothing,
  "Ctrl-D": nothing,
  "Ctrl-H": nothing,
  "Ctrl-Alt-Backspace": nothing,
  "Alt-D": nothing,
  "Alt-Delete": nothing,
  "Alt-Backspace": nothing,

  "Left": horiz(-1),
  "Mod-Left": horiz(-1),
  "Right": horiz(1),
  "Mod-Right": horiz(1),
  "Up": vert(-1),
  "Down": vert(1)
};

if (_dom.browser.mac) {
  keys["Alt-Left"] = horiz(-1);
  keys["Alt-Right"] = horiz(1);
  keys["Ctrl-Backspace"] = keys["Ctrl-Delete"] = nothing;
}

var captureKeys = exports.captureKeys = new _browserkeymap2.default(keys);
},{"../dom":1,"./selection":18,"browserkeymap":50}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isWordChar = isWordChar;
exports.charCategory = charCategory;
exports.isExtendingChar = isExtendingChar;
var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;

// Extending unicode characters. A series of a non-extending char +
// any number of extending chars is treated as a single unit as far
// as editing and measuring is concerned. This is not fully correct,
// since some scripts/fonts/browsers also treat other configurations
// of code points as a group.
var extendingChar = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;

function isWordChar(ch) {
  return (/\w/.test(ch) || isExtendingChar(ch) || ch > "\x80" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
  );
}

// Get the category of a given character. Either a "space",
// a character that can be part of a word ("word"), or anything else ("other").
function charCategory(ch) {
  return (/\s/.test(ch) ? "space" : isWordChar(ch) ? "word" : "other"
  );
}

function isExtendingChar(ch) {
  return ch.charCodeAt(0) >= 768 && extendingChar.test(ch);
}
},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CommandSet = exports.Command = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.updateCommands = updateCommands;
exports.selectedNodeAttr = selectedNodeAttr;

var _browserkeymap = require("browserkeymap");

var _browserkeymap2 = _interopRequireDefault(_browserkeymap);

var _model = require("../model");

var _transform = require("../transform");

var _dom = require("../dom");

var _sortedinsert = require("../util/sortedinsert");

var _sortedinsert2 = _interopRequireDefault(_sortedinsert);

var _obj = require("../util/obj");

var _base_commands = require("./base_commands");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; A command is a named piece of functionality that can be bound to
// a key, shown in the menu, or otherwise exposed to the user.
//
// The commands available in a given editor are determined by the
// `commands` option. By default, they come from the `baseCommands`
// object and the commands [registered](#SchemaItem.register) with
// schema items. Registering a `CommandSpec` on a [node](#NodeType) or
// [mark](#MarkType) type will cause that command to come into scope
// in editors whose schema includes that item.

var Command = exports.Command = function () {
  function Command(spec, self, name) {
    _classCallCheck(this, Command);

    // :: string The name of the command.
    this.name = name;
    if (!this.name) throw new RangeError("Trying to define a command without a name");
    // :: CommandSpec The command's specifying object.
    this.spec = spec;
    this.self = self;
  }

  // :: (ProseMirror, ?[any]) → ?bool
  // Execute this command. If the command takes
  // [parameters](#Command.params), they can be passed as second
  // argument here, or otherwise the user will be prompted for them
  // using the value of the `commandParamPrompt` option.
  //
  // Returns the value returned by the command spec's [`run`
  // method](#CommandSpec.run), or a `ParamPrompt` instance if the
  // command is ran asynchronously through a prompt.


  _createClass(Command, [{
    key: "exec",
    value: function exec(pm, params) {
      var run = this.spec.run;
      if (!params) {
        if (!this.params.length) return run.call(this.self, pm);
        return new pm.options.commandParamPrompt(pm, this).open();
      } else {
        if (this.params.length != (params ? params.length : 0)) throw new RangeError("Invalid amount of parameters for command " + this.name);
        return run.call.apply(run, [this.self, pm].concat(_toConsumableArray(params)));
      }
    }

    // :: (ProseMirror) → bool
    // Ask this command whether it is currently relevant, given the
    // editor's document and selection. If the command does not define a
    // [`select`](#CommandSpec.select) method, this always returns true.

  }, {
    key: "select",
    value: function select(pm) {
      var f = this.spec.select;
      return f ? f.call(this.self, pm) : true;
    }

    // :: (ProseMirror) → bool
    // Ask this command whether it is “active”. This is mostly used to
    // style inline mark icons (such as strong) differently when the
    // selection contains such marks.

  }, {
    key: "active",
    value: function active(pm) {
      var f = this.spec.active;
      return f ? f.call(this.self, pm) : false;
    }

    // :: [CommandParam]
    // Get the list of parameters that this command expects.

  }, {
    key: "params",
    get: function get() {
      return this.spec.params || empty;
    }

    // :: string
    // Get the label for this command.

  }, {
    key: "label",
    get: function get() {
      return this.spec.label || this.name;
    }
  }]);

  return Command;
}();

var empty = [];

function deriveCommandSpec(type, spec, name) {
  if (!spec.derive) return spec;
  var conf = _typeof(spec.derive) == "object" ? spec.derive : {};
  var dname = conf.name || name;
  var derive = type.constructor.derivableCommands[dname];
  if (!derive) throw new RangeError("Don't know how to derive command " + dname);
  var derived = derive.call(type, conf);
  for (var prop in spec) {
    if (prop != "derive") derived[prop] = spec[prop];
  }return derived;
}

// ;; The type used as the value of the `commands` option. Allows you
// to specify the set of commands that are available in the editor by
// adding and modifying command specs.

var CommandSet = function () {
  function CommandSet(base, op) {
    _classCallCheck(this, CommandSet);

    this.base = base;
    this.op = op;
  }

  // :: (union<Object<CommandSpec>, "schema">, ?(string, CommandSpec) → bool) → CommandSet
  // Add a set of commands, creating a new command set. If `set` is
  // the string `"schema"`, the commands are retrieved from the
  // editor's schema's [registry](#Schema.registry), otherwise, it
  // should be an object mapping command names to command specs.
  //
  // A filter function can be given to add only the commands for which
  // the filter returns true.


  _createClass(CommandSet, [{
    key: "add",
    value: function add(set, filter) {
      return new CommandSet(this, function (commands, schema) {
        function add(name, spec, self) {
          if (!filter || filter(name, spec)) {
            if (commands[name]) throw new RangeError("Duplicate definition of command " + name);
            commands[name] = new Command(spec, self, name);
          }
        }

        if (set === "schema") {
          schema.registry("command", function (name, spec, type, typeName) {
            add(typeName + ":" + name, deriveCommandSpec(type, spec, name), type);
          });
        } else {
          for (var name in set) {
            add(name, set[name]);
          }
        }
      });
    }

    // :: (Object<?CommandSpec>) → CommandSet
    // Create a new command set by adding, modifying, or deleting
    // commands. The `update` object can map a command name to `null` to
    // delete it, to a full `CommandSpec` (containing a `run` property)
    // to add it, or to a partial `CommandSpec` (without a `run`
    // property) to update some properties in the command by that name.

  }, {
    key: "update",
    value: function update(_update) {
      return new CommandSet(this, function (commands) {
        for (var name in _update) {
          var spec = _update[name];
          if (!spec) {
            delete commands[name];
          } else if (spec.run) {
            commands[name] = new Command(spec, null, name);
          } else {
            var known = commands[name];
            if (known) commands[name] = new Command((0, _obj.copyObj)(spec, (0, _obj.copyObj)(known.spec)), known.self, name);
          }
        }
      });
    }
  }, {
    key: "derive",
    value: function derive(schema) {
      var commands = this.base ? this.base.derive(schema) : Object.create(null);
      this.op(commands, schema);
      return commands;
    }
  }]);

  return CommandSet;
}();

// :: CommandSet
// A set without any commands.


exports.CommandSet = CommandSet;
CommandSet.empty = new CommandSet(null, function () {
  return null;
});

// :: CommandSet
// The default value of the `commands` option. Includes the [base
// commands](#baseCommands) and the commands defined by the schema.
CommandSet.default = CommandSet.empty.add("schema").add(_base_commands.baseCommands);

// ;; #path=CommandSpec #kind=interface
// Commands are defined using objects that specify various aspects of
// the command. The only property that _must_ appear in a command spec
// is [`run`](#CommandSpec.run). You should probably also give your
// commands a `label`.

// :: string #path=CommandSpec.label
// A user-facing label for the command. This will be used, among other
// things. as the tooltip title for the command's menu item. If there
// is no `label`, the command's `name` will be used instead.

// :: (pm: ProseMirror, ...params: [any]) → ?bool #path=CommandSpec.run
// The function that executes the command. If the command has
// [parameters](#CommandSpec.params), their values are passed as
// arguments. For commands [registered](#SchemaItem.register) on node or
// mark types, `this` will be bound to the node or mark type when this
// function is ran. Should return `false` when the command could not
// be executed.

// :: [CommandParam] #path=CommandSpec.params
// The parameters that this command expects.

// :: (pm: ProseMirror) → bool #path=CommandSpec.select
// The function used to [select](#Command.select) the command. `this`
// will again be bound to a node or mark type, when available.

// :: (pm: ProseMirror) → bool #path=CommandSpec.active
// The function used to determine whether the command is
// [active](#Command.active). `this` refers to the associated node or
// mark type.

// :: union<Object<[string]>, [string]> #path=CommandSpec.keys
// The default key bindings for this command. May either be an array
// of strings containing [key
// names](https://github.com/marijnh/browserkeymap#a-string-notation-for-key-events),
// or an object with optional `all`, `mac`, and `pc` properties,
// specifying arrays of keys for different platforms.

// :: union<bool, Object> #path=CommandSpec.derive
// [Mark](#MarkType) and [node](#NodeType) types often need to define
// boilerplate commands. To reduce the amount of duplicated code, you
// can derive such commands by setting the `derive` property to either
// `true` or an object which is passed to the deriving function. If
// this object has a `name` property, that is used, instead of the
// command name, to pick a deriving function.
//
// For node types, you can derive `"insert"`, `"make"`, and `"wrap"`.
//
// For mark types, you can derive `"set"`, `"unset"`, and `"toggle"`.

// ;; #path=CommandParam #kind=interface
// The parameters that a command can take are specified using objects
// with the following properties:

// :: string #path=CommandParam.label
// The user-facing name of the parameter. Shown to the user when
// prompting for this parameter.

// :: string #path=CommandParam.type
// The type of the parameter. Supported types are `"text"` and `"select"`.

// :: any #path=CommandParam.default
// A default value for the parameter.

// :: (ProseMirror) → ?any #path=CommandParam.prefill
// A function that, given an editor instance (and a `this` bound to
// the command's source item), tries to derive an initial value for
// the parameter, or return null if it can't.

// :: (any) → ?string #path=CommandParam.validate
// An optional function that is called to validate values provided for
// this parameter. Should return a falsy value when the value is
// valid, and an error message when it is not.

function deriveKeymap(pm) {
  var bindings = {},
      platform = _dom.browser.mac ? "mac" : "pc";
  function add(command, keys) {
    for (var i = 0; i < keys.length; i++) {
      var _$exec = /^(.+?)(?:\((\d+)\))?$/.exec(keys[i]);

      var _$exec2 = _slicedToArray(_$exec, 3);

      var _ = _$exec2[0];
      var name = _$exec2[1];
      var _$exec2$ = _$exec2[2];
      var rank = _$exec2$ === undefined ? 50 : _$exec2$;

      (0, _sortedinsert2.default)(bindings[name] || (bindings[name] = []), { command: command, rank: rank }, function (a, b) {
        return a.rank - b.rank;
      });
    }
  }
  for (var name in pm.commands) {
    var cmd = pm.commands[name],
        keys = cmd.spec.keys;
    if (!keys) continue;
    if (Array.isArray(keys)) {
      add(cmd, keys);
    } else {
      if (keys.all) add(cmd, keys.all);
      if (keys[platform]) add(cmd, keys[platform]);
    }
  }

  for (var key in bindings) {
    bindings[key] = bindings[key].map(function (b) {
      return b.command.name;
    });
  }return new _browserkeymap2.default(bindings);
}

function updateCommands(pm, set) {
  // :: () #path=ProseMirror#events#commandsChanging
  // Fired before the set of commands for the editor is updated.
  pm.signal("commandsChanging");
  pm.commands = set.derive(pm.schema);
  pm.input.baseKeymap = deriveKeymap(pm);
  pm.commandKeys = Object.create(null);
  // :: () #path=ProseMirror#events#commandsChanged
  // Fired when the set of commands for the editor is updated.
  pm.signal("commandsChanged");
}

function markActive(pm, type) {
  var sel = pm.selection;
  if (sel.empty) return type.isInSet(pm.activeMarks());else return pm.doc.rangeHasMark(sel.from, sel.to, type);
}

function canAddMark(pm, type) {
  var _pm$selection = pm.selection;
  var from = _pm$selection.from;
  var to = _pm$selection.to;
  var empty = _pm$selection.empty;var $from = void 0;
  if (empty) return !type.isInSet(pm.activeMarks()) && ($from = pm.doc.resolve(from)) && $from.parent.contentMatchAt($from.index()).allowsMark(type);
  var can = false;
  pm.doc.nodesBetween(from, to, function (node, _, parent, i) {
    if (can) return false;
    can = node.isInline && !type.isInSet(node.marks) && parent.contentMatchAt(i + 1).allowsMark(type);
  });
  return can;
}

function markApplies(pm, type) {
  var _pm$selection2 = pm.selection;
  var from = _pm$selection2.from;
  var to = _pm$selection2.to;

  var relevant = false;
  pm.doc.nodesBetween(from, to, function (node, _, parent, i) {
    if (relevant) return false;
    relevant = node.isTextblock && node.contentMatchAt(0).allowsMark(type) || node.isInline && parent.contentMatchAt(i + 1).allowsMark(type);
  });
  return relevant;
}

function selectedMarkAttr(pm, type, attr) {
  var _pm$selection3 = pm.selection;
  var from = _pm$selection3.from;
  var to = _pm$selection3.to;
  var empty = _pm$selection3.empty;

  var start = void 0,
      end = void 0;
  if (empty) {
    start = end = type.isInSet(pm.activeMarks());
  } else {
    var startChunk = pm.doc.resolve(from).nodeAfter;
    start = startChunk ? type.isInSet(startChunk.marks) : null;
    end = type.isInSet(pm.doc.marksAt(to));
  }
  if (start && end && start.attrs[attr] == end.attrs[attr]) return start.attrs[attr];
}

function selectedNodeAttr(pm, type, name) {
  var node = pm.selection.node;

  if (node && node.type == type) return node.attrs[name];
}

function deriveParams(type, params) {
  return params && params.map(function (param) {
    var attr = type.attrs[param.attr];
    var obj = { type: "text",
      default: attr.default,
      prefill: type instanceof _model.NodeType ? function (pm) {
        return selectedNodeAttr(pm, this, param.attr);
      } : function (pm) {
        return selectedMarkAttr(pm, this, param.attr);
      } };
    for (var prop in param) {
      obj[prop] = param[prop];
    }return obj;
  });
}

function fillAttrs(conf, givenParams) {
  var attrs = conf.attrs;
  if (conf.params) {
    (function () {
      var filled = Object.create(null);
      if (attrs) for (var name in attrs) {
        filled[name] = attrs[name];
      }conf.params.forEach(function (param, i) {
        return filled[param.attr] = givenParams[i];
      });
      attrs = filled;
    })();
  }
  return attrs;
}

_model.NodeType.derivableCommands = Object.create(null);
_model.MarkType.derivableCommands = Object.create(null);

_model.MarkType.derivableCommands.set = function (conf) {
  return {
    run: function run(pm) {
      for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        params[_key - 1] = arguments[_key];
      }

      pm.setMark(this, true, fillAttrs(conf, params));
    },
    select: function select(pm) {
      return conf.inverseSelect ? markApplies(pm, this) && !markActive(pm, this) : canAddMark(pm, this);
    },

    params: deriveParams(this, conf.params)
  };
};

_model.MarkType.derivableCommands.unset = function () {
  return {
    run: function run(pm) {
      pm.setMark(this, false);
    },
    select: function select(pm) {
      return markActive(pm, this);
    }
  };
};

_model.MarkType.derivableCommands.toggle = function () {
  return {
    run: function run(pm) {
      pm.setMark(this, null);
    },
    active: function active(pm) {
      return markActive(pm, this);
    },
    select: function select(pm) {
      return markApplies(pm, this);
    }
  };
};

function isAtTopOfListItem(doc, from, to, listType) {
  var $from = doc.resolve(from);
  return $from.sameParent(doc.resolve(to)) && $from.depth >= 2 && $from.index(-1) == 0 && $from.node(-2).type.compatibleContent(listType);
}

_model.NodeType.derivableCommands.wrap = function (conf) {
  return {
    run: function run(pm) {
      var _pm$selection4 = pm.selection;
      var from = _pm$selection4.from;
      var to = _pm$selection4.to;
      var head = _pm$selection4.head;var doJoin = false;
      var $from = pm.doc.resolve(from);
      if (conf.list && head && isAtTopOfListItem(pm.doc, from, to, this)) {
        // Don't do anything if this is the top of the list
        if ($from.index(-2) == 0) return false;
        doJoin = true;
      }

      for (var _len2 = arguments.length, params = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        params[_key2 - 1] = arguments[_key2];
      }

      var tr = pm.tr.wrap(from, to, this, fillAttrs(conf, params));
      if (doJoin) tr.join($from.before(-1));
      return tr.apply(pm.apply.scroll);
    },
    select: function select(pm) {
      var _pm$selection5 = pm.selection;
      var from = _pm$selection5.from;
      var to = _pm$selection5.to;
      var head = _pm$selection5.head;

      if (conf.list && head != null && isAtTopOfListItem(pm.doc, from, to, this) && pm.doc.resolve(from).index(-2) == 0) return false;
      return (0, _transform.canWrap)(pm.doc, from, to, this);
    },

    params: deriveParams(this, conf.params)
  };
};

function alreadyHasBlockType(doc, from, to, type, attrs) {
  var found = false;
  if (!attrs) attrs = {};
  doc.nodesBetween(from, to || from, function (node) {
    if (node.isTextblock) {
      if (node.hasMarkup(type, attrs)) found = true;
      return false;
    }
  });
  return found;
}

function activeTextblockIs(pm, type, attrs) {
  var _pm$selection6 = pm.selection;
  var from = _pm$selection6.from;
  var to = _pm$selection6.to;
  var node = _pm$selection6.node;

  if (!node || node.isInline) {
    var $from = pm.doc.resolve(from);
    if (!$from.sameParent(pm.doc.resolve(to))) return false;
    node = $from.parent;
  } else if (!node.isTextblock) {
    return false;
  }
  return node.hasMarkup(type, attrs);
}

_model.NodeType.derivableCommands.make = function (conf) {
  return {
    run: function run(pm) {
      var _pm$selection7 = pm.selection;
      var from = _pm$selection7.from;
      var to = _pm$selection7.to;

      return pm.tr.setBlockType(from, to, this, conf.attrs).apply(pm.apply.scroll);
    },
    select: function select(pm) {
      var _pm$selection8 = pm.selection;
      var from = _pm$selection8.from;
      var to = _pm$selection8.to;
      var node = _pm$selection8.node;var depth = void 0;
      if (node) {
        if (!node.isTextblock || node.hasMarkup(this, conf.attrs)) return false;
        depth = 0;
      } else {
        if (alreadyHasBlockType(pm.doc, from, to, this, conf.attrs)) return false;
        depth = 1;
      }
      var $from = pm.doc.resolve(from),
          parentDepth = $from.depth - depth,
          index = $from.index(parentDepth);
      return $from.node(parentDepth).canReplaceWith(index, index + 1, this, conf.attrs);
    },
    active: function active(pm) {
      return activeTextblockIs(pm, this, conf.attrs);
    }
  };
};

_model.NodeType.derivableCommands.insert = function (conf) {
  return {
    run: function run(pm) {
      for (var _len3 = arguments.length, params = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        params[_key3 - 1] = arguments[_key3];
      }

      return pm.tr.replaceSelection(this.create(fillAttrs(conf, params))).apply(pm.apply.scroll);
    },

    select: this.isInline ? function (pm) {
      var $from = pm.doc.resolve(pm.selection.from),
          index = $from.index();
      return $from.parent.canReplaceWith(index, index, this);
    } : null,
    params: deriveParams(this, conf.params)
  };
};
},{"../dom":1,"../model":26,"../transform":33,"../util/obj":47,"../util/sortedinsert":49,"./base_commands":2,"browserkeymap":50}],6:[function(require,module,exports){
"use strict";

var _dom = require("../dom");

(0, _dom.insertCSS)("\n\n.ProseMirror {\n  border: 1px solid silver;\n  position: relative;\n}\n\n.ProseMirror-content {\n  padding: 4px 8px 4px 14px;\n  white-space: pre-wrap;\n  line-height: 1.2;\n}\n\n.ProseMirror-drop-target {\n  position: absolute;\n  width: 1px;\n  background: #666;\n  pointer-events: none;\n}\n\n.ProseMirror-content ul.tight p, .ProseMirror-content ol.tight p {\n  margin: 0;\n}\n\n.ProseMirror-content ul, .ProseMirror-content ol {\n  padding-left: 30px;\n  cursor: default;\n}\n\n.ProseMirror-content blockquote {\n  padding-left: 1em;\n  border-left: 3px solid #eee;\n  margin-left: 0; margin-right: 0;\n}\n\n.ProseMirror-content pre {\n  white-space: pre-wrap;\n}\n\n.ProseMirror-selectednode {\n  outline: 2px solid #8cf;\n}\n\n.ProseMirror-nodeselection *::selection { background: transparent; }\n.ProseMirror-nodeselection *::-moz-selection { background: transparent; }\n\n.ProseMirror-content p:first-child,\n.ProseMirror-content h1:first-child,\n.ProseMirror-content h2:first-child,\n.ProseMirror-content h3:first-child,\n.ProseMirror-content h4:first-child,\n.ProseMirror-content h5:first-child,\n.ProseMirror-content h6:first-child {\n  margin-top: .3em;\n}\n\n/* Add space around the hr to make clicking it easier */\n\n.ProseMirror-content hr {\n  position: relative;\n  height: 6px;\n  border: none;\n}\n\n.ProseMirror-content hr:after {\n  content: \"\";\n  position: absolute;\n  left: 10px;\n  right: 10px;\n  top: 2px;\n  border-top: 2px solid silver;\n}\n\n.ProseMirror-content img {\n  cursor: default;\n}\n\n/* Make sure li selections wrap around markers */\n\n.ProseMirror-content li {\n  position: relative;\n  pointer-events: none; /* Don't do weird stuff with marker clicks */\n}\n.ProseMirror-content li > * {\n  pointer-events: auto;\n}\n\nli.ProseMirror-selectednode {\n  outline: none;\n}\n\nli.ProseMirror-selectednode:after {\n  content: \"\";\n  position: absolute;\n  left: -32px;\n  right: -2px; top: -2px; bottom: -2px;\n  border: 2px solid #8cf;\n  pointer-events: none;\n}\n\n");
},{"../dom":1}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readInputChange = readInputChange;
exports.readCompositionChange = readCompositionChange;

var _model = require("../model");

var _htmlformat = require("../htmlformat");

var _map = require("../transform/map");

var _selection = require("./selection");

var _dompos = require("./dompos");

function readInputChange(pm) {
  pm.ensureOperation({ readSelection: false });
  return readDOMChange(pm, rangeAroundSelection(pm));
}

function readCompositionChange(pm, margin) {
  return readDOMChange(pm, rangeAroundComposition(pm, margin));
}

// Note that all referencing and parsing is done with the
// start-of-operation selection and document, since that's the one
// that the DOM represents. If any changes came in in the meantime,
// the modification is mapped over those before it is applied, in
// readDOMChange.

function parseBetween(pm, from, to) {
  var _DOMFromPos = (0, _dompos.DOMFromPos)(pm, from, true);

  var parent = _DOMFromPos.node;
  var startOff = _DOMFromPos.offset;

  var endOff = (0, _dompos.DOMFromPos)(pm, to, true).offset;
  while (startOff) {
    var prev = parent.childNodes[startOff - 1];
    if (prev.nodeType != 1 || !prev.hasAttribute("pm-offset")) --startOff;else break;
  }
  while (endOff < parent.childNodes.length) {
    var next = parent.childNodes[endOff];
    if (next.nodeType != 1 || !next.hasAttribute("pm-offset")) ++endOff;else break;
  }
  return (0, _htmlformat.fromDOM)(pm.schema, parent, {
    topNode: pm.doc.resolve(from).parent.copy(),
    from: startOff,
    to: endOff,
    preserveWhitespace: true,
    editableContent: true
  });
}

function isAtEnd($pos, depth) {
  for (var i = depth || 0; i < $pos.depth; i++) {
    if ($pos.index(i) + 1 < $pos.node(i).childCount) return false;
  }return $pos.parentOffset == $pos.parent.content.size;
}
function isAtStart($pos, depth) {
  for (var i = depth || 0; i < $pos.depth; i++) {
    if ($pos.index(0) > 0) return false;
  }return $pos.parentOffset == 0;
}

function rangeAroundSelection(pm) {
  var _pm$operation = pm.operation;
  var sel = _pm$operation.sel;
  var doc = _pm$operation.doc;var $from = doc.resolve(sel.from);var $to = doc.resolve(sel.to);
  // When the selection is entirely inside a text block, use
  // rangeAroundComposition to get a narrow range.
  if ($from.sameParent($to) && $from.parent.isTextblock && $from.parentOffset && $to.parentOffset < $to.parent.content.size) return rangeAroundComposition(pm, 0);

  for (var depth = 0;; depth++) {
    var fromStart = isAtStart($from, depth + 1),
        toEnd = isAtEnd($to, depth + 1);
    if (fromStart || toEnd || $from.index(depth) != $to.index(depth) || $to.node(depth).isTextblock) {
      var from = $from.before(depth + 1),
          to = $to.after(depth + 1);
      if (fromStart && $from.index(depth) > 0) from -= $from.node(depth).child($from.index(depth) - 1).nodeSize;
      if (toEnd && $to.index(depth) + 1 < $to.node(depth).childCount) to += $to.node(depth).child($to.index(depth) + 1).nodeSize;
      return { from: from, to: to };
    }
  }
}

function rangeAroundComposition(pm, margin) {
  var _pm$operation2 = pm.operation;
  var sel = _pm$operation2.sel;
  var doc = _pm$operation2.doc;

  var $from = doc.resolve(sel.from),
      $to = doc.resolve(sel.to);
  if (!$from.sameParent($to)) return rangeAroundSelection(pm);
  var startOff = Math.max(0, $from.parentOffset - margin);
  var size = $from.parent.content.size;
  var endOff = Math.min(size, $to.parentOffset + margin);

  if (startOff > 0) startOff = $from.parent.childBefore(startOff).offset;
  if (endOff < size) {
    var after = $from.parent.childAfter(endOff);
    endOff = after.offset + after.node.nodeSize;
  }
  var nodeStart = $from.start();
  return { from: nodeStart + startOff, to: nodeStart + endOff };
}

function readDOMChange(pm, range) {
  var op = pm.operation;
  // If the document was reset since the start of the current
  // operation, we can't do anything useful with the change to the
  // DOM, so we discard it.
  if (op.docSet) {
    pm.markAllDirty();
    return false;
  }

  var parsed = parseBetween(pm, range.from, range.to);
  var compare = op.doc.slice(range.from, range.to);
  var change = findDiff(compare.content, parsed.content, range.from, op.sel.from);
  if (!change) return false;
  var fromMapped = (0, _map.mapThroughResult)(op.mappings, change.start);
  var toMapped = (0, _map.mapThroughResult)(op.mappings, change.endA);
  if (fromMapped.deleted && toMapped.deleted) return false;

  // Mark nodes touched by this change as 'to be redrawn'
  markDirtyFor(pm, op.doc, change.start, change.endA);

  var $from = parsed.resolveNoCache(change.start - range.from);
  var $to = parsed.resolveNoCache(change.endB - range.from),
      nextSel = void 0,
      text = void 0;
  // If this looks like the effect of pressing Enter, just dispatch an
  // Enter key instead.
  if (!$from.sameParent($to) && $from.pos < parsed.content.size && (nextSel = (0, _selection.findSelectionFrom)(parsed, $from.pos + 1, 1, true)) && nextSel.head == $to.pos) {
    pm.input.dispatchKey("Enter");
  } else if ($from.sameParent($to) && $from.parent.isTextblock && (text = uniformTextBetween(parsed, $from.pos, $to.pos)) != null) {
    pm.input.insertText(fromMapped.pos, toMapped.pos, text, function (doc) {
      return domSel(pm, doc);
    });
  } else {
    var slice = parsed.slice(change.start - range.from, change.endB - range.from);
    var tr = pm.tr.replace(fromMapped.pos, toMapped.pos, slice);
    tr.apply({
      scrollIntoView: true,
      selection: domSel(pm, tr.doc)
    });
  }
  return true;
}

function domSel(pm, doc) {
  if (pm.hasFocus()) return (0, _selection.selectionFromDOM)(pm, doc, null, true).range;
}

function uniformTextBetween(node, from, to) {
  var result = "",
      valid = true,
      marks = null;
  node.nodesBetween(from, to, function (node, pos) {
    if (!node.isInline && pos < from) return;
    if (!node.isText) return valid = false;
    if (!marks) marks = node.marks;else if (!_model.Mark.sameSet(marks, node.marks)) valid = false;
    result += node.text.slice(Math.max(0, from - pos), to - pos);
  });
  return valid ? result : null;
}

function findDiff(a, b, pos, preferedStart) {
  var start = (0, _model.findDiffStart)(a, b, pos);
  if (!start) return null;

  var _findDiffEnd = (0, _model.findDiffEnd)(a, b, pos + a.size, pos + b.size);

  var endA = _findDiffEnd.a;
  var endB = _findDiffEnd.b;

  if (endA < start) {
    var move = preferedStart <= start && preferedStart >= endA ? start - preferedStart : 0;
    start -= move;
    endB = start + (endB - endA);
    endA = start;
  } else if (endB < start) {
    var _move = preferedStart <= start && preferedStart >= endB ? start - preferedStart : 0;
    start -= _move;
    endA = start + (endA - endB);
    endB = start;
  }
  return { start: start, endA: endA, endB: endB };
}

function markDirtyFor(pm, doc, start, end) {
  var $start = doc.resolve(start),
      $end = doc.resolve(end),
      same = $start.sameDepth($end);
  if (same == 0) pm.markAllDirty();else pm.markRangeDirty($start.before(same), $start.after(same), doc);
}
},{"../htmlformat":20,"../model":26,"../transform/map":34,"./dompos":8,"./selection":18}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.posBeforeFromDOM = posBeforeFromDOM;
exports.posFromDOM = posFromDOM;
exports.childContainer = childContainer;
exports.DOMFromPos = DOMFromPos;
exports.DOMAfterPos = DOMAfterPos;
exports.scrollIntoView = scrollIntoView;
exports.posAtCoords = posAtCoords;
exports.coordsAtPos = coordsAtPos;
exports.selectableNodeAbove = selectableNodeAbove;
exports.handleNodeClick = handleNodeClick;

var _dom = require("../dom");

// : (ProseMirror, DOMNode) → number
// Get the path for a given a DOM node in a document.
function posBeforeFromDOM(pm, node) {
  var pos = 0,
      add = 0;
  for (var cur = node; cur != pm.content; cur = cur.parentNode) {
    var attr = cur.getAttribute("pm-offset");
    if (attr) {
      pos += +attr + add;add = 1;
    }
  }
  return pos;
}

// : (ProseMirror, DOMNode, number) → number
function posFromDOM(pm, dom, domOffset, loose) {
  if (!loose && pm.operation && pm.doc != pm.operation.doc) throw new RangeError("Fetching a position from an outdated DOM structure");

  if (domOffset == null) {
    domOffset = Array.prototype.indexOf.call(dom.parentNode.childNodes, dom);
    dom = dom.parentNode;
  }

  // Move up to the wrapping container, counting local offset along
  // the way.
  var innerOffset = 0,
      tag = void 0;
  for (;;) {
    var adjust = 0;
    if (dom.nodeType == 3) {
      innerOffset += domOffset;
      // IE has a habit of splitting text nodes for no apparent reason
      if (loose) for (var _before = dom.previousSibling; _before && _before.nodeType == 3; _before = _before.previousSibling) {
        innerOffset += _before.nodeValue.length;
      }
    } else if (tag = dom.getAttribute("pm-offset") && !childContainer(dom)) {
      if (!loose) {
        var size = +dom.getAttribute("pm-size");
        if (domOffset == dom.childNodes.length) innerOffset = size;else innerOffset = Math.min(innerOffset, size);
      } else {
        for (var i = 0; i < domOffset; i++) {
          var child = dom.childNodes[i];
          if (child.nodeType == 3) innerOffset += child.nodeValue.length;
        }
      }
      return posBeforeFromDOM(pm, dom) + innerOffset;
    } else if (dom.hasAttribute("pm-container")) {
      break;
    } else if (tag = dom.getAttribute("pm-inner-offset")) {
      innerOffset += +tag;
      adjust = -1;
    } else if (domOffset && domOffset == dom.childNodes.length) {
      adjust = 1;
    }

    var parent = dom.parentNode;
    domOffset = adjust < 0 ? 0 : Array.prototype.indexOf.call(parent.childNodes, dom) + adjust;
    dom = parent;
  }

  var start = dom == pm.content ? 0 : posBeforeFromDOM(pm, dom) + 1,
      before = 0;

  for (var _child = dom.childNodes[domOffset - 1]; _child; _child = _child.previousSibling) {
    if (_child.nodeType == 1 && (tag = _child.getAttribute("pm-offset"))) {
      before += +tag + +_child.getAttribute("pm-size");
      break;
    } else if (loose && _child.nodeType == 3) {
      before += _child.nodeValue.length;
    }
  }
  return start + before + innerOffset;
}

// : (DOMNode) → ?DOMNode
function childContainer(dom) {
  return dom.hasAttribute("pm-container") ? dom : dom.querySelector("[pm-container]");
}

// : (ProseMirror, number) → {node: DOMNode, offset: number}
// Find the DOM node and offset into that node that the given document
// position refers to.
function DOMFromPos(pm, pos, loose) {
  if (!loose && pm.operation && pm.doc != pm.operation.doc) throw new RangeError("Resolving a position in an outdated DOM structure");

  var container = pm.content,
      offset = pos;
  for (;;) {
    for (var child = container.firstChild, i = 0;; child = child.nextSibling, i++) {
      if (!child) {
        if (offset && !loose) throw new RangeError("Failed to find node at " + pos);
        return { node: container, offset: i };
      }

      var size = child.nodeType == 1 && child.getAttribute("pm-size");
      if (size) {
        if (!offset) return { node: container, offset: i };
        size = +size;
        if (offset < size) {
          container = childContainer(child);
          if (!container) {
            return leafAt(child, offset);
          } else {
            offset--;
            break;
          }
        } else {
          offset -= size;
        }
      }
    }
  }
}

// : (ProseMirror, number) → DOMNode
function DOMAfterPos(pm, pos) {
  var _DOMFromPos = DOMFromPos(pm, pos);

  var node = _DOMFromPos.node;
  var offset = _DOMFromPos.offset;

  if (node.nodeType != 1 || offset == node.childNodes.length) throw new RangeError("No node after pos " + pos);
  return node.childNodes[offset];
}

// : (DOMNode, number) → {node: DOMNode, offset: number}
function leafAt(node, offset) {
  for (;;) {
    var child = node.firstChild;
    if (!child) return { node: node, offset: offset };
    if (child.nodeType != 1) return { node: child, offset: offset };
    if (child.hasAttribute("pm-inner-offset")) {
      var nodeOffset = 0;
      for (;;) {
        var nextSib = child.nextSibling,
            nextOffset = void 0;
        if (!nextSib || (nextOffset = +nextSib.getAttribute("pm-inner-offset")) >= offset) break;
        child = nextSib;
        nodeOffset = nextOffset;
      }
      offset -= nodeOffset;
    }
    node = child;
  }
}

function windowRect() {
  return { left: 0, right: window.innerWidth,
    top: 0, bottom: window.innerHeight };
}

function scrollIntoView(pm, pos) {
  if (!pos) pos = pm.sel.range.head || pm.sel.range.from;
  var coords = coordsAtPos(pm, pos);
  for (var parent = pm.content;; parent = parent.parentNode) {
    var _pm$options = pm.options;
    var scrollThreshold = _pm$options.scrollThreshold;
    var scrollMargin = _pm$options.scrollMargin;

    var atBody = parent == document.body;
    var rect = atBody ? windowRect() : parent.getBoundingClientRect();
    var moveX = 0,
        moveY = 0;
    if (coords.top < rect.top + scrollThreshold) moveY = -(rect.top - coords.top + scrollMargin);else if (coords.bottom > rect.bottom - scrollThreshold) moveY = coords.bottom - rect.bottom + scrollMargin;
    if (coords.left < rect.left + scrollThreshold) moveX = -(rect.left - coords.left + scrollMargin);else if (coords.right > rect.right - scrollThreshold) moveX = coords.right - rect.right + scrollMargin;
    if (moveX || moveY) {
      if (atBody) {
        window.scrollBy(moveX, moveY);
      } else {
        if (moveY) parent.scrollTop += moveY;
        if (moveX) parent.scrollLeft += moveX;
      }
    }
    if (atBody) break;
  }
}

function findOffsetInNode(node, coords) {
  var closest = void 0,
      dyClosest = 2e8,
      coordsClosest = void 0,
      offset = 0;
  for (var child = node.firstChild; child; child = child.nextSibling) {
    var rects = void 0;
    if (child.nodeType == 1) rects = child.getClientRects();else if (child.nodeType == 3) rects = textRange(child).getClientRects();else continue;

    for (var i = 0; i < rects.length; i++) {
      var rect = rects[i];
      if (rect.left <= coords.left && rect.right >= coords.left) {
        var dy = rect.top > coords.top ? rect.top - coords.top : rect.bottom < coords.top ? coords.top - rect.bottom : 0;
        if (dy < dyClosest) {
          // FIXME does not group by row
          closest = child;
          dyClosest = dy;
          coordsClosest = dy ? { left: coords.left, top: rect.top } : coords;
          if (child.nodeType == 1 && !child.firstChild) offset = i + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0);
          continue;
        }
      }
      if (!closest && (coords.top >= rect.bottom || coords.top >= rect.top && coords.left >= rect.right)) offset = i + 1;
    }
  }
  if (!closest) return { node: node, offset: offset };
  if (closest.nodeType == 3) return findOffsetInText(closest, coordsClosest);
  if (closest.firstChild) return findOffsetInNode(closest, coordsClosest);
  return { node: node, offset: offset };
}

function findOffsetInText(node, coords) {
  var len = node.nodeValue.length;
  var range = document.createRange();
  for (var i = 0; i < len; i++) {
    range.setEnd(node, i + 1);
    range.setStart(node, i);
    var rect = range.getBoundingClientRect();
    if (rect.top == rect.bottom) continue;
    if (rect.left - 1 <= coords.left && rect.right + 1 >= coords.left && rect.top - 1 <= coords.top && rect.bottom + 1 >= coords.top) return { node: node, offset: i + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0) };
  }
  return { node: node, offset: 0 };
}

// Given an x,y position on the editor, get the position in the document.
function posAtCoords(pm, coords) {
  var elt = document.elementFromPoint(coords.left, coords.top + 1);
  if (!(0, _dom.contains)(pm.content, elt)) return null;

  if (!elt.firstChild) elt = elt.parentNode;

  var _findOffsetInNode = findOffsetInNode(elt, coords);

  var node = _findOffsetInNode.node;
  var offset = _findOffsetInNode.offset;

  return posFromDOM(pm, node, offset);
}

function textRange(node, from, to) {
  var range = document.createRange();
  range.setEnd(node, to == null ? node.nodeValue.length : to);
  range.setStart(node, from || 0);
  return range;
}

function singleRect(object, bias) {
  var rects = object.getClientRects();
  return !rects.length ? object.getBoundingClientRect() : rects[bias < 0 ? 0 : rects.length - 1];
}

// : (ProseMirror, number) → ClientRect
// Given a position in the document model, get a bounding box of the
// character at that position, relative to the window.
function coordsAtPos(pm, pos) {
  var _DOMFromPos2 = DOMFromPos(pm, pos);

  var node = _DOMFromPos2.node;
  var offset = _DOMFromPos2.offset;

  var side = void 0,
      rect = void 0;
  if (node.nodeType == 3) {
    if (offset < node.nodeValue.length) {
      rect = singleRect(textRange(node, offset, offset + 1), -1);
      side = "left";
    }
    if ((!rect || rect.left == rect.right) && offset) {
      rect = singleRect(textRange(node, offset - 1, offset), 1);
      side = "right";
    }
  } else if (node.firstChild) {
    if (offset < node.childNodes.length) {
      var child = node.childNodes[offset];
      rect = singleRect(child.nodeType == 3 ? textRange(child) : child, -1);
      side = "left";
    }
    if ((!rect || rect.top == rect.bottom) && offset) {
      var _child2 = node.childNodes[offset - 1];
      rect = singleRect(_child2.nodeType == 3 ? textRange(_child2) : _child2, 1);
      side = "right";
    }
  } else {
    rect = node.getBoundingClientRect();
    side = "left";
  }
  var x = rect[side];
  return { top: rect.top, bottom: rect.bottom, left: x, right: x };
}

// ;; #path=NodeType #kind=class #noAnchor
// You can add several properties to [node types](#NodeType) to
// influence the way the editor interacts with them.

function targetKludge(dom, coords) {
  if (/^[uo]l$/i.test(dom.nodeName)) {
    for (var child = dom.firstChild; child; child = child.nextSibling) {
      if (child.nodeType != 1 || !child.hasAttribute("pm-offset") || !/^li$/i.test(child.nodeName)) continue;
      var childBox = child.getBoundingClientRect();
      if (coords.left > childBox.left - 2) break;
      if (childBox.top <= coords.top && childBox.bottom >= coords.top) return child;
    }
  }
  return dom;
}

function selectableNodeAbove(pm, dom, coords, liberal) {
  dom = targetKludge(dom, coords);
  for (; dom && dom != pm.content; dom = dom.parentNode) {
    if (dom.hasAttribute("pm-offset")) {
      var pos = posBeforeFromDOM(pm, dom),
          node = pm.doc.nodeAt(pos);
      // Leaf nodes are implicitly clickable
      if ((liberal || node.type.isLeaf) && node.type.selectable) return pos;
      if (!liberal) return null;
    }
  }
}

// :: (pm: ProseMirror, event: MouseEvent, pos: number, node: Node) → bool
// #path=NodeType.prototype.handleClick
// If a node is directly clicked (that is, the click didn't land in a
// DOM node belonging to a child node), and its type has a
// `handleClick` method, that method is given a chance to handle the
// click. The method is called, and should return `false` if it did
// _not_ handle the click.
//
// The `event` passed is the event for `"mousedown"`, but calling
// `preventDefault` on it has no effect, since this method is only
// called after a corresponding `"mouseup"` has occurred and
// ProseMirror has determined that this is not a drag or multi-click
// event.

// :: (pm: ProseMirror, event: MouseEvent, pos: number, node: Node) → bool
// #path=NodeType.prototype.handleDoubleClick
// This works like [`handleClick`](#NodeType.handleClick), but is
// called for double clicks instead.

// :: (pm: ProseMirror, event: MouseEvent, pos: number, node: Node) → bool
// #path=NodeType.prototype.handleContextMenu
//
// When the [context
// menu](https://developer.mozilla.org/en-US/docs/Web/Events/contextmenu)
// is activated in the editable context, nodes that the clicked
// position falls inside of get a chance to react to it. Node types
// may define a `handleContextMenu` method, which will be called when
// present, first on inner nodes and then up the document tree, until
// one of the methods returns something other than `false`.
//
// The handlers can inspect `event.target` to figure out whether they
// were directly clicked, and may call `event.preventDefault()` to
// prevent the native context menu.

function handleNodeClick(pm, type, event, target, direct) {
  for (var dom = target; dom && dom != pm.content; dom = dom.parentNode) {
    if (dom.hasAttribute("pm-offset")) {
      var pos = posBeforeFromDOM(pm, dom),
          node = pm.doc.nodeAt(pos);
      var handled = node.type[type] && node.type[type](pm, event, pos, node) !== false;
      if (direct || handled) return handled;
    }
  }
}
},{"../dom":1}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.draw = draw;
exports.redraw = redraw;

var _htmlformat = require("../htmlformat");

var _dom = require("../dom");

var _main = require("./main");

var _dompos = require("./dompos");

function options(ranges) {
  return {
    pos: 0,

    onRender: function onRender(node, dom, _pos, offset) {
      if (node.isBlock) {
        if (offset != null) dom.setAttribute("pm-offset", offset);
        dom.setAttribute("pm-size", node.nodeSize);
        if (node.isTextblock) adjustTrailingHacks(dom, node);
        if (dom.contentEditable == "false") dom = (0, _dom.elt)("div", null, dom);
      }

      return dom;
    },
    onContainer: function onContainer(dom) {
      dom.setAttribute("pm-container", true);
    },

    // : (Node, DOMNode, number, number) → DOMNode
    renderInlineFlat: function renderInlineFlat(node, dom, pos, offset) {
      ranges.advanceTo(pos);
      var end = pos + node.nodeSize;
      var nextCut = ranges.nextChangeBefore(end);

      var inner = dom,
          wrapped = void 0;
      for (var i = 0; i < node.marks.length; i++) {
        inner = inner.firstChild;
      }if (dom.nodeType != 1) {
        dom = (0, _dom.elt)("span", null, dom);
        if (nextCut == -1) wrapped = dom;
      }
      if (!wrapped && (nextCut > -1 || ranges.current.length)) {
        wrapped = inner == dom ? dom = (0, _dom.elt)("span", null, inner) : inner.parentNode.appendChild((0, _dom.elt)("span", null, inner));
      }

      dom.setAttribute("pm-offset", offset);
      dom.setAttribute("pm-size", node.nodeSize);

      var inlineOffset = 0;
      while (nextCut > -1) {
        var size = nextCut - pos;
        var split = splitSpan(wrapped, size);
        if (ranges.current.length) split.className = ranges.current.join(" ");
        split.setAttribute("pm-inner-offset", inlineOffset);
        inlineOffset += size;
        ranges.advanceTo(nextCut);
        nextCut = ranges.nextChangeBefore(end);
        if (nextCut == -1) wrapped.setAttribute("pm-inner-offset", inlineOffset);
        pos += size;
      }

      if (ranges.current.length) wrapped.className = ranges.current.join(" ");
      return dom;
    },

    document: document
  };
}

function splitSpan(span, at) {
  var textNode = span.firstChild,
      text = textNode.nodeValue;
  var newNode = span.parentNode.insertBefore((0, _dom.elt)("span", null, text.slice(0, at)), span);
  textNode.nodeValue = text.slice(at);
  return newNode;
}

function draw(pm, doc) {
  pm.content.textContent = "";
  pm.content.appendChild((0, _htmlformat.toDOM)(doc, options(pm.ranges.activeRangeTracker())));
}

function adjustTrailingHacks(dom, node) {
  var needs = node.content.size == 0 || node.lastChild.type.isBR || node.type.isCode && node.lastChild.isText && /\n$/.test(node.lastChild.text) ? "br" : !node.lastChild.isText && node.lastChild.type.isLeaf ? "text" : null;
  var last = dom.lastChild;
  var has = !last || last.nodeType != 1 || !last.hasAttribute("pm-ignore") ? null : last.nodeName == "BR" ? "br" : "text";
  if (needs != has) {
    if (has) dom.removeChild(last);
    if (needs) dom.appendChild(needs == "br" ? (0, _dom.elt)("br", { "pm-ignore": "trailing-break" }) : (0, _dom.elt)("span", { "pm-ignore": "cursor-text" }, ""));
  }
}

function findNodeIn(parent, i, node) {
  for (; i < parent.childCount; i++) {
    var child = parent.child(i);
    if (child == node) return i;
  }
  return -1;
}

function movePast(dom) {
  var next = dom.nextSibling;
  dom.parentNode.removeChild(dom);
  return next;
}

function redraw(pm, dirty, doc, prev) {
  if (dirty.get(prev) == _main.DIRTY_REDRAW) return draw(pm, doc);

  var opts = options(pm.ranges.activeRangeTracker());

  function scan(dom, node, prev, pos) {
    var iPrev = 0,
        pChild = prev.firstChild;
    var domPos = dom.firstChild;

    for (var iNode = 0, offset = 0; iNode < node.childCount; iNode++) {
      var child = node.child(iNode),
          matching = void 0,
          reuseDOM = void 0;
      var found = pChild == child ? iPrev : findNodeIn(prev, iPrev + 1, child);
      if (found > -1) {
        matching = child;
        while (iPrev != found) {
          iPrev++;
          domPos = movePast(domPos);
        }
      }

      if (matching && !dirty.get(matching)) {
        reuseDOM = true;
      } else if (pChild && !child.isText && child.sameMarkup(pChild) && dirty.get(pChild) != _main.DIRTY_REDRAW) {
        reuseDOM = true;
        if (!pChild.type.isLeaf) scan((0, _dompos.childContainer)(domPos), child, pChild, pos + offset + 1);
      } else {
        opts.pos = pos + offset;
        var rendered = (0, _htmlformat.nodeToDOM)(child, opts, offset);
        dom.insertBefore(rendered, domPos);
        reuseDOM = false;
      }

      if (reuseDOM) {
        domPos.setAttribute("pm-offset", offset);
        domPos.setAttribute("pm-size", child.nodeSize);
        domPos = domPos.nextSibling;
        pChild = prev.maybeChild(++iPrev);
      }
      offset += child.nodeSize;
    }

    while (pChild) {
      domPos = movePast(domPos);
      pChild = prev.maybeChild(++iPrev);
    }
    if (node.isTextblock) adjustTrailingHacks(dom, node);

    if (_dom.browser.ios) iosHacks(dom);
  }
  scan(pm.content, doc, prev, 0);
}

function iosHacks(dom) {
  if (dom.nodeName == "UL" || dom.nodeName == "OL") {
    var oldCSS = dom.style.cssText;
    dom.style.cssText = oldCSS + "; list-style: square !important";
    window.getComputedStyle(dom).listStyle;
    dom.style.cssText = oldCSS;
  }
}
},{"../dom":1,"../htmlformat":20,"./dompos":8,"./main":13}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.History = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _transform = require("../transform");

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ProseMirror's history implements not a way to roll back to a
// previous state, because ProseMirror supports applying changes
// without adding them to the history (for example during
// collaboration).
//
// To this end, each 'Branch' (one for the undo history and one for
// the redo history) keeps an array of 'Items', which can optionally
// hold a step (an actual undoable change), and always hold a position
// map (which is needed to move changes below them to apply to the
// current document).
//
// An item that has both a step and a selection token field is the
// start of an 'event' -- a group of changes that will be undone or
// redone at once. (It stores only a token, since that way we don't
// have to provide a document until the selection is actually applied,
// which is useful when compressing.)

// Used to schedule history compression
var max_empty_items = 500;

var Branch = function () {
  function Branch(maxEvents) {
    _classCallCheck(this, Branch);

    this.events = 0;
    this.maxEvents = maxEvents;
    // Item 0 is always a dummy that's only used to have an id to
    // refer to at the start of the history.
    this.items = [new Item()];
  }

  // : (Node, bool, ?Item) → ?{transform: Transform, selection: SelectionToken, ids: [number]}
  // Pop the latest event off the branch's history and apply it
  // to a document transform, returning the transform and the step IDs.


  _createClass(Branch, [{
    key: "popEvent",
    value: function popEvent(doc, preserveItems, upto) {
      var preserve = preserveItems,
          transform = new _transform.Transform(doc);
      var remap = new BranchRemapping();
      var selection = void 0,
          ids = [],
          i = this.items.length;

      for (;;) {
        var cur = this.items[--i];
        if (upto && cur == upto) break;
        if (!cur.map) return null;

        if (!cur.step) {
          remap.add(cur);
          preserve = true;
          continue;
        }

        if (preserve) {
          var step = cur.step.map(remap.remap),
              map = void 0;

          this.items[i] = new MapItem(cur.map);
          if (step && transform.maybeStep(step).doc) {
            map = transform.maps[transform.maps.length - 1];
            this.items.push(new MapItem(map, this.items[i].id));
          }
          remap.movePastStep(cur, map);
        } else {
          this.items.pop();
          transform.maybeStep(cur.step);
        }

        ids.push(cur.id);
        if (cur.selection) {
          this.events--;
          if (!upto) {
            selection = cur.selection.type.mapToken(cur.selection, remap.remap);
            break;
          }
        }
      }

      return { transform: transform, selection: selection, ids: ids };
    }
  }, {
    key: "clear",
    value: function clear() {
      this.items.length = 1;
      this.events = 0;
    }

    // : (Transform, Selection, ?[number])
    // Create a new branch with the given transform added.

  }, {
    key: "addTransform",
    value: function addTransform(transform, selection, ids) {
      for (var i = 0; i < transform.steps.length; i++) {
        var step = transform.steps[i].invert(transform.docs[i]);
        this.items.push(new StepItem(transform.maps[i], ids && ids[i], step, selection));
        if (selection) {
          this.events++;
          selection = null;
        }
      }
      if (this.events > this.maxEvents) this.clip();
    }

    // Clip this branch to the max number of events.

  }, {
    key: "clip",
    value: function clip() {
      var seen = 0,
          toClip = this.events - this.maxEvents;
      for (var i = 0;; i++) {
        var cur = this.items[i];
        if (cur.selection) {
          if (seen < toClip) {
            ++seen;
          } else {
            this.items.splice(0, i, new Item(null, this.events[toClip - 1]));
            this.events = this.maxEvents;
            return;
          }
        }
      }
    }
  }, {
    key: "addMaps",
    value: function addMaps(array) {
      if (this.events == 0) return;
      for (var i = 0; i < array.length; i++) {
        this.items.push(new MapItem(array[i]));
      }
    }
  }, {
    key: "findChangeID",
    value: function findChangeID(id) {
      if (id == this.items[0].id) return this.items[0];

      for (var i = this.items.length - 1; i >= 0; i--) {
        var cur = this.items[i];
        if (cur.step) {
          if (cur.id == id) return cur;
          if (cur.id < id) return null;
        }
      }
    }

    // : ([PosMap], Transform, [number])
    // When the collab module receives remote changes, the history has
    // to know about those, so that it can adjust the steps that were
    // rebased on top of the remote changes, and include the position
    // maps for the remote changes in its array of items.

  }, {
    key: "rebased",
    value: function rebased(newMaps, rebasedTransform, positions) {
      if (this.events == 0) return;

      var rebasedItems = [],
          start = this.items.length - positions.length,
          startPos = 0;
      if (start < 1) {
        startPos = 1 - start;
        start = 1;
        this.items[0] = new Item();
      }

      if (positions.length) {
        var remap = new _transform.Remapping([], newMaps.slice());
        for (var iItem = start, iPosition = startPos; iItem < this.items.length; iItem++) {
          var item = this.items[iItem],
              pos = positions[iPosition++],
              id = void 0;
          if (pos != -1) {
            var map = rebasedTransform.maps[pos];
            if (item.step) {
              var step = rebasedTransform.steps[pos].invert(rebasedTransform.docs[pos]);
              var selection = item.selection && item.selection.type.mapToken(item.selection, remap);
              rebasedItems.push(new StepItem(map, item.id, step, selection));
            } else {
              rebasedItems.push(new MapItem(map));
            }
            id = remap.addToBack(map);
          }
          remap.addToFront(item.map.invert(), id);
        }

        this.items.length = start;
      }

      for (var i = 0; i < newMaps.length; i++) {
        this.items.push(new MapItem(newMaps[i]));
      }for (var _i = 0; _i < rebasedItems.length; _i++) {
        this.items.push(rebasedItems[_i]);
      }if (!this.compressing && this.emptyItems(start) + newMaps.length > max_empty_items) this.compress(start + newMaps.length);
    }
  }, {
    key: "emptyItems",
    value: function emptyItems(upto) {
      var count = 0;
      for (var i = 1; i < upto; i++) {
        if (!this.items[i].step) count++;
      }return count;
    }

    // Compressing a branch means rewriting it to push the air (map-only
    // items) out. During collaboration, these naturally accumulate
    // because each remote change adds one. The `upto` argument is used
    // to ensure that only the items below a given level are compressed,
    // because `rebased` relies on a clean, untouched set of items in
    // order to associate old ids to rebased steps.

  }, {
    key: "compress",
    value: function compress(upto) {
      var remap = new BranchRemapping();
      var items = [],
          events = 0;
      for (var i = this.items.length - 1; i >= 0; i--) {
        var item = this.items[i];
        if (i >= upto) {
          items.push(item);
        } else if (item.step) {
          var step = item.step.map(remap.remap),
              map = step && step.posMap();
          remap.movePastStep(item, map);
          if (step) {
            var selection = item.selection && item.selection.type.mapToken(item.selection, remap.remap);
            items.push(new StepItem(map.invert(), item.id, step, selection));
            if (selection) events++;
          }
        } else if (item.map) {
          remap.add(item);
        } else {
          items.push(item);
        }
      }
      this.items = items.reverse();
      this.events = events;
    }
  }, {
    key: "toString",
    value: function toString() {
      return this.items.join("\n");
    }
  }, {
    key: "changeID",
    get: function get() {
      for (var i = this.items.length - 1; i > 0; i--) {
        if (this.items[i].step) return this.items[i].id;
      }return this.items[0].id;
    }
  }]);

  return Branch;
}();

// History items all have ids, but the meaning of these is somewhat
// complicated.
//
// - For StepItems, the ids are kept ordered (inside a given branch),
//   and are kept associated with a given change (if you undo and then
//   redo it, the resulting item gets the old id)
//
// - For MapItems, the ids are just opaque identifiers, not
//   necessarily ordered.
//
// - The placeholder item at the base of a branch's list


var nextID = 1;

var Item = function () {
  function Item(map, id) {
    _classCallCheck(this, Item);

    this.map = map;
    this.id = id || nextID++;
  }

  _createClass(Item, [{
    key: "toString",
    value: function toString() {
      return this.id + ":" + (this.map || "") + (this.step ? ":" + this.step : "") + (this.mirror != null ? "->" + this.mirror : "");
    }
  }]);

  return Item;
}();

var StepItem = function (_Item) {
  _inherits(StepItem, _Item);

  function StepItem(map, id, step, selection) {
    _classCallCheck(this, StepItem);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(StepItem).call(this, map, id));

    _this.step = step;
    _this.selection = selection;
    return _this;
  }

  return StepItem;
}(Item);

var MapItem = function (_Item2) {
  _inherits(MapItem, _Item2);

  function MapItem(map, mirror) {
    _classCallCheck(this, MapItem);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(MapItem).call(this, map));

    _this2.mirror = mirror;
    return _this2;
  }

  return MapItem;
}(Item);

// Assists with remapping a step with other changes that have been
// made since the step was first applied.


var BranchRemapping = function () {
  function BranchRemapping() {
    _classCallCheck(this, BranchRemapping);

    this.remap = new _transform.Remapping();
    this.mirrorBuffer = Object.create(null);
  }

  _createClass(BranchRemapping, [{
    key: "add",
    value: function add(item) {
      var id = this.remap.addToFront(item.map, this.mirrorBuffer[item.id]);
      if (item.mirror != null) this.mirrorBuffer[item.mirror] = id;
      return id;
    }
  }, {
    key: "movePastStep",
    value: function movePastStep(item, map) {
      var id = this.add(item);
      if (map) this.remap.addToBack(map, id);
    }
  }]);

  return BranchRemapping;
}();

// ;; An undo/redo history manager for an editor instance.


var History = exports.History = function () {
  function History(pm) {
    _classCallCheck(this, History);

    this.pm = pm;

    this.done = new Branch(pm.options.historyDepth);
    this.undone = new Branch(pm.options.historyDepth);

    this.lastAddedAt = 0;
    this.ignoreTransform = false;
    this.preserveItems = 0;

    pm.on("transform", this.recordTransform.bind(this));
  }

  // : (Transform, Selection, Object)
  // Record a transformation in undo history.


  _createClass(History, [{
    key: "recordTransform",
    value: function recordTransform(transform, selection, options) {
      if (this.ignoreTransform) return;

      if (options.addToHistory == false) {
        this.done.addMaps(transform.maps);
        this.undone.addMaps(transform.maps);
      } else {
        var now = Date.now();
        // Group transforms that occur in quick succession into one event.
        var newGroup = now > this.lastAddedAt + this.pm.options.historyEventDelay;
        this.done.addTransform(transform, newGroup ? selection.token : null);
        this.undone.clear();
        this.lastAddedAt = now;
      }
    }

    // :: () → bool
    // Undo one history event. The return value indicates whether
    // anything was actually undone. Note that in a collaborative
    // context, or when changes are [applied](#ProseMirror.apply)
    // without adding them to the history, it is possible for
    // [`undoDepth`](#History.undoDepth) to have a positive value, but
    // this method to still return `false`, when non-history changes
    // overwrote all remaining changes in the history.

  }, {
    key: "undo",
    value: function undo() {
      return this.shift(this.done, this.undone);
    }

    // :: () → bool
    // Redo one history event. The return value indicates whether
    // anything was actually redone.

  }, {
    key: "redo",
    value: function redo() {
      return this.shift(this.undone, this.done);
    }

    // :: number
    // The amount of undoable events available.

  }, {
    key: "shift",


    // : (Branch, Branch) → bool
    // Apply the latest event from one branch to the document and optionally
    // shift the event onto the other branch. Returns true when an event could
    // be shifted.
    value: function shift(from, to) {
      var pop = from.popEvent(this.pm.doc, this.preserveItems > 0);
      if (!pop) return false;
      var selectionBeforeTransform = this.pm.selection;

      if (!pop.transform.steps.length) return this.shift(from, to);

      var selection = pop.selection.type.fromToken(pop.selection, pop.transform.doc);
      this.applyIgnoring(pop.transform, selection);

      // Store the selection before transform on the event so that
      // it can be reapplied if the event is undone or redone (e.g.
      // redoing a character addition should place the cursor after
      // the character).
      to.addTransform(pop.transform, selectionBeforeTransform.token, pop.ids);

      this.lastAddedAt = 0;

      return true;
    }
  }, {
    key: "applyIgnoring",
    value: function applyIgnoring(transform, selection) {
      this.ignoreTransform = true;
      this.pm.apply(transform, { selection: selection, filter: false });
      this.ignoreTransform = false;
    }

    // :: () → Object
    // Get the current ‘version’ of the editor content. This can be used
    // to later [check](#History.isAtVersion) whether anything changed, or
    // to [roll back](#History.backToVersion) to this version.

  }, {
    key: "getVersion",
    value: function getVersion() {
      return this.done.changeID;
    }

    // :: (Object) → bool
    // Returns `true` when the editor history is in the state that it
    // was when the given [version](#History.getVersion) was recorded.
    // That means either no changes were made, or changes were
    // done/undone and then undone/redone again.

  }, {
    key: "isAtVersion",
    value: function isAtVersion(version) {
      return this.done.changeID == version;
    }

    // :: (Object) → bool
    // Rolls back all changes made since the given
    // [version](#History.getVersion) was recorded. Returns `false` if
    // that version was no longer found in the history, and thus the
    // action could not be completed.

  }, {
    key: "backToVersion",
    value: function backToVersion(version) {
      var found = this.done.findChangeID(version);
      if (!found) return false;

      var _done$popEvent = this.done.popEvent(this.pm.doc, this.preserveItems > 0, found);

      var transform = _done$popEvent.transform;

      this.applyIgnoring(transform);
      this.undone.clear();
      return true;
    }

    // Used by the collab module to tell the history that some of its
    // content has been rebased.

  }, {
    key: "rebased",
    value: function rebased(newMaps, rebasedTransform, positions) {
      this.done.rebased(newMaps, rebasedTransform, positions);
      this.undone.rebased(newMaps, rebasedTransform, positions);
    }
  }, {
    key: "undoDepth",
    get: function get() {
      return this.done.events;
    }

    // :: number
    // The amount of redoable events available.

  }, {
    key: "redoDepth",
    get: function get() {
      return this.undone.events;
    }
  }]);

  return History;
}();
},{"../transform":33}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Keymap = exports.Plugin = exports.baseCommands = exports.Command = exports.CommandSet = exports.MarkedRange = exports.NodeSelection = exports.TextSelection = exports.Selection = exports.ProseMirror = undefined;

var _main = require("./main");

Object.defineProperty(exports, "ProseMirror", {
  enumerable: true,
  get: function get() {
    return _main.ProseMirror;
  }
});

var _selection = require("./selection");

Object.defineProperty(exports, "Selection", {
  enumerable: true,
  get: function get() {
    return _selection.Selection;
  }
});
Object.defineProperty(exports, "TextSelection", {
  enumerable: true,
  get: function get() {
    return _selection.TextSelection;
  }
});
Object.defineProperty(exports, "NodeSelection", {
  enumerable: true,
  get: function get() {
    return _selection.NodeSelection;
  }
});

var _range = require("./range");

Object.defineProperty(exports, "MarkedRange", {
  enumerable: true,
  get: function get() {
    return _range.MarkedRange;
  }
});

var _command = require("./command");

Object.defineProperty(exports, "CommandSet", {
  enumerable: true,
  get: function get() {
    return _command.CommandSet;
  }
});
Object.defineProperty(exports, "Command", {
  enumerable: true,
  get: function get() {
    return _command.Command;
  }
});

var _base_commands = require("./base_commands");

Object.defineProperty(exports, "baseCommands", {
  enumerable: true,
  get: function get() {
    return _base_commands.baseCommands;
  }
});

var _plugin = require("./plugin");

Object.defineProperty(exports, "Plugin", {
  enumerable: true,
  get: function get() {
    return _plugin.Plugin;
  }
});

require("./schema_commands");

var _browserkeymap = require("browserkeymap");

var _browserkeymap2 = _interopRequireDefault(_browserkeymap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.Keymap = _browserkeymap2.default;
},{"./base_commands":2,"./command":5,"./main":13,"./plugin":15,"./range":16,"./schema_commands":17,"./selection":18,"browserkeymap":50}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Input = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _browserkeymap = require("browserkeymap");

var _browserkeymap2 = _interopRequireDefault(_browserkeymap);

var _htmlformat = require("../htmlformat");

var _model = require("../model");

var _capturekeys = require("./capturekeys");

var _dom = require("../dom");

var _domchange = require("./domchange");

var _selection = require("./selection");

var _dompos = require("./dompos");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var stopSeq = null;

// A collection of DOM events that occur within the editor, and callback functions
// to invoke when the event fires.
var handlers = {};

var Input = exports.Input = function () {
  function Input(pm) {
    var _this = this;

    _classCallCheck(this, Input);

    this.pm = pm;
    this.baseKeymap = null;

    this.keySeq = null;

    this.mouseDown = null;
    this.dragging = null;
    this.dropTarget = null;
    this.shiftKey = false;
    this.finishComposing = null;

    this.keymaps = [];
    this.defaultKeymap = null;

    this.storedMarks = null;

    var _loop = function _loop(event) {
      var handler = handlers[event];
      pm.content.addEventListener(event, function (e) {
        return handler(pm, e);
      });
    };

    for (var event in handlers) {
      _loop(event);
    }

    pm.on("selectionChange", function () {
      return _this.storedMarks = null;
    });
  }

  // Dispatch a key press to the internal keymaps, which will override the default
  // DOM behavior.


  _createClass(Input, [{
    key: "dispatchKey",
    value: function dispatchKey(name, e) {
      var pm = this.pm,
          seq = pm.input.keySeq;
      // If the previous key should be used in sequence with this one, modify the name accordingly.
      if (seq) {
        if (_browserkeymap2.default.isModifierKey(name)) return true;
        clearTimeout(stopSeq);
        stopSeq = setTimeout(function () {
          if (pm.input.keySeq == seq) pm.input.keySeq = null;
        }, 50);
        name = seq + " " + name;
      }

      var handle = function handle(bound) {
        if (bound === false) return "nothing";
        if (bound == "...") return "multi";
        if (bound == null) return false;

        var result = false;
        if (Array.isArray(bound)) {
          for (var i = 0; result === false && i < bound.length; i++) {
            result = handle(bound[i]);
          }
        } else if (typeof bound == "string") {
          result = pm.execCommand(bound);
        } else {
          result = bound(pm);
        }
        return result == false ? false : "handled";
      };

      var result = void 0;
      for (var i = 0; !result && i < pm.input.keymaps.length; i++) {
        result = handle(pm.input.keymaps[i].map.lookup(name, pm));
      }if (!result) result = handle(pm.input.baseKeymap.lookup(name, pm)) || handle(_capturekeys.captureKeys.lookup(name));

      // If the key should be used in sequence with the next key, store the keyname internally.
      if (result == "multi") pm.input.keySeq = name;

      if ((result == "handled" || result == "multi") && e) e.preventDefault();

      if (seq && !result && /\'$/.test(name)) {
        if (e) e.preventDefault();
        return true;
      }
      return !!result;
    }

    // : (ProseMirror, TextSelection, string, ?(Node) → Selection)
    // Insert text into a document.

  }, {
    key: "insertText",
    value: function insertText(from, to, text, findSelection) {
      if (from == to && !text) return;
      var pm = this.pm,
          marks = pm.input.storedMarks || pm.doc.marksAt(from);
      var tr = pm.tr.replaceWith(from, to, text ? pm.schema.text(text, marks) : null);
      tr.apply({
        scrollIntoView: true,
        selection: findSelection && findSelection(tr.doc) || (0, _selection.findSelectionNear)(tr.doc, tr.map(to), -1, true)
      });
      // :: () #path=ProseMirror#events#textInput
      // Fired when the user types text into the editor.
      if (text) pm.signal("textInput", text);
    }
  }, {
    key: "startComposition",
    value: function startComposition(dataLen, realStart) {
      this.pm.ensureOperation({ noFlush: true, readSelection: realStart }).composing = {
        ended: false,
        applied: false,
        margin: dataLen
      };
      this.pm.unscheduleFlush();
    }
  }, {
    key: "applyComposition",
    value: function applyComposition(andFlush) {
      var composing = this.composing;
      if (composing.applied) return;
      (0, _domchange.readCompositionChange)(this.pm, composing.margin);
      composing.applied = true;
      // Operations that read DOM changes must be flushed, to make sure
      // subsequent DOM changes find a clean DOM.
      if (andFlush) this.pm.flush();
    }
  }, {
    key: "composing",
    get: function get() {
      return this.pm.operation && this.pm.operation.composing;
    }
  }]);

  return Input;
}();

handlers.keydown = function (pm, e) {
  // :: () #path=ProseMirror#events#interaction
  // Fired when the user interacts with the editor, for example by
  // clicking on it or pressing a key while it is focused. Mostly
  // useful for closing or resetting transient UI state such as open
  // menus.
  if (!(0, _selection.hasFocus)(pm)) return;
  pm.signal("interaction");
  if (e.keyCode == 16) pm.input.shiftKey = true;
  if (pm.input.composing) return;
  var name = _browserkeymap2.default.keyName(e);
  if (name && pm.input.dispatchKey(name, e)) return;
  pm.sel.fastPoll();
};

handlers.keyup = function (pm, e) {
  if (e.keyCode == 16) pm.input.shiftKey = false;
};

handlers.keypress = function (pm, e) {
  if (!(0, _selection.hasFocus)(pm) || pm.input.composing || !e.charCode || e.ctrlKey && !e.altKey || _dom.browser.mac && e.metaKey) return;
  if (pm.input.dispatchKey(_browserkeymap2.default.keyName(e), e)) return;
  var sel = pm.selection;
  // On iOS, let input through, because if we handle it the virtual
  // keyboard's default case doesn't update (it only does so when the
  // user types or taps, not on selection updates from JavaScript).
  if (!_dom.browser.ios) {
    pm.input.insertText(sel.from, sel.to, String.fromCharCode(e.charCode));
    e.preventDefault();
  }
};

function realTarget(pm, mouseEvent) {
  if (pm.operation && pm.flush()) return document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY);else return mouseEvent.target;
}

function selectClickedNode(pm, e, target) {
  var pos = (0, _dompos.selectableNodeAbove)(pm, target, { left: e.clientX, top: e.clientY }, true);
  if (pos == null) return pm.sel.fastPoll();

  var _pm$selection = pm.selection;
  var node = _pm$selection.node;
  var from = _pm$selection.from;

  if (node) {
    var $pos = pm.doc.resolve(pos),
        $from = pm.doc.resolve(from);
    if ($pos.depth >= $from.depth && $pos.before($from.depth + 1) == from) {
      if ($from.depth == 0) return pm.sel.fastPoll();
      pos = $pos.before($from.depth);
    }
  }

  pm.setNodeSelection(pos);
  pm.focus();
  e.preventDefault();
}

var lastClick = 0,
    oneButLastClick = 0;

function handleTripleClick(pm, e, target) {
  e.preventDefault();
  var pos = (0, _dompos.selectableNodeAbove)(pm, target, { left: e.clientX, top: e.clientY }, true);
  if (pos != null) {
    var $pos = pm.doc.resolve(pos),
        node = $pos.nodeAfter;
    if (node.isBlock && !node.isTextblock) // Non-textblock block, select it
      pm.setNodeSelection(pos);else if (node.isInline) // Inline node, select whole parent
      pm.setTextSelection($pos.start(), $pos.end());else // Textblock, select content
      pm.setTextSelection(pos + 1, pos + 1 + node.content.size);
    pm.focus();
  }
}

handlers.mousedown = function (pm, e) {
  pm.signal("interaction");
  var now = Date.now(),
      doubleClick = now - lastClick < 500,
      tripleClick = now - oneButLastClick < 600;
  oneButLastClick = lastClick;
  lastClick = now;

  var target = realTarget(pm, e);
  if (tripleClick) handleTripleClick(pm, e, target);else if (doubleClick && (0, _dompos.handleNodeClick)(pm, "handleDoubleClick", e, target, true)) {} else pm.input.mouseDown = new MouseDown(pm, e, target, doubleClick);
};

var MouseDown = function () {
  function MouseDown(pm, event, target, doubleClick) {
    _classCallCheck(this, MouseDown);

    this.pm = pm;
    this.event = event;
    this.target = target;
    this.leaveToBrowser = pm.input.shiftKey || doubleClick;

    var pos = (0, _dompos.posBeforeFromDOM)(pm, this.target),
        node = pm.doc.nodeAt(pos);
    this.mightDrag = node.type.draggable || node == pm.sel.range.node ? pos : null;
    if (this.mightDrag != null) {
      this.target.draggable = true;
      if (_dom.browser.gecko && (this.setContentEditable = !this.target.hasAttribute("contentEditable"))) this.target.setAttribute("contentEditable", "false");
    }

    this.x = event.clientX;this.y = event.clientY;

    window.addEventListener("mouseup", this.up = this.up.bind(this));
    window.addEventListener("mousemove", this.move = this.move.bind(this));
    pm.sel.fastPoll();
  }

  _createClass(MouseDown, [{
    key: "done",
    value: function done() {
      window.removeEventListener("mouseup", this.up);
      window.removeEventListener("mousemove", this.move);
      if (this.mightDrag != null) {
        this.target.draggable = false;
        if (_dom.browser.gecko && this.setContentEditable) this.target.removeAttribute("contentEditable");
      }
    }
  }, {
    key: "up",
    value: function up(event) {
      this.done();

      var target = realTarget(this.pm, event);
      if (this.leaveToBrowser || !(0, _dom.contains)(this.pm.content, target)) {
        this.pm.sel.fastPoll();
      } else if (this.event.ctrlKey) {
        selectClickedNode(this.pm, event, target);
      } else if (!(0, _dompos.handleNodeClick)(this.pm, "handleClick", event, target, true)) {
        var pos = (0, _dompos.selectableNodeAbove)(this.pm, target, { left: this.x, top: this.y });
        if (pos) {
          this.pm.setNodeSelection(pos);
          this.pm.focus();
        } else {
          this.pm.sel.fastPoll();
        }
      }
    }
  }, {
    key: "move",
    value: function move(event) {
      if (!this.leaveToBrowser && (Math.abs(this.x - event.clientX) > 4 || Math.abs(this.y - event.clientY) > 4)) this.leaveToBrowser = true;
      this.pm.sel.fastPoll();
    }
  }]);

  return MouseDown;
}();

handlers.touchdown = function (pm) {
  pm.sel.fastPoll();
};

handlers.contextmenu = function (pm, e) {
  (0, _dompos.handleNodeClick)(pm, "handleContextMenu", e, realTarget(pm, e), false);
};

// Input compositions are hard. Mostly because the events fired by
// browsers are A) very unpredictable and inconsistent, and B) not
// cancelable.
//
// ProseMirror has the problem that it must not update the DOM during
// a composition, or the browser will cancel it. What it does is keep
// long-running operations (delayed DOM updates) when a composition is
// active.
//
// We _do not_ trust the information in the composition events which,
// apart from being very uninformative to begin with, is often just
// plain wrong. Instead, when a composition ends, we parse the dom
// around the original selection, and derive an update from that.

handlers.compositionstart = function (pm, e) {
  if (!pm.input.composing && (0, _selection.hasFocus)(pm)) pm.input.startComposition(e.data ? e.data.length : 0, true);
};

handlers.compositionupdate = function (pm) {
  if (!pm.input.composing && (0, _selection.hasFocus)(pm)) pm.input.startComposition(0, false);
};

handlers.compositionend = function (pm, e) {
  if (!(0, _selection.hasFocus)(pm)) return;
  var composing = pm.input.composing;
  if (!composing) {
    // We received a compositionend without having seen any previous
    // events for the composition. If there's data in the event
    // object, we assume that it's a real change, and start a
    // composition. Otherwise, we just ignore it.
    if (e.data) pm.input.startComposition(e.data.length, false);else return;
  } else if (composing.applied) {
    // This happens when a flush during composition causes a
    // syncronous compositionend.
    return;
  }

  clearTimeout(pm.input.finishComposing);
  pm.operation.composing.ended = true;
  // Applying the composition right away from this event confuses
  // Chrome (and probably other browsers), causing them to re-update
  // the DOM afterwards. So we apply the composition either in the
  // next input event, or after a short interval.
  pm.input.finishComposing = window.setTimeout(function () {
    var composing = pm.input.composing;
    if (composing && composing.ended) pm.input.applyComposition(true);
  }, 20);
};

function readInput(pm) {
  var composing = pm.input.composing;
  if (composing) {
    // Ignore input events during composition, except when the
    // composition has ended, in which case we can apply it.
    if (composing.ended) pm.input.applyComposition(true);
    return true;
  }

  // Read the changed DOM and derive an update from that.
  var result = (0, _domchange.readInputChange)(pm);
  pm.flush();
  return result;
}

function readInputSoon(pm) {
  window.setTimeout(function () {
    if (!readInput(pm)) window.setTimeout(function () {
      return readInput(pm);
    }, 80);
  }, 20);
}

handlers.input = function (pm) {
  if ((0, _selection.hasFocus)(pm)) readInput(pm);
};

function toClipboard(doc, from, to, dataTransfer) {
  var slice = doc.slice(from, to);
  if (!slice.openLeft && !slice.openRight && slice.possibleParent) slice = new _model.Slice(_model.Fragment.from(slice.possibleParent.copy(slice.content), 1, 1));
  var attr = slice.openLeft + "/" + slice.openRight;
  var html = "<div pm-context=\"" + attr + "\">" + (0, _htmlformat.toHTML)(slice.content) + "</div>";
  dataTransfer.clearData();
  dataTransfer.setData("text/html", html);
  dataTransfer.setData("text/plain", slice.content.textBetween(0, slice.content.size, "\n\n"));
  return slice;
}

var cachedCanUpdateClipboard = null;

function canUpdateClipboard(dataTransfer) {
  if (cachedCanUpdateClipboard != null) return cachedCanUpdateClipboard;
  dataTransfer.setData("text/html", "<hr>");
  return cachedCanUpdateClipboard = dataTransfer.getData("text/html") == "<hr>";
}

// :: (text: string) → string #path=ProseMirror#events#transformPastedText
// Fired when plain text is pasted. Handlers must return the given
// string or a [transformed](#EventMixin.signalPipelined) version of
// it.

// :: (html: string) → string #path=ProseMirror#events#transformPastedHTML
// Fired when html content is pasted or dragged into the editor.
// Handlers must return the given string or a
// [transformed](#EventMixin.signalPipelined) version of it.

// :: (slice: Slice) → Slice #path=ProseMirror#events#transformPasted
// Fired when something is pasted or dragged into the editor. The
// given slice represents the pasted content, and your handler can
// return a modified version to manipulate it before it is inserted
// into the document.

// : (ProseMirror, DataTransfer, ?bool) → ?Slice
function fromClipboard(pm, dataTransfer, plainText, target) {
  var txt = dataTransfer.getData("text/plain");
  var html = dataTransfer.getData("text/html");
  if (!html && !txt) return null;
  var dom = document.createElement("div");
  if ((plainText || !html) && txt) {
    pm.signalPipelined("transformPastedText", txt).split(/\n{2,}/).forEach(function (para) {
      dom.appendChild(document.createElement("paragraph")).textContent = para;
    });
  } else {
    dom.innerHTML = pm.signalPipelined("transformPastedHTML", html);
  }
  var wrap = dom.querySelector("[pm-context]"),
      m = void 0,
      openLeft = null,
      openRight = null;
  if (wrap && (m = /^(\d+)\/(\d+)$/.exec(wrap.getAttribute("pm-context")))) {
    dom = wrap;
    openLeft = +m[1];
    openRight = +m[2];
  }
  var slice = (0, _htmlformat.fromDOMInContext)(pm.doc.resolve(target), dom, { openLeft: openLeft, openRight: openRight, preserveWhiteSpace: true });
  return pm.signalPipelined("transformPasted", slice);
}

handlers.copy = handlers.cut = function (pm, e) {
  var _pm$selection2 = pm.selection;
  var from = _pm$selection2.from;
  var to = _pm$selection2.to;
  var empty = _pm$selection2.empty;var cut = e.type == "cut";
  if (empty) return;
  if (!e.clipboardData || !canUpdateClipboard(e.clipboardData)) {
    if (cut && _dom.browser.ie && _dom.browser.ie_version <= 11) readInputSoon(pm);
    return;
  }
  toClipboard(pm.doc, from, to, e.clipboardData);
  e.preventDefault();
  if (cut) pm.tr.delete(from, to).apply();
};

handlers.paste = function (pm, e) {
  if (!(0, _selection.hasFocus)(pm)) return;
  if (!e.clipboardData) {
    if (_dom.browser.ie && _dom.browser.ie_version <= 11) readInputSoon(pm);
    return;
  }
  var sel = pm.selection;
  var slice = fromClipboard(pm, e.clipboardData, pm.input.shiftKey, sel.from);
  if (slice) {
    e.preventDefault();
    var start = sel.from,
        $from = void 0,
        wrap = slice.possibleParent;
    if (!wrap && slice.openLeft) {
      wrap = slice.content.firstChild;
      for (var i = 1; i < slice.openLeft; i++) {
        wrap = wrap.firstChild;
      }
    }
    // When pasting textblock content in an empty textblock, preserve
    // the original type.
    if (wrap && wrap.isTextblock && ($from = pm.doc.resolve(sel.from)).parent.isTextblock && !$from.parent.content.size) {
      start--;
      if (slice.openLeft) slice = new _model.Slice(slice.content, slice.openLeft - 1, slice.openRight);else slice = new _model.Slice(_model.Fragment.from(wrap.copy(slice.content)), 0, slice.openRight + 1);
    }
    var tr = pm.tr.replace(start, sel.to, slice);
    tr.apply({ scrollIntoView: true, selection: (0, _selection.findSelectionNear)(tr.doc, tr.map(sel.to)) });
  }
};

var Dragging = function Dragging(slice, from, to) {
  _classCallCheck(this, Dragging);

  this.slice = slice;
  this.from = from;
  this.to = to;
};

function dropPos(pm, slice, pos) {
  if (!slice || !slice.content.size) return pos;
  var $pos = pm.doc.resolve(pos);
  for (var d = $pos.depth; d >= 0; d--) {
    var bias = d == $pos.depth ? 0 : pos <= ($pos.start(d + 1) + $pos.end(d + 1)) / 2 ? -1 : 1;
    var insertPos = $pos.index(d) + (bias > 0 ? 1 : 0);
    if ($pos.node(d).canReplace(insertPos, insertPos, slice.content)) return bias == 0 ? pos : bias < 0 ? $pos.before(d + 1) : $pos.after(d + 1);
  }
  return pos;
}

function removeDropTarget(pm) {
  if (pm.input.dropTarget) {
    pm.wrapper.removeChild(pm.input.dropTarget);
    pm.input.dropTarget = null;
  }
}

handlers.dragstart = function (pm, e) {
  var mouseDown = pm.input.mouseDown;
  if (mouseDown) mouseDown.done();

  if (!e.dataTransfer) return;

  var _pm$selection3 = pm.selection;
  var from = _pm$selection3.from;
  var to = _pm$selection3.to;
  var empty = _pm$selection3.empty;var dragging = void 0;
  var pos = !empty && pm.posAtCoords({ left: e.clientX, top: e.clientY });
  if (pos != null && pos >= from && pos <= to) {
    dragging = { from: from, to: to };
  } else if (mouseDown && mouseDown.mightDrag != null) {
    var _pos = mouseDown.mightDrag;
    dragging = { from: _pos, to: _pos + pm.doc.nodeAt(_pos).nodeSize };
  }

  if (dragging) {
    var slice = toClipboard(pm.doc, dragging.from, dragging.to, e.dataTransfer);
    // FIXME the document could change during a drag, invalidating this range
    // use a marked range?
    pm.input.dragging = new Dragging(slice, dragging.from, dragging.to);
  }
};

handlers.dragend = function (pm) {
  removeDropTarget(pm);
  window.setTimeout(function () {
    return pm.input.dragging = null;
  }, 50);
};

handlers.dragover = handlers.dragenter = function (pm, e) {
  e.preventDefault();

  var target = pm.input.dropTarget;
  if (!target) target = pm.input.dropTarget = pm.wrapper.appendChild((0, _dom.elt)("div", { class: "ProseMirror-drop-target" }));

  var pos = dropPos(pm, pm.input.dragging && pm.input.dragging.slice, pm.posAtCoords({ left: e.clientX, top: e.clientY }));
  if (pos == null) return;
  var coords = pm.coordsAtPos(pos);
  var rect = pm.wrapper.getBoundingClientRect();
  coords.top -= rect.top;
  coords.right -= rect.left;
  coords.bottom -= rect.top;
  coords.left -= rect.left;
  target.style.left = coords.left - 1 + "px";
  target.style.top = coords.top + "px";
  target.style.height = coords.bottom - coords.top + "px";
};

handlers.dragleave = function (pm, e) {
  if (e.target == pm.content) removeDropTarget(pm);
};

handlers.drop = function (pm, e) {
  var dragging = pm.input.dragging;
  pm.input.dragging = null;
  removeDropTarget(pm);

  // :: (event: DOMEvent) #path=ProseMirror#events#drop
  // Fired when a drop event occurs on the editor content. A handler
  // may declare the event handled by calling `preventDefault` on it
  // or returning a truthy value.
  if (!e.dataTransfer || pm.signalDOM(e)) return;

  var mousePos = pm.posAtCoords({ left: e.clientX, top: e.clientY });
  if (mousePos == null) return;
  var slice = dragging && dragging.slice || fromClipboard(pm, e.dataTransfer, mousePos);
  if (!slice) return;

  e.preventDefault();
  var insertPos = dropPos(pm, slice, mousePos),
      start = insertPos;
  var tr = pm.tr;
  if (dragging && !e.ctrlKey && dragging.from != null) {
    tr.delete(dragging.from, dragging.to);
    insertPos = tr.map(insertPos);
  }
  tr.replace(insertPos, insertPos, slice).apply();
  var found = void 0;
  if (slice.content.childCount == 1 && slice.openLeft == 0 && slice.openRight == 0 && slice.content.child(0).type.selectable && (found = pm.doc.nodeAt(insertPos)) && found.sameMarkup(slice.content.child(0))) {
    pm.setNodeSelection(insertPos);
  } else {
    var left = (0, _selection.findSelectionNear)(pm.doc, insertPos, 1, true).from;
    var right = (0, _selection.findSelectionNear)(pm.doc, tr.map(start), -1, true).to;
    pm.setTextSelection(left, right);
  }
  pm.focus();
};

handlers.focus = function (pm) {
  pm.wrapper.classList.add("ProseMirror-focused");
  // :: () #path=ProseMirror#events#focus
  // Fired when the editor gains focus.
  pm.signal("focus");
};

handlers.blur = function (pm) {
  pm.wrapper.classList.remove("ProseMirror-focused");
  // :: () #path=ProseMirror#events#blur
  // Fired when the editor loses focus.
  pm.signal("blur");
};
},{"../dom":1,"../htmlformat":20,"../model":26,"./capturekeys":3,"./domchange":7,"./dompos":8,"./selection":18,"browserkeymap":50}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DIRTY_REDRAW = exports.DIRTY_RESCAN = exports.ProseMirror = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

require("./css");

var _browserkeymap = require("browserkeymap");

var _browserkeymap2 = _interopRequireDefault(_browserkeymap);

var _sortedinsert = require("../util/sortedinsert");

var _sortedinsert2 = _interopRequireDefault(_sortedinsert);

var _map = require("../util/map");

var _event = require("../util/event");

var _dom = require("../dom");

var _options = require("./options");

var _selection = require("./selection");

var _dompos = require("./dompos");

var _draw = require("./draw");

var _input = require("./input");

var _history = require("./history");

var _range = require("./range");

var _transform = require("./transform");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; This is the class used to represent instances of the editor. A
// ProseMirror editor holds a [document](#Node) and a
// [selection](#Selection), and displays an editable surface
// representing that document in the browser document.
//
// Contains event methods (`on`, etc) from the [event
// mixin](#EventMixin).

var ProseMirror = exports.ProseMirror = function () {
  // :: (Object)
  // Construct a new editor from a set of [options](#edit_options)
  // and, if it has a [`place`](#place) option, add it to the
  // document.

  function ProseMirror(opts) {
    var _this = this;

    _classCallCheck(this, ProseMirror);

    (0, _dom.ensureCSSAdded)();

    opts = this.options = (0, _options.parseOptions)(opts);
    // :: Schema
    // The schema for this editor's document.
    this.schema = opts.schema;
    if (opts.doc == null) opts.doc = this.schema.nodes.doc.create(null, this.schema.nodes.doc.fixContent());
    // :: DOMNode
    // The editable DOM node containing the document.
    this.content = (0, _dom.elt)("div", { class: "ProseMirror-content", "pm-container": true });
    // :: DOMNode
    // The outer DOM element of the editor.
    this.wrapper = (0, _dom.elt)("div", { class: "ProseMirror" }, this.content);
    this.wrapper.ProseMirror = this;

    if (opts.place && opts.place.appendChild) opts.place.appendChild(this.wrapper);else if (opts.place) opts.place(this.wrapper);

    this.setDocInner(opts.doc);
    (0, _draw.draw)(this, this.doc);
    this.content.contentEditable = true;
    if (opts.label) this.content.setAttribute("aria-label", opts.label);

    // A namespace where plugins can store their state. See the `Plugin` class.
    this.plugin = Object.create(null);
    this.cached = Object.create(null);
    this.operation = null;
    this.dirtyNodes = new _map.Map(); // Maps node object to 1 (re-scan content) or 2 (redraw entirely)
    this.flushScheduled = null;

    this.sel = new _selection.SelectionState(this, (0, _selection.findSelectionAtStart)(this.doc));
    this.accurateSelection = false;
    this.input = new _input.Input(this);

    // :: Object<Command>
    // The commands available in the editor.
    this.commands = null;
    this.commandKeys = null;
    (0, _options.initOptions)(this);
    this.options.plugins.forEach(function (plugin) {
      return plugin.attach(_this);
    });
  }

  // :: (string, any)
  // Update the value of the given [option](#edit_options).


  _createClass(ProseMirror, [{
    key: "setOption",
    value: function setOption(name, value) {
      (0, _options.setOption)(this, name, value);
      // :: (name: string, value: *) #path=ProseMirror#events#optionChanged
      // Fired when [`setOption`](#ProseMirror.setOption) is called.
      this.signal("optionChanged", name, value);
    }

    // :: (string) → any
    // Get the current value of the given [option](#edit_options).

  }, {
    key: "getOption",
    value: function getOption(name) {
      return this.options[name];
    }

    // :: Selection
    // Get the current selection.

  }, {
    key: "setTextSelection",


    // :: (number, ?number)
    // Set the selection to a [text selection](#TextSelection) from
    // `anchor` to `head`, or, if `head` is null, a cursor selection at
    // `anchor`.
    value: function setTextSelection(anchor) {
      var head = arguments.length <= 1 || arguments[1] === undefined ? anchor : arguments[1];

      this.checkPos(head, true);
      if (anchor != head) this.checkPos(anchor, true);
      this.setSelection(new _selection.TextSelection(anchor, head));
    }

    // :: (number)
    // Set the selection to a node selection on the node after `pos`.

  }, {
    key: "setNodeSelection",
    value: function setNodeSelection(pos) {
      this.checkPos(pos, false);
      var node = this.doc.nodeAt(pos);
      if (!node) throw new RangeError("Trying to set a node selection that doesn't point at a node");
      if (!node.type.selectable) throw new RangeError("Trying to select a non-selectable node");
      this.setSelection(new _selection.NodeSelection(pos, pos + node.nodeSize, node));
    }

    // :: (Selection)
    // Set the selection to the given selection object.

  }, {
    key: "setSelection",
    value: function setSelection(selection) {
      this.ensureOperation();
      if (!selection.eq(this.sel.range)) this.sel.setAndSignal(selection);
    }
  }, {
    key: "setDocInner",
    value: function setDocInner(doc) {
      if (doc.type != this.schema.nodes.doc) throw new RangeError("Trying to set a document with a different schema");
      // :: Node The current document.
      this.doc = doc;
      this.ranges = new _range.RangeStore(this);
      // :: History The edit history for the editor.
      this.history = new _history.History(this);
    }

    // :: (Node, ?Selection)
    // Set the editor's content, and optionally include a new selection.

  }, {
    key: "setDoc",
    value: function setDoc(doc, sel) {
      if (!sel) sel = (0, _selection.findSelectionAtStart)(doc);
      // :: (doc: Node, selection: Selection) #path=ProseMirror#events#beforeSetDoc
      // Fired when [`setDoc`](#ProseMirror.setDoc) is called, before
      // the document is actually updated.
      this.signal("beforeSetDoc", doc, sel);
      this.ensureOperation();
      this.setDocInner(doc);
      this.operation.docSet = true;
      this.sel.set(sel, true);
      // :: (doc: Node, selection: Selection) #path=ProseMirror#events#setDoc
      // Fired when [`setDoc`](#ProseMirror.setDoc) is called, after
      // the document is updated.
      this.signal("setDoc", doc, sel);
    }
  }, {
    key: "updateDoc",
    value: function updateDoc(doc, mapping, selection) {
      this.ensureOperation();
      this.ranges.transform(mapping);
      this.operation.mappings.push(mapping);
      this.doc = doc;
      this.sel.setAndSignal(selection || this.sel.range.map(doc, mapping));
      // :: () #path=ProseMirror#events#change
      // Fired when the document has changed. See
      // [`setDoc`](#ProseMirror.event_setDoc) and
      // [`transform`](#ProseMirror.event_transform) for more specific
      // change-related events.
      this.signal("change");
    }

    // :: EditorTransform
    // Create an editor- and selection-aware `Transform` for this editor.

  }, {
    key: "apply",


    // :: (Transform, ?Object) → union<Transform,bool>
    // Apply a transformation (which you might want to create with the
    // [`tr` getter](#ProseMirror.tr)) to the document in the editor.
    // The following options are supported:
    //
    // **`selection`**`: ?Selection`
    //   : A new selection to set after the transformation is applied.
    //
    // **`scrollIntoView`**: ?bool
    //   : When true, scroll the selection into view on the next
    //     [redraw](#ProseMirror.flush).
    //
    // **`filter`**: ?bool
    //   : When set to false, suppresses the ability of the
    //     [`"filterTransform"` event](#ProseMirror.event_beforeTransform)
    //     to cancel this transform.
    //
    // Returns the transform, or `false` if there were no steps in it.
    //
    // Has the following property:
    value: function apply(transform) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? nullOptions : arguments[1];

      if (!transform.steps.length) return false;
      if (!transform.docs[0].eq(this.doc)) throw new RangeError("Applying a transform that does not start with the current document");

      // :: (transform: Transform) #path=ProseMirror#events#filterTransform
      // Fired before a transform (applied without `filter: false`) is
      // applied. The handler can return a truthy value to cancel the
      // transform.
      if (options.filter !== false && this.signalHandleable("filterTransform", transform)) return false;

      var selectionBeforeTransform = this.selection;

      // :: (transform: Transform, options: Object) #path=ProseMirror#events#beforeTransform
      // Indicates that the given transform is about to be
      // [applied](#ProseMirror.apply). The handler may add additional
      // [steps](#Step) to the transform, but it it not allowed to
      // interfere with the editor's state.
      this.signal("beforeTransform", transform, options);
      this.updateDoc(transform.doc, transform, options.selection);
      // :: (transform: Transform, selectionBeforeTransform: Selection, options: Object) #path=ProseMirror#events#transform
      // Signals that a (non-empty) transformation has been aplied to
      // the editor. Passes the `Transform`, the selection before the
      // transform, and the options given to [`apply`](#ProseMirror.apply)
      // as arguments to the handler.
      this.signal("transform", transform, selectionBeforeTransform, options);
      if (options.scrollIntoView) this.scrollIntoView();
      return transform;
    }

    // :: (number, ?bool)
    // Verify that the given position is valid in the current document,
    // and throw an error otherwise. When `textblock` is true, the position
    // must also fall within a textblock node.

  }, {
    key: "checkPos",
    value: function checkPos(pos, textblock) {
      var valid = pos >= 0 && pos <= this.doc.content.size;
      if (valid && textblock) valid = this.doc.resolve(pos).parent.isTextblock;
      if (!valid) throw new RangeError("Position " + pos + " is not valid in current document");
    }

    // : (?Object) → Operation
    // Ensure that an operation has started.

  }, {
    key: "ensureOperation",
    value: function ensureOperation(options) {
      return this.operation || this.startOperation(options);
    }

    // : (?Object) → Operation
    // Start an operation and schedule a flush so that any effect of
    // the operation shows up in the DOM.

  }, {
    key: "startOperation",
    value: function startOperation(options) {
      var _this2 = this;

      this.operation = new Operation(this, options);
      if (!(options && options.readSelection === false) && this.sel.readFromDOM()) this.operation.sel = this.sel.range;

      if (this.flushScheduled == null) this.flushScheduled = (0, _dom.requestAnimationFrame)(function () {
        return _this2.flush();
      });
      return this.operation;
    }

    // Cancel any scheduled operation flush.

  }, {
    key: "unscheduleFlush",
    value: function unscheduleFlush() {
      if (this.flushScheduled != null) {
        (0, _dom.cancelAnimationFrame)(this.flushScheduled);
        this.flushScheduled = null;
      }
    }

    // :: () → bool
    // Flush any pending changes to the DOM. When the document,
    // selection, or marked ranges in an editor change, the DOM isn't
    // updated immediately, but rather scheduled to be updated the next
    // time the browser redraws the screen. This method can be used to
    // force this to happen immediately. It can be useful when you, for
    // example, want to measure where on the screen a part of the
    // document ends up, immediately after changing the document.
    //
    // Returns true when it updated the document DOM.

  }, {
    key: "flush",
    value: function flush() {
      this.unscheduleFlush();

      if (!document.body.contains(this.wrapper) || !this.operation) return false;
      // :: () #path=ProseMirror#events#flushing
      // Fired when the editor is about to [flush](#ProseMirror.flush)
      // an update to the DOM.
      this.signal("flushing");

      var op = this.operation,
          redrawn = false;
      if (!op) return false;
      if (op.composing) this.input.applyComposition();

      this.operation = null;
      this.accurateSelection = true;

      if (op.doc != this.doc || this.dirtyNodes.size) {
        (0, _draw.redraw)(this, this.dirtyNodes, this.doc, op.doc);
        this.dirtyNodes.clear();
        redrawn = true;
      }

      if (redrawn || !op.sel.eq(this.sel.range) || op.focus) this.sel.toDOM(op.focus);

      // FIXME somehow schedule this relative to ui/update so that it
      // doesn't cause extra layout
      if (op.scrollIntoView !== false) (0, _dompos.scrollIntoView)(this, op.scrollIntoView);
      // :: () #path=ProseMirror#events#draw
      // Fired when the editor redrew its document in the DOM.
      if (redrawn) this.signal("draw");
      // :: () #path=ProseMirror#events#flush
      // Fired when the editor has finished
      // [flushing](#ProseMirror.flush) an update to the DOM.
      this.signal("flush");
      this.accurateSelection = false;
      return redrawn;
    }

    // :: (Keymap, ?number)
    // Add a
    // [keymap](https://github.com/marijnh/browserkeymap#an-object-type-for-keymaps)
    // to the editor. Keymaps added in this way are queried before the
    // base keymap. The `rank` parameter can be used to
    // control when they are queried relative to other maps added like
    // this. Maps with a lower rank get queried first.

  }, {
    key: "addKeymap",
    value: function addKeymap(map) {
      var rank = arguments.length <= 1 || arguments[1] === undefined ? 50 : arguments[1];

      (0, _sortedinsert2.default)(this.input.keymaps, { map: map, rank: rank }, function (a, b) {
        return a.rank - b.rank;
      });
    }

    // :: (union<string, Keymap>)
    // Remove the given keymap, or the keymap with the given name, from
    // the editor.

  }, {
    key: "removeKeymap",
    value: function removeKeymap(map) {
      var maps = this.input.keymaps;
      for (var i = 0; i < maps.length; ++i) {
        if (maps[i].map == map || maps[i].map.options.name == map) {
          maps.splice(i, 1);
          return true;
        }
      }
    }

    // :: (number, number, ?Object) → MarkedRange
    // Create a marked range between the given positions. Marked ranges
    // “track” the part of the document they point to—as the document
    // changes, they are updated to move, grow, and shrink along with
    // their content.
    //
    // `options` may be an object containing these properties:
    //
    // **`inclusiveLeft`**`: bool = false`
    //   : Whether the left side of the range is inclusive. When it is,
    //     content inserted at that point will become part of the range.
    //     When not, it will be outside of the range.
    //
    // **`inclusiveRight`**`: bool = false`
    //   : Whether the right side of the range is inclusive.
    //
    // **`removeWhenEmpty`**`: bool = true`
    //   : Whether the range should be forgotten when it becomes empty
    //     (because all of its content was deleted).
    //
    // **`className`**: string
    //   : A CSS class to add to the inline content that is part of this
    //     range.

  }, {
    key: "markRange",
    value: function markRange(from, to, options) {
      this.checkPos(from);
      this.checkPos(to);
      var range = new _range.MarkedRange(from, to, options);
      this.ranges.addRange(range);
      return range;
    }

    // :: (MarkedRange)
    // Remove the given range from the editor.

  }, {
    key: "removeRange",
    value: function removeRange(range) {
      this.ranges.removeRange(range);
    }

    // :: (MarkType, ?bool, ?Object)
    // Set (when `to` is true), unset (`to` is false), or toggle (`to`
    // is null) the given mark type on the selection. When there is a
    // non-empty selection, the marks of the selection are updated. When
    // the selection is empty, the set of [active
    // marks](#ProseMirror.activeMarks) is updated.

  }, {
    key: "setMark",
    value: function setMark(type, to, attrs) {
      var sel = this.selection;
      if (sel.empty) {
        var marks = this.activeMarks(),
            $head = void 0;
        if (to == null) to = !type.isInSet(marks);
        if (to && ($head = this.doc.resolve(sel.head)) && !$head.parent.contentMatchAt($head.index()).allowsMark(type)) return;
        this.input.storedMarks = to ? type.create(attrs).addToSet(marks) : type.removeFromSet(marks);
        // :: () #path=ProseMirror#events#activeMarkChange
        // Fired when the set of [active marks](#ProseMirror.activeMarks) changes.
        this.signal("activeMarkChange");
      } else {
        if (to != null ? to : !this.doc.rangeHasMark(sel.from, sel.to, type)) this.apply(this.tr.addMark(sel.from, sel.to, type.create(attrs)));else this.apply(this.tr.removeMark(sel.from, sel.to, type));
      }
    }

    // :: () → [Mark]
    // Get the marks at the cursor. By default, this yields the marks
    // associated with the content at the cursor, as per `Node.marksAt`.
    // But `setMark` may have been used to change the set of active
    // marks, in which case that set is returned.

  }, {
    key: "activeMarks",
    value: function activeMarks() {
      var head;
      return this.input.storedMarks || ((head = this.selection.head) != null ? this.doc.marksAt(head) : []);
    }

    // :: ()
    // Give the editor focus.

  }, {
    key: "focus",
    value: function focus() {
      if (this.operation) this.operation.focus = true;else this.sel.toDOM(true);
    }

    // :: () → bool
    // Query whether the editor has focus.

  }, {
    key: "hasFocus",
    value: function hasFocus() {
      if (this.sel.range instanceof _selection.NodeSelection) return document.activeElement == this.content;else return (0, _selection.hasFocus)(this);
    }

    // :: ({top: number, left: number}) → ?number
    // If the given coordinates (which should be relative to the top
    // left corner of the window—not the page) fall within the editable
    // content, this method will return the document position that
    // corresponds to those coordinates.

  }, {
    key: "posAtCoords",
    value: function posAtCoords(coords) {
      this.flush();
      return (0, _dompos.posAtCoords)(this, coords);
    }

    // :: (number) → {top: number, left: number, bottom: number}
    // Find the screen coordinates (relative to top left corner of the
    // window) of the given document position.

  }, {
    key: "coordsAtPos",
    value: function coordsAtPos(pos) {
      this.checkPos(pos);
      this.flush();
      return (0, _dompos.coordsAtPos)(this, pos);
    }

    // :: (?number)
    // Scroll the given position, or the cursor position if `pos` isn't
    // given, into view.

  }, {
    key: "scrollIntoView",
    value: function scrollIntoView() {
      var pos = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

      if (pos) this.checkPos(pos);
      this.ensureOperation();
      this.operation.scrollIntoView = pos;
    }

    // :: (string, ?[any]) → bool
    // Execute the named [command](#Command). If the command takes
    // parameters, they can be passed as an array.

  }, {
    key: "execCommand",
    value: function execCommand(name, params) {
      var cmd = this.commands[name];
      return !!(cmd && cmd.exec(this, params) !== false);
    }

    // :: (string) → ?string
    // Return the name of the key that is bound to the given command, if
    // any.

  }, {
    key: "keyForCommand",
    value: function keyForCommand(name) {
      var cached = this.commandKeys[name];
      if (cached !== undefined) return cached;

      var cmd = this.commands[name],
          keymap = this.input.baseKeymap;
      if (!cmd) return this.commandKeys[name] = null;
      var key = cmd.spec.key || (_dom.browser.mac ? cmd.spec.macKey : cmd.spec.pcKey);
      if (key) {
        key = _browserkeymap2.default.normalizeKeyName(Array.isArray(key) ? key[0] : key);
        var deflt = keymap.bindings[key];
        if (Array.isArray(deflt) ? deflt.indexOf(name) > -1 : deflt == name) return this.commandKeys[name] = key;
      }
      for (var _key in keymap.bindings) {
        var bound = keymap.bindings[_key];
        if (Array.isArray(bound) ? bound.indexOf(name) > -1 : bound == name) return this.commandKeys[name] = _key;
      }
      return this.commandKeys[name] = null;
    }
  }, {
    key: "markRangeDirty",
    value: function markRangeDirty(from, to) {
      var doc = arguments.length <= 2 || arguments[2] === undefined ? this.doc : arguments[2];

      this.ensureOperation();
      var dirty = this.dirtyNodes;
      var $from = doc.resolve(from),
          $to = doc.resolve(to);
      var same = $from.sameDepth($to);
      for (var depth = 0; depth <= same; depth++) {
        var child = $from.node(depth);
        if (!dirty.has(child)) dirty.set(child, DIRTY_RESCAN);
      }
      var start = $from.index(same),
          end = $to.index(same) + (same == $to.depth && $to.atNodeBoundary ? 0 : 1);
      var parent = $from.node(same);
      for (var i = start; i < end; i++) {
        dirty.set(parent.child(i), DIRTY_REDRAW);
      }
    }
  }, {
    key: "markAllDirty",
    value: function markAllDirty() {
      this.dirtyNodes.set(this.doc, DIRTY_REDRAW);
    }

    // :: (string) → string
    // Return a translated string, if a translate function has been supplied,
    // or the original string.

  }, {
    key: "translate",
    value: function translate(string) {
      var trans = this.options.translate;
      return trans ? trans(string) : string;
    }
  }, {
    key: "selection",
    get: function get() {
      if (!this.accurateSelection) this.ensureOperation();
      return this.sel.range;
    }
  }, {
    key: "tr",
    get: function get() {
      return new _transform.EditorTransform(this);
    }
  }]);

  return ProseMirror;
}();

// :: Object
// The object `{scrollIntoView: true}`, which is a common argument to
// pass to `ProseMirror.apply` or `EditorTransform.apply`.


ProseMirror.prototype.apply.scroll = { scrollIntoView: true };

var DIRTY_RESCAN = exports.DIRTY_RESCAN = 1,
    DIRTY_REDRAW = exports.DIRTY_REDRAW = 2;

var nullOptions = {};

(0, _event.eventMixin)(ProseMirror);

// Operations are used to delay/batch DOM updates. When a change to
// the editor state happens, it is not immediately flushed to the DOM,
// but rather a call to `ProseMirror.flush` is scheduled using
// `requestAnimationFrame`. An object of this class is stored in the
// editor's `operation` property, and holds information about the
// state at the start of the operation, which can be used to determine
// the minimal DOM update needed. It also stores information about
// whether a focus needs to happen on flush, and whether something
// needs to be scrolled into view.

var Operation = function Operation(pm, options) {
  _classCallCheck(this, Operation);

  this.doc = pm.doc;
  this.docSet = false;
  this.sel = options && options.selection || pm.sel.range;
  this.scrollIntoView = false;
  this.focus = false;
  this.mappings = [];
  this.composing = null;
};
},{"../dom":1,"../util/event":45,"../util/map":46,"../util/sortedinsert":49,"./css":6,"./dompos":8,"./draw":9,"./history":10,"./input":12,"./options":14,"./range":16,"./selection":18,"./transform":19,"browserkeymap":50}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseOptions = parseOptions;
exports.initOptions = initOptions;
exports.setOption = setOption;

var _schema = require("../schema");

var _prompt = require("../ui/prompt");

var _command = require("./command");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// An option encapsulates functionality for an editor instance,
// e.g. the amount of history events that the editor should hold
// onto or the document's schema.

var Option = function Option(defaultValue, update, updateOnInit) {
  _classCallCheck(this, Option);

  this.defaultValue = defaultValue;
  // A function that will be invoked with the option's old and new
  // value every time the option is [set](#ProseMirror.setOption).
  // This function should bootstrap option functionality.
  this.update = update;
  this.updateOnInit = updateOnInit !== false;
};

var options = Object.create(null);

// : (string, any, ?(pm: ProseMirror, newValue: any, oldValue: any, init: bool), bool)
// Define a new option. The `update` handler will be called with the
// option's old and new value every time the option is
// [changed](#ProseMirror.setOption). When `updateOnInit` is false, it
// will not be called on editor init, otherwise it is called with null as the old value,
// and a fourth argument of true.
function defineOption(name, defaultValue, update, updateOnInit) {
  options[name] = new Option(defaultValue, update, updateOnInit);
}

// :: Schema #path=schema #kind=option
// The [schema](#Schema) that the editor's document should use.
defineOption("schema", _schema.defaultSchema);

// :: Node #path=doc #kind=option
// The starting document.
defineOption("doc", null, function (pm, value) {
  return pm.setDoc(value);
}, false);

// :: ?union<DOMNode, (DOMNode)> #path=place #kind=option
// Determines the placement of the editor in the page. When `null`,
// the editor is not placed. When a DOM node is given, the editor is
// appended to that node. When a function is given, it is called
// with the editor's wrapping DOM node, and is expected to place it
// into the document.
defineOption("place", null);

// :: number #path=historyDepth #kind=option
// The amount of history events that are collected before the oldest
// events are discarded. Defaults to 100.
defineOption("historyDepth", 100);

// :: number #path=historyEventDelay #kind=option
// The amount of milliseconds that must pass between changes to
// start a new history event. Defaults to 500.
defineOption("historyEventDelay", 500);

// :: number #path=scrollThreshold #kind=option
// The minimum distance to keep between the position of document
// changes and the editor bounding rectangle before scrolling the view.
// Defaults to 0.
defineOption("scrollThreshold", 0);

// :: number #path=scrollMargin #kind=option
// Determines how far to scroll when the scroll threshold is
// surpassed. Defaults to 5.
defineOption("scrollMargin", 5);

// :: CommandSet #path=commands #kind=option
// Specifies the set of [commands](#Command) available in the editor
// (which in turn determines the base key bindings and items available
// in the menus). Defaults to `CommandSet.default`.
defineOption("commands", _command.CommandSet.default, _command.updateCommands);

// :: ParamPrompt #path=commandParamPrompt #kind=option
// A default [parameter prompting](#ui/prompt) class to use when a
// command is [executed](#ProseMirror.execCommand) without providing
// parameters.
defineOption("commandParamPrompt", _prompt.ParamPrompt);

// :: ?string #path=label #kind=option
// The label of the editor. When set, the editable DOM node gets an
// `aria-label` attribute with this value.
defineOption("label", null);

// :: ?(string) → string #path=translate #kind=option
// Optional function to translate strings such as menu labels and prompts.
// When set, should be a function that takes a string as argument and returns
// a string, i.e. :: (string) → string
defineOption("translate", null); // FIXME create a way to explicitly force a menu redraw

defineOption("plugins", [], false);

function parseOptions(obj) {
  var result = Object.create(null);
  var given = obj ? [obj].concat(obj.use || []) : [];
  outer: for (var opt in options) {
    for (var i = 0; i < given.length; i++) {
      if (opt in given[i]) {
        result[opt] = given[i][opt];
        continue outer;
      }
    }
    result[opt] = options[opt].defaultValue;
  }
  return result;
}

function initOptions(pm) {
  for (var opt in options) {
    var desc = options[opt];
    if (desc.update && desc.updateOnInit) desc.update(pm, pm.options[opt], null, true);
  }
}

function setOption(pm, name, value) {
  var desc = options[name];
  if (desc === undefined) throw new RangeError("Option '" + name + "' is not defined");
  if (desc.update === false) throw new RangeError("Option '" + name + "' can not be changed");
  var old = pm.options[name];
  pm.options[name] = value;
  if (desc.update) desc.update(pm, value, old, false);
}
},{"../schema":32,"../ui/prompt":42,"./command":5}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var pluginProps = Object.create(null);

// Each plugin gets assigned a unique property name, so that its state
// can be stored in the editor's `plugin` object.
function registerProp() {
  var name = arguments.length <= 0 || arguments[0] === undefined ? "plugin" : arguments[0];

  for (var i = 1;; i++) {
    var prop = name + (i > 1 ? "_" + i : "");
    if (!(prop in pluginProps)) return pluginProps[prop] = prop;
  }
}

// ;; A plugin is a piece of functionality that can be attached to a
// ProseMirror instance. It may do something like show a
// [menu](#menubar) or wire in [collaborative editing](#collab). The
// plugin object is the interface to enabling and disabling the
// plugin, and for those where this is relevant, for accessing its
// state.

var Plugin = exports.Plugin = function () {
  // :: (constructor, ?Object)
  // Create a plugin object for the given state class. If desired, you
  // can pass a collection of options. When initializing the plugin,
  // it will receive the ProseMirror instance and the options as
  // arguments to its constructor.

  function Plugin(State, options, prop) {
    _classCallCheck(this, Plugin);

    this.State = State;
    this.options = options || Object.create(null);
    this.prop = prop || registerProp(State.name);
  }

  // :: (ProseMirror) → ?any
  // Return the plugin state for the given editor, if any.


  _createClass(Plugin, [{
    key: "get",
    value: function get(pm) {
      return pm.plugin[this.prop];
    }

    // :: (ProseMirror) → any
    // Initialize the plugin for the given editor. If it was already
    // enabled, it is first disabled and then re-enabled.

  }, {
    key: "attach",
    value: function attach(pm) {
      this.detach(pm);
      return pm.plugin[this.prop] = new this.State(pm, this.options);
    }

    // :: (ProseMirror)
    // Disable the plugin in the given editor. If the state has a
    // `detach` method, that will be called with the editor as argument,
    // to give it a chance to clean up.

  }, {
    key: "detach",
    value: function detach(pm) {
      var found = this.get(pm);
      if (found) {
        if (found.detach) found.detach(pm);
        delete pm.plugin[this.prop];
      }
    }

    // :: (ProseMirror) → any
    // Get the plugin state for an editor. Initializes the plugin if it
    // wasn't already active.

  }, {
    key: "ensure",
    value: function ensure(pm) {
      return this.get(pm) || this.attach(pm);
    }

    // :: (?Object) → Plugin
    // Configure the plugin. The given options will be combined with the
    // existing (default) options, with the newly provided ones taking
    // precedence. Returns a new plugin object with the new
    // configuration.

  }, {
    key: "config",
    value: function config(options) {
      if (!options) return this;
      var result = Object.create(null);
      for (var prop in this.options) {
        result[prop] = this.options[prop];
      }for (var _prop in options) {
        result[_prop] = options[_prop];
      }return new Plugin(this.State, result, this.prop);
    }
  }]);

  return Plugin;
}();
},{}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RangeStore = exports.MarkedRange = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _event = require("../util/event");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; A [marked range](#ProseMirror.markRange). Includes the methods
// from the [event mixin](#EventMixin).

var MarkedRange = exports.MarkedRange = function () {
  function MarkedRange(from, to, options) {
    _classCallCheck(this, MarkedRange);

    this.options = options || {};
    // :: ?number
    // The current start position of the range. Updated whenever the
    // editor's document is changed. Set to `null` when the marked
    // range is [removed](#ProseMirror.removeRange).
    this.from = from;
    // :: ?number
    // The current end position of the range. Updated whenever the
    // editor's document is changed. Set to `null` when the marked
    // range is [removed](#ProseMirror.removeRange).
    this.to = to;
  }

  _createClass(MarkedRange, [{
    key: "remove",
    value: function remove() {
      // :: (from: number, to: number) #path=MarkedRange#events#removed
      // Signalled when the marked range is removed from the editor.
      this.signal("removed", this.from, Math.max(this.to, this.from));
      this.from = this.to = null;
    }
  }]);

  return MarkedRange;
}();

(0, _event.eventMixin)(MarkedRange);

var RangeSorter = function () {
  function RangeSorter() {
    _classCallCheck(this, RangeSorter);

    this.sorted = [];
  }

  _createClass(RangeSorter, [{
    key: "find",
    value: function find(at) {
      var min = 0,
          max = this.sorted.length;
      for (;;) {
        if (max < min + 10) {
          for (var i = min; i < max; i++) {
            if (this.sorted[i].at >= at) return i;
          }return max;
        }
        var mid = min + max >> 1;
        if (this.sorted[mid].at > at) max = mid;else min = mid;
      }
    }
  }, {
    key: "insert",
    value: function insert(obj) {
      this.sorted.splice(this.find(obj.at), 0, obj);
    }
  }, {
    key: "remove",
    value: function remove(at, range) {
      var pos = this.find(at);
      for (var dist = 0;; dist++) {
        var leftPos = pos - dist - 1,
            rightPos = pos + dist;
        if (leftPos >= 0 && this.sorted[leftPos].range == range) {
          this.sorted.splice(leftPos, 1);
          return;
        } else if (rightPos < this.sorted.length && this.sorted[rightPos].range == range) {
          this.sorted.splice(rightPos, 1);
          return;
        }
      }
    }
  }, {
    key: "resort",
    value: function resort() {
      for (var i = 0; i < this.sorted.length; i++) {
        var cur = this.sorted[i];
        var at = cur.at = cur.type == "open" ? cur.range.from : cur.range.to;
        var pos = i;
        while (pos > 0 && this.sorted[pos - 1].at > at) {
          this.sorted[pos] = this.sorted[pos - 1];
          this.sorted[--pos] = cur;
        }
      }
    }
  }]);

  return RangeSorter;
}();

var RangeStore = exports.RangeStore = function () {
  function RangeStore(pm) {
    _classCallCheck(this, RangeStore);

    this.pm = pm;
    this.ranges = [];
    this.sorted = new RangeSorter();
  }

  _createClass(RangeStore, [{
    key: "addRange",
    value: function addRange(range) {
      this.ranges.push(range);
      this.sorted.insert({ type: "open", at: range.from, range: range });
      this.sorted.insert({ type: "close", at: range.to, range: range });
      if (range.options.className) this.pm.markRangeDirty(range.from, range.to);
    }
  }, {
    key: "removeRange",
    value: function removeRange(range) {
      var found = this.ranges.indexOf(range);
      if (found > -1) {
        this.ranges.splice(found, 1);
        this.sorted.remove(range.from, range);
        this.sorted.remove(range.to, range);
        if (range.options.className) this.pm.markRangeDirty(range.from, range.to);
        range.remove();
      }
    }
  }, {
    key: "transform",
    value: function transform(mapping) {
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this.ranges[i];
        range.from = mapping.map(range.from, range.options.inclusiveLeft ? -1 : 1);
        range.to = mapping.map(range.to, range.options.inclusiveRight ? 1 : -1);
        if (range.options.removeWhenEmpty !== false && range.from >= range.to) {
          this.removeRange(range);
          i--;
        } else if (range.from > range.to) {
          range.to = range.from;
        }
      }
      this.sorted.resort();
    }
  }, {
    key: "activeRangeTracker",
    value: function activeRangeTracker() {
      return new RangeTracker(this.sorted.sorted);
    }
  }]);

  return RangeStore;
}();

function significant(range) {
  return range.options.className && range.from != range.to;
}

var RangeTracker = function () {
  function RangeTracker(sorted) {
    _classCallCheck(this, RangeTracker);

    this.sorted = sorted;
    this.pos = 0;
    this.current = [];
  }

  _createClass(RangeTracker, [{
    key: "advanceTo",
    value: function advanceTo(pos) {
      var next = void 0;
      while (this.pos < this.sorted.length && (next = this.sorted[this.pos]).at <= pos) {
        if (significant(next.range)) {
          var className = next.range.options.className;
          if (next.type == "open") this.current.push(className);else this.current.splice(this.current.indexOf(className), 1);
        }
        this.pos++;
      }
    }
  }, {
    key: "nextChangeBefore",
    value: function nextChangeBefore(pos) {
      for (;;) {
        if (this.pos == this.sorted.length) return -1;
        var next = this.sorted[this.pos];
        if (!significant(next.range)) this.pos++;else if (next.at >= pos) return -1;else return next.at;
      }
    }
  }]);

  return RangeTracker;
}();
},{"../util/event":45}],17:[function(require,module,exports){
"use strict";

var _schema = require("../schema");

var _model = require("../model");

var _transform = require("../transform");

var _command = require("./command");

// # Mark types

// ;; #path="strong:set" #kind=command
// Add the [strong](#StrongMark) mark to the selected content.
_schema.StrongMark.register("command", "set", { derive: true, label: "Set strong" });

// ;; #path="strong:unset" #kind=command
// Remove the [strong](#StrongMark) mark from the selected content.
_schema.StrongMark.register("command", "unset", { derive: true, label: "Unset strong" });

// ;; #path="strong:toggle" #kind=command
// Toggle the [strong](#StrongMark) mark. If there is any strong
// content in the selection, or there is no selection and the [active
// marks](#ProseMirror.activeMarks) contain the strong mark, this
// counts as [active](#Command.active) and executing it removes the
// mark. Otherwise, this does not count as active, and executing it
// makes the selected content strong.
//
// **Keybindings:** Mod-B
_schema.StrongMark.register("command", "toggle", {
  derive: true,
  label: "Toggle strong",
  menu: {
    group: "inline", rank: 20,
    display: {
      type: "icon",
      width: 805, height: 1024,
      path: "M317 869q42 18 80 18 214 0 214-191 0-65-23-102-15-25-35-42t-38-26-46-14-48-6-54-1q-41 0-57 5 0 30-0 90t-0 90q0 4-0 38t-0 55 2 47 6 38zM309 442q24 4 62 4 46 0 81-7t62-25 42-51 14-81q0-40-16-70t-45-46-61-24-70-8q-28 0-74 7 0 28 2 86t2 86q0 15-0 45t-0 45q0 26 0 39zM0 950l1-53q8-2 48-9t60-15q4-6 7-15t4-19 3-18 1-21 0-19v-37q0-561-12-585-2-4-12-8t-25-6-28-4-27-2-17-1l-2-47q56-1 194-6t213-5q13 0 39 0t38 0q40 0 78 7t73 24 61 40 42 59 16 78q0 29-9 54t-22 41-36 32-41 25-48 22q88 20 146 76t58 141q0 57-20 102t-53 74-78 48-93 27-100 8q-25 0-75-1t-75-1q-60 0-175 6t-132 6z"
    }
  },
  keys: ["Mod-B"]
});

// ;; #path=em:set #kind=command
// Add the [emphasis](#EmMark) mark to the selected content.
_schema.EmMark.register("command", "set", { derive: true, label: "Add emphasis" });

// ;; #path=em:unset #kind=command
// Remove the [emphasis](#EmMark) mark from the selected content.
_schema.EmMark.register("command", "unset", { derive: true, label: "Remove emphasis" });

// ;; #path=em:toggle #kind=command
// Toggle the [emphasis](#EmMark) mark. If there is any emphasized
// content in the selection, or there is no selection and the [active
// marks](#ProseMirror.activeMarks) contain the emphasis mark, this
// counts as [active](#Command.active) and executing it removes the
// mark. Otherwise, this does not count as active, and executing it
// makes the selected content emphasized.
//
// **Keybindings:** Mod-I
_schema.EmMark.register("command", "toggle", {
  derive: true,
  label: "Toggle emphasis",
  menu: {
    group: "inline", rank: 21,
    display: {
      type: "icon",
      width: 585, height: 1024,
      path: "M0 949l9-48q3-1 46-12t63-21q16-20 23-57 0-4 35-165t65-310 29-169v-14q-13-7-31-10t-39-4-33-3l10-58q18 1 68 3t85 4 68 1q27 0 56-1t69-4 56-3q-2 22-10 50-17 5-58 16t-62 19q-4 10-8 24t-5 22-4 26-3 24q-15 84-50 239t-44 203q-1 5-7 33t-11 51-9 47-3 32l0 10q9 2 105 17-1 25-9 56-6 0-18 0t-18 0q-16 0-49-5t-49-5q-78-1-117-1-29 0-81 5t-69 6z"
    }
  },
  keys: ["Mod-I"]
});

// ;; #path=code:set #kind=command
// Add the [code](#CodeMark) mark to the selected content.
_schema.CodeMark.register("command", "set", { derive: true, label: "Set code style" });

// ;; #path=code:unset #kind=command
// Remove the [code](#CodeMark) mark from the selected content.
_schema.CodeMark.register("command", "unset", { derive: true, label: "Remove code style" });

// ;; #path=code:toggle #kind=command
// Toggle the [code](#CodeMark) mark. If there is any code-styled
// content in the selection, or there is no selection and the [active
// marks](#ProseMirror.activeMarks) contain the code mark, this
// counts as [active](#Command.active) and executing it removes the
// mark. Otherwise, this does not count as active, and executing it
// styles the selected content as code.
//
// **Keybindings:** Mod-`
_schema.CodeMark.register("command", "toggle", {
  derive: true,
  label: "Toggle code style",
  menu: {
    group: "inline", rank: 22,
    display: {
      type: "icon",
      width: 896, height: 1024,
      path: "M608 192l-96 96 224 224-224 224 96 96 288-320-288-320zM288 192l-288 320 288 320 96-96-224-224 224-224-96-96z"
    }
  },
  keys: ["Mod-`"]
});

var linkIcon = {
  type: "icon",
  width: 951, height: 1024,
  path: "M832 694q0-22-16-38l-118-118q-16-16-38-16-24 0-41 18 1 1 10 10t12 12 8 10 7 14 2 15q0 22-16 38t-38 16q-8 0-15-2t-14-7-10-8-12-12-10-10q-18 17-18 41 0 22 16 38l117 118q15 15 38 15 22 0 38-14l84-83q16-16 16-38zM430 292q0-22-16-38l-117-118q-16-16-38-16-22 0-38 15l-84 83q-16 16-16 38 0 22 16 38l118 118q15 15 38 15 24 0 41-17-1-1-10-10t-12-12-8-10-7-14-2-15q0-22 16-38t38-16q8 0 15 2t14 7 10 8 12 12 10 10q18-17 18-41zM941 694q0 68-48 116l-84 83q-47 47-116 47-69 0-116-48l-117-118q-47-47-47-116 0-70 50-119l-50-50q-49 50-118 50-68 0-116-48l-118-118q-48-48-48-116t48-116l84-83q47-47 116-47 69 0 116 48l117 118q47 47 47 116 0 70-50 119l50 50q49-50 118-50 68 0 116 48l118 118q48 48 48 116z"
};

// ;; #path=link:unset #kind=command
// Removes all links for the selected content, or, if there is no
// selection, from the [active marks](#ProseMirror.activeMarks). Will
// only [select](#Command.select) itself when there is a link in the
// selection or active marks.
_schema.LinkMark.register("command", "unset", {
  derive: true,
  label: "Unlink",
  menu: { group: "inline", rank: 30, display: linkIcon },
  active: function active() {
    return true;
  }
});

// ;; #path=link:set #kind=command
// Adds a link mark to the selection or set of [active
// marks](#ProseMirror.activeMarks). Takes parameters to determine the
// attributes of the link:
//
// **`href`**`: string`
//   : The link's target.
//
// **`title`**`: string`
//   : The link's title.
//
// Only selects itself when `unlink` isn't selected, so that only one
// of the two is visible in the menu at any time.
_schema.LinkMark.register("command", "set", {
  derive: {
    inverseSelect: true,
    params: [{ label: "Target", attr: "href" }, { label: "Title", attr: "title" }]
  },
  label: "Add link",
  menu: { group: "inline", rank: 30, display: linkIcon }
});

// Node types

// ;; #path=image:insert #kind=command
// Replace the selection with an [image](#Image) node. Takes paramers
// that specify the image's attributes:
//
// **`src`**`: string`
//   : The URL of the image.
//
// **`alt`**`: string`
//   : The alt text for the image.
//
// **`title`**`: string`
//   : A title for the image.
_schema.Image.register("command", "insert", {
  derive: {
    params: [{ label: "Image URL", attr: "src" }, { label: "Description / alternative text", attr: "alt",
      prefill: function prefill(pm) {
        return (0, _command.selectedNodeAttr)(pm, this, "alt") || pm.doc.textBetween(pm.selection.from, pm.selection.to, " ");
      } }, { label: "Title", attr: "title" }]
  },
  label: "Insert image",
  menu: {
    group: "insert", rank: 20,
    display: { type: "label", label: "Image" }
  }
});

// ;; #path=bullet_list:wrap #kind=command
// Wrap the selection in a bullet list.
//
// **Keybindings:** Shift-Ctrl-8
_schema.BulletList.register("command", "wrap", {
  derive: { list: true },
  label: "Wrap the selection in a bullet list",
  menu: {
    group: "block", rank: 40,
    display: {
      type: "icon",
      width: 768, height: 896,
      path: "M0 512h128v-128h-128v128zM0 256h128v-128h-128v128zM0 768h128v-128h-128v128zM256 512h512v-128h-512v128zM256 256h512v-128h-512v128zM256 768h512v-128h-512v128z"
    }
  },
  keys: ["Shift-Ctrl-8"]
});

// ;; #path=ordered_list:wrap #kind=command
// Wrap the selection in an ordered list.
//
// **Keybindings:** Shift-Ctrl-9
_schema.OrderedList.register("command", "wrap", {
  derive: { list: true },
  label: "Wrap the selection in an ordered list",
  menu: {
    group: "block", rank: 41,
    display: {
      type: "icon",
      width: 768, height: 896,
      path: "M320 512h448v-128h-448v128zM320 768h448v-128h-448v128zM320 128v128h448v-128h-448zM79 384h78v-256h-36l-85 23v50l43-2v185zM189 590c0-36-12-78-96-78-33 0-64 6-83 16l1 66c21-10 42-15 67-15s32 11 32 28c0 26-30 58-110 112v50h192v-67l-91 2c49-30 87-66 87-113l1-1z"
    }
  },
  keys: ["Shift-Ctrl-9"]
});

// ;; #path=blockquote:wrap #kind=command
// Wrap the selection in a block quote.
//
// **Keybindings:** Shift-Ctrl-.
_schema.BlockQuote.register("command", "wrap", {
  derive: true,
  label: "Wrap the selection in a block quote",
  menu: {
    group: "block", rank: 45,
    display: {
      type: "icon",
      width: 640, height: 896,
      path: "M0 448v256h256v-256h-128c0 0 0-128 128-128v-128c0 0-256 0-256 256zM640 320v-128c0 0-256 0-256 256v256h256v-256h-128c0 0 0-128 128-128z"
    }
  },
  keys: ["Shift-Ctrl-."]
});

// ;; #path=hard_break:insert #kind=command
// Replace the selection with a hard break node. If the selection is
// in a node whose [type](#NodeType) has a truthy `isCode` property
// (such as `CodeBlock` in the default schema), a regular newline is
// inserted instead.
//
// **Keybindings:** Mod-Enter, Shift-Enter
_schema.HardBreak.register("command", "insert", {
  label: "Insert hard break",
  run: function run(pm) {
    var _pm$selection = pm.selection;
    var node = _pm$selection.node;
    var from = _pm$selection.from;

    if (node && node.isBlock) return false;else if (pm.doc.resolve(from).parent.type.isCode) return pm.tr.typeText("\n").apply(pm.apply.scroll);else return pm.tr.replaceSelection(this.create()).apply(pm.apply.scroll);
  },

  keys: { all: ["Mod-Enter", "Shift-Enter"],
    mac: ["Ctrl-Enter"] }
});

// ;; #path=list_item:split #kind=command
// If the selection is a text selection inside of a child of a list
// item, split that child and the list item, and delete the selection.
//
// **Keybindings:** Enter
_schema.ListItem.register("command", "split", {
  label: "Split the current list item",
  run: function run(pm) {
    var _pm$selection2 = pm.selection;
    var from = _pm$selection2.from;
    var to = _pm$selection2.to;
    var node = _pm$selection2.node;var $from = pm.doc.resolve(from);
    if (node && node.isBlock || $from.depth < 2 || !$from.sameParent(pm.doc.resolve(to))) return false;
    var grandParent = $from.node(-1);
    if (grandParent.type != this) return false;
    var nextType = to == $from.end() ? grandParent.defaultContentType($from.indexAfter(-1)) : null;
    var tr = pm.tr.delete(from, to);
    if ((0, _transform.canSplit)(tr.doc, from, 2, nextType)) return tr.split(from, 2, nextType).apply(pm.apply.scroll);
    return false;
  },

  keys: ["Enter(50)"]
});

function selectedListItems(pm, type) {
  var _pm$selection3 = pm.selection;
  var node = _pm$selection3.node;
  var from = _pm$selection3.from;
  var to = _pm$selection3.to;var $from = pm.doc.resolve(from);
  if (node && node.type == type) return { from: from, to: to, depth: $from.depth + 1 };

  var itemDepth = $from.parent.type == type ? $from.depth : $from.depth > 0 && $from.node(-1).type == type ? $from.depth - 1 : null;
  if (itemDepth == null) return;

  var $to = pm.doc.resolve(to);
  if ($from.sameDepth($to) < itemDepth - 1) return null;
  return { from: $from.before(itemDepth),
    to: $to.after(itemDepth),
    depth: itemDepth };
}

// ;; #path="list_item:lift" #kind=command
// Lift a list item into a parent list.
//
// **Keybindings:** Mod-[
_schema.ListItem.register("command", "lift", {
  label: "Lift the selected list items to an outer list",
  run: function run(pm) {
    var selected = selectedListItems(pm, this);
    if (!selected || selected.depth < 3) return false;
    var $to = pm.doc.resolve(pm.selection.to);
    if ($to.node(selected.depth - 2).type != this) return false;
    var itemsAfter = selected.to < $to.end(selected.depth - 1);
    var tr = pm.tr.lift(selected.from, selected.to);
    var end = tr.map(selected.to, -1);
    if (itemsAfter) tr.join(end);
    return tr.apply(pm.apply.scroll);
  },

  keys: ["Mod-[(20)"]
});

// ;; #path="list_item:sink" #kind=command
// Move a list item into a sublist.
//
// **Keybindings:** Mod-]
_schema.ListItem.register("command", "sink", {
  label: "Sink the selected list items into an inner list",
  run: function run(pm) {
    var selected = selectedListItems(pm, this);
    if (!selected) return false;
    var $from = pm.doc.resolve(pm.selection.from),
        startIndex = $from.index(selected.depth - 1);
    if (startIndex == 0) return false;
    var parent = $from.node(selected.depth - 1),
        before = parent.child(startIndex - 1);
    if (before.type != this) return false;
    var nestedBefore = before.lastChild && before.lastChild.type == parent.type;
    var slice = new _model.Slice(_model.Fragment.from(this.create(null, parent.type.create(parent.attrs))), nestedBefore ? 2 : 1, 0);
    return pm.tr.step(new _transform.ReplaceAroundStep(selected.from - (nestedBefore ? 2 : 1), selected.to, selected.from, selected.to, slice, nestedBefore ? 0 : 1, true)).apply(pm.apply.scroll);
  },

  keys: ["Mod-](20)"]
});

var _loop = function _loop(i) {
  // ;; #path="heading:make_" #kind=command
  // The commands `make1` to `make6` set the textblocks in the
  // selection to become headers with the given level.
  //
  // **Keybindings:** Shift-Ctrl-1 through Shift-Ctrl-6
  _schema.Heading.registerComputed("command", "make" + i, function (type) {
    var attrs = { level: i };
    if (i <= type.maxLevel) return {
      derive: { name: "make", attrs: attrs },
      label: "Change to heading " + i,
      keys: i <= 6 && ["Shift-Ctrl-" + i],
      menu: {
        group: "textblockHeading", rank: 30 + i,
        display: { type: "label", label: "Level " + i },
        activeDisplay: "Head " + i
      }
    };
  });
};

for (var i = 1; i <= 10; i++) {
  _loop(i);
} // ;; #path=paragraph:make #kind=command
// Set the textblocks in the selection to be regular paragraphs.
//
// **Keybindings:** Shift-Ctrl-0
_schema.Paragraph.register("command", "make", {
  derive: true,
  label: "Change to paragraph",
  keys: ["Shift-Ctrl-0"],
  menu: {
    group: "textblock", rank: 10,
    display: { type: "label", label: "Plain" },
    activeDisplay: "Plain"
  }
});

// ;; #path=code_block:make #kind=command
// Set the textblocks in the selection to be code blocks.
//
// **Keybindings:** Shift-Ctrl-\
_schema.CodeBlock.register("command", "make", {
  derive: true,
  label: "Change to code block",
  keys: ["Shift-Ctrl-\\"],
  menu: {
    group: "textblock", rank: 20,
    display: { type: "label", label: "Code" },
    activeDisplay: "Code"
  }
});

// ;; #path=horizontal_rule:insert #kind=command
// Replace the selection with a horizontal rule.
//
// **Keybindings:** Mod-Shift-Minus
_schema.HorizontalRule.register("command", "insert", {
  derive: true,
  label: "Insert horizontal rule",
  keys: ["Mod-Shift--"],
  menu: { group: "insert", rank: 70, display: { type: "label", label: "Horizontal rule" } }
});
},{"../model":26,"../schema":32,"../transform":33,"./command":5}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NodeSelection = exports.TextSelection = exports.Selection = exports.SelectionState = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.selectionFromDOM = selectionFromDOM;
exports.hasFocus = hasFocus;
exports.findSelectionFrom = findSelectionFrom;
exports.findSelectionNear = findSelectionNear;
exports.findSelectionAtStart = findSelectionAtStart;
exports.findSelectionAtEnd = findSelectionAtEnd;
exports.verticalMotionLeavesTextblock = verticalMotionLeavesTextblock;

var _dom = require("../dom");

var _dompos = require("./dompos");

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Track the state of the current editor selection. Keeps the editor
// selection in sync with the DOM selection by polling for changes,
// as there is no DOM event for DOM selection changes.

var SelectionState = exports.SelectionState = function () {
  function SelectionState(pm, range) {
    var _this = this;

    _classCallCheck(this, SelectionState);

    this.pm = pm;
    // The current editor selection.
    this.range = range;

    // The timeout ID for the poller when active.
    this.polling = null;
    // Track the state of the DOM selection.
    this.lastAnchorNode = this.lastHeadNode = this.lastAnchorOffset = this.lastHeadOffset = null;
    // The corresponding DOM node when a node selection is active.
    this.lastNode = null;

    pm.content.addEventListener("focus", function () {
      return _this.receivedFocus();
    });

    this.poller = this.poller.bind(this);
  }

  // : (Selection, boolean)
  // Set the current selection and signal an event on the editor.


  _createClass(SelectionState, [{
    key: "setAndSignal",
    value: function setAndSignal(range, clearLast) {
      this.set(range, clearLast);
      // :: () #path=ProseMirror#events#selectionChange
      // Indicates that the editor's selection has changed.
      this.pm.signal("selectionChange");
    }

    // : (Selection, boolean)
    // Set the current selection.

  }, {
    key: "set",
    value: function set(range, clearLast) {
      this.pm.ensureOperation({ readSelection: false, selection: range });
      this.range = range;
      if (clearLast !== false) this.lastAnchorNode = null;
    }
  }, {
    key: "poller",
    value: function poller() {
      if (hasFocus(this.pm)) {
        if (!this.pm.operation) this.readFromDOM();
        this.polling = setTimeout(this.poller, 100);
      } else {
        this.polling = null;
      }
    }
  }, {
    key: "startPolling",
    value: function startPolling() {
      clearTimeout(this.polling);
      this.polling = setTimeout(this.poller, 50);
    }
  }, {
    key: "fastPoll",
    value: function fastPoll() {
      this.startPolling();
    }
  }, {
    key: "stopPolling",
    value: function stopPolling() {
      clearTimeout(this.polling);
      this.polling = null;
    }

    // : () → bool
    // Whether the DOM selection has changed from the last known state.

  }, {
    key: "domChanged",
    value: function domChanged() {
      var sel = window.getSelection();
      return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset || sel.focusNode != this.lastHeadNode || sel.focusOffset != this.lastHeadOffset;
    }

    // Store the current state of the DOM selection.

  }, {
    key: "storeDOMState",
    value: function storeDOMState() {
      var sel = window.getSelection();
      this.lastAnchorNode = sel.anchorNode;this.lastAnchorOffset = sel.anchorOffset;
      this.lastHeadNode = sel.focusNode;this.lastHeadOffset = sel.focusOffset;
    }

    // : () → bool
    // When the DOM selection changes in a notable manner, modify the
    // current selection state to match.

  }, {
    key: "readFromDOM",
    value: function readFromDOM() {
      if (!hasFocus(this.pm) || !this.domChanged()) return false;

      var _selectionFromDOM = selectionFromDOM(this.pm, this.pm.doc, this.range.head);

      var range = _selectionFromDOM.range;
      var adjusted = _selectionFromDOM.adjusted;

      this.setAndSignal(range);

      if (range instanceof NodeSelection || adjusted) {
        this.toDOM();
      } else {
        this.clearNode();
        this.storeDOMState();
      }
      return true;
    }
  }, {
    key: "toDOM",
    value: function toDOM(takeFocus) {
      if (!hasFocus(this.pm)) {
        if (!takeFocus) return;
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=921444
        else if (_dom.browser.gecko) this.pm.content.focus();
      }
      if (this.range instanceof NodeSelection) this.nodeToDOM();else this.rangeToDOM();
    }

    // Make changes to the DOM for a node selection.

  }, {
    key: "nodeToDOM",
    value: function nodeToDOM() {
      var dom = (0, _dompos.DOMAfterPos)(this.pm, this.range.from);
      if (dom != this.lastNode) {
        this.clearNode();
        dom.classList.add("ProseMirror-selectednode");
        this.pm.content.classList.add("ProseMirror-nodeselection");
        this.lastNode = dom;
      }
      var range = document.createRange(),
          sel = window.getSelection();
      range.selectNode(dom);
      sel.removeAllRanges();
      sel.addRange(range);
      this.storeDOMState();
    }

    // Make changes to the DOM for a text selection.

  }, {
    key: "rangeToDOM",
    value: function rangeToDOM() {
      this.clearNode();

      var anchor = (0, _dompos.DOMFromPos)(this.pm, this.range.anchor);
      var head = (0, _dompos.DOMFromPos)(this.pm, this.range.head);

      var sel = window.getSelection(),
          range = document.createRange();
      if (sel.extend) {
        range.setEnd(anchor.node, anchor.offset);
        range.collapse(false);
      } else {
        if (this.range.anchor > this.range.head) {
          var tmp = anchor;anchor = head;head = tmp;
        }
        range.setEnd(head.node, head.offset);
        range.setStart(anchor.node, anchor.offset);
      }
      sel.removeAllRanges();
      sel.addRange(range);
      if (sel.extend) sel.extend(head.node, head.offset);
      this.storeDOMState();
    }

    // Clear all DOM statefulness of the last node selection.

  }, {
    key: "clearNode",
    value: function clearNode() {
      if (this.lastNode) {
        this.lastNode.classList.remove("ProseMirror-selectednode");
        this.pm.content.classList.remove("ProseMirror-nodeselection");
        this.lastNode = null;
        return true;
      }
    }
  }, {
    key: "receivedFocus",
    value: function receivedFocus() {
      if (this.polling == null) this.startPolling();
    }
  }]);

  return SelectionState;
}();

// ;; An editor selection. Can be one of two selection types:
// `TextSelection` and `NodeSelection`. Both have the properties
// listed here, but also contain more information (such as the
// selected [node](#NodeSelection.node) or the
// [head](#TextSelection.head) and [anchor](#TextSelection.anchor)).


var Selection = exports.Selection = function Selection() {
  _classCallCheck(this, Selection);
};

// :: number #path=Selection.prototype.from
// The left-bound of the selection.

// :: number #path=Selection.prototype.to
// The right-bound of the selection.

// :: bool #path=Selection.prototype.empty
// True if the selection is an empty text selection (head an anchor
// are the same).

// :: (other: Selection) → bool #path=Selection.prototype.eq
// Test whether the selection is the same as another selection.

// :: (doc: Node, mapping: Mappable) → Selection #path=Selection.prototype.map
// Map this selection through a [mappable](#Mappable) thing. `doc`
// should be the new document, to which we are mapping.


// ;; A text selection represents a classical editor
// selection, with a head (the moving side) and anchor (immobile
// side), both of which point into textblock nodes. It can be empty (a
// regular cursor position).

var TextSelection = exports.TextSelection = function (_Selection) {
  _inherits(TextSelection, _Selection);

  // :: (number, ?number)
  // Construct a text selection. When `head` is not given, it defaults
  // to `anchor`.

  function TextSelection(anchor, head) {
    _classCallCheck(this, TextSelection);

    // :: number
    // The selection's immobile side (does not move when pressing
    // shift-arrow).

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(TextSelection).call(this));

    _this2.anchor = anchor;
    // :: number
    // The selection's mobile side (the side that moves when pressing
    // shift-arrow).
    _this2.head = head == null ? anchor : head;
    return _this2;
  }

  _createClass(TextSelection, [{
    key: "eq",
    value: function eq(other) {
      return other instanceof TextSelection && other.head == this.head && other.anchor == this.anchor;
    }
  }, {
    key: "map",
    value: function map(doc, mapping) {
      var head = mapping.map(this.head);
      if (!doc.resolve(head).parent.isTextblock) return findSelectionNear(doc, head);
      var anchor = mapping.map(this.anchor);
      return new TextSelection(doc.resolve(anchor).parent.isTextblock ? anchor : head, head);
    }
  }, {
    key: "inverted",
    get: function get() {
      return this.anchor > this.head;
    }
  }, {
    key: "from",
    get: function get() {
      return Math.min(this.head, this.anchor);
    }
  }, {
    key: "to",
    get: function get() {
      return Math.max(this.head, this.anchor);
    }
  }, {
    key: "empty",
    get: function get() {
      return this.anchor == this.head;
    }
  }, {
    key: "token",
    get: function get() {
      return new SelectionToken(TextSelection, this.anchor, this.head);
    }
  }], [{
    key: "mapToken",
    value: function mapToken(token, mapping) {
      return new SelectionToken(TextSelection, mapping.map(token.a), mapping.map(token.b));
    }
  }, {
    key: "fromToken",
    value: function fromToken(token, doc) {
      if (!doc.resolve(token.b).parent.isTextblock) return findSelectionNear(doc, token.b);
      return new TextSelection(doc.resolve(token.a).parent.isTextblock ? token.a : token.b, token.b);
    }
  }]);

  return TextSelection;
}(Selection);

// ;; A node selection is a selection that points at a
// single node. All nodes marked [selectable](#NodeType.selectable)
// can be the target of a node selection. In such an object, `from`
// and `to` point directly before and after the selected node.


var NodeSelection = exports.NodeSelection = function (_Selection2) {
  _inherits(NodeSelection, _Selection2);

  // :: (number, number, Node)
  // Create a node selection. Does not verify the validity of its
  // arguments. Use `ProseMirror.setNodeSelection` for an easier,
  // error-checking way to create a node selection.

  function NodeSelection(from, to, node) {
    _classCallCheck(this, NodeSelection);

    var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(NodeSelection).call(this));

    _this3.from = from;
    _this3.to = to;
    // :: Node The selected node.
    _this3.node = node;
    return _this3;
  }

  _createClass(NodeSelection, [{
    key: "eq",
    value: function eq(other) {
      return other instanceof NodeSelection && this.from == other.from;
    }
  }, {
    key: "map",
    value: function map(doc, mapping) {
      var from = mapping.map(this.from, 1);
      var to = mapping.map(this.to, -1);
      var node = doc.nodeAt(from);
      if (node && to == from + node.nodeSize && node.type.selectable) return new NodeSelection(from, to, node);
      return findSelectionNear(doc, from);
    }
  }, {
    key: "empty",
    get: function get() {
      return false;
    }
  }, {
    key: "token",
    get: function get() {
      return new SelectionToken(NodeSelection, this.from, this.to);
    }
  }], [{
    key: "mapToken",
    value: function mapToken(token, mapping) {
      return new SelectionToken(TextSelection, mapping.map(token.a, 1), mapping.map(token.b, -1));
    }
  }, {
    key: "fromToken",
    value: function fromToken(token, doc) {
      var node = doc.nodeAt(token.a);
      if (node && token.b == token.a + node.nodeSize && node.type.selectable) return new NodeSelection(token.a, token.b, node);
      return findSelectionNear(doc, token.a);
    }
  }]);

  return NodeSelection;
}(Selection);

var SelectionToken = function SelectionToken(type, a, b) {
  _classCallCheck(this, SelectionToken);

  this.type = type;
  this.a = a;
  this.b = b;
};

function selectionFromDOM(pm, doc, oldHead, loose) {
  var sel = window.getSelection();
  var anchor = (0, _dompos.posFromDOM)(pm, sel.anchorNode, sel.anchorOffset, loose);
  var head = sel.isCollapsed ? anchor : (0, _dompos.posFromDOM)(pm, sel.focusNode, sel.focusOffset, loose);

  var range = findSelectionNear(doc, head, oldHead != null && oldHead < head ? 1 : -1);
  if (range instanceof TextSelection) {
    var selNearAnchor = findSelectionNear(doc, anchor, anchor > range.to ? -1 : 1, true);
    range = new TextSelection(selNearAnchor.anchor, range.head);
  } else if (anchor < range.from || anchor > range.to) {
    // If head falls on a node, but anchor falls outside of it,
    // create a text selection between them
    var inv = anchor > range.to;
    range = new TextSelection(findSelectionNear(doc, anchor, inv ? -1 : 1, true).anchor, findSelectionNear(doc, inv ? range.from : range.to, inv ? 1 : -1, true).head);
  }
  return { range: range, adjusted: head != range.head || anchor != range.anchor };
}

function hasFocus(pm) {
  if (document.activeElement != pm.content) return false;
  var sel = window.getSelection();
  return sel.rangeCount && (0, _dom.contains)(pm.content, sel.anchorNode);
}

// Try to find a selection inside the given node. `pos` points at the
// position where the search starts. When `text` is true, only return
// text selections.
function findSelectionIn(node, pos, index, dir, text) {
  for (var i = index - (dir > 0 ? 0 : 1); dir > 0 ? i < node.childCount : i >= 0; i += dir) {
    var child = node.child(i);
    if (child.isTextblock) return new TextSelection(pos + dir);
    if (!child.type.isLeaf) {
      var inner = findSelectionIn(child, pos + dir, dir < 0 ? child.childCount : 0, dir, text);
      if (inner) return inner;
    } else if (!text && child.type.selectable) {
      return new NodeSelection(pos - (dir < 0 ? child.nodeSize : 0), pos + (dir > 0 ? child.nodeSize : 0), child);
    }
    pos += child.nodeSize * dir;
  }
}

// FIXME we'll need some awareness of text direction when scanning for selections

// Create a selection which is moved relative to a position in a
// given direction. When a selection isn't found at the given position,
// walks up the document tree one level and one step in the
// desired direction.
function findSelectionFrom(doc, pos, dir, text) {
  var $pos = doc.resolve(pos);
  var inner = $pos.parent.isTextblock ? new TextSelection(pos) : findSelectionIn($pos.parent, pos, $pos.index(), dir, text);
  if (inner) return inner;

  for (var depth = $pos.depth - 1; depth >= 0; depth--) {
    var found = dir < 0 ? findSelectionIn($pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, text) : findSelectionIn($pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, text);
    if (found) return found;
  }
}

function findSelectionNear(doc, pos) {
  var bias = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];
  var text = arguments[3];

  var result = findSelectionFrom(doc, pos, bias, text) || findSelectionFrom(doc, pos, -bias, text);
  if (!result) throw new RangeError("Searching for selection in invalid document " + doc);
  return result;
}

// Find the selection closest to the start of the given node. `pos`,
// if given, should point at the start of the node's content.
function findSelectionAtStart(node, text) {
  return findSelectionIn(node, 0, 0, 1, text);
}

// Find the selection closest to the end of the given node.
function findSelectionAtEnd(node, text) {
  return findSelectionIn(node, node.content.size, node.childCount, -1, text);
}

// : (ProseMirror, number, number)
// Whether vertical position motion in a given direction
// from a position would leave a text block.
function verticalMotionLeavesTextblock(pm, pos, dir) {
  var $pos = pm.doc.resolve(pos);
  var dom = (0, _dompos.DOMAfterPos)(pm, $pos.before());
  var coords = (0, _dompos.coordsAtPos)(pm, pos);
  for (var child = dom.firstChild; child; child = child.nextSibling) {
    if (child.nodeType != 1) continue;
    var boxes = child.getClientRects();
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (dir < 0 ? box.bottom < coords.top : box.top > coords.bottom) return false;
    }
  }
  return true;
}
},{"../dom":1,"./dompos":8}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EditorTransform = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _model = require("../model");

var _transform = require("../transform");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; A selection-aware extension of `Transform`. Use
// `ProseMirror.tr` to create an instance.

var EditorTransform = exports.EditorTransform = function (_Transform) {
  _inherits(EditorTransform, _Transform);

  function EditorTransform(pm) {
    _classCallCheck(this, EditorTransform);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(EditorTransform).call(this, pm.doc));

    _this.pm = pm;
    return _this;
  }

  // :: (?Object) → ?EditorTransform
  // Apply the transformation. Returns the transform, or `false` it is
  // was empty.


  _createClass(EditorTransform, [{
    key: "apply",
    value: function apply(options) {
      return this.pm.apply(this, options);
    }

    // :: Selection
    // Get the editor's current selection, [mapped](#Selection.map)
    // through the steps in this transform.

  }, {
    key: "replaceSelection",


    // :: (?Node, ?bool) → EditorTransform
    // Replace the selection with the given node, or delete it if `node`
    // is null. When `inheritMarks` is true and the node is an inline
    // node, it inherits the marks from the place where it is inserted.
    value: function replaceSelection(node, inheritMarks) {
      var _selection = this.selection;
      var empty = _selection.empty;
      var from = _selection.from;
      var to = _selection.to;
      var selNode = _selection.node;


      if (node && node.isInline && inheritMarks !== false) node = node.mark(empty ? this.pm.input.storedMarks : this.doc.marksAt(from));

      if (selNode && selNode.isTextblock && node && node.isInline) {
        // Putting inline stuff onto a selected textblock puts it
        // inside, so cut off the sides
        from++;
        to--;
      } else if (selNode) {
        // This node can not simply be removed/replaced. Remove its parent as well
        var $from = this.doc.resolve(from),
            depth = $from.depth;
        while (depth && $from.node(depth).childCount == 1 && !$from.node(depth).canReplace($from.index(depth - 1), $from.index(depth - 1) + 1, _model.Fragment.from(node))) {
          depth--;
        }if (depth < $from.depth) {
          from = $from.before(depth + 1);
          to = $from.after(depth + 1);
        }
      } else if (node && from == to) {
        var _$from = this.doc.resolve(from);
        if (_$from.parentOffset == 0) {
          for (var d = _$from.depth; d > 0; d--) {
            if ((d == _$from.depth || _$from.index(d) == 0) && !_$from.node(d).canReplace(_$from.index(d), _$from.index(d), _model.Fragment.from(node))) from = to = _$from.before(d);else break;
          }
        } else if (_$from.parentOffset == _$from.parent.content.size) {
          for (var _d = _$from.depth; _d > 0; _d--) {
            if ((_d == _$from.depth || _$from.index(_d) == _$from.node(_d).childCount - 1) && !_$from.node(_d).canReplace(_$from.index(_d) + 1, _$from.index(_d) + 1, _model.Fragment.from(node))) from = to = _$from.after(_d);else break;
          }
        }
      }

      return this.replaceWith(from, to, node);
    }

    // :: () → EditorTransform
    // Delete the selection.

  }, {
    key: "deleteSelection",
    value: function deleteSelection() {
      return this.replaceSelection();
    }

    // :: (string) → EditorTransform
    // Replace the selection with a text node containing the given string.

  }, {
    key: "typeText",
    value: function typeText(text) {
      return this.replaceSelection(this.pm.schema.text(text), true);
    }
  }, {
    key: "selection",
    get: function get() {
      return this.steps.length ? this.pm.selection.map(this) : this.pm.selection;
    }
  }]);

  return EditorTransform;
}(_transform.Transform);
},{"../model":26,"../transform":33}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _parse = require("./parse");

Object.defineProperty(exports, "fromDOM", {
  enumerable: true,
  get: function get() {
    return _parse.fromDOM;
  }
});
Object.defineProperty(exports, "fromHTML", {
  enumerable: true,
  get: function get() {
    return _parse.fromHTML;
  }
});
Object.defineProperty(exports, "fromDOMInContext", {
  enumerable: true,
  get: function get() {
    return _parse.fromDOMInContext;
  }
});

var _serialize = require("./serialize");

Object.defineProperty(exports, "toDOM", {
  enumerable: true,
  get: function get() {
    return _serialize.toDOM;
  }
});
Object.defineProperty(exports, "toHTML", {
  enumerable: true,
  get: function get() {
    return _serialize.toHTML;
  }
});
Object.defineProperty(exports, "nodeToDOM", {
  enumerable: true,
  get: function get() {
    return _serialize.nodeToDOM;
  }
});
},{"./parse":21,"./serialize":22}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.fromDOM = fromDOM;
exports.fromDOMInContext = fromDOMInContext;
exports.fromHTML = fromHTML;

var _model = require("../model");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// :: (Schema, DOMNode, ?Object) → Node
// Parse document from the content of a DOM node. To pass an explicit
// parent document (for example, when not in a browser window
// environment, where we simply use the global document), pass it as
// the `document` property of `options`.
function fromDOM(schema, dom) {
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  var topNode = options.topNode;
  var top = new NodeBuilder(topNode ? topNode.type : schema.nodes.doc, topNode ? topNode.attrs : null, true);
  var context = new DOMParseState(schema, options, top);
  var start = options.from ? dom.childNodes[options.from] : dom.firstChild;
  var end = options.to != null && dom.childNodes[options.to] || null;
  context.addAll(start, end);
  return top.finish();
}

// :: (ResolvedPos, DOMNode, number, number, ?Object) → Slice
// Parse a DOM fragment into a `Slice`, starting with the context at
// `$context`. If the DOM nodes are known to be 'open' (as in
// `Slice`), pass their open depth as `openLeft` and `openRight`.
function fromDOMInContext($context, dom) {
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  var _builderFromContext = builderFromContext($context, dom);

  var builder = _builderFromContext.builder;
  var top = _builderFromContext.top;
  var left = _builderFromContext.left;

  var context = new DOMParseState($context.node(0).type.schema, options, builder);
  context.addAll(dom.firstChild, null);

  var openLeft = options.openLeft != null ? options.openLeft : left && left.isTextblock ? 1 : 0;
  var openRight = options.openRight;
  if (openRight == null) {
    var right = parseInfoAtSide(top.type.schema, dom, 1);
    openRight = right && right.isTextblock ? 1 : 0;
  }

  var openTo = Math.min(top.openDepth, builder.depth + openRight);
  var doc = top.finish(openTo),
      maxOpenLeft = 0;
  for (var node = doc.firstChild; node && !node.type.isLeaf; node = node.firstChild) {
    ++maxOpenLeft;
  }return doc.slice(Math.min(builder.depth + openLeft, maxOpenLeft), doc.content.size - openTo);
}

function builderFromContext($context, dom) {
  var topNode = $context.node(0),
      matches = [];
  for (var i = 0; i < $context.depth; i++) {
    matches.push($context.node(i).contentMatchAt($context.indexAfter(i)));
  }var left = parseInfoAtSide(topNode.type.schema, dom, -1),
      start = $context.depth,
      wrap = [];
  search: if (left) {
    for (var _i = matches.length - 1; _i >= 0; _i--) {
      if (matches[_i].matchType(left.type, left.attrs, noMarks)) {
        start = _i;
        break search;
      }
    }for (var _i2 = matches.length - 1, wrapping; _i2 >= 0; _i2--) {
      if (wrapping = matches[_i2].findWrapping(left.type, left.attrs)) {
        start = _i2;
        wrap = wrapping;
        break search;
      }
    }
  }
  var top = new NodeBuilder(topNode.type, topNode.attrs, true),
      builder = top;
  for (var _i3 = 1; _i3 <= start; _i3++) {
    var node = $context.node(_i3);
    builder = builder.start(node.type, node.attrs, true, matches[_i3]);
  }
  for (var _i4 = 0; _i4 < wrap.length; _i4++) {
    builder = builder.start(wrap[_i4].type, wrap[_i4].attrs, false);
  }return { builder: builder, top: top, left: left };
}

function parseInfoAtSide(schema, dom, side) {
  var info = schemaInfo(schema).selectors;
  for (var cur = dom, next;; cur = next) {
    next = cur && (side > 0 ? cur.lastChild || cur.previousSibling : cur.firstChild || cur.nextSibling);
    if (!next && cur != dom) next = side > 0 ? cur.parentNode.previousSibling : cur.parentNode.nextSibling;
    if (!next) return null;
    if (next.nodeType == 1) {
      var result = matchTag(info, next);
      if (result && result.type instanceof _model.NodeType) return result.type.create(result.attrs);
    }
    cur = next;
  }
}

// :: (Schema, string, ?Object) → Node
// Parses the HTML into a DOM, and then calls through to `fromDOM`.
function fromHTML(schema, html, options) {
  var wrap = (options && options.document || window.document).createElement("div");
  wrap.innerHTML = html;
  return fromDOM(schema, wrap, options);
}

// :: union<?Object, [?Object, {content: ?union<bool, DOMNode>, preserveWhiteSpace: ?bool}]>
// #path=ParseSpec #kind=interface
// A value that describes how to parse a given DOM node as a
// ProseMirror node or mark type. Specifies the attributes of the new
// node or mark, along with optional information about the way the
// node's content should be treated.
//
// May either be a set of attributes, where `null` indicates the
// node's default attributes, or an array containing first a set of
// attributes and then an object describing the treatment of the
// node's content. If the `content` property is `false`, the content
// will be ignored. If it is not given, the DOM node's children will
// be parsed as content of the ProseMirror node or mark. If it is a
// DOM node, that DOM node's content is treated as the content of the
// new node or mark (this is useful if, for example, your DOM
// representation puts its child nodes in an inner wrapping node). You
// can set `preserveWhiteSpace` to a boolean to enable or disable
// preserving of whitespace when parsing the content.

// :: Object<union<ParseSpec, (DOMNode) → union<bool, ParseSpec>>> #path=NodeType.prototype.matchDOMTag
// Defines the way nodes of this type are parsed. Should contain an
// object mapping CSS selectors (such as `"p"` for `<p>` tags, or
// `div[data-type="foo"]` for `<div>` tags with a specific attribute)
// to [parse specs](#ParseSpec) or functions that, when given a DOM
// node, return either `false` or a parse spec.

// :: Object<union<ParseSpec, (DOMNode) → union<bool, ParseSpec>>> #path=MarkType.prototype.matchDOMTag
// Defines the way marks of this type are parsed. Works just like
// `NodeType.matchTag`, but produces marks rather than nodes.

// :: Object<union<?Object, (string) → union<bool, ?Object>>> #path=MarkType.prototype.matchDOMStyle
// Defines the way DOM styles are mapped to marks of this type. Should
// contain an object mapping CSS property names, as found in inline
// styles, to either attributes for this mark (null for default
// attributes), or a function mapping the style's value to either a
// set of attributes or `false` to indicate that the style does not
// match.

var NodeBuilder = function () {
  function NodeBuilder(type, attrs, solid, prev, match) {
    _classCallCheck(this, NodeBuilder);

    // : NodeType
    // The type of the node being built
    this.type = type;
    // : ContentMatch
    // The content match at this point, used to determine whether
    // other nodes may be added here.
    this.match = match || type.contentExpr.start(attrs);
    // : bool
    // True when the node is found in the source, and thus should be
    // preserved until its end. False when it was made up to provide a
    // wrapper for another node.
    this.solid = solid;
    // : [Node]
    // The nodes that have been added so far.
    this.content = [];
    // : ?NodeBuilder
    // The builder for the parent node, if any.
    this.prev = prev;
    // : ?NodeBuilder
    // The builder for the last child, if that is still open (see
    // `NodeBuilder.start`)
    this.openChild = null;
  }

  // : (Node) → ?Node
  // Try to add a node. Strip it of marks if necessary. Returns null
  // when the node doesn't fit here.


  _createClass(NodeBuilder, [{
    key: "add",
    value: function add(node) {
      var _this = this;

      var matched = this.match.matchNode(node);
      if (!matched && node.marks.length) {
        node = node.mark(node.marks.filter(function (mark) {
          return _this.match.allowsMark(mark.type);
        }));
        matched = this.match.matchNode(node);
      }
      if (!matched) return null;
      this.closeChild();
      this.content.push(node);
      this.match = matched;
      return node;
    }

    // : (NodeType, ?Object, bool, ?ContentMatch) → ?NodeBuilder
    // Try to start a new node at this point.

  }, {
    key: "start",
    value: function start(type, attrs, solid, match) {
      var matched = this.match.matchType(type, attrs, noMarks);
      if (!matched) return null;
      this.closeChild();
      this.match = matched;
      return this.openChild = new NodeBuilder(type, attrs, solid, this, match);
    }
  }, {
    key: "closeChild",
    value: function closeChild(openRight) {
      if (this.openChild) {
        this.content.push(this.openChild.finish(openRight && openRight - 1));
        this.openChild = null;
      }
    }

    // : ()
    // Strip any trailing space text from the builder's content.

  }, {
    key: "stripTrailingSpace",
    value: function stripTrailingSpace() {
      if (this.openChild) return;
      var last = this.content[this.content.length - 1],
          m = void 0;
      if (last && last.isText && (m = /\s+$/.exec(last.text))) {
        if (last.text.length == m[0].length) this.content.pop();else this.content[this.content.length - 1] = last.copy(last.text.slice(0, last.text.length - m[0].length));
      }
    }

    // : (?number) → Node
    // Finish this node. If `openRight` is > 0, the node (and `openRight
    // - 1` last children) is partial, and we don't need to 'close' it
    // by filling in required content.

  }, {
    key: "finish",
    value: function finish(openRight) {
      this.closeChild(openRight);
      var content = _model.Fragment.from(this.content);
      if (!openRight) content = content.append(this.match.fillBefore(_model.Fragment.empty, true));
      return this.type.create(this.match.attrs, content);
    }

    // : (NodeType, ?Object, ?Node) → ?NodeBuilder
    // Try to find a valid place to add a node with the given type and
    // attributes. When successful, if `node` was given, add it in its
    // entirety and return the builder to which it was added. If not,
    // start a node of the given type and return the builder for it.

  }, {
    key: "findPlace",
    value: function findPlace(type, attrs, node) {
      for (var top = this;; top = top.prev) {
        var ok = node ? top.add(node) && top : top.start(type, attrs, true);
        if (ok) return ok;
        if (top.solid) break;
      }

      for (var _top = this;; _top = _top.prev) {
        var route = _top.match.findWrapping(type, attrs);
        if (route) {
          for (var i = 0; i < route.length; i++) {
            _top = _top.start(route[i].type, route[i].attrs, false);
          }return node ? _top.add(node) && _top : _top.start(type, attrs, true);
        } else if (_top.solid) {
          return null;
        }
      }
    }
  }, {
    key: "depth",
    get: function get() {
      var d = 0;
      for (var b = this.prev; b; b = b.prev) {
        d++;
      }return d;
    }
  }, {
    key: "openDepth",
    get: function get() {
      var d = 0;
      for (var c = this.openChild; c; c = c.openChild) {
        d++;
      }return d;
    }
  }]);

  return NodeBuilder;
}();

// : Object<bool> The block-level tags in HTML5


var blockTags = {
  address: true, article: true, aside: true, blockquote: true, canvas: true,
  dd: true, div: true, dl: true, fieldset: true, figcaption: true, figure: true,
  footer: true, form: true, h1: true, h2: true, h3: true, h4: true, h5: true,
  h6: true, header: true, hgroup: true, hr: true, li: true, noscript: true, ol: true,
  output: true, p: true, pre: true, section: true, table: true, tfoot: true, ul: true
};

// : Object<bool> The tags that we normally ignore.
var ignoreTags = {
  head: true, noscript: true, object: true, script: true, style: true, title: true
};

// : Object<bool> List tags.
var listTags = { ol: true, ul: true };

var noMarks = [];

// A state object used to track context during a parse.

var DOMParseState = function () {
  // : (Schema, Object, NodeBuilder)

  function DOMParseState(schema, options, top) {
    _classCallCheck(this, DOMParseState);

    // : Object The options passed to this parse.
    this.options = options || {};
    // : Schema The schema that we are parsing into.
    this.schema = schema;
    this.top = top;
    // : [Mark] The current set of marks
    this.marks = noMarks;
    // : bool Whether to preserve whitespace
    this.preserveWhitespace = this.options.preserveWhitespace;
    this.info = schemaInfo(schema);
  }

  // : (Mark) → [Mark]
  // Add a mark to the current set of marks, return the old set.


  _createClass(DOMParseState, [{
    key: "addMark",
    value: function addMark(mark) {
      var old = this.marks;
      this.marks = mark.addToSet(this.marks);
      return old;
    }

    // : (DOMNode)
    // Add a DOM node to the content. Text is inserted as text node,
    // otherwise, the node is passed to `addElement` or, if it has a
    // `style` attribute, `addElementWithStyles`.

  }, {
    key: "addDOM",
    value: function addDOM(dom) {
      if (dom.nodeType == 3) {
        var value = dom.nodeValue;
        var top = this.top;
        if (/\S/.test(value) || top.type.isTextblock) {
          if (!this.preserveWhitespace) {
            value = value.replace(/\s+/g, " ");
            // If this starts with whitespace, and there is either no node
            // before it or a node that ends with whitespace, strip the
            // leading space.
            if (/^\s/.test(value)) top.stripTrailingSpace();
          }
          if (value) this.insertNode(this.schema.text(value, this.marks));
        }
      } else if (dom.nodeType == 1 && !dom.hasAttribute("pm-ignore")) {
        var style = dom.getAttribute("style");
        if (style) this.addElementWithStyles(parseStyles(style), dom);else this.addElement(dom);
      }
    }

    // : (DOMNode)
    // Try to find a handler for the given tag and use that to parse. If
    // none is found, the element's content nodes are added directly.

  }, {
    key: "addElement",
    value: function addElement(dom) {
      var name = dom.nodeName.toLowerCase();
      if (listTags.hasOwnProperty(name)) this.normalizeList(dom);
      // Ignore trailing BR nodes, which browsers create during editing
      if (this.options.editableContent && name == "br" && !dom.nextSibling) return;
      if (!this.parseNodeType(dom, name) && !ignoreTags.hasOwnProperty(name)) {
        var sync = blockTags.hasOwnProperty(name) && this.top;
        this.addAll(dom.firstChild, null);
        if (sync) this.sync(sync);
      }
    }

    // Run any style parser associated with the node's styles. After
    // that, if no style parser suppressed the node's content, pass it
    // through to `addElement`.

  }, {
    key: "addElementWithStyles",
    value: function addElementWithStyles(styles, dom) {
      var oldMarks = this.marks,
          marks = this.marks;
      for (var i = 0; i < styles.length; i += 2) {
        var result = matchStyle(this.info.styles, styles[i], styles[i + 1]);
        if (!result) continue;
        if (result.attrs === false) return;
        marks = result.type.create(result.attrs).addToSet(marks);
      }
      this.marks = marks;
      this.addElement(dom);
      this.marks = oldMarks;
    }

    // (DOMNode, string) → bool
    // Look up a handler for the given node. If none are found, return
    // false. Otherwise, apply it, use its return value to drive the way
    // the node's content is wrapped, and return true.

  }, {
    key: "parseNodeType",
    value: function parseNodeType(dom) {
      var result = matchTag(this.info.selectors, dom);
      if (!result) return false;

      var isNode = result.type instanceof _model.NodeType,
          sync = void 0,
          before = void 0;
      if (isNode) sync = this.enter(result.type, result.attrs);else before = this.addMark(result.type.create(result.attrs));

      var contentNode = dom,
          preserve = null,
          prevPreserve = this.preserveWhitespace;
      if (result.content) {
        if (result.content.content === false) contentNode = null;else if (result.content.content) contentNode = result.content.content;
        preserve = result.content.preserveWhitespace;
      }

      if (contentNode) {
        if (preserve != null) this.preserveWhitespace = preserve;
        this.addAll(contentNode.firstChild, null, sync);
        if (sync) this.sync(sync.prev);else if (before) this.marks = before;
        if (preserve != null) this.preserveWhitespace = prevPreserve;
      }
      return true;
    }

    // : (?DOMNode, ?DOMNode, ?NodeBuilder)
    // Add all nodes between `from` and `to` (via `nextSibling`). If
    // `sync` is passed, use it to synchronize after every block
    // element.

  }, {
    key: "addAll",
    value: function addAll(from, to, sync) {
      for (var dom = from; dom != to; dom = dom.nextSibling) {
        this.addDOM(dom);
        if (sync && blockTags.hasOwnProperty(dom.nodeName.toLowerCase())) this.sync(sync);
      }
    }

    // : (Node) → ?Node
    // Try to insert the given node, adjusting the context when needed.

  }, {
    key: "insertNode",
    value: function insertNode(node) {
      var ok = this.top.findPlace(node.type, node.attrs, node);
      if (ok) {
        this.sync(ok);
        return true;
      }
    }

    // : (NodeType, ?Object, [Node]) → ?Node
    // Insert a node of the given type, with the given content, based on
    // `dom`, at the current position in the document.

  }, {
    key: "insert",
    value: function insert(type, attrs, content) {
      var frag = type.fixContent(_model.Fragment.from(content), attrs);
      if (!frag) return null;
      this.insertNode(type.create(attrs, frag, type.isInline ? this.marks : null));
    }

    // : (NodeType, ?Object) → ?NodeBuilder
    // Try to start a node of the given type, adjusting the context when
    // necessary.

  }, {
    key: "enter",
    value: function enter(type, attrs) {
      var ok = this.top.findPlace(type, attrs);
      if (ok) {
        this.sync(ok);
        return ok;
      }
    }

    // : ()
    // Leave the node currently at the top.

  }, {
    key: "leave",
    value: function leave() {
      if (!this.preserveWhitespace) this.top.stripTrailingSpace();
      this.top = this.top.prev;
    }
  }, {
    key: "sync",
    value: function sync(to) {
      for (;;) {
        for (var cur = to; cur; cur = cur.prev) {
          if (cur == this.top) {
            this.top = to;
            return;
          }
        }this.leave();
      }
    }

    // Kludge to work around directly nested list nodes produced by some
    // tools and allowed by browsers to mean that the nested list is
    // actually part of the list item above it.

  }, {
    key: "normalizeList",
    value: function normalizeList(dom) {
      for (var child = dom.firstChild, prev; child; child = child.nextSibling) {
        if (child.nodeType == 1 && listTags.hasOwnProperty(child.nodeName.toLowerCase()) && (prev = child.previousSibling)) {
          prev.appendChild(child);
          child = prev;
        }
      }
    }
  }]);

  return DOMParseState;
}();

// Apply a CSS selector.


function matches(dom, selector) {
  return (dom.matches || dom.msMatchesSelector || dom.webkitMatchesSelector || dom.mozMatchesSelector).call(dom, selector);
}

// : (string) → [string]
// Tokenize a style attribute into property/value pairs.
function parseStyles(style) {
  var re = /\s*([\w-]+)\s*:\s*([^;]+)/g,
      m = void 0,
      result = [];
  while (m = re.exec(style)) {
    result.push(m[1], m[2].trim());
  }return result;
}

function schemaInfo(schema) {
  return schema.cached.parseDOMInfo || (schema.cached.parseDOMInfo = summarizeSchemaInfo(schema));
}

function summarizeSchemaInfo(schema) {
  var selectors = [],
      styles = [];
  for (var name in schema.nodes) {
    var type = schema.nodes[name],
        match = type.matchDOMTag;
    if (match) for (var selector in match) {
      selectors.push({ selector: selector, type: type, value: match[selector] });
    }
  }
  for (var _name in schema.marks) {
    var _type = schema.marks[_name],
        _match = _type.matchDOMTag,
        props = _type.matchDOMStyle;
    if (_match) for (var _selector in _match) {
      selectors.push({ selector: _selector, type: _type, value: _match[_selector] });
    }if (props) for (var prop in props) {
      styles.push({ prop: prop, type: _type, value: props[prop] });
    }
  }
  return { selectors: selectors, styles: styles };
}

function matchTag(selectors, dom) {
  for (var i = 0; i < selectors.length; i++) {
    var cur = selectors[i];
    if (matches(dom, cur.selector)) {
      var value = cur.value,
          content = void 0;
      if (value instanceof Function) {
        value = value(dom);
        if (value === false) continue;
      }
      if (Array.isArray(value)) {
        ;var _value = value;

        var _value2 = _slicedToArray(_value, 2);

        value = _value2[0];
        content = _value2[1];
      }
      return { type: cur.type, attrs: value, content: content };
    }
  }
}

function matchStyle(styles, prop, value) {
  for (var i = 0; i < styles.length; i++) {
    var cur = styles[i];
    if (cur.prop == prop) {
      var attrs = cur.value;
      if (attrs instanceof Function) {
        attrs = attrs(value);
        if (attrs === false) continue;
      }
      return { type: cur.type, attrs: attrs };
    }
  }
}
},{"../model":26}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.toDOM = toDOM;
exports.nodeToDOM = nodeToDOM;
exports.toHTML = toHTML;

var _model = require("../model");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Object used to to expose relevant values and methods
// to DOM serializer functions.

var DOMSerializer = function () {
  function DOMSerializer(options) {
    _classCallCheck(this, DOMSerializer);

    // : Object The options passed to the serializer.
    this.options = options || {};
    // : DOMDocument The DOM document in which we are working.
    this.doc = this.options.document || window.document;
  }

  _createClass(DOMSerializer, [{
    key: "renderNode",
    value: function renderNode(node, pos, offset) {
      var dom = this.renderStructure(node.type.toDOM(node), node.content, pos + 1);
      if (this.options.onRender) dom = this.options.onRender(node, dom, pos, offset) || dom;
      return dom;
    }
  }, {
    key: "renderStructure",
    value: function renderStructure(structure, content, startPos) {
      if (typeof structure == "string") return this.doc.createTextNode(structure);
      if (structure.nodeType != null) return structure;
      var dom = this.doc.createElement(structure[0]),
          attrs = structure[1],
          start = 1;
      if (attrs && (typeof attrs === "undefined" ? "undefined" : _typeof(attrs)) == "object" && attrs.nodeType == null && !Array.isArray(attrs)) {
        start = 2;
        for (var name in attrs) {
          if (name == "style") dom.style.cssText = attrs[name];else if (attrs[name]) dom.setAttribute(name, attrs[name]);
        }
      }
      for (var i = start; i < structure.length; i++) {
        var child = structure[i];
        if (child === 0) {
          if (!content) throw new RangeError("Content hole not allowed in a Mark spec (must produce a single node)");
          if (i < structure.length - 1 || i > start) throw new RangeError("Content hole must be the only child of its parent node");
          if (this.options.onContainer) this.options.onContainer(dom);
          this.renderFragment(content, dom, startPos);
        } else {
          dom.appendChild(this.renderStructure(child, content, startPos));
        }
      }
      return dom;
    }
  }, {
    key: "renderFragment",
    value: function renderFragment(fragment, where, startPos) {
      if (!where) where = this.doc.createDocumentFragment();
      if (fragment.size == 0) return where;

      if (!fragment.firstChild.isInline) this.renderBlocksInto(fragment, where, startPos);else if (this.options.renderInlineFlat) this.renderInlineFlatInto(fragment, where, startPos);else this.renderInlineInto(fragment, where, startPos);
      return where;
    }
  }, {
    key: "renderBlocksInto",
    value: function renderBlocksInto(fragment, where, startPos) {
      var _this = this;

      fragment.forEach(function (node, offset) {
        return where.appendChild(_this.renderNode(node, startPos + offset, offset));
      });
    }
  }, {
    key: "renderInlineInto",
    value: function renderInlineInto(fragment, where, startPos) {
      var _this2 = this;

      var top = where;
      var active = [];
      fragment.forEach(function (node, offset) {
        var keep = 0;
        for (; keep < Math.min(active.length, node.marks.length); ++keep) {
          if (!node.marks[keep].eq(active[keep])) break;
        }while (keep < active.length) {
          active.pop();
          top = top.parentNode;
        }
        while (active.length < node.marks.length) {
          var add = node.marks[active.length];
          active.push(add);
          top = top.appendChild(_this2.renderMark(add));
        }
        top.appendChild(_this2.renderNode(node, startPos + offset, offset));
      });
    }
  }, {
    key: "renderInlineFlatInto",
    value: function renderInlineFlatInto(fragment, where, startPos) {
      var _this3 = this;

      fragment.forEach(function (node, offset) {
        var pos = startPos + offset,
            dom = _this3.renderNode(node, pos, offset);
        dom = _this3.wrapInlineFlat(dom, node.marks);
        dom = _this3.options.renderInlineFlat(node, dom, pos, offset) || dom;
        where.appendChild(dom);
      });
    }
  }, {
    key: "renderMark",
    value: function renderMark(mark) {
      return this.renderStructure(mark.type.toDOM(mark));
    }
  }, {
    key: "wrapInlineFlat",
    value: function wrapInlineFlat(dom, marks) {
      for (var i = marks.length - 1; i >= 0; i--) {
        var wrap = this.renderMark(marks[i]);
        wrap.appendChild(dom);
        dom = wrap;
      }
      return dom;
    }
  }]);

  return DOMSerializer;
}();

// :: (union<Node, Fragment>, ?Object) → DOMFragment
// Serialize the given content to a DOM fragment. When not
// in the browser, the `document` option, containing a DOM document,
// should be passed so that the serialize can create nodes.
//
// To define rendering behavior for your own [node](#NodeType) and
// [mark](#MarkType) types, give them a [`toDOM`](#NodeType.toDOM)
// method.


function toDOM(content, options) {
  return new DOMSerializer(options).renderFragment(content instanceof _model.Node ? content.content : content, null, options.pos || 0);
}

// :: (Node) → DOMOutputSpec #path=NodeType.prototype.toDOM
// Defines the way the node should be serialized to DOM/HTML. Should
// return an [array structure](#DOMOutputSpec) that describes the
// resulting DOM structure, with an optional number zero (“hole”) in
// it to indicate where the node's content should be inserted.

// :: (Node) → DOMOutputSpec #path=MarkType.prototype.toDOM
// Defines the way the mark should be serialized to DOM/HTML.

// :: union<string, DOMNode, [any]> #path=DOMOutputSpec #kind=interface
// A description of a DOM structure. Strings are interpreted as text
// nodes. A DOM node simply means itself.
//
// An array describes a DOM element. The first element in the array
// should be a string, and is the name of the DOM element. If the
// second element is a non-Array, non-DOM node object, it is
// interpreted as an object providing the DOM element's attributes.
// Any elements after that (including the 2nd if it's not an attribute
// object) are interpreted as children of the DOM elements, and must
// either be valid `DOMOutputSpec` values, or the number zero.
//
// The number zero (pronounce “hole”) is used to indicate the place
// where a ProseMirror node's content should be inserted.

// :: (Node, ?Object) → DOMNode
// Serialize a given node to a DOM node. This is useful when you need
// to serialize a part of a document, as opposed to the whole
// document.
function nodeToDOM(node, options, offset) {
  var serializer = new DOMSerializer(options),
      pos = options.pos || 0;
  var dom = serializer.renderNode(node, pos, offset);
  if (node.isInline) {
    dom = serializer.wrapInlineFlat(dom, node.marks);
    if (serializer.options.renderInlineFlat) dom = options.renderInlineFlat(node, dom, pos, offset) || dom;
  }
  return dom;
}

// :: (union<Node, Fragment>, ?Object) → string
// Serialize a node as an HTML string. Goes through `toDOM` and then
// serializes the result. Again, you must pass a `document` option
// when not in the browser.
function toHTML(content, options) {
  var serializer = new DOMSerializer(options);
  var wrap = serializer.doc.createElement("div");
  wrap.appendChild(serializer.renderFragment(content instanceof _model.Node ? content.content : content, null, options.pos || 0));
  return wrap.innerHTML;
}
},{"../model":26}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ContentMatch = exports.ContentExpr = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fragment = require("./fragment");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ContentExpr = exports.ContentExpr = function () {
  function ContentExpr(nodeType, elements, inlineContent) {
    _classCallCheck(this, ContentExpr);

    this.nodeType = nodeType;
    this.elements = elements;
    this.inlineContent = inlineContent;
  }

  _createClass(ContentExpr, [{
    key: "start",
    value: function start(attrs) {
      return new ContentMatch(this, attrs, 0, 0);
    }
  }, {
    key: "matches",
    value: function matches(attrs, fragment, from, to) {
      return this.start(attrs).matchToEnd(fragment, from, to);
    }

    // Get a position in a known-valid fragment. If this is a simple
    // (single-element) expression, we don't have to do any matching,
    // and can simply skip to the position with count `index`.

  }, {
    key: "getMatchAt",
    value: function getMatchAt(attrs, fragment) {
      var index = arguments.length <= 2 || arguments[2] === undefined ? fragment.childCount : arguments[2];

      if (this.elements.length == 1) return new ContentMatch(this, attrs, 0, index);else return this.start(attrs).matchFragment(fragment, 0, index);
    }
  }, {
    key: "checkReplace",
    value: function checkReplace(attrs, content, from, to) {
      var replacement = arguments.length <= 4 || arguments[4] === undefined ? _fragment.Fragment.empty : arguments[4];
      var start = arguments.length <= 5 || arguments[5] === undefined ? 0 : arguments[5];
      var end = arguments.length <= 6 || arguments[6] === undefined ? replacement.childCount : arguments[6];

      // Check for simple case, where the expression only has a single element
      // (Optimization to avoid matching more than we need)
      if (this.elements.length == 1) {
        var elt = this.elements[0];
        if (!checkCount(elt, content.childCount - (to - from) + (end - start), attrs, this)) return false;
        for (var i = start; i < end; i++) {
          if (!elt.matches(replacement.child(i), attrs, this)) return false;
        }return true;
      }

      var match = this.getMatchAt(attrs, content, from).matchFragment(replacement, start, end);
      return match ? match.matchToEnd(content, to) : false;
    }
  }, {
    key: "checkReplaceWith",
    value: function checkReplaceWith(attrs, content, from, to, type, typeAttrs, marks) {
      if (this.elements.length == 1) {
        var elt = this.elements[0];
        if (!checkCount(elt, content.childCount - (to - from) + 1, attrs, this)) return false;
        return elt.matchesType(type, typeAttrs, marks, attrs, this);
      }

      var match = this.getMatchAt(attrs, content, from).matchType(type, typeAttrs, marks);
      return match ? match.matchToEnd(content, to) : false;
    }
  }, {
    key: "compatible",
    value: function compatible(other) {
      for (var i = 0; i < this.elements.length; i++) {
        var elt = this.elements[i];
        for (var j = 0; j < other.elements.length; j++) {
          if (other.elements[j].compatible(elt)) return true;
        }
      }
      return false;
    }
  }, {
    key: "generateContent",
    value: function generateContent(attrs) {
      return this.start(attrs).fillBefore(_fragment.Fragment.empty, true);
    }
  }, {
    key: "isLeaf",
    get: function get() {
      return this.elements.length == 0;
    }
  }], [{
    key: "parse",
    value: function parse(nodeType, expr, specs) {
      var elements = [],
          pos = 0,
          inline = null;
      for (;;) {
        pos += /^\s*/.exec(expr.slice(pos))[0].length;
        if (pos == expr.length) break;

        var types = /^(?:(\w+)|\(\s*(\w+(?:\s*\|\s*\w+)*)\s*\))/.exec(expr.slice(pos));
        if (!types) throw new SyntaxError("Invalid content expression '" + expr + "' at " + pos);
        pos += types[0].length;
        var attrs = /^\[([^\]]+)\]/.exec(expr.slice(pos));
        if (attrs) pos += attrs[0].length;
        var marks = /^<(?:(_)|\s*(\w+(?:\s+\w+)*)\s*)>/.exec(expr.slice(pos));
        if (marks) pos += marks[0].length;
        var repeat = /^(?:([+*?])|\{\s*(\d+|\.\w+)\s*(,\s*(\d+|\.\w+)?)?\s*\})/.exec(expr.slice(pos));
        if (repeat) pos += repeat[0].length;

        var nodeTypes = expandTypes(nodeType.schema, specs, types[1] ? [types[1]] : types[2].split(/\s*\|\s*/));
        for (var i = 0; i < nodeTypes.length; i++) {
          if (inline == null) inline = nodeTypes[i].isInline;else if (inline != nodeTypes[i].isInline) throw new SyntaxError("Mixing inline and block content in a single node");
        }
        var attrSet = !attrs ? null : parseAttrs(nodeType, attrs[1]);
        var markSet = !marks ? false : marks[1] ? true : checkMarks(nodeType.schema, marks[2].split(/\s+/));

        var _parseRepeat = parseRepeat(nodeType, repeat);

        var min = _parseRepeat.min;
        var max = _parseRepeat.max;

        if (min != 0 && nodeTypes[0].hasRequiredAttrs(attrSet)) throw new SyntaxError("Node type " + types[0] + " in type " + nodeType.name + " is required, but has non-optional attributes");
        var newElt = new ContentElement(nodeTypes, attrSet, markSet, min, max);
        for (var _i = elements.length - 1; _i >= 0; _i--) {
          if (elements[_i].overlaps(newElt)) throw new SyntaxError("Overlapping adjacent content expressions in '" + expr + "'");
          if (elements[_i].min != 0) break;
        }
        elements.push(newElt);
      }

      return new ContentExpr(nodeType, elements, !!inline);
    }
  }]);

  return ContentExpr;
}();

var ContentElement = function () {
  function ContentElement(nodeTypes, attrs, marks, min, max) {
    _classCallCheck(this, ContentElement);

    this.nodeTypes = nodeTypes;
    this.attrs = attrs;
    this.marks = marks;
    this.min = min;
    this.max = max;
  }

  _createClass(ContentElement, [{
    key: "matchesType",
    value: function matchesType(type, attrs, marks, parentAttrs, parentExpr) {
      if (this.nodeTypes.indexOf(type) == -1) return false;
      if (this.attrs) {
        if (!attrs) return false;
        for (var prop in this.attrs) {
          if (attrs[prop] != _resolveValue(this.attrs[prop], parentAttrs, parentExpr)) return false;
        }
      }
      if (this.marks === true) return true;
      if (this.marks === false) return marks.length == 0;
      for (var i = 0; i < marks.length; i++) {
        if (this.marks.indexOf(marks[i].type) == -1) return false;
      }return true;
    }
  }, {
    key: "matches",
    value: function matches(node, parentAttrs, parentExpr) {
      return this.matchesType(node.type, node.attrs, node.marks, parentAttrs, parentExpr);
    }
  }, {
    key: "compatible",
    value: function compatible(other) {
      for (var i = 0; i < this.nodeTypes.length; i++) {
        if (other.nodeTypes.indexOf(this.nodeTypes[i]) != -1) return true;
      }return false;
    }
  }, {
    key: "constrainedAttrs",
    value: function constrainedAttrs(parentAttrs, expr) {
      if (!this.attrs) return null;
      var attrs = Object.create(null);
      for (var prop in this.attrs) {
        attrs[prop] = _resolveValue(this.attrs[prop], parentAttrs, expr);
      }return attrs;
    }
  }, {
    key: "createFiller",
    value: function createFiller(parentAttrs, expr) {
      var type = this.nodeTypes[0],
          attrs = type.computeAttrs(this.constrainedAttrs(parentAttrs, expr));
      return type.create(attrs, type.contentExpr.generateContent(attrs));
    }
  }, {
    key: "defaultType",
    value: function defaultType() {
      return this.nodeTypes[0].defaultAttrs && this.nodeTypes[0];
    }
  }, {
    key: "overlaps",
    value: function overlaps(other) {
      return this.nodeTypes.some(function (t) {
        return other.nodeTypes.indexOf(t) > -1;
      });
    }
  }, {
    key: "allowsMark",
    value: function allowsMark(markType) {
      return this.marks === true || this.marks && this.marks.indexOf(markType) > -1;
    }
  }]);

  return ContentElement;
}();

// ;; Represents a partial match of a node type's [content
// expression](#SchemaSpec.nodes).


var ContentMatch = exports.ContentMatch = function () {
  function ContentMatch(expr, attrs, index, count) {
    _classCallCheck(this, ContentMatch);

    this.expr = expr;
    this.attrs = attrs;
    this.index = index;
    this.count = count;
  }

  _createClass(ContentMatch, [{
    key: "move",
    value: function move(index, count) {
      return new ContentMatch(this.expr, this.attrs, index, count);
    }
  }, {
    key: "resolveValue",
    value: function resolveValue(value) {
      return value instanceof AttrValue ? _resolveValue(value, this.attrs, this.expr) : value;
    }

    // :: (Node) → ?ContentMatch
    // Match a node, returning an updated match if successful.

  }, {
    key: "matchNode",
    value: function matchNode(node) {
      return this.matchType(node.type, node.attrs, node.marks);
    }

    // :: (NodeType, ?Object, [Mark]) → ?ContentMatch
    // Match a node type and marks, returning an updated match if
    // successful.

  }, {
    key: "matchType",
    value: function matchType(type, attrs, marks) {
      // FIXME `var` to work around Babel bug T7293
      for (index = this.index, count = this.count, void 0; index < this.expr.elements.length; index++, count = 0) {
        var index, count;

        var elt = this.expr.elements[index],
            max = this.resolveValue(elt.max);
        if (count < max && elt.matchesType(type, attrs, marks, this.attrs, this.expr)) {
          count++;
          return this.move(index, count);
        }
        if (count < this.resolveValue(elt.min)) return null;
      }
    }

    // :: (Fragment, ?number, ?number) → ?union<ContentMatch, bool>
    // Try to match a fragment. Returns a new match when successful,
    // `null` when it ran into a required element it couldn't fit, and
    // `false` if it reached the end of the expression without
    // matching all nodes.

  }, {
    key: "matchFragment",
    value: function matchFragment(fragment) {
      var from = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var to = arguments.length <= 2 || arguments[2] === undefined ? fragment.childCount : arguments[2];

      if (from == to) return this;
      var fragPos = from,
          end = this.expr.elements.length;
      for (index = this.index, count = this.count, void 0; index < end; index++, count = 0) {
        var index, count;

        var elt = this.expr.elements[index],
            max = this.resolveValue(elt.max);

        while (count < max) {
          if (elt.matches(fragment.child(fragPos), this.attrs, this.expr)) {
            count++;
            if (++fragPos == to) return this.move(index, count);
          } else {
            break;
          }
        }
        if (count < this.resolveValue(elt.min)) return null;
      }
      return false;
    }

    // :: (Fragment, ?number, ?number) → bool
    // Returns true only if the fragment matches here, and reaches all
    // the way to the end of the content expression.

  }, {
    key: "matchToEnd",
    value: function matchToEnd(fragment, start, end) {
      var matched = this.matchFragment(fragment, start, end);
      return matched && matched.validEnd() || false;
    }

    // :: () → bool
    // Returns true if this position represents a valid end of the
    // expression (no required content follows after it).

  }, {
    key: "validEnd",
    value: function validEnd() {
      for (var i = this.index, count = this.count; i < this.expr.elements.length; i++, count = 0) {
        if (count < this.resolveValue(this.expr.elements[i].min)) return false;
      }return true;
    }

    // :: (Fragment, bool, ?number) → ?Fragment
    // Try to match the given fragment, and if that fails, see if it can
    // be made to match by inserting nodes in front of it. When
    // successful, return a fragment (which may be empty if nothing had
    // to be inserted). When `toEnd` is true, only return a fragment if
    // the resulting match goes to the end of the content expression.

  }, {
    key: "fillBefore",
    value: function fillBefore(after, toEnd, startIndex) {
      var added = [],
          match = this,
          index = startIndex || 0,
          end = this.expr.elements.length;
      for (;;) {
        var fits = match.matchFragment(after, index);
        if (fits && (!toEnd || fits.validEnd())) return _fragment.Fragment.from(added);
        if (fits === false) return null; // Matched to end with content remaining

        var elt = match.element;
        if (match.count < this.resolveValue(elt.min)) {
          added.push(elt.createFiller(this.attrs, this.expr));
          match = match.move(match.index, match.count + 1);
        } else if (match.index < end) {
          match = match.move(match.index + 1, 0);
        } else if (after.childCount > index) {
          return null;
        } else {
          return _fragment.Fragment.from(added);
        }
      }
    }
  }, {
    key: "possibleContent",
    value: function possibleContent() {
      var found = [];
      for (var i = this.index, count = this.count; i < this.expr.elements.length; i++, count = 0) {
        var elt = this.expr.elements[i],
            attrs = elt.constrainedAttrs(this.attrs, this.expr);
        if (count < this.resolveValue(elt.max)) for (var j = 0; j < elt.nodeTypes.length; j++) {
          var type = elt.nodeTypes[j];
          if (!type.hasRequiredAttrs(attrs)) found.push({ type: type, attrs: attrs });
        }
        if (this.resolveValue(elt.min) > count) break;
      }
      return found;
    }

    // :: (MarkType) → bool
    // Check whether a node with the given mark type is allowed after
    // this position.

  }, {
    key: "allowsMark",
    value: function allowsMark(markType) {
      return this.element.allowsMark(markType);
    }

    // :: (NodeType, ?Object) → ?[{type: NodeType, attrs: Object}]
    // Find a set of wrapping node types that would allow a node of type
    // `type` to appear at this position. The result may be empty (when
    // it fits directly) and will be null when no such wrapping exists.

  }, {
    key: "findWrapping",
    value: function findWrapping(target, targetAttrs) {
      // FIXME find out how expensive this is. Try to reintroduce caching?
      var seen = Object.create(null),
          first = { match: this, via: null },
          active = [first];
      while (active.length) {
        var current = active.shift(),
            match = current.match;
        var possible = match.possibleContent();
        for (var i = 0; i < possible.length; i++) {
          var _possible$i = possible[i];
          var type = _possible$i.type;
          var attrs = _possible$i.attrs;var fullAttrs = type.computeAttrs(attrs);
          if (type == target) {
            var fits = match.matchType(type, targetAttrs, []);
            if (fits && fits.validEnd()) {
              var result = [];
              for (var obj = current; obj.via; obj = obj.via) {
                result.push({ type: obj.match.expr.nodeType, attrs: obj.match.attrs });
              }return result.reverse();
            }
          }
          if (!type.isLeaf && !(type.name in seen) && (current == first || match.matchType(type, fullAttrs, []).validEnd())) {
            active.push({ match: type.contentExpr.start(fullAttrs), via: current });
            seen[type.name] = true;
          }
        }
      }
    }
  }, {
    key: "element",
    get: function get() {
      return this.expr.elements[this.index];
    }
  }]);

  return ContentMatch;
}();

var AttrValue = function AttrValue(attr) {
  _classCallCheck(this, AttrValue);

  this.attr = attr;
};

function parseValue(nodeType, value) {
  if (value.charAt(0) == ".") {
    var attr = value.slice(1);
    if (!nodeType.attrs[attr]) throw new SyntaxError("Node type " + nodeType.name + " has no attribute " + attr);
    return new AttrValue(attr);
  } else {
    return JSON.parse(value);
  }
}

function checkMarks(schema, marks) {
  var found = [];
  for (var i = 0; i < marks.length; i++) {
    var mark = schema.marks[marks[i]];
    if (mark) found.push(mark);else throw new SyntaxError("Unknown mark type: '" + marks[i] + "'");
  }
  return found;
}

function _resolveValue(value, attrs, expr) {
  if (!(value instanceof AttrValue)) return value;
  var attrVal = attrs && attrs[value.attr];
  return attrVal !== undefined ? attrVal : expr.nodeType.defaultAttrs[value.attr];
}

function checkCount(elt, count, attrs, expr) {
  return count >= _resolveValue(elt.min, attrs, expr) && count <= _resolveValue(elt.max, attrs, expr);
}

function expandTypes(schema, specs, types) {
  var result = [];
  types.forEach(function (type) {
    var found = schema.nodes[type];
    if (found) {
      if (result.indexOf(found) == -1) result.push(found);
    } else {
      specs.forEach(function (name, spec) {
        if (spec.group && spec.group.split(" ").indexOf(type) > -1) {
          found = schema.nodes[name];
          if (result.indexOf(found) == -1) result.push(found);
        }
      });
    }
    if (!found) throw new SyntaxError("Node type or group '" + type + "' does not exist");
  });
  return result;
}

var many = 2e9; // Big number representable as a 32-bit int

function parseRepeat(nodeType, match) {
  var min = 1,
      max = 1;
  if (match) {
    if (match[1] == "+") {
      max = many;
    } else if (match[1] == "*") {
      min = 0;
      max = many;
    } else if (match[1] == "?") {
      min = 0;
    } else if (match[2]) {
      min = parseValue(nodeType, match[2]);
      if (match[3]) max = match[4] ? parseValue(nodeType, match[4]) : many;else max = min;
    }
    if (max == 0 || min > max) throw new SyntaxError("Invalid repeat count in '" + match[0] + "'");
  }
  return { min: min, max: max };
}

function parseAttrs(nodeType, expr) {
  var parts = expr.split(/\s*,\s*/);
  var attrs = Object.create(null);
  for (var i = 0; i < parts.length; i++) {
    var match = /^(\w+)=(\w+|\"(?:\\.|[^\\])*\"|\.\w+)$/.exec(parts[i]);
    if (!match) throw new SyntaxError("Invalid attribute syntax: " + parts[i]);
    attrs[match[1]] = parseValue(nodeType, match[2]);
  }
  return attrs;
}
},{"./fragment":25}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findDiffStart = findDiffStart;
exports.findDiffEnd = findDiffEnd;
// :: (Node, Node) → ?number
// Find the first position at which nodes `a` and `b` differ, or
// `null` if they are the same.
function findDiffStart(a, b) {
  var pos = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

  for (var i = 0;; i++) {
    if (i == a.childCount || i == b.childCount) return a.childCount == b.childCount ? null : pos;

    var childA = a.child(i),
        childB = b.child(i);
    if (childA == childB) {
      pos += childA.nodeSize;continue;
    }

    if (!childA.sameMarkup(childB)) return pos;

    if (childA.isText && childA.text != childB.text) {
      for (var j = 0; childA.text[j] == childB.text[j]; j++) {
        pos++;
      }return pos;
    }
    if (childA.content.size || childB.content.size) {
      var inner = findDiffStart(childA.content, childB.content, pos + 1);
      if (inner != null) return inner;
    }
    pos += childA.nodeSize;
  }
}

// :: (Node, Node) → ?{a: number, b: number}
// Find the first position, searching from the end, at which nodes `a`
// and `b` differ, or `null` if they are the same. Since this position
// will not be the same in both nodes, an object with two separate
// positions is returned.
function findDiffEnd(a, b) {
  var posA = arguments.length <= 2 || arguments[2] === undefined ? a.size : arguments[2];
  var posB = arguments.length <= 3 || arguments[3] === undefined ? b.size : arguments[3];

  for (var iA = a.childCount, iB = b.childCount;;) {
    if (iA == 0 || iB == 0) return iA == iB ? null : { a: posA, b: posB };

    var childA = a.child(--iA),
        childB = b.child(--iB),
        size = childA.nodeSize;
    if (childA == childB) {
      posA -= size;posB -= size;
      continue;
    }

    if (!childA.sameMarkup(childB)) return { a: posA, b: posB };

    if (childA.isText && childA.text != childB.text) {
      var same = 0,
          minSize = Math.min(childA.text.length, childB.text.length);
      while (same < minSize && childA.text[childA.text.length - same - 1] == childB.text[childB.text.length - same - 1]) {
        same++;posA--;posB--;
      }
      return { a: posA, b: posB };
    }
    if (childA.content.size || childB.content.size) {
      var inner = findDiffEnd(childA.content, childB.content, posA - 1, posB - 1);
      if (inner) return inner;
    }
    posA -= size;posB -= size;
  }
}
},{}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; Fragment is the type used to represent a node's collection of
// child nodes.
//
// Fragments are persistent data structures. That means you should
// _not_ mutate them or their content, but create new instances
// whenever needed. The API tries to make this easy.

var Fragment = exports.Fragment = function () {
  function Fragment(content, size) {
    _classCallCheck(this, Fragment);

    this.content = content;
    this.size = size || 0;
    if (size == null) for (var i = 0; i < content.length; i++) {
      this.size += content[i].nodeSize;
    }
  }

  // :: () → string
  // Return a debugging string that describes this fragment.


  _createClass(Fragment, [{
    key: "toString",
    value: function toString() {
      return "<" + this.toStringInner() + ">";
    }
  }, {
    key: "toStringInner",
    value: function toStringInner() {
      return this.content.join(", ");
    }
  }, {
    key: "nodesBetween",
    value: function nodesBetween(from, to, f, nodeStart, parent) {
      for (var i = 0, pos = 0; pos < to; i++) {
        var child = this.content[i],
            end = pos + child.nodeSize;
        if (end > from && f(child, nodeStart + pos, parent, i) !== false && child.content.size) {
          var start = pos + 1;
          child.nodesBetween(Math.max(0, from - start), Math.min(child.content.size, to - start), f, nodeStart + start);
        }
        pos = end;
      }
    }

    // :: (number, number, string) → string

  }, {
    key: "textBetween",
    value: function textBetween(from, to, separator) {
      var text = "",
          separated = true;
      this.nodesBetween(from, to, function (node, pos) {
        if (node.isText) {
          text += node.text.slice(Math.max(from, pos) - pos, to - pos);
          separated = !separator;
        } else if (!separated && node.isBlock) {
          text += separator;
          separated = true;
        }
      }, 0);
      return text;
    }

    // :: (number, ?number) → Fragment
    // Cut out the sub-fragment between the two given positions.

  }, {
    key: "cut",
    value: function cut(from, to) {
      if (to == null) to = this.size;
      if (from == 0 && to == this.size) return this;
      var result = [],
          size = 0;
      if (to > from) for (var i = 0, pos = 0; pos < to; i++) {
        var child = this.content[i],
            end = pos + child.nodeSize;
        if (end > from) {
          if (pos < from || end > to) {
            if (child.isText) child = child.cut(Math.max(0, from - pos), Math.min(child.text.length, to - pos));else child = child.cut(Math.max(0, from - pos - 1), Math.min(child.content.size, to - pos - 1));
          }
          result.push(child);
          size += child.nodeSize;
        }
        pos = end;
      }
      return new Fragment(result, size);
    }
  }, {
    key: "cutByIndex",
    value: function cutByIndex(from, to) {
      if (from == to) return Fragment.empty;
      if (from == 0 && to == this.content.length) return this;
      return new Fragment(this.content.slice(from, to));
    }

    // :: (Fragment) → Fragment
    // Create a new fragment containing the content of this fragment and
    // `other`.

  }, {
    key: "append",
    value: function append(other) {
      if (!other.size) return this;
      if (!this.size) return other;
      var last = this.lastChild,
          first = other.firstChild,
          content = this.content.slice(),
          i = 0;
      if (last.isText && last.sameMarkup(first)) {
        content[content.length - 1] = last.copy(last.text + first.text);
        i = 1;
      }
      for (; i < other.content.length; i++) {
        content.push(other.content[i]);
      }return new Fragment(content, this.size + other.size);
    }

    // :: (number, Node) → Fragment
    // Create a new fragment in which the node at the given index is
    // replaced by the given node.

  }, {
    key: "replaceChild",
    value: function replaceChild(index, node) {
      var current = this.content[index];
      if (current == node) return this;
      var copy = this.content.slice();
      var size = this.size + node.nodeSize - current.nodeSize;
      copy[index] = node;
      return new Fragment(copy, size);
    }

    // (Node) → Fragment
    // Create a new fragment by prepending the given node to this
    // fragment.

  }, {
    key: "addToStart",
    value: function addToStart(node) {
      return new Fragment([node].concat(this.content), this.size + node.nodeSize);
    }

    // (Node) → Fragment
    // Create a new fragment by appending the given node to this
    // fragment.

  }, {
    key: "addToEnd",
    value: function addToEnd(node) {
      return new Fragment(this.content.concat(node), this.size + node.nodeSize);
    }

    // :: () → ?Object
    // Create a JSON-serializeable representation of this fragment.

  }, {
    key: "toJSON",
    value: function toJSON() {
      return this.content.length ? this.content.map(function (n) {
        return n.toJSON();
      }) : null;
    }

    // :: (Schema, ?Object) → Fragment
    // Deserialize a fragment from its JSON representation.

  }, {
    key: "eq",


    // :: (Fragment) → bool
    // Compare this fragment to another one.
    value: function eq(other) {
      if (this.content.length != other.content.length) return false;
      for (var i = 0; i < this.content.length; i++) {
        if (!this.content[i].eq(other.content[i])) return false;
      }return true;
    }

    // :: (?union<Fragment, Node, [Node]>) → Fragment
    // Create a fragment from something that can be interpreted as a set
    // of nodes. For `null`, it returns the empty fragment. For a
    // fragment, the fragment itself. For a node or array of nodes, a
    // fragment containing those nodes.

  }, {
    key: "child",


    // :: (number) → Node
    // Get the child node at the given index. Raise an error when the
    // index is out of range.
    value: function child(index) {
      var found = this.content[index];
      if (!found) throw new RangeError("Index " + index + " out of range for " + this);
      return found;
    }

    // :: (number) → ?Node
    // Get the child node at the given index, if it exists.

  }, {
    key: "maybeChild",
    value: function maybeChild(index) {
      return this.content[index];
    }

    // :: ((node: Node, offset: number))
    // Call `f` for every child node, passing the node and its offset
    // into this parent node.

  }, {
    key: "forEach",
    value: function forEach(f) {
      for (var i = 0, p = 0; i < this.content.length; i++) {
        var child = this.content[i];
        f(child, p);
        p += child.nodeSize;
      }
    }

    // : (number, ?number) → {index: number, offset: number}
    // Find the index and inner offset corresponding to a given relative
    // position in this fragment. The result object will be reused
    // (overwritten) the next time the function is called. (Not public.)

  }, {
    key: "findIndex",
    value: function findIndex(pos) {
      var round = arguments.length <= 1 || arguments[1] === undefined ? -1 : arguments[1];

      if (pos == 0) return retIndex(0, pos);
      if (pos == this.size) return retIndex(this.content.length, pos);
      if (pos > this.size || pos < 0) throw new RangeError("Position " + pos + " outside of fragment (" + this + ")");
      for (var i = 0, curPos = 0;; i++) {
        var cur = this.child(i),
            end = curPos + cur.nodeSize;
        if (end >= pos) {
          if (end == pos || round > 0) return retIndex(i + 1, end);
          return retIndex(i, curPos);
        }
        curPos = end;
      }
    }
  }, {
    key: "firstChild",


    // :: ?Node
    // The first child of the fragment, or `null` if it is empty.
    get: function get() {
      return this.content.length ? this.content[0] : null;
    }

    // :: ?Node
    // The last child of the fragment, or `null` if it is empty.

  }, {
    key: "lastChild",
    get: function get() {
      return this.content.length ? this.content[this.content.length - 1] : null;
    }

    // :: number
    // The number of child nodes in this fragment.

  }, {
    key: "childCount",
    get: function get() {
      return this.content.length;
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, value) {
      return value ? new Fragment(value.map(schema.nodeFromJSON)) : Fragment.empty;
    }

    // :: ([Node]) → Fragment
    // Build a fragment from an array of nodes. Ensures that adjacent
    // text nodes with the same style are joined together.

  }, {
    key: "fromArray",
    value: function fromArray(array) {
      if (!array.length) return Fragment.empty;
      var joined = void 0,
          size = 0;
      for (var i = 0; i < array.length; i++) {
        var node = array[i];
        size += node.nodeSize;
        if (i && node.isText && array[i - 1].sameMarkup(node)) {
          if (!joined) joined = array.slice(0, i);
          joined[joined.length - 1] = node.copy(joined[joined.length - 1].text + node.text);
        } else if (joined) {
          joined.push(node);
        }
      }
      return new Fragment(joined || array, size);
    }
  }, {
    key: "from",
    value: function from(nodes) {
      if (!nodes) return Fragment.empty;
      if (nodes instanceof Fragment) return nodes;
      if (Array.isArray(nodes)) return this.fromArray(nodes);
      return new Fragment([nodes], nodes.nodeSize);
    }
  }]);

  return Fragment;
}();

var found = { index: 0, offset: 0 };
function retIndex(index, offset) {
  found.index = index;
  found.offset = offset;
  return found;
}

// :: Fragment
// An empty fragment. Intended to be reused whenever a node doesn't
// contain anything (rather than allocating a new empty fragment for
// each leaf node).
Fragment.empty = new Fragment([], 0);
},{}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
        value: true
});

var _node = require("./node");

Object.defineProperty(exports, "Node", {
        enumerable: true,
        get: function get() {
                return _node.Node;
        }
});

var _resolvedpos = require("./resolvedpos");

Object.defineProperty(exports, "ResolvedPos", {
        enumerable: true,
        get: function get() {
                return _resolvedpos.ResolvedPos;
        }
});

var _fragment = require("./fragment");

Object.defineProperty(exports, "Fragment", {
        enumerable: true,
        get: function get() {
                return _fragment.Fragment;
        }
});

var _replace = require("./replace");

Object.defineProperty(exports, "Slice", {
        enumerable: true,
        get: function get() {
                return _replace.Slice;
        }
});
Object.defineProperty(exports, "ReplaceError", {
        enumerable: true,
        get: function get() {
                return _replace.ReplaceError;
        }
});

var _mark = require("./mark");

Object.defineProperty(exports, "Mark", {
        enumerable: true,
        get: function get() {
                return _mark.Mark;
        }
});

var _schema = require("./schema");

Object.defineProperty(exports, "SchemaSpec", {
        enumerable: true,
        get: function get() {
                return _schema.SchemaSpec;
        }
});
Object.defineProperty(exports, "Schema", {
        enumerable: true,
        get: function get() {
                return _schema.Schema;
        }
});
Object.defineProperty(exports, "NodeType", {
        enumerable: true,
        get: function get() {
                return _schema.NodeType;
        }
});
Object.defineProperty(exports, "Block", {
        enumerable: true,
        get: function get() {
                return _schema.Block;
        }
});
Object.defineProperty(exports, "Inline", {
        enumerable: true,
        get: function get() {
                return _schema.Inline;
        }
});
Object.defineProperty(exports, "Text", {
        enumerable: true,
        get: function get() {
                return _schema.Text;
        }
});
Object.defineProperty(exports, "MarkType", {
        enumerable: true,
        get: function get() {
                return _schema.MarkType;
        }
});
Object.defineProperty(exports, "Attribute", {
        enumerable: true,
        get: function get() {
                return _schema.Attribute;
        }
});
Object.defineProperty(exports, "NodeKind", {
        enumerable: true,
        get: function get() {
                return _schema.NodeKind;
        }
});

var _content = require("./content");

Object.defineProperty(exports, "ContentMatch", {
        enumerable: true,
        get: function get() {
                return _content.ContentMatch;
        }
});

var _diff = require("./diff");

Object.defineProperty(exports, "findDiffStart", {
        enumerable: true,
        get: function get() {
                return _diff.findDiffStart;
        }
});
Object.defineProperty(exports, "findDiffEnd", {
        enumerable: true,
        get: function get() {
                return _diff.findDiffEnd;
        }
});
},{"./content":23,"./diff":24,"./fragment":25,"./mark":27,"./node":28,"./replace":29,"./resolvedpos":30,"./schema":31}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Mark = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _comparedeep = require("../util/comparedeep");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; A mark is a piece of information that can be attached to a node,
// such as it being emphasized, in code font, or a link. It has a type
// and optionally a set of attributes that provide further information
// (such as the target of the link). Marks are created through a
// `Schema`, which controls which types exist and which
// attributes they have.

var Mark = exports.Mark = function () {
  function Mark(type, attrs) {
    _classCallCheck(this, Mark);

    // :: MarkType
    // The type of this mark.
    this.type = type;
    // :: Object
    // The attributes associated with this mark.
    this.attrs = attrs;
  }

  // :: () → Object
  // Convert this mark to a JSON-serializeable representation.


  _createClass(Mark, [{
    key: "toJSON",
    value: function toJSON() {
      var obj = { _: this.type.name };
      for (var attr in this.attrs) {
        obj[attr] = this.attrs[attr];
      }return obj;
    }

    // :: ([Mark]) → [Mark]
    // Given a set of marks, create a new set which contains this one as
    // well, in the right position. If this mark or another of its type
    // is already in the set, the set itself is returned.

  }, {
    key: "addToSet",
    value: function addToSet(set) {
      for (var i = 0; i < set.length; i++) {
        var other = set[i];
        if (other.type == this.type) {
          if (this.eq(other)) return set;
          var copy = set.slice();
          copy[i] = this;
          return copy;
        }
        if (other.type.rank > this.type.rank) return set.slice(0, i).concat(this).concat(set.slice(i));
      }
      return set.concat(this);
    }

    // :: ([Mark]) → [Mark]
    // Remove this mark from the given set, returning a new set. If this
    // mark is not in the set, the set itself is returned.

  }, {
    key: "removeFromSet",
    value: function removeFromSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (this.eq(set[i])) return set.slice(0, i).concat(set.slice(i + 1));
      }return set;
    }

    // :: ([Mark]) → bool
    // Test whether this mark is in the given set of marks.

  }, {
    key: "isInSet",
    value: function isInSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (this.eq(set[i])) return true;
      }return false;
    }

    // :: (Mark) → bool
    // Test whether this mark has the same type and attributes as
    // another mark.

  }, {
    key: "eq",
    value: function eq(other) {
      if (this == other) return true;
      if (this.type != other.type) return false;
      if (!(0, _comparedeep.compareDeep)(other.attrs, this.attrs)) return false;
      return true;
    }

    // :: ([Mark], [Mark]) → bool
    // Test whether two sets of marks are identical.

  }], [{
    key: "sameSet",
    value: function sameSet(a, b) {
      if (a == b) return true;
      if (a.length != b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!a[i].eq(b[i])) return false;
      }return true;
    }

    // :: (?union<Mark, [Mark]>) → [Mark]
    // Create a properly sorted mark set from null, a single mark, or an
    // unsorted array of marks.

  }, {
    key: "setFrom",
    value: function setFrom(marks) {
      if (!marks || marks.length == 0) return empty;
      if (marks instanceof Mark) return [marks];
      var copy = marks.slice();
      copy.sort(function (a, b) {
        return a.type.rank - b.type.rank;
      });
      return copy;
    }
  }]);

  return Mark;
}();

var empty = [];
},{"../util/comparedeep":43}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TextNode = exports.Node = undefined;

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fragment = require("./fragment");

var _mark = require("./mark");

var _replace2 = require("./replace");

var _resolvedpos = require("./resolvedpos");

var _comparedeep = require("../util/comparedeep");

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var emptyArray = [],
    emptyAttrs = Object.create(null);

// ;; This class represents a node in the tree that makes up a
// ProseMirror document. So a document is an instance of `Node`, with
// children that are also instances of `Node`.
//
// Nodes are persistent data structures. Instead of changing them, you
// create new ones with the content you want. Old ones keep pointing
// at the old document shape. This is made cheaper by sharing
// structure between the old and new data as much as possible, which a
// tree shape like this (without back pointers) makes easy.
//
// **Never** directly mutate the properties of a `Node` object. See
// [this guide](guide/doc.html) for more information.

var Node = exports.Node = function () {
  function Node(type, attrs, content, marks) {
    _classCallCheck(this, Node);

    // :: NodeType
    // The type of node that this is.
    this.type = type;

    // :: Object
    // An object mapping attribute names to string values. The kind of
    // attributes allowed and required are determined by the node
    // type.
    this.attrs = attrs;

    // :: Fragment
    // The node's content.
    this.content = content || _fragment.Fragment.empty;

    // :: [Mark]
    // The marks (things like whether it is emphasized or part of a
    // link) associated with this node.
    this.marks = marks || emptyArray;
  }

  // :: number
  // The size of this node. For text node, this is the amount of
  // characters. For leaf nodes, it is one. And for non-leaf nodes, it
  // is the size of the content plus two (the start and end token).


  _createClass(Node, [{
    key: "child",


    // :: (number) → Node
    // Get the child node at the given index. Raise an error when the
    // index is out of range.
    value: function child(index) {
      return this.content.child(index);
    }

    // :: (number) → ?Node
    // Get the child node at the given index, if it exists.

  }, {
    key: "maybeChild",
    value: function maybeChild(index) {
      return this.content.maybeChild(index);
    }

    // :: ((node: Node, offset: number))
    // Call `f` for every child node, passing the node and its offset
    // into this parent node.

  }, {
    key: "forEach",
    value: function forEach(f) {
      this.content.forEach(f);
    }

    // :: string
    // Concatenate all the text nodes found in this fragment and its
    // children.

  }, {
    key: "textBetween",


    // :: (number, number, ?string) → string
    // Get all text between positions `from` and `to`. When `separator`
    // is given, it will be inserted whenever a new block node is
    // started.
    value: function textBetween(from, to, separator) {
      return this.content.textBetween(from, to, separator);
    }

    // :: ?Node
    // Returns this node's first child, or `null` if there are no
    // children.

  }, {
    key: "eq",


    // :: (Node) → bool
    // Test whether two nodes represent the same content.
    value: function eq(other) {
      return this == other || this.sameMarkup(other) && this.content.eq(other.content);
    }

    // :: (Node) → bool
    // Compare the markup (type, attributes, and marks) of this node to
    // those of another. Returns `true` if both have the same markup.

  }, {
    key: "sameMarkup",
    value: function sameMarkup(other) {
      return this.hasMarkup(other.type, other.attrs, other.marks);
    }

    // :: (NodeType, ?Object, ?[Mark]) → bool
    // Check whether this node's markup correspond to the given type,
    // attributes, and marks.

  }, {
    key: "hasMarkup",
    value: function hasMarkup(type, attrs, marks) {
      return this.type == type && (0, _comparedeep.compareDeep)(this.attrs, attrs || type.defaultAttrs || emptyAttrs) && _mark.Mark.sameSet(this.marks, marks || emptyArray);
    }

    // :: (?Fragment) → Node
    // Create a new node with the same markup as this node, containing
    // the given content (or empty, if no content is given).

  }, {
    key: "copy",
    value: function copy() {
      var content = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

      if (content == this.content) return this;
      return new this.constructor(this.type, this.attrs, content, this.marks);
    }

    // :: ([Mark]) → Node
    // Create a copy of this node, with the given set of marks instead
    // of the node's own marks.

  }, {
    key: "mark",
    value: function mark(marks) {
      return marks == this.marks ? this : new this.constructor(this.type, this.attrs, this.content, marks);
    }

    // :: (number, ?number) → Node
    // Create a copy of this node with only the content between the
    // given offsets. If `to` is not given, it defaults to the end of
    // the node.

  }, {
    key: "cut",
    value: function cut(from, to) {
      if (from == 0 && to == this.content.size) return this;
      return this.copy(this.content.cut(from, to));
    }

    // :: (number, ?number) → Slice
    // Cut out the part of the document between the given positions, and
    // return it as a `Slice` object.

  }, {
    key: "slice",
    value: function slice(from) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.content.size : arguments[1];

      if (from == to) return _replace2.Slice.empty;

      var $from = this.resolve(from),
          $to = this.resolve(to);
      var depth = $from.sameDepth($to),
          start = $from.start(depth),
          node = $from.node(depth);
      var content = node.content.cut($from.pos - start, $to.pos - start);
      return new _replace2.Slice(content, $from.depth - depth, $to.depth - depth, node);
    }

    // :: (number, number, Slice) → Node
    // Replace the part of the document between the given positions with
    // the given slice. The slice must 'fit', meaning its open sides
    // must be able to connect to the surrounding content, and its
    // content nodes must be valid children for the node they are placed
    // into. If any of this is violated, an error of type `ReplaceError`
    // is thrown.

  }, {
    key: "replace",
    value: function replace(from, to, slice) {
      return (0, _replace2.replace)(this.resolve(from), this.resolve(to), slice);
    }

    // :: (number) → ?Node
    // Find the node after the given position.

  }, {
    key: "nodeAt",
    value: function nodeAt(pos) {
      for (var node = this;;) {
        var _node$content$findInd = node.content.findIndex(pos);

        var index = _node$content$findInd.index;
        var offset = _node$content$findInd.offset;

        node = node.maybeChild(index);
        if (!node) return null;
        if (offset == pos || node.isText) return node;
        pos -= offset + 1;
      }
    }

    // :: (number) → {node: ?Node, index: number, offset: number}
    // Find the (direct) child node after the given offset, if any,
    // and return it along with its index and offset relative to this
    // node.

  }, {
    key: "childAfter",
    value: function childAfter(pos) {
      var _content$findIndex = this.content.findIndex(pos);

      var index = _content$findIndex.index;
      var offset = _content$findIndex.offset;

      return { node: this.content.maybeChild(index), index: index, offset: offset };
    }

    // :: (number) → {node: ?Node, index: number, offset: number}
    // Find the (direct) child node before the given offset, if any,
    // and return it along with its index and offset relative to this
    // node.

  }, {
    key: "childBefore",
    value: function childBefore(pos) {
      if (pos == 0) return { node: null, index: 0, offset: 0 };

      var _content$findIndex2 = this.content.findIndex(pos);

      var index = _content$findIndex2.index;
      var offset = _content$findIndex2.offset;

      if (offset < pos) return { node: this.content.child(index), index: index, offset: offset };
      var node = this.content.child(index - 1);
      return { node: node, index: index - 1, offset: offset - node.nodeSize };
    }

    // :: (?number, ?number, (node: Node, pos: number, parent: Node, index: number))
    // Iterate over all nodes between the given two positions, calling
    // the callback with the node, its position, its parent
    // node, and its index in that node.

  }, {
    key: "nodesBetween",
    value: function nodesBetween(from, to, f) {
      var pos = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

      this.content.nodesBetween(from, to, f, pos, this);
    }

    // :: ((node: Node, pos: number, parent: Node))
    // Call the given callback for every descendant node.

  }, {
    key: "descendants",
    value: function descendants(f) {
      this.nodesBetween(0, this.content.size, f);
    }

    // :: (number) → ResolvedPos
    // Resolve the given position in the document, returning an object
    // describing its path through the document.

  }, {
    key: "resolve",
    value: function resolve(pos) {
      return _resolvedpos.ResolvedPos.resolveCached(this, pos);
    }
  }, {
    key: "resolveNoCache",
    value: function resolveNoCache(pos) {
      return _resolvedpos.ResolvedPos.resolve(this, pos);
    }

    // :: (number) → [Mark]
    // Get the marks at the given position factoring in the surrounding marks'
    // inclusiveLeft and inclusiveRight properties. If the position is at the
    // start of a non-empty node, the marks of the node after it are returned.

  }, {
    key: "marksAt",
    value: function marksAt(pos) {
      var $pos = this.resolve(pos),
          parent = $pos.parent,
          index = $pos.index();

      // In an empty parent, return the empty array
      if (parent.content.size == 0) return emptyArray;
      // When inside a text node or at the start of the parent node, return the node's marks
      if (index == 0 || !$pos.atNodeBoundary) return parent.child(index).marks;

      var marks = parent.child(index - 1).marks;
      for (var i = 0; i < marks.length; i++) {
        if (!marks[i].type.inclusiveRight) marks = marks[i--].removeFromSet(marks);
      }return marks;
    }

    // :: (?number, ?number, MarkType) → bool
    // Test whether a mark of the given type occurs in this document
    // between the two given positions.

  }, {
    key: "rangeHasMark",
    value: function rangeHasMark(from, to, type) {
      var found = false;
      this.nodesBetween(from, to, function (node) {
        if (type.isInSet(node.marks)) found = true;
        return !found;
      });
      return found;
    }

    // :: bool
    // True when this is a block (non-inline node)

  }, {
    key: "toString",


    // :: () → string
    // Return a string representation of this node for debugging
    // purposes.
    value: function toString() {
      var name = this.type.name;
      if (this.content.size) name += "(" + this.content.toStringInner() + ")";
      return wrapMarks(this.marks, name);
    }

    // :: (number) → ContentMatch
    // Get the content match in this node at the given index.

  }, {
    key: "contentMatchAt",
    value: function contentMatchAt(index) {
      return this.type.contentExpr.getMatchAt(this.attrs, this.content, index);
    }

    // :: (number, number, ?Fragment, ?number, ?number) → bool
    // Test whether replacing the range `from` to `to` (by index) with
    // the given replacement fragment (which defaults to the empty
    // fragment) would leave the node's content valid. You can
    // optionally pass `start` and `end` indices into the replacement
    // fragment.

  }, {
    key: "canReplace",
    value: function canReplace(from, to, replacement, start, end) {
      return this.type.contentExpr.checkReplace(this.attrs, this.content, from, to, replacement, start, end);
    }

    // :: (number, number, NodeType, ?[Mark]) → bool
    // Test whether replacing the range `from` to `to` (by index) with a
    // node of the given type and marks would be valid.

  }, {
    key: "canReplaceWith",
    value: function canReplaceWith(from, to, type, attrs, marks) {
      return this.type.contentExpr.checkReplaceWith(this.attrs, this.content, from, to, type, attrs, marks || emptyArray);
    }

    // :: (Node) → bool
    // Test whether the given node's content could be appended to this
    // node. If that node is empty, this will only return true if there
    // is at least one node type that can appear in both nodes (to avoid
    // merging completely incompatible nodes).

  }, {
    key: "canAppend",
    value: function canAppend(other) {
      if (other.content.size) return this.canReplace(this.childCount, this.childCount, other.content);else return this.type.compatibleContent(other.type);
    }
  }, {
    key: "defaultContentType",
    value: function defaultContentType(at) {
      return this.contentMatchAt(at).element.defaultType();
    }

    // :: () → Object
    // Return a JSON-serializeable representation of this node.

  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = { type: this.type.name };
      for (var _ in this.attrs) {
        obj.attrs = this.attrs;
        break;
      }
      if (this.content.size) obj.content = this.content.toJSON();
      if (this.marks.length) obj.marks = this.marks.map(function (n) {
        return n.toJSON();
      });
      return obj;
    }

    // :: (Schema, Object) → Node
    // Deserialize a node from its JSON representation.

  }, {
    key: "nodeSize",
    get: function get() {
      return this.type.isLeaf ? 1 : 2 + this.content.size;
    }

    // :: number
    // The number of children that the node has.

  }, {
    key: "childCount",
    get: function get() {
      return this.content.childCount;
    }
  }, {
    key: "textContent",
    get: function get() {
      this.textBetween(0, this.content.size, "");
    }
  }, {
    key: "firstChild",
    get: function get() {
      return this.content.firstChild;
    }

    // :: ?Node
    // Returns this node's last child, or `null` if there are no
    // children.

  }, {
    key: "lastChild",
    get: function get() {
      return this.content.lastChild;
    }
  }, {
    key: "isBlock",
    get: function get() {
      return this.type.isBlock;
    }

    // :: bool
    // True when this is a textblock node, a block node with inline
    // content.

  }, {
    key: "isTextblock",
    get: function get() {
      return this.type.isTextblock;
    }

    // :: bool
    // True when this is an inline node (a text node or a node that can
    // appear among text).

  }, {
    key: "isInline",
    get: function get() {
      return this.type.isInline;
    }

    // :: bool
    // True when this is a text node.

  }, {
    key: "isText",
    get: function get() {
      return this.type.isText;
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      var type = schema.nodeType(json.type);
      var content = json.text != null ? json.text : _fragment.Fragment.fromJSON(schema, json.content);
      return type.create(json.attrs, content, json.marks && json.marks.map(schema.markFromJSON));
    }
  }]);

  return Node;
}();

// ;; #forward=Node


var TextNode = exports.TextNode = function (_Node) {
  _inherits(TextNode, _Node);

  function TextNode(type, attrs, content, marks) {
    _classCallCheck(this, TextNode);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(TextNode).call(this, type, attrs, null, marks));

    if (!content) throw new RangeError("Empty text nodes are not allowed");

    // :: ?string
    // For text nodes, this contains the node's text content.
    _this.text = content;
    return _this;
  }

  _createClass(TextNode, [{
    key: "toString",
    value: function toString() {
      return wrapMarks(this.marks, JSON.stringify(this.text));
    }
  }, {
    key: "textBetween",
    value: function textBetween(from, to) {
      return this.text.slice(from, to);
    }
  }, {
    key: "mark",
    value: function mark(marks) {
      return new TextNode(this.type, this.attrs, this.text, marks);
    }
  }, {
    key: "cut",
    value: function cut() {
      var from = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.text.length : arguments[1];

      if (from == 0 && to == this.text.length) return this;
      return this.copy(this.text.slice(from, to));
    }
  }, {
    key: "eq",
    value: function eq(other) {
      return this.sameMarkup(other) && this.text == other.text;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var base = _get(Object.getPrototypeOf(TextNode.prototype), "toJSON", this).call(this);
      base.text = this.text;
      return base;
    }
  }, {
    key: "textContent",
    get: function get() {
      return this.text;
    }
  }, {
    key: "nodeSize",
    get: function get() {
      return this.text.length;
    }
  }]);

  return TextNode;
}(Node);

function wrapMarks(marks, str) {
  for (var i = marks.length - 1; i >= 0; i--) {
    str = marks[i].type.name + "(" + str + ")";
  }return str;
}
},{"../util/comparedeep":43,"./fragment":25,"./mark":27,"./replace":29,"./resolvedpos":30}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Slice = exports.ReplaceError = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.replace = replace;

var _error = require("../util/error");

var _fragment = require("./fragment");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; Error type raised by `Node.replace` when given an invalid
// replacement.

var ReplaceError = exports.ReplaceError = function (_ProseMirrorError) {
  _inherits(ReplaceError, _ProseMirrorError);

  function ReplaceError() {
    _classCallCheck(this, ReplaceError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ReplaceError).apply(this, arguments));
  }

  return ReplaceError;
}(_error.ProseMirrorError);

// ;; A slice represents a piece cut out of a larger document. It
// stores not only a fragment, but also the depth up to which nodes on
// both side are 'open' / cut through.


var Slice = exports.Slice = function () {
  // :: (Fragment, number, number, ?Node)

  function Slice(content, openLeft, openRight, possibleParent) {
    _classCallCheck(this, Slice);

    // :: Fragment The slice's content nodes.
    this.content = content;
    // :: number The open depth at the start.
    this.openLeft = openLeft;
    // :: number The open depth at the end.
    this.openRight = openRight;
    this.possibleParent = possibleParent;
  }

  // :: number
  // The size this slice would add when inserted into a document.


  _createClass(Slice, [{
    key: "insertAt",
    value: function insertAt(pos, fragment) {
      function insertInto(content, dist, insert, parent) {
        var _content$findIndex = content.findIndex(dist);

        var index = _content$findIndex.index;
        var offset = _content$findIndex.offset;var child = content.maybeChild(index);
        if (offset == dist || child.isText) {
          if (parent && !parent.canReplace(index, index, insert)) return null;
          return content.cut(0, dist).append(insert).append(content.cut(dist));
        }
        var inner = insertInto(child.content, dist - offset - 1, insert);
        return inner && content.replaceChild(index, child.copy(inner));
      }
      var content = insertInto(this.content, pos + this.openLeft, fragment, null);
      return content && new Slice(content, this.openLeft, this.openRight);
    }
  }, {
    key: "removeBetween",
    value: function removeBetween(from, to) {
      function removeRange(content, from, to) {
        var _content$findIndex2 = content.findIndex(from);

        var index = _content$findIndex2.index;
        var offset = _content$findIndex2.offset;var child = content.maybeChild(index);

        var _content$findIndex3 = content.findIndex(to);

        var indexTo = _content$findIndex3.index;
        var offsetTo = _content$findIndex3.offset;

        if (offset == from || child.isText) {
          if (offsetTo != to && !content.child(indexTo).isText) throw new RangeError("Removing non-flat range");
          return content.cut(0, from).append(content.cut(to));
        }
        if (index != indexTo) throw new RangeError("Removing non-flat range");
        return content.replaceChild(index, child.copy(removeRange(child.content, from - offset - 1, to - offset - 1)));
      }
      return new Slice(removeRange(this.content, from + this.openLeft, to + this.openLeft), this.openLeft, this.openRight);
    }
  }, {
    key: "toString",
    value: function toString() {
      return this.content + "(" + this.openLeft + "," + this.openRight + ")";
    }

    // :: () → ?Object
    // Convert a slice to a JSON-serializable representation.

  }, {
    key: "toJSON",
    value: function toJSON() {
      if (!this.content.size) return null;
      return { content: this.content.toJSON(),
        openLeft: this.openLeft,
        openRight: this.openRight };
    }

    // :: (Schema, ?Object) → Slice
    // Deserialize a slice from its JSON representation.

  }, {
    key: "size",
    get: function get() {
      return this.content.size - this.openLeft - this.openRight;
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      if (!json) return Slice.empty;
      return new Slice(_fragment.Fragment.fromJSON(schema, json.content), json.openLeft, json.openRight);
    }
  }]);

  return Slice;
}();

// :: Slice
// The empty slice.


Slice.empty = new Slice(_fragment.Fragment.empty, 0, 0);

function replace($from, $to, slice) {
  if (slice.openLeft > $from.depth) throw new ReplaceError("Inserted content deeper than insertion position");
  if ($from.depth - slice.openLeft != $to.depth - slice.openRight) throw new ReplaceError("Inconsistent open depths");
  return replaceOuter($from, $to, slice, 0);
}

function replaceOuter($from, $to, slice, depth) {
  var index = $from.index(depth),
      node = $from.node(depth);
  if (index == $to.index(depth) && depth < $from.depth - slice.openLeft) {
    var inner = replaceOuter($from, $to, slice, depth + 1);
    return node.copy(node.content.replaceChild(index, inner));
  } else if (slice.content.size) {
    var _prepareSliceForRepla = prepareSliceForReplace(slice, $from);

    var start = _prepareSliceForRepla.start;
    var end = _prepareSliceForRepla.end;

    return close(node, replaceThreeWay($from, start, end, $to, depth));
  } else {
    return close(node, replaceTwoWay($from, $to, depth));
  }
}

function checkJoin(main, sub) {
  if (!sub.type.compatibleContent(main.type)) throw new ReplaceError("Cannot join " + sub.type.name + " onto " + main.type.name);
}

function joinable($before, $after, depth) {
  var node = $before.node(depth);
  checkJoin(node, $after.node(depth));
  return node;
}

function addNode(child, target) {
  var last = target.length - 1;
  if (last >= 0 && child.isText && child.sameMarkup(target[last])) target[last] = child.copy(target[last].text + child.text);else target.push(child);
}

function addRange($start, $end, depth, target) {
  var node = ($end || $start).node(depth);
  var startIndex = 0,
      endIndex = $end ? $end.index(depth) : node.childCount;
  if ($start) {
    startIndex = $start.index(depth);
    if ($start.depth > depth) {
      startIndex++;
    } else if (!$start.atNodeBoundary) {
      addNode($start.nodeAfter, target);
      startIndex++;
    }
  }
  for (var i = startIndex; i < endIndex; i++) {
    addNode(node.child(i), target);
  }if ($end && $end.depth == depth && !$end.atNodeBoundary) addNode($end.nodeBefore, target);
}

function close(node, content) {
  if (!node.type.validContent(content, node.attrs)) throw new ReplaceError("Invalid content for node " + node.type.name);
  return node.copy(content);
}

function replaceThreeWay($from, $start, $end, $to, depth) {
  var openLeft = $from.depth > depth && joinable($from, $start, depth + 1);
  var openRight = $to.depth > depth && joinable($end, $to, depth + 1);

  var content = [];
  addRange(null, $from, depth, content);
  if (openLeft && openRight && $start.index(depth) == $end.index(depth)) {
    checkJoin(openLeft, openRight);
    addNode(close(openLeft, replaceThreeWay($from, $start, $end, $to, depth + 1)), content);
  } else {
    if (openLeft) addNode(close(openLeft, replaceTwoWay($from, $start, depth + 1)), content);
    addRange($start, $end, depth, content);
    if (openRight) addNode(close(openRight, replaceTwoWay($end, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new _fragment.Fragment(content);
}

function replaceTwoWay($from, $to, depth) {
  var content = [];
  addRange(null, $from, depth, content);
  if ($from.depth > depth) {
    var type = joinable($from, $to, depth + 1);
    addNode(close(type, replaceTwoWay($from, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new _fragment.Fragment(content);
}

function prepareSliceForReplace(slice, $along) {
  var extra = $along.depth - slice.openLeft,
      parent = $along.node(extra);
  var node = parent.copy(slice.content);
  for (var i = extra - 1; i >= 0; i--) {
    node = $along.node(i).copy(_fragment.Fragment.from(node));
  }return { start: node.resolveNoCache(slice.openLeft + extra),
    end: node.resolveNoCache(node.content.size - slice.openRight - extra) };
}
},{"../util/error":44,"./fragment":25}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; The usual way to represent positions in a document is with a
// plain integer. Since those tell you very little about the context
// of that position, you'll often have to 'resolve' a position to get
// the context you need. Objects of this class represent such a
// resolved position, providing various pieces of context information
// and helper methods.
//
// Throughout this interface, methods that take an optional `depth`
// parameter will interpret undefined as `this.depth` and negative
// numbers as `this.depth + value`.

var ResolvedPos = exports.ResolvedPos = function () {
  function ResolvedPos(pos, path, parentOffset) {
    _classCallCheck(this, ResolvedPos);

    // :: number The position that was resolved.
    this.pos = pos;
    this.path = path;
    // :: number
    // The number of levels the parent node is from the root. If this
    // position points directly into the root, it is 0. If it points
    // into a top-level paragraph, 1, and so on.
    this.depth = path.length / 3 - 1;
    // :: number The offset this position has into its parent node.
    this.parentOffset = parentOffset;
  }

  _createClass(ResolvedPos, [{
    key: "resolveDepth",
    value: function resolveDepth(val) {
      if (val == null) return this.depth;
      if (val < 0) return this.depth + val;
      return val;
    }

    // :: Node
    // The parent node that the position points into. Note that even if
    // a position points into a text node, that node is not considered
    // the parent—text nodes are 'flat' in this model.

  }, {
    key: "node",


    // :: (?number) → Node
    // The ancestor node at the given level. `p.node(p.depth)` is the
    // same as `p.parent`.
    value: function node(depth) {
      return this.path[this.resolveDepth(depth) * 3];
    }

    // :: (?number) → number
    // The index into the ancestor at the given level. If this points at
    // the 3rd node in the 2nd paragraph on the top level, for example,
    // `p.index(0)` is 2 and `p.index(1)` is 3.

  }, {
    key: "index",
    value: function index(depth) {
      return this.path[this.resolveDepth(depth) * 3 + 1];
    }

    // :: (?number) → number
    // The index pointing after this position into the ancestor at the
    // given level.

  }, {
    key: "indexAfter",
    value: function indexAfter(depth) {
      depth = this.resolveDepth(depth);
      return this.index(depth) + (depth == this.depth && this.atNodeBoundary ? 0 : 1);
    }

    // :: (?number) → number
    // The (absolute) position at the start of the node at the given
    // level.

  }, {
    key: "start",
    value: function start(depth) {
      depth = this.resolveDepth(depth);
      return depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
    }

    // :: (?number) → number
    // The (absolute) position at the end of the node at the given
    // level.

  }, {
    key: "end",
    value: function end(depth) {
      depth = this.resolveDepth(depth);
      return this.start(depth) + this.node(depth).content.size;
    }

    // :: (?number) → number
    // The (absolute) position directly before the node at the given
    // level, or, when `level` is `this.level + 1`, the original
    // position.

  }, {
    key: "before",
    value: function before(depth) {
      depth = this.resolveDepth(depth);
      if (!depth) throw new RangeError("There is no position before the top-level node");
      return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1];
    }

    // :: (?number) → number
    // The (absolute) position directly after the node at the given
    // level, or, when `level` is `this.level + 1`, the original
    // position.

  }, {
    key: "after",
    value: function after(depth) {
      depth = this.resolveDepth(depth);
      if (!depth) throw new RangeError("There is no position after the top-level node");
      return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1] + this.path[depth * 3].nodeSize;
    }

    // :: bool
    // True if this position points at a node boundary, false if it
    // points into a text node.

  }, {
    key: "sameDepth",


    // :: (ResolvedPos) → number
    // The depth up to which this position and the other share the same
    // parent nodes.
    value: function sameDepth(other) {
      var depth = 0,
          max = Math.min(this.depth, other.depth);
      while (depth < max && this.index(depth) == other.index(depth)) {
        ++depth;
      }return depth;
    }

    // :: (ResolvedPos) → bool
    // Query whether the given position shares the same parent node.

  }, {
    key: "sameParent",
    value: function sameParent(other) {
      return this.pos - this.parentOffset == other.pos - other.parentOffset;
    }
  }, {
    key: "toString",
    value: function toString() {
      var str = "";
      for (var i = 1; i <= this.depth; i++) {
        str += (str ? "/" : "") + this.node(i).type.name + "_" + this.index(i - 1);
      }return str + ":" + this.parentOffset;
    }
  }, {
    key: "parent",
    get: function get() {
      return this.node(this.depth);
    }
  }, {
    key: "atNodeBoundary",
    get: function get() {
      return this.path[this.path.length - 1] == this.pos;
    }

    // :: ?Node
    // Get the node directly after the position, if any. If the position
    // points into a text node, only the part of that node after the
    // position is returned.

  }, {
    key: "nodeAfter",
    get: function get() {
      var parent = this.parent,
          index = this.index(this.depth);
      if (index == parent.childCount) return null;
      var dOff = this.pos - this.path[this.path.length - 1],
          child = parent.child(index);
      return dOff ? parent.child(index).cut(dOff) : child;
    }

    // :: ?Node
    // Get the node directly before the position, if any. If the
    // position points into a text node, only the part of that node
    // before the position is returned.

  }, {
    key: "nodeBefore",
    get: function get() {
      var index = this.index(this.depth);
      var dOff = this.pos - this.path[this.path.length - 1];
      if (dOff) return this.parent.child(index).cut(0, dOff);
      return index == 0 ? null : this.parent.child(index - 1);
    }
  }], [{
    key: "resolve",
    value: function resolve(doc, pos) {
      if (!(pos >= 0 && pos <= doc.content.size)) throw new RangeError("Position " + pos + " out of range");
      var path = [];
      var start = 0,
          parentOffset = pos;
      for (var node = doc;;) {
        var _node$content$findInd = node.content.findIndex(parentOffset);

        var index = _node$content$findInd.index;
        var offset = _node$content$findInd.offset;

        var rem = parentOffset - offset;
        path.push(node, index, start + offset);
        if (!rem) break;
        node = node.child(index);
        if (node.isText) break;
        parentOffset = rem - 1;
        start += offset + 1;
      }
      return new ResolvedPos(pos, path, parentOffset);
    }
  }, {
    key: "resolveCached",
    value: function resolveCached(doc, pos) {
      for (var i = 0; i < resolveCache.length; i++) {
        var cached = resolveCache[i];
        if (cached.pos == pos && cached.node(0) == doc) return cached;
      }
      var result = resolveCache[resolveCachePos] = ResolvedPos.resolve(doc, pos);
      resolveCachePos = (resolveCachePos + 1) % resolveCacheSize;
      return result;
    }
  }]);

  return ResolvedPos;
}();

var resolveCache = [],
    resolveCachePos = 0,
    resolveCacheSize = 6;
},{}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Schema = exports.MarkType = exports.Attribute = exports.Text = exports.Inline = exports.Block = exports.NodeType = undefined;

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _node = require("./node");

var _fragment = require("./fragment");

var _mark = require("./mark");

var _content = require("./content");

var _obj = require("../util/obj");

var _orderedmap = require("../util/orderedmap");

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; The [node](#NodeType) and [mark](#MarkType) types
// that make up a schema have several things in common—they support
// attributes, and you can [register](#SchemaItem.register) values
// with them. This class implements this functionality, and acts as a
// superclass to those `NodeType` and `MarkType`.

var SchemaItem = function () {
  function SchemaItem() {
    _classCallCheck(this, SchemaItem);
  }

  _createClass(SchemaItem, [{
    key: "getDefaultAttrs",


    // For node types where all attrs have a default value (or which don't
    // have any attributes), build up a single reusable default attribute
    // object, and use it for all nodes that don't specify specific
    // attributes.
    value: function getDefaultAttrs() {
      var defaults = Object.create(null);
      for (var attrName in this.attrs) {
        var attr = this.attrs[attrName];
        if (attr.default === undefined) return null;
        defaults[attrName] = attr.default;
      }
      return defaults;
    }
  }, {
    key: "computeAttrs",
    value: function computeAttrs(attrs) {
      var built = Object.create(null);
      for (var name in this.attrs) {
        var value = attrs && attrs[name];
        if (value == null) {
          var attr = this.attrs[name];
          if (attr.default !== undefined) value = attr.default;else if (attr.compute) value = attr.compute(this);else throw new RangeError("No value supplied for attribute " + name);
        }
        built[name] = value;
      }
      return built;
    }
  }, {
    key: "freezeAttrs",
    value: function freezeAttrs() {
      var frozen = Object.create(null);
      for (var name in this.attrs) {
        frozen[name] = this.attrs[name];
      }Object.defineProperty(this, "attrs", { value: frozen });
    }
  }, {
    key: "attrs",

    // :: Object<Attribute>
    // The set of attributes to associate with each node or mark of this
    // type.
    get: function get() {
      return {};
    }

    // :: (Object<?Attribute>)
    // Add or remove attributes from this type. Expects an object
    // mapping names to either attributes (to add) or null (to remove
    // the attribute by that name).

  }], [{
    key: "updateAttrs",
    value: function updateAttrs(attrs) {
      Object.defineProperty(this.prototype, "attrs", { value: overlayObj(this.prototype.attrs, attrs) });
    }
  }, {
    key: "getRegistry",
    value: function getRegistry() {
      if (this == SchemaItem) return null;
      if (!this.prototype.hasOwnProperty("registry")) this.prototype.registry = Object.create(Object.getPrototypeOf(this).getRegistry());
      return this.prototype.registry;
    }
  }, {
    key: "getNamespace",
    value: function getNamespace(name) {
      if (this == SchemaItem) return null;
      var reg = this.getRegistry();
      if (!Object.prototype.hasOwnProperty.call(reg, name)) reg[name] = Object.create(Object.getPrototypeOf(this).getNamespace(name));
      return reg[name];
    }

    // :: (string, string, *)
    // Register a value in this type's registry. Various components use
    // `Schema.registry` to query values from the marks and nodes that
    // make up the schema. The `namespace`, for example
    // [`"command"`](#commands), determines which component will see
    // this value. `name` is a name specific to this value. Its meaning
    // differs per namespace.
    //
    // Subtypes inherit the registered values from their supertypes.
    // They can override individual values by calling this method to
    // overwrite them with a new value, or with `null` to disable them.

  }, {
    key: "register",
    value: function register(namespace, name, value) {
      this.getNamespace(namespace)[name] = function () {
        return value;
      };
    }

    // :: (string, string, (SchemaItem) → *)
    // Register a value in this types's registry, like
    // [`register`](#SchemaItem.register), but providing a function that
    // will be called with the actual node or mark type, whose return
    // value will be treated as the effective value (or will be ignored,
    // if `null`).

  }, {
    key: "registerComputed",
    value: function registerComputed(namespace, name, f) {
      this.getNamespace(namespace)[name] = f;
    }

    // :: (string)
    // By default, schema items inherit the
    // [registered](#SchemaItem.register) items from their superclasses.
    // Call this to disable that behavior for the given namespace.

  }, {
    key: "cleanNamespace",
    value: function cleanNamespace(namespace) {
      this.getNamespace(namespace).__proto__ = null;
    }
  }]);

  return SchemaItem;
}();

function overlayObj(base, update) {
  var copy = (0, _obj.copyObj)(base);
  for (var name in update) {
    var value = update[name];
    if (value == null) delete copy[name];else copy[name] = value;
  }
  return copy;
}

// ;; Node types are objects allocated once per `Schema`
// and used to tag `Node` instances with a type. They are
// instances of sub-types of this class, and contain information about
// the node type (its name, its allowed attributes, methods for
// serializing it to various formats, information to guide
// deserialization, and so on).

var NodeType = exports.NodeType = function (_SchemaItem) {
  _inherits(NodeType, _SchemaItem);

  function NodeType(name, schema) {
    _classCallCheck(this, NodeType);

    // :: string
    // The name the node type has in this schema.

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(NodeType).call(this));

    _this.name = name;
    // Freeze the attributes, to avoid calling a potentially expensive
    // getter all the time.
    _this.freezeAttrs();
    _this.defaultAttrs = _this.getDefaultAttrs();
    _this.contentExpr = null;
    // :: Schema
    // A link back to the `Schema` the node type belongs to.
    _this.schema = schema;
    return _this;
  }

  // :: bool
  // True if this is a block type.


  _createClass(NodeType, [{
    key: "hasRequiredAttrs",
    value: function hasRequiredAttrs(ignore) {
      for (var n in this.attrs) {
        if (this.attrs[n].isRequired && (!ignore || !(n in ignore))) return true;
      }return false;
    }
  }, {
    key: "compatibleContent",
    value: function compatibleContent(other) {
      return this == other || this.contentExpr.compatible(other.contentExpr);
    }
  }, {
    key: "computeAttrs",
    value: function computeAttrs(attrs) {
      if (!attrs && this.defaultAttrs) return this.defaultAttrs;else return _get(Object.getPrototypeOf(NodeType.prototype), "computeAttrs", this).call(this, attrs);
    }

    // :: (?Object, ?union<Fragment, Node, [Node]>, ?[Mark]) → Node
    // Create a `Node` of this type. The given attributes are
    // checked and defaulted (you can pass `null` to use the type's
    // defaults entirely, if no required attributes exist). `content`
    // may be a `Fragment`, a node, an array of nodes, or
    // `null`. Similarly `marks` may be `null` to default to the empty
    // set of marks.

  }, {
    key: "create",
    value: function create(attrs, content, marks) {
      return new _node.Node(this, this.computeAttrs(attrs), _fragment.Fragment.from(content), _mark.Mark.setFrom(marks));
    }

    // :: (Fragment, ?Object) → bool
    // Returns true if the given fragment is valid content for this node
    // type.

  }, {
    key: "validContent",
    value: function validContent(content, attrs) {
      return this.contentExpr.matches(attrs, content);
    }

    // :: (Fragment, ?Object) → ?Fragment
    // Verify whether the given fragment would be valid content for this
    // node type, and if not, try to insert content before and/or after
    // it to make it valid. Returns null if no valid fragment could be
    // created.

  }, {
    key: "fixContent",
    value: function fixContent() {
      var content = arguments.length <= 0 || arguments[0] === undefined ? _fragment.Fragment.empty : arguments[0];
      var attrs = arguments[1];

      var before = this.contentExpr.start(attrs).fillBefore(content);
      if (!before) return null;
      content = before.append(content);
      var after = this.contentExpr.getMatchAt(attrs, content).fillBefore(_fragment.Fragment.empty, true);
      if (!after) return;
      return content.append(after);
    }
  }, {
    key: "isBlock",
    get: function get() {
      return false;
    }

    // :: bool
    // True if this is a textblock type, a block that contains inline
    // content.

  }, {
    key: "isTextblock",
    get: function get() {
      return false;
    }

    // :: bool
    // True if this is an inline type.

  }, {
    key: "isInline",
    get: function get() {
      return false;
    }

    // :: bool
    // True if this is the text node type.

  }, {
    key: "isText",
    get: function get() {
      return false;
    }

    // :: bool
    // Controls whether nodes of this type can be selected (as a user
    // node selection).

  }, {
    key: "selectable",
    get: function get() {
      return true;
    }

    // :: bool
    // Determines whether nodes of this type can be dragged. Enabling it
    // causes ProseMirror to set a `draggable` attribute on its DOM
    // representation, and to put its HTML serialization into the drag
    // event's [data
    // transfer](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer)
    // when dragged.

  }, {
    key: "draggable",
    get: function get() {
      return false;
    }

    // :: bool
    // Controls whether this node type is locked.

  }, {
    key: "locked",
    get: function get() {
      return false;
    }

    // :: bool
    // True for node types that allow no content.

  }, {
    key: "isLeaf",
    get: function get() {
      return this.contentExpr.isLeaf;
    }
  }], [{
    key: "compile",
    value: function compile(nodes, schema) {
      var result = Object.create(null);
      nodes.forEach(function (name, spec) {
        return result[name] = new spec.type(name, schema);
      });

      if (!result.doc) throw new RangeError("Every schema needs a 'doc' type");
      if (!result.text) throw new RangeError("Every schema needs a 'text' type");

      return result;
    }
  }]);

  return NodeType;
}(SchemaItem);

// ;; Base type for block nodetypes.


var Block = exports.Block = function (_NodeType) {
  _inherits(Block, _NodeType);

  function Block() {
    _classCallCheck(this, Block);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Block).apply(this, arguments));
  }

  _createClass(Block, [{
    key: "isBlock",
    get: function get() {
      return true;
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return this.contentExpr.inlineContent;
    }
  }]);

  return Block;
}(NodeType);

// ;; Base type for inline node types.


var Inline = exports.Inline = function (_NodeType2) {
  _inherits(Inline, _NodeType2);

  function Inline() {
    _classCallCheck(this, Inline);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Inline).apply(this, arguments));
  }

  _createClass(Inline, [{
    key: "isInline",
    get: function get() {
      return true;
    }
  }]);

  return Inline;
}(NodeType);

// ;; The text node type.


var Text = exports.Text = function (_Inline) {
  _inherits(Text, _Inline);

  function Text() {
    _classCallCheck(this, Text);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Text).apply(this, arguments));
  }

  _createClass(Text, [{
    key: "create",
    value: function create(attrs, content, marks) {
      return new _node.TextNode(this, this.computeAttrs(attrs), content, marks);
    }
  }, {
    key: "toDOM",
    value: function toDOM(node) {
      return node.text;
    }
  }, {
    key: "selectable",
    get: function get() {
      return false;
    }
  }, {
    key: "isText",
    get: function get() {
      return true;
    }
  }]);

  return Text;
}(Inline);

// Attribute descriptors

// ;; Attributes are named values associated with nodes and marks.
// Each node type or mark type has a fixed set of attributes, which
// instances of this class are used to control. Attribute values must
// be JSON-serializable.


var Attribute = exports.Attribute = function () {
  // :: (Object)
  // Create an attribute. `options` is an object containing the
  // settings for the attributes. The following settings are
  // supported:
  //
  // **`default`**`: ?any`
  //   : The default value for this attribute, to choose when no
  //     explicit value is provided.
  //
  // **`compute`**`: ?(Fragment) → any`
  //   : A function that computes a default value for the attribute from
  //     the node's content.
  //
  // **`label`**`: ?string`
  //   : A user-readable text label associated with the attribute.
  //
  // Attributes that have no default or compute property must be
  // provided whenever a node or mark of a type that has them is
  // created.

  function Attribute() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Attribute);

    this.default = options.default;
    this.compute = options.compute;
    this.label = options.label;
  }

  _createClass(Attribute, [{
    key: "isRequired",
    get: function get() {
      return this.default === undefined && !this.compute;
    }
  }]);

  return Attribute;
}();

// Marks

// ;; Like nodes, marks (which are associated with nodes to signify
// things like emphasis or being part of a link) are tagged with type
// objects, which are instantiated once per `Schema`.


var MarkType = exports.MarkType = function (_SchemaItem2) {
  _inherits(MarkType, _SchemaItem2);

  function MarkType(name, rank, schema) {
    _classCallCheck(this, MarkType);

    // :: string
    // The name of the mark type.

    var _this5 = _possibleConstructorReturn(this, Object.getPrototypeOf(MarkType).call(this));

    _this5.name = name;
    _this5.freezeAttrs();
    _this5.rank = rank;
    // :: Schema
    // The schema that this mark type instance is part of.
    _this5.schema = schema;
    var defaults = _this5.getDefaultAttrs();
    _this5.instance = defaults && new _mark.Mark(_this5, defaults);
    return _this5;
  }

  // :: bool
  // Whether this mark should be active when the cursor is positioned
  // at the end of the mark.


  _createClass(MarkType, [{
    key: "create",


    // :: (?Object) → Mark
    // Create a mark of this type. `attrs` may be `null` or an object
    // containing only some of the mark's attributes. The others, if
    // they have defaults, will be added.
    value: function create(attrs) {
      if (!attrs && this.instance) return this.instance;
      return new _mark.Mark(this, this.computeAttrs(attrs));
    }
  }, {
    key: "removeFromSet",


    // :: ([Mark]) → [Mark]
    // When there is a mark of this type in the given set, a new set
    // without it is returned. Otherwise, the input set is returned.
    value: function removeFromSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (set[i].type == this) return set.slice(0, i).concat(set.slice(i + 1));
      }return set;
    }

    // :: ([Mark]) → ?Mark
    // Tests whether there is a mark of this type in the given set.

  }, {
    key: "isInSet",
    value: function isInSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (set[i].type == this) return set[i];
      }
    }
  }, {
    key: "inclusiveRight",
    get: function get() {
      return true;
    }
  }], [{
    key: "compile",
    value: function compile(marks, schema) {
      var result = Object.create(null),
          rank = 0;
      marks.forEach(function (name, markType) {
        return result[name] = new markType(name, rank++, schema);
      });
      return result;
    }
  }]);

  return MarkType;
}(SchemaItem);

// ;; #path=SchemaSpec #kind=interface
// An object describing a schema, as passed to the `Schema`
// constructor.

// :: union<Object<NodeSpec>, OrderedMap<NodeSpec>> #path=SchemaSpec.nodes
// The node types in this schema. Maps names to `NodeSpec` objects
// describing the node to be associated with that name. Their order is significant

// :: ?union<Object<constructor<MarkType>>, OrderedMap<constructor<MarkType>>> #path=SchemaSpec.marks
// The mark types that exist in this schema.

// ;; #path=NodeSpec #kind=interface

// :: constructor<NodeType> #path=NodeSpec.type
// The `NodeType` class to be used for this node.

// :: ?string #path=NodeSpec.content
// The content expression for this node, as parsed by
// `ContentExpr.parse`. When not given, the node does not allow any
// content.

// :: ?string #path=NodeSpec.group
// The group or space-separated groups to which this node belongs, as
// referred to in the content expressions for the schema.

// ;; Each document is based on a single schema, which provides the
// node and mark types that it is made up of (which, in turn,
// determine the structure it is allowed to have).


var Schema = function () {
  // :: (SchemaSpec)
  // Construct a schema from a specification.

  function Schema(spec) {
    _classCallCheck(this, Schema);

    // :: OrderedMap<NodeSpec> The node specs that the schema is based on.
    this.nodeSpec = _orderedmap.OrderedMap.from(spec.nodes);
    // :: OrderedMap<constructor<MarkType>> The mark spec that the schema is based on.
    this.markSpec = _orderedmap.OrderedMap.from(spec.marks);

    // :: Object<NodeType>
    // An object mapping the schema's node names to node type objects.
    this.nodes = NodeType.compile(this.nodeSpec, this);
    // :: Object<MarkType>
    // A map from mark names to mark type objects.
    this.marks = MarkType.compile(this.markSpec, this);
    for (var prop in this.nodes) {
      if (prop in this.marks) throw new RangeError(prop + " can not be both a node and a mark");
      var type = this.nodes[prop];
      type.contentExpr = _content.ContentExpr.parse(type, this.nodeSpec.get(prop).content || "", this.nodeSpec);
    }

    // :: Object
    // An object for storing whatever values modules may want to
    // compute and cache per schema. (If you want to store something
    // in it, try to use property names unlikely to clash.)
    this.cached = Object.create(null);
    this.cached.wrappings = Object.create(null);

    this.node = this.node.bind(this);
    this.text = this.text.bind(this);
    this.nodeFromJSON = this.nodeFromJSON.bind(this);
    this.markFromJSON = this.markFromJSON.bind(this);
  }

  // :: (union<string, NodeType>, ?Object, ?union<Fragment, Node, [Node]>, ?[Mark]) → Node
  // Create a node in this schema. The `type` may be a string or a
  // `NodeType` instance. Attributes will be extended
  // with defaults, `content` may be a `Fragment`,
  // `null`, a `Node`, or an array of nodes.
  //
  // When creating a text node, `content` should be a string and is
  // interpreted as the node's text.
  //
  // This method is bound to the Schema, meaning you don't have to
  // call it as a method, but can pass it to higher-order functions
  // and such.


  _createClass(Schema, [{
    key: "node",
    value: function node(type, attrs, content, marks) {
      if (typeof type == "string") type = this.nodeType(type);else if (!(type instanceof NodeType)) throw new RangeError("Invalid node type: " + type);else if (type.schema != this) throw new RangeError("Node type from different schema used (" + type.name + ")");

      return type.create(attrs, content, marks);
    }

    // :: (string, ?[Mark]) → Node
    // Create a text node in the schema. This method is bound to the
    // Schema. Empty text nodes are not allowed.

  }, {
    key: "text",
    value: function text(_text, marks) {
      return this.nodes.text.create(null, _text, _mark.Mark.setFrom(marks));
    }

    // :: (string, ?Object) → Mark
    // Create a mark with the named type

  }, {
    key: "mark",
    value: function mark(name, attrs) {
      var spec = this.marks[name];
      if (!spec) throw new RangeError("No mark named " + name);
      return spec.create(attrs);
    }

    // :: (Object) → Node
    // Deserialize a node from its JSON representation. This method is
    // bound.

  }, {
    key: "nodeFromJSON",
    value: function nodeFromJSON(json) {
      return _node.Node.fromJSON(this, json);
    }

    // :: (Object) → Mark
    // Deserialize a mark from its JSON representation. This method is
    // bound.

  }, {
    key: "markFromJSON",
    value: function markFromJSON(json) {
      var type = this.marks[json._];
      var attrs = null;
      for (var prop in json) {
        if (prop != "_") {
          if (!attrs) attrs = Object.create(null);
          attrs[prop] = json[prop];
        }
      }return attrs ? type.create(attrs) : type.instance;
    }

    // :: (string) → NodeType
    // Get the `NodeType` associated with the given name in
    // this schema, or raise an error if it does not exist.

  }, {
    key: "nodeType",
    value: function nodeType(name) {
      var found = this.nodes[name];
      if (!found) throw new RangeError("Unknown node type: " + name);
      return found;
    }

    // :: (string, (name: string, value: *, source: union<NodeType, MarkType>, name: string))
    // Retrieve all registered items under the given name from this
    // schema. The given function will be called with the name, each item, the
    // element—node type or mark type—that it was associated with, and
    // that element's name in the schema.

  }, {
    key: "registry",
    value: function registry(namespace, f) {
      for (var i = 0; i < 2; i++) {
        var obj = i ? this.marks : this.nodes;
        for (var tname in obj) {
          var type = obj[tname],
              registry = type.registry,
              ns = registry && registry[namespace];
          if (ns) for (var prop in ns) {
            var value = ns[prop](type);
            if (value != null) f(prop, value, type, tname);
          }
        }
      }
    }
  }]);

  return Schema;
}();

exports.Schema = Schema;
},{"../util/obj":47,"../util/orderedmap":48,"./content":23,"./fragment":25,"./mark":27,"./node":28}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultSchema = exports.CodeMark = exports.LinkMark = exports.StrongMark = exports.EmMark = exports.HardBreak = exports.Image = exports.Paragraph = exports.CodeBlock = exports.Heading = exports.HorizontalRule = exports.ListItem = exports.BulletList = exports.OrderedList = exports.BlockQuote = exports.Doc = exports.Text = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _model = require("../model");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

exports.Text = _model.Text;

// ;; The default top-level document node type.

var Doc = exports.Doc = function (_Block) {
  _inherits(Doc, _Block);

  function Doc() {
    _classCallCheck(this, Doc);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Doc).apply(this, arguments));
  }

  return Doc;
}(_model.Block);

// ;; The default blockquote node type.


var BlockQuote = exports.BlockQuote = function (_Block2) {
  _inherits(BlockQuote, _Block2);

  function BlockQuote() {
    _classCallCheck(this, BlockQuote);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(BlockQuote).apply(this, arguments));
  }

  _createClass(BlockQuote, [{
    key: "toDOM",
    value: function toDOM() {
      return ["blockquote", 0];
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "blockquote": null };
    }
  }]);

  return BlockQuote;
}(_model.Block);

// ;; The default ordered list node type. Has a single attribute,
// `order`, which determines the number at which the list starts
// counting, and defaults to 1.


var OrderedList = exports.OrderedList = function (_Block3) {
  _inherits(OrderedList, _Block3);

  function OrderedList() {
    _classCallCheck(this, OrderedList);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(OrderedList).apply(this, arguments));
  }

  _createClass(OrderedList, [{
    key: "toDOM",
    value: function toDOM(node) {
      return ["ol", { start: node.attrs.order == 1 ? null : node.attrs.order }, 0];
    }
  }, {
    key: "attrs",
    get: function get() {
      return { order: new _model.Attribute({ default: 1 }) };
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "ol": function ol(dom) {
          return {
            order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1
          };
        } };
    }
  }]);

  return OrderedList;
}(_model.Block);

// ;; The default bullet list node type.


var BulletList = exports.BulletList = function (_Block4) {
  _inherits(BulletList, _Block4);

  function BulletList() {
    _classCallCheck(this, BulletList);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(BulletList).apply(this, arguments));
  }

  _createClass(BulletList, [{
    key: "toDOM",
    value: function toDOM() {
      return ["ul", 0];
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "ul": null };
    }
  }]);

  return BulletList;
}(_model.Block);

// ;; The default list item node type.


var ListItem = exports.ListItem = function (_Block5) {
  _inherits(ListItem, _Block5);

  function ListItem() {
    _classCallCheck(this, ListItem);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ListItem).apply(this, arguments));
  }

  _createClass(ListItem, [{
    key: "toDOM",
    value: function toDOM() {
      return ["li", 0];
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "li": null };
    }
  }]);

  return ListItem;
}(_model.Block);

// ;; The default horizontal rule node type.


var HorizontalRule = exports.HorizontalRule = function (_Block6) {
  _inherits(HorizontalRule, _Block6);

  function HorizontalRule() {
    _classCallCheck(this, HorizontalRule);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(HorizontalRule).apply(this, arguments));
  }

  _createClass(HorizontalRule, [{
    key: "toDOM",
    value: function toDOM() {
      return ["div", ["hr"]];
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "hr": null };
    }
  }]);

  return HorizontalRule;
}(_model.Block);

// ;; The default heading node type. Has a single attribute
// `level`, which indicates the heading level, and defaults to 1.


var Heading = exports.Heading = function (_Block7) {
  _inherits(Heading, _Block7);

  function Heading() {
    _classCallCheck(this, Heading);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Heading).apply(this, arguments));
  }

  _createClass(Heading, [{
    key: "toDOM",
    value: function toDOM(node) {
      return ["h" + node.attrs.level, 0];
    }
  }, {
    key: "attrs",
    get: function get() {
      return { level: new _model.Attribute({ default: 1 }) };
    }
    // :: number
    // Controls the maximum heading level. Has the value 6 in the
    // `Heading` class, but you can override it in a subclass.

  }, {
    key: "maxLevel",
    get: function get() {
      return 6;
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return {
        "h1": { level: 1 },
        "h2": { level: 2 },
        "h3": { level: 3 },
        "h4": { level: 4 },
        "h5": { level: 5 },
        "h6": { level: 6 }
      };
    }
  }]);

  return Heading;
}(_model.Block);

// ;; The default code block / listing node type. Only
// allows unmarked text nodes inside of it.


var CodeBlock = exports.CodeBlock = function (_Block8) {
  _inherits(CodeBlock, _Block8);

  function CodeBlock() {
    _classCallCheck(this, CodeBlock);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(CodeBlock).apply(this, arguments));
  }

  _createClass(CodeBlock, [{
    key: "toDOM",
    value: function toDOM() {
      return ["pre", ["code", 0]];
    }
  }, {
    key: "isCode",
    get: function get() {
      return true;
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "pre": [null, { preserveWhitespace: true }] };
    }
  }]);

  return CodeBlock;
}(_model.Block);

// ;; The default paragraph node type.


var Paragraph = exports.Paragraph = function (_Block9) {
  _inherits(Paragraph, _Block9);

  function Paragraph() {
    _classCallCheck(this, Paragraph);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Paragraph).apply(this, arguments));
  }

  _createClass(Paragraph, [{
    key: "toDOM",
    value: function toDOM() {
      return ["p", 0];
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "p": null };
    }
  }]);

  return Paragraph;
}(_model.Block);

// ;; The default inline image node type. Has these
// attributes:
//
// - **`src`** (required): The URL of the image.
// - **`alt`**: The alt text.
// - **`title`**: The title of the image.


var Image = exports.Image = function (_Inline) {
  _inherits(Image, _Inline);

  function Image() {
    _classCallCheck(this, Image);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Image).apply(this, arguments));
  }

  _createClass(Image, [{
    key: "toDOM",
    value: function toDOM(node) {
      return ["img", node.attrs];
    }
  }, {
    key: "attrs",
    get: function get() {
      return {
        src: new _model.Attribute(),
        alt: new _model.Attribute({ default: "" }),
        title: new _model.Attribute({ default: "" })
      };
    }
  }, {
    key: "draggable",
    get: function get() {
      return true;
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "img[src]": function imgSrc(dom) {
          return {
            src: dom.getAttribute("src"),
            title: dom.getAttribute("title"),
            alt: dom.getAttribute("alt")
          };
        } };
    }
  }]);

  return Image;
}(_model.Inline);

// ;; The default hard break node type.


var HardBreak = exports.HardBreak = function (_Inline2) {
  _inherits(HardBreak, _Inline2);

  function HardBreak() {
    _classCallCheck(this, HardBreak);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(HardBreak).apply(this, arguments));
  }

  _createClass(HardBreak, [{
    key: "toDOM",
    value: function toDOM() {
      return ["br"];
    }
  }, {
    key: "selectable",
    get: function get() {
      return false;
    }
  }, {
    key: "isBR",
    get: function get() {
      return true;
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "br": null };
    }
  }]);

  return HardBreak;
}(_model.Inline);

// ;; The default emphasis mark type.


var EmMark = exports.EmMark = function (_MarkType) {
  _inherits(EmMark, _MarkType);

  function EmMark() {
    _classCallCheck(this, EmMark);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(EmMark).apply(this, arguments));
  }

  _createClass(EmMark, [{
    key: "toDOM",
    value: function toDOM() {
      return ["em"];
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "i": null, "em": null };
    }
  }, {
    key: "matchDOMStyle",
    get: function get() {
      return { "font-style": function fontStyle(value) {
          return value == "italic" && null;
        } };
    }
  }]);

  return EmMark;
}(_model.MarkType);

// ;; The default strong mark type.


var StrongMark = exports.StrongMark = function (_MarkType2) {
  _inherits(StrongMark, _MarkType2);

  function StrongMark() {
    _classCallCheck(this, StrongMark);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(StrongMark).apply(this, arguments));
  }

  _createClass(StrongMark, [{
    key: "toDOM",
    value: function toDOM() {
      return ["strong"];
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "b": null, "strong": null };
    }
  }, {
    key: "matchDOMStyle",
    get: function get() {
      return { "font-weight": function fontWeight(value) {
          return (/^(bold(er)?|[5-9]\d{2,})$/.test(value) && null
          );
        } };
    }
  }]);

  return StrongMark;
}(_model.MarkType);

// ;; The default link mark type. Has these attributes:
//
// - **`href`** (required): The link target.
// - **`title`**: The link's title.


var LinkMark = exports.LinkMark = function (_MarkType3) {
  _inherits(LinkMark, _MarkType3);

  function LinkMark() {
    _classCallCheck(this, LinkMark);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(LinkMark).apply(this, arguments));
  }

  _createClass(LinkMark, [{
    key: "toDOM",
    value: function toDOM(node) {
      return ["a", node.attrs];
    }
  }, {
    key: "attrs",
    get: function get() {
      return {
        href: new _model.Attribute(),
        title: new _model.Attribute({ default: "" })
      };
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "a[href]": function aHref(dom) {
          return {
            href: dom.getAttribute("href"), title: dom.getAttribute("title")
          };
        } };
    }
  }]);

  return LinkMark;
}(_model.MarkType);

// ;; The default code font mark type.


var CodeMark = exports.CodeMark = function (_MarkType4) {
  _inherits(CodeMark, _MarkType4);

  function CodeMark() {
    _classCallCheck(this, CodeMark);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(CodeMark).apply(this, arguments));
  }

  _createClass(CodeMark, [{
    key: "toDOM",
    value: function toDOM() {
      return ["code"];
    }
  }, {
    key: "isCode",
    get: function get() {
      return true;
    }
  }, {
    key: "matchDOMTag",
    get: function get() {
      return { "code": null };
    }
  }]);

  return CodeMark;
}(_model.MarkType);

// :: Schema
// ProseMirror's default document schema.


var defaultSchema = exports.defaultSchema = new _model.Schema({
  nodes: {
    doc: { type: Doc, content: "block+" },

    paragraph: { type: Paragraph, content: "inline<_>*", group: "block" },
    blockquote: { type: BlockQuote, content: "block+", group: "block" },
    ordered_list: { type: OrderedList, content: "list_item+", group: "block" },
    bullet_list: { type: BulletList, content: "list_item+", group: "block" },
    horizontal_rule: { type: HorizontalRule, group: "block" },
    heading: { type: Heading, content: "inline<_>*", group: "block" },
    code_block: { type: CodeBlock, content: "text*", group: "block" },

    list_item: { type: ListItem, content: "block+" },

    text: { type: _model.Text, group: "inline" },
    image: { type: Image, group: "inline" },
    hard_break: { type: HardBreak, group: "inline" }
  },

  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark,
    code: CodeMark
  }
});
},{"../model":26}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ReplaceAroundStep = exports.ReplaceStep = exports.RemoveMarkStep = exports.AddMarkStep = exports.Remapping = exports.MapResult = exports.PosMap = exports.canSplit = exports.joinable = exports.joinPoint = exports.canLift = exports.canWrap = exports.StepResult = exports.Step = exports.TransformError = exports.Transform = undefined;

var _transform = require("./transform");

Object.defineProperty(exports, "Transform", {
  enumerable: true,
  get: function get() {
    return _transform.Transform;
  }
});
Object.defineProperty(exports, "TransformError", {
  enumerable: true,
  get: function get() {
    return _transform.TransformError;
  }
});

var _step = require("./step");

Object.defineProperty(exports, "Step", {
  enumerable: true,
  get: function get() {
    return _step.Step;
  }
});
Object.defineProperty(exports, "StepResult", {
  enumerable: true,
  get: function get() {
    return _step.StepResult;
  }
});

var _structure = require("./structure");

Object.defineProperty(exports, "canWrap", {
  enumerable: true,
  get: function get() {
    return _structure.canWrap;
  }
});
Object.defineProperty(exports, "canLift", {
  enumerable: true,
  get: function get() {
    return _structure.canLift;
  }
});
Object.defineProperty(exports, "joinPoint", {
  enumerable: true,
  get: function get() {
    return _structure.joinPoint;
  }
});
Object.defineProperty(exports, "joinable", {
  enumerable: true,
  get: function get() {
    return _structure.joinable;
  }
});
Object.defineProperty(exports, "canSplit", {
  enumerable: true,
  get: function get() {
    return _structure.canSplit;
  }
});

var _map = require("./map");

Object.defineProperty(exports, "PosMap", {
  enumerable: true,
  get: function get() {
    return _map.PosMap;
  }
});
Object.defineProperty(exports, "MapResult", {
  enumerable: true,
  get: function get() {
    return _map.MapResult;
  }
});
Object.defineProperty(exports, "Remapping", {
  enumerable: true,
  get: function get() {
    return _map.Remapping;
  }
});

var _mark_step = require("./mark_step");

Object.defineProperty(exports, "AddMarkStep", {
  enumerable: true,
  get: function get() {
    return _mark_step.AddMarkStep;
  }
});
Object.defineProperty(exports, "RemoveMarkStep", {
  enumerable: true,
  get: function get() {
    return _mark_step.RemoveMarkStep;
  }
});

var _replace_step = require("./replace_step");

Object.defineProperty(exports, "ReplaceStep", {
  enumerable: true,
  get: function get() {
    return _replace_step.ReplaceStep;
  }
});
Object.defineProperty(exports, "ReplaceAroundStep", {
  enumerable: true,
  get: function get() {
    return _replace_step.ReplaceAroundStep;
  }
});

require("./replace");

require("./mark");
},{"./map":34,"./mark":35,"./mark_step":36,"./replace":37,"./replace_step":38,"./step":39,"./structure":40,"./transform":41}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.mapThrough = mapThrough;
exports.mapThroughResult = mapThroughResult;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; #path=Mappable #kind=interface
// There are various things that positions can be mapped through.
// We'll denote those as 'mappable'. This is not an actual class in
// the codebase, only an agreed-on interface.

// :: (pos: number, bias: ?number) → number #path=Mappable.map
// Map a position through this object. When given, the `bias`
// determines in which direction to move when a chunk of content is
// inserted at or around the mapped position.

// :: (pos: number, bias: ?number) → MapResult #path=Mappable.mapResult
// Map a position, and return an object containing additional
// information about the mapping. The result's `deleted` field tells
// you whether the position was deleted (completely enclosed in a
// replaced range) during the mapping.

// Recovery values encode a range index and an offset. They are
// represented as numbers, because tons of them will be created when
// mapping, for example, a large number of marked ranges. The number's
// lower 16 bits provide the index, the remaining bits the offset.
//
// Note: We intentionally don't use bit shift operators to en- and
// decode these, since those clip to 32 bits, which we might in rare
// cases want to overflow. A 64-bit float can represent 48-bit
// integers precisely.

var lower16 = 0xffff;
var factor16 = Math.pow(2, 16);

function makeRecover(index, offset) {
  return index + offset * factor16;
}
function recoverIndex(value) {
  return value & lower16;
}
function recoverOffset(value) {
  return (value - (value & lower16)) / factor16;
}

// ;; The return value of mapping a position.

var MapResult = exports.MapResult = function MapResult(pos) {
  var deleted = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
  var recover = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  _classCallCheck(this, MapResult);

  // :: number The mapped version of the position.
  this.pos = pos;
  // :: bool Tells you whether the position was deleted, that is,
  // whether the step removed its surroundings from the document.
  this.deleted = deleted;
  this.recover = recover;
};

// ;; A position map, holding information about the way positions in
// the pre-step version of a document correspond to positions in the
// post-step version. This class implements `Mappable`.


var PosMap = exports.PosMap = function () {
  // :: ([number])
  // Create a position map. The modifications to the document are
  // represented as an array of numbers, in which each group of three
  // represents an [start, oldSize, newSize] chunk.

  function PosMap(ranges) {
    var inverted = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    _classCallCheck(this, PosMap);

    this.ranges = ranges;
    this.inverted = inverted;
  }

  _createClass(PosMap, [{
    key: "recover",
    value: function recover(value) {
      var diff = 0,
          index = recoverIndex(value);
      if (!this.inverted) for (var i = 0; i < index; i++) {
        diff += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
      }return this.ranges[index * 3] + diff + recoverOffset(value);
    }

    // :: (number, ?number) → MapResult
    // Map the given position through this map. The `bias` parameter can
    // be used to control what happens when the transform inserted
    // content at (or around) this position—if `bias` is negative, the a
    // position before the inserted content will be returned, if it is
    // positive, a position after the insertion is returned.

  }, {
    key: "mapResult",
    value: function mapResult(pos, bias) {
      return this._map(pos, bias, false);
    }

    // :: (number, ?number) → number
    // Map the given position through this map, returning only the
    // mapped position.

  }, {
    key: "map",
    value: function map(pos, bias) {
      return this._map(pos, bias, true);
    }
  }, {
    key: "_map",
    value: function _map(pos, bias, simple) {
      var diff = 0,
          oldIndex = this.inverted ? 2 : 1,
          newIndex = this.inverted ? 1 : 2;
      for (var i = 0; i < this.ranges.length; i += 3) {
        var start = this.ranges[i] - (this.inverted ? diff : 0);
        if (start > pos) break;
        var oldSize = this.ranges[i + oldIndex],
            newSize = this.ranges[i + newIndex],
            end = start + oldSize;
        if (pos <= end) {
          var side = !oldSize ? bias : pos == start ? -1 : pos == end ? 1 : bias;
          var result = start + diff + (side < 0 ? 0 : newSize);
          if (simple) return result;
          var recover = makeRecover(i / 3, pos - start);
          return new MapResult(result, pos != start && pos != end, recover);
        }
        diff += newSize - oldSize;
      }
      return simple ? pos + diff : new MapResult(pos + diff);
    }
  }, {
    key: "touches",
    value: function touches(pos, recover) {
      var diff = 0,
          index = recoverIndex(recover);
      var oldIndex = this.inverted ? 2 : 1,
          newIndex = this.inverted ? 1 : 2;
      for (var i = 0; i < this.ranges.length; i += 3) {
        var start = this.ranges[i] - (this.inverted ? diff : 0);
        if (start > pos) break;
        var oldSize = this.ranges[i + oldIndex],
            end = start + oldSize;
        if (pos <= end && i == index * 3) return true;
        diff += this.ranges[i + newIndex] - oldSize;
      }
      return false;
    }

    // :: () → PosMap
    // Create an inverted version of this map. The result can be used to
    // map positions in the post-step document to the pre-step document.

  }, {
    key: "invert",
    value: function invert() {
      return new PosMap(this.ranges, !this.inverted);
    }
  }, {
    key: "toString",
    value: function toString() {
      return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
    }
  }]);

  return PosMap;
}();

PosMap.empty = new PosMap([]);

// ;; A remapping represents a pipeline of zero or more mappings. It
// is a specialized data structured used to manage mapping through a
// series of steps, typically including inverted and non-inverted
// versions of the same step. (This comes up when ‘rebasing’ steps for
// collaboration or history management.) This class implements
// `Mappable`.

var Remapping = exports.Remapping = function () {
  // :: (?[PosMap], ?[PosMap])

  function Remapping() {
    var head = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
    var tail = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    _classCallCheck(this, Remapping);

    // :: [PosMap]
    // The maps in the head of the mapping are applied to input
    // positions first, back-to-front. So the map at the end of this
    // array (if any) is the very first one applied.
    this.head = head;
    // The maps in the tail are applied last, front-to-back.
    this.tail = tail;
    this.mirror = Object.create(null);
  }

  // :: (PosMap, ?number) → number
  // Add a map to the mapping's front. If this map is the mirror image
  // (produced by an inverted step) of another map in this mapping,
  // that map's id (as returned by this method or
  // [`addToBack`](#Remapping.addToBack)) should be passed as a second
  // parameter to register the correspondence.


  _createClass(Remapping, [{
    key: "addToFront",
    value: function addToFront(map, corr) {
      this.head.push(map);
      var id = -this.head.length;
      if (corr != null) this.mirror[id] = corr;
      return id;
    }

    // :: (PosMap, ?number) → number
    // Add a map to the mapping's back. If the map is the mirror image
    // of another mapping in this object, the id of that map should be
    // passed to register the correspondence.

  }, {
    key: "addToBack",
    value: function addToBack(map, corr) {
      this.tail.push(map);
      var id = this.tail.length - 1;
      if (corr != null) this.mirror[corr] = id;
      return id;
    }
  }, {
    key: "get",
    value: function get(id) {
      return id < 0 ? this.head[-id - 1] : this.tail[id];
    }

    // :: (number, ?number) → MapResult
    // Map a position through this remapping, returning a mapping
    // result.

  }, {
    key: "mapResult",
    value: function mapResult(pos, bias) {
      return this._map(pos, bias, false);
    }

    // :: (number, ?number) → number
    // Map a position through this remapping.

  }, {
    key: "map",
    value: function map(pos, bias) {
      return this._map(pos, bias, true);
    }
  }, {
    key: "_map",
    value: function _map(pos, bias, simple) {
      var deleted = false,
          recoverables = null;

      for (var i = -this.head.length; i < this.tail.length; i++) {
        var map = this.get(i),
            rec = void 0;

        if ((rec = recoverables && recoverables[i]) != null && map.touches(pos, rec)) {
          pos = map.recover(rec);
          continue;
        }

        var result = map.mapResult(pos, bias);
        if (result.recover != null) {
          var corr = this.mirror[i];
          if (corr != null) {
            if (result.deleted) {
              i = corr;
              pos = this.get(corr).recover(result.recover);
              continue;
            } else {
              ;(recoverables || (recoverables = Object.create(null)))[corr] = result.recover;
            }
          }
        }

        if (result.deleted) deleted = true;
        pos = result.pos;
      }

      return simple ? pos : new MapResult(pos, deleted);
    }
  }, {
    key: "toString",
    value: function toString() {
      var maps = [];
      for (var i = -this.head.length; i < this.tail.length; i++) {
        maps.push(i + ":" + this.get(i) + (this.mirror[i] != null ? "->" + this.mirror[i] : ""));
      }return maps.join("\n");
    }
  }]);

  return Remapping;
}();

function mapThrough(mappables, pos, bias, start) {
  for (var i = start || 0; i < mappables.length; i++) {
    pos = mappables[i].map(pos, bias);
  }return pos;
}

function mapThroughResult(mappables, pos, bias) {
  var deleted = false;
  for (var i = 0; i < mappables.length; i++) {
    var result = mappables[i].mapResult(pos, bias);
    pos = result.pos;
    if (result.deleted) deleted = true;
  }
  return new MapResult(pos, deleted);
}
},{}],35:[function(require,module,exports){
"use strict";

var _model = require("../model");

var _transform = require("./transform");

var _mark_step = require("./mark_step");

var _replace_step = require("./replace_step");

// :: (number, number, Mark) → Transform
// Add the given mark to the inline content between `from` and `to`.
_transform.Transform.prototype.addMark = function (from, to, mark) {
  var _this = this;

  var removed = [],
      added = [],
      removing = null,
      adding = null;
  this.doc.nodesBetween(from, to, function (node, pos, parent, index) {
    if (!node.isInline) return;
    var marks = node.marks;
    if (mark.isInSet(marks) || !parent.contentMatchAt(index + 1).allowsMark(mark.type)) {
      adding = removing = null;
    } else {
      var start = Math.max(pos, from),
          end = Math.min(pos + node.nodeSize, to);
      var rm = mark.type.isInSet(marks);

      if (!rm) removing = null;else if (removing && removing.mark.eq(rm)) removing.to = end;else removed.push(removing = new _mark_step.RemoveMarkStep(start, end, rm));

      if (adding) adding.to = end;else added.push(adding = new _mark_step.AddMarkStep(start, end, mark));
    }
  });

  removed.forEach(function (s) {
    return _this.step(s);
  });
  added.forEach(function (s) {
    return _this.step(s);
  });
  return this;
};

// :: (number, number, ?union<Mark, MarkType>) → Transform
// Remove the given mark, or all marks of the given type, from inline
// nodes between `from` and `to`.
_transform.Transform.prototype.removeMark = function (from, to) {
  var _this2 = this;

  var mark = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var matched = [],
      step = 0;
  this.doc.nodesBetween(from, to, function (node, pos) {
    if (!node.isInline) return;
    step++;
    var toRemove = null;
    if (mark instanceof _model.MarkType) {
      var found = mark.isInSet(node.marks);
      if (found) toRemove = [found];
    } else if (mark) {
      if (mark.isInSet(node.marks)) toRemove = [mark];
    } else {
      toRemove = node.marks;
    }
    if (toRemove && toRemove.length) {
      var end = Math.min(pos + node.nodeSize, to);
      for (var i = 0; i < toRemove.length; i++) {
        var style = toRemove[i],
            _found = void 0;
        for (var j = 0; j < matched.length; j++) {
          var m = matched[j];
          if (m.step == step - 1 && style.eq(matched[j].style)) _found = m;
        }
        if (_found) {
          _found.to = end;
          _found.step = step;
        } else {
          matched.push({ style: style, from: Math.max(pos, from), to: end, step: step });
        }
      }
    }
  });
  matched.forEach(function (m) {
    return _this2.step(new _mark_step.RemoveMarkStep(m.from, m.to, m.style));
  });
  return this;
};

// :: (number, number) → Transform
// Remove all marks and non-text inline nodes from the given range.
_transform.Transform.prototype.clearMarkup = function (from, to) {
  var _this3 = this;

  var delSteps = []; // Must be accumulated and applied in inverse order
  this.doc.nodesBetween(from, to, function (node, pos) {
    if (!node.isInline) return;
    if (!node.type.isText) {
      delSteps.push(new _replace_step.ReplaceStep(pos, pos + node.nodeSize, _model.Slice.empty));
      return;
    }
    for (var i = 0; i < node.marks.length; i++) {
      _this3.step(new _mark_step.RemoveMarkStep(Math.max(pos, from), Math.min(pos + node.nodeSize, to), node.marks[i]));
    }
  });
  for (var i = delSteps.length - 1; i >= 0; i--) {
    this.step(delSteps[i]);
  }return this;
};

_transform.Transform.prototype.clearMarkupFor = function (pos, newType, newAttrs) {
  var node = this.doc.nodeAt(pos),
      match = newType.contentExpr.start(newAttrs);
  var delSteps = [];
  for (var i = 0, cur = pos + 1; i < node.childCount; i++) {
    var child = node.child(i),
        end = cur + child.nodeSize;
    var allowed = match.matchType(child.type, child.attrs, []);
    if (!allowed) {
      delSteps.push(new _replace_step.ReplaceStep(cur, end, _model.Slice.empty));
    } else {
      match = allowed;
      for (var j = 0; j < child.marks.length; j++) {
        if (!match.allowsMark(child.marks[j])) this.step(new _mark_step.RemoveMarkStep(cur, end, child.marks[j]));
      }
    }
    cur = end;
  }
  for (var _i = delSteps.length - 1; _i >= 0; _i--) {
    this.step(delSteps[_i]);
  }return this;
};
},{"../model":26,"./mark_step":36,"./replace_step":38,"./transform":41}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RemoveMarkStep = exports.AddMarkStep = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _model = require("../model");

var _step = require("./step");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function mapFragment(fragment, f, parent) {
  var mapped = [];
  for (var i = 0; i < fragment.childCount; i++) {
    var child = fragment.child(i);
    if (child.content.size) child = child.copy(mapFragment(child.content, f, child));
    if (child.isInline) child = f(child, parent, i);
    mapped.push(child);
  }
  return _model.Fragment.fromArray(mapped);
}

// ;; Add a mark to all inline content between two positions.

var AddMarkStep = exports.AddMarkStep = function (_Step) {
  _inherits(AddMarkStep, _Step);

  // :: (number, number, Mark)

  function AddMarkStep(from, to, mark) {
    _classCallCheck(this, AddMarkStep);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AddMarkStep).call(this));

    _this.from = from;
    _this.to = to;
    _this.mark = mark;
    return _this;
  }

  _createClass(AddMarkStep, [{
    key: "apply",
    value: function apply(doc) {
      var _this2 = this;

      var oldSlice = doc.slice(this.from, this.to);
      var slice = new _model.Slice(mapFragment(oldSlice.content, function (node, parent, index) {
        if (!parent.contentMatchAt(index + 1).allowsMark(_this2.mark.type)) return node;
        return node.mark(_this2.mark.addToSet(node.marks));
      }, oldSlice.possibleParent), oldSlice.openLeft, oldSlice.openRight);
      return _step.StepResult.fromReplace(doc, this.from, this.to, slice);
    }
  }, {
    key: "invert",
    value: function invert() {
      return new RemoveMarkStep(this.from, this.to, this.mark);
    }
  }, {
    key: "map",
    value: function map(mapping) {
      var from = mapping.mapResult(this.from, 1),
          to = mapping.mapResult(this.to, -1);
      if (from.deleted && to.deleted || from.pos >= to.pos) return null;
      return new AddMarkStep(from.pos, to.pos, this.mark);
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      return new AddMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
    }
  }]);

  return AddMarkStep;
}(_step.Step);

_step.Step.register("addMark", AddMarkStep);

// ;; Remove a mark from all inline content between two positions.

var RemoveMarkStep = exports.RemoveMarkStep = function (_Step2) {
  _inherits(RemoveMarkStep, _Step2);

  // :: (number, number, Mark)

  function RemoveMarkStep(from, to, mark) {
    _classCallCheck(this, RemoveMarkStep);

    var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(RemoveMarkStep).call(this));

    _this3.from = from;
    _this3.to = to;
    _this3.mark = mark;
    return _this3;
  }

  _createClass(RemoveMarkStep, [{
    key: "apply",
    value: function apply(doc) {
      var _this4 = this;

      var oldSlice = doc.slice(this.from, this.to);
      var slice = new _model.Slice(mapFragment(oldSlice.content, function (node) {
        return node.mark(_this4.mark.removeFromSet(node.marks));
      }), oldSlice.openLeft, oldSlice.openRight);
      return _step.StepResult.fromReplace(doc, this.from, this.to, slice);
    }
  }, {
    key: "invert",
    value: function invert() {
      return new AddMarkStep(this.from, this.to, this.mark);
    }
  }, {
    key: "map",
    value: function map(mapping) {
      var from = mapping.mapResult(this.from, 1),
          to = mapping.mapResult(this.to, -1);
      if (from.deleted && to.deleted || from.pos >= to.pos) return null;
      return new RemoveMarkStep(from.pos, to.pos, this.mark);
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      return new RemoveMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
    }
  }]);

  return RemoveMarkStep;
}(_step.Step);

_step.Step.register("removeMark", RemoveMarkStep);
},{"../model":26,"./step":39}],37:[function(require,module,exports){
"use strict";

var _model = require("../model");

var _replace_step = require("./replace_step");

var _transform = require("./transform");

// :: (number, number) → Transform
// Delete the content between the given positions.
_transform.Transform.prototype.delete = function (from, to) {
  return this.replace(from, to, _model.Slice.empty);
};

// :: (number, ?number, ?Slice) → Transform
// Replace the part of the document between `from` and `to` with the
// part of the `source` between `start` and `end`.
_transform.Transform.prototype.replace = function (from) {
  var to = arguments.length <= 1 || arguments[1] === undefined ? from : arguments[1];
  var slice = arguments.length <= 2 || arguments[2] === undefined ? _model.Slice.empty : arguments[2];

  if (from == to && !slice.size) return this;

  var $from = this.doc.resolve(from),
      $to = this.doc.resolve(to);
  var placed = placeSlice($from, slice);

  var fittedLeft = fitLeft($from, placed);
  var fitted = fitRight($from, $to, fittedLeft);
  if (!fitted) return this;
  if (fittedLeft.size != fitted.size && canMoveText($from, $to, fittedLeft)) {
    var d = $to.depth,
        after = $to.after(d);
    while (d > 1 && after == $to.end(--d)) {
      ++after;
    }var fittedAfter = fitRight($from, this.doc.resolve(after), fittedLeft);
    if (fittedAfter) return this.step(new _replace_step.ReplaceAroundStep(from, after, to, $to.end(), fittedAfter, fittedLeft.size));
  }
  return this.step(new _replace_step.ReplaceStep(from, to, fitted));
};

// :: (number, number, union<Fragment, Node, [Node]>) → Transform
// Replace the given range with the given content, which may be a
// fragment, node, or array of nodes.
_transform.Transform.prototype.replaceWith = function (from, to, content) {
  return this.replace(from, to, new _model.Slice(_model.Fragment.from(content), 0, 0));
};

// :: (number, union<Fragment, Node, [Node]>) → Transform
// Insert the given content at the given position.
_transform.Transform.prototype.insert = function (pos, content) {
  return this.replaceWith(pos, pos, content);
};

// :: (number, string) → Transform
// Insert the given text at `pos`, inheriting the marks of the
// existing content at that position.
_transform.Transform.prototype.insertText = function (pos, text) {
  return this.insert(pos, this.doc.type.schema.text(text, this.doc.marksAt(pos)));
};

// :: (number, Node) → Transform
// Insert the given node at `pos`, inheriting the marks of the
// existing content at that position.
_transform.Transform.prototype.insertInline = function (pos, node) {
  return this.insert(pos, node.mark(this.doc.marksAt(pos)));
};

function fitLeftInner($from, depth, placed, placedBelow) {
  var content = _model.Fragment.empty,
      openRight = 0,
      placedHere = placed[depth];
  if ($from.depth > depth) {
    var inner = fitLeftInner($from, depth + 1, placed, placedBelow || placedHere);
    openRight = inner.openRight + 1;
    content = _model.Fragment.from($from.node(depth + 1).copy(inner.content));
  }

  if (placedHere) {
    content = content.append(placedHere.content);
    openRight = placedHere.openRight;
  }
  if (placedBelow) {
    content = content.append($from.node(depth).contentMatchAt($from.indexAfter(depth)).fillBefore(_model.Fragment.empty, true));
    openRight = 0;
  }

  return { content: content, openRight: openRight };
}

function fitLeft($from, placed) {
  var _fitLeftInner = fitLeftInner($from, 0, placed, false);

  var content = _fitLeftInner.content;
  var openRight = _fitLeftInner.openRight;

  return new _model.Slice(content, $from.depth, openRight || 0);
}

function fitRightJoin(content, parent, $from, $to, depth, openLeft, openRight) {
  var match = void 0,
      count = content.childCount,
      matchCount = count - (openRight > 0 ? 1 : 0);
  if (openLeft < 0) match = parent.contentMatchAt(matchCount);else if (count == 1 && openRight > 0) match = $from.node(depth).contentMatchAt(openLeft ? $from.index(depth) : $from.indexAfter(depth));else match = $from.node(depth).contentMatchAt($from.indexAfter(depth)).matchFragment(content, count > 0 && openLeft ? 1 : 0, matchCount);

  var toNode = $to.node(depth);
  if (openRight > 0 && depth < $to.depth) {
    // FIXME find a less allocaty approach
    var after = toNode.content.cutByIndex($to.indexAfter(depth)).addToStart(content.lastChild);
    var _joinable = match.fillBefore(after, true);
    // Can't insert content if there's a single node stretched across this gap
    if (_joinable && _joinable.size && openLeft > 0 && count == 1) _joinable = null;

    if (_joinable) {
      var inner = fitRightJoin(content.lastChild.content, content.lastChild, $from, $to, depth + 1, count == 1 ? openLeft - 1 : -1, openRight - 1);
      if (inner) {
        var last = content.lastChild.copy(inner);
        if (_joinable.size) return content.sliceByIndex(0, count - 1).append(_joinable).addToEnd(last);else return content.replaceChild(count - 1, last);
      }
    }
  }
  if (openRight > 0) match = match.matchNode(count == 1 && openLeft > 0 ? $from.node(depth + 1) : content.lastChild);

  // If we're here, the next level can't be joined, so we see what
  // happens if we leave it open.
  var toIndex = $to.index(depth);
  if (toIndex == toNode.childCount && !toNode.type.compatibleContent(parent.type)) return null;
  var joinable = match.fillBefore(toNode.content, true, toIndex);
  if (!joinable) return null;

  if (openRight > 0) {
    var closed = fitRightClosed(content.lastChild, openRight - 1, $from, depth + 1, count == 1 ? openLeft - 1 : -1);
    content = content.replaceChild(count - 1, closed);
  }
  content = content.append(joinable);
  if ($to.depth > depth) content = content.addToEnd(fitRightSeparate($to, depth + 1));
  return content;
}

function fitRightClosed(node, openRight, $from, depth, openLeft) {
  var match = void 0,
      content = node.content,
      count = content.childCount;
  if (openLeft >= 0) match = $from.node(depth).contentMatchAt($from.indexAfter(depth)).matchFragment(content, openLeft > 0 ? 1 : 0, count);else match = node.contentMatchAt(count);

  if (openRight > 0) {
    var closed = fitRightClosed(content.lastChild, openRight - 1, $from, depth + 1, count == 1 ? openLeft - 1 : -1);
    content = content.replaceChild(count - 1, closed);
  }

  return node.copy(content.append(match.fillBefore(_model.Fragment.empty, true)));
}

function fitRightSeparate($to, depth) {
  var node = $to.node(depth);
  var fill = node.contentMatchAt(0).fillBefore(node.content, true, $to.index(depth));
  if ($to.depth > depth) fill = fill.addToEnd(fitRightSeparate($to, depth + 1));
  return node.copy(fill);
}

function normalizeSlice(content, openLeft, openRight) {
  while (openLeft > 0 && openRight > 0 && content.childCount == 1) {
    content = content.firstChild.content;
    openLeft--;
    openRight--;
  }
  return new _model.Slice(content, openLeft, openRight);
}

// : (ResolvedPos, ResolvedPos, number, Slice) → Slice
function fitRight($from, $to, slice) {
  var fitted = fitRightJoin(slice.content, $from.node(0), $from, $to, 0, slice.openLeft, slice.openRight);
  // FIXME we might want to be clever about selectively dropping nodes here?
  if (!fitted) return null;
  return normalizeSlice(fitted, slice.openLeft, $to.depth);
}

function canMoveText($from, $to, slice) {
  if (!$to.parent.isTextblock) return false;

  var match = void 0;
  if (!slice.openRight) {
    var parent = $from.node($from.depth - (slice.openLeft - slice.openRight));
    if (!parent.isTextblock) return false;
    match = parent.contentMatchAt(parent.childCount);
    if (slice.size) match = match.matchFragment(slice.content, slice.openLeft ? 1 : 0);
  } else {
    var _parent = nodeRight(slice.content, slice.openRight);
    if (!_parent.isTextblock) return false;
    match = _parent.contentMatchAt(_parent.childCount);
  }
  match = match.matchFragment($to.parent.content, $to.index());
  return match && match.validEnd();
}

// Algorithm for 'placing' the elements of a slice into a gap:
//
// We consider the content of each node that is open to the left to be
// independently placeable. I.e. in <p("foo"), p("bar")>, when the
// paragraph on the left is open, "foo" can be placed (somewhere on
// the left side of the replacement gap) independently from p("bar").
//
// So placeSlice splits up a slice into a number of sub-slices,
// along with information on where they can be placed on the given
// left-side edge. It works by walking the open side of the slice,
// from the inside out, and trying to find a landing spot for each
// element, by simultaneously scanning over the gap side. When no
// place is found for an open node's content, it is left in that node.
//
// If the outer content can't be placed, a set of wrapper nodes is
// made up for it (by rooting it in the document node type using
// findWrapping), and the algorithm continues to iterate over those.
// This is guaranteed to find a fit, since both stacks now start with
// the same node type (doc).

function nodeLeft(content, depth) {
  for (var i = 1; i < depth; i++) {
    content = content.firstChild.content;
  }return content.firstChild;
}

function nodeRight(content, depth) {
  for (var i = 1; i < depth; i++) {
    content = content.lastChild.content;
  }return content.lastChild;
}

function placeSlice($from, slice) {
  var dFrom = $from.depth,
      unplaced = null;
  var placed = [],
      parents = null;

  for (var dSlice = slice.openLeft;; --dSlice) {
    var curType = void 0,
        curAttrs = void 0,
        curFragment = void 0;
    if (dSlice >= 0) {
      if (dSlice > 0) {
        // Inside slice
        ;
        var _nodeLeft = nodeLeft(slice.content, dSlice);

        curType = _nodeLeft.type;
        curAttrs = _nodeLeft.attrs;
        curFragment = _nodeLeft.content;
      } else if (dSlice == 0) {
        // Top of slice
        curFragment = slice.content;
      }
      if (dSlice < slice.openLeft) curFragment = curFragment.cut(curFragment.firstChild.nodeSize);
    } else {
      // Outside slice
      curFragment = _model.Fragment.empty;
      var parent = parents[parents.length + dSlice - 1];
      curType = parent.type;
      curAttrs = parent.attrs;
    }
    if (unplaced) curFragment = curFragment.addToStart(unplaced);

    if (curFragment.size == 0 && dSlice <= 0) break;

    // FIXME cut/remove marks when it helps find a placement
    var found = findPlacement(curFragment, $from, dFrom);
    if (found) {
      if (found.fragment.size > 0) placed[found.depth] = {
        content: found.fill.append(found.fragment),
        openRight: dSlice > 0 ? 0 : slice.openRight - dSlice,
        depth: found.depth
      };
      if (dSlice <= 0) break;
      unplaced = null;
      dFrom = Math.max(0, found.depth - 1);
    } else {
      if (dSlice == 0) {
        var top = $from.node(0);
        parents = top.contentMatchAt($from.index(0)).findWrapping(curFragment.firstChild.type, curFragment.firstChild.attrs);
        if (!parents) break;
        var last = parents[parents.length - 1];
        if (last ? !last.type.contentExpr.matches(last.attrs, curFragment) : !top.canReplace($from.indexAfter(0), $from.depth ? $from.index(0) : $from.indexAfter(0), curFragment)) break;
        parents = [{ type: top.type, attrs: top.attrs }].concat(parents);
        curType = parents[parents.length - 1].type;
        curAttrs = parents[parents.length - 1].type;
      }
      curFragment = curType.contentExpr.start(curAttrs).fillBefore(curFragment, true).append(curFragment);
      unplaced = curType.create(curAttrs, curFragment);
    }
  }

  return placed;
}

function findPlacement(fragment, $from, start) {
  var hasMarks = false;
  for (var i = 0; i < fragment.childCount; i++) {
    if (fragment.child(i).marks.length) hasMarks = true;
  }for (var d = start; d >= 0; d--) {
    var startMatch = $from.node(d).contentMatchAt($from.indexAfter(d));
    var match = startMatch.fillBefore(fragment);
    if (match) return { depth: d, fill: match, fragment: fragment };
    if (hasMarks) {
      var stripped = matchStrippingMarks(startMatch, fragment);
      if (stripped) return { depth: d, fill: _model.Fragment.empty, fragment: stripped };
    }
  }
}

function matchStrippingMarks(match, fragment) {
  var newNodes = [];
  for (var i = 0; i < fragment.childCount; i++) {
    var node = fragment.child(i),
        stripped = node.mark(node.marks.filter(function (m) {
      return match.allowsMark(m.type);
    }));
    match = match.matchNode(stripped);
    if (!match) return null;
    newNodes.push(stripped);
  }
  return _model.Fragment.from(newNodes);
}
},{"../model":26,"./replace_step":38,"./transform":41}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ReplaceAroundStep = exports.ReplaceStep = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _model = require("../model");

var _step = require("./step");

var _map = require("./map");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; Replace a part of the document with a slice of new content.

var ReplaceStep = exports.ReplaceStep = function (_Step) {
  _inherits(ReplaceStep, _Step);

  // :: (number, number, Slice, bool)
  // The given `slice` should fit the 'gap' between `from` and
  // `to`—the depths must line up, and the surrounding nodes must be
  // able to be joined with the open sides of the slice. When
  // `structure` is true, the step will fail if the content between
  // from and to is not just a sequence of closing and then opening
  // tokens (this is to guard against rebased replace steps
  // overwriting something they weren't supposed to).

  function ReplaceStep(from, to, slice, structure) {
    _classCallCheck(this, ReplaceStep);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ReplaceStep).call(this));

    _this.from = from;
    _this.to = to;
    _this.slice = slice;
    _this.structure = !!structure;
    return _this;
  }

  _createClass(ReplaceStep, [{
    key: "apply",
    value: function apply(doc) {
      if (this.structure && contentBetween(doc, this.from, this.to)) return _step.StepResult.fail("Structure replace would overwrite content");
      return _step.StepResult.fromReplace(doc, this.from, this.to, this.slice);
    }
  }, {
    key: "posMap",
    value: function posMap() {
      return new _map.PosMap([this.from, this.to - this.from, this.slice.size]);
    }
  }, {
    key: "invert",
    value: function invert(doc) {
      return new ReplaceStep(this.from, this.from + this.slice.size, doc.slice(this.from, this.to));
    }
  }, {
    key: "map",
    value: function map(mapping) {
      var from = mapping.mapResult(this.from, 1),
          to = mapping.mapResult(this.to, -1);
      if (from.deleted && to.deleted) return null;
      return new ReplaceStep(from.pos, Math.max(from.pos, to.pos), this.slice);
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      return new ReplaceStep(json.from, json.to, _model.Slice.fromJSON(schema, json.slice));
    }
  }]);

  return ReplaceStep;
}(_step.Step);

_step.Step.register("replace", ReplaceStep);

// ;; Replace a part of the document with a slice of content, but
// preserve a range of the replaced content by moving it into the
// slice.

var ReplaceAroundStep = exports.ReplaceAroundStep = function (_Step2) {
  _inherits(ReplaceAroundStep, _Step2);

  // :: (number, number, number, number, Slice, number, bool)
  // Create a replace-wrap step with the given range and gap. `inset`
  // should be the point in the slice into which the gap should be
  // moved. `structure` has the same meaning as it has in the
  // `Replace` step.

  function ReplaceAroundStep(from, to, gapFrom, gapTo, slice, insert, structure) {
    _classCallCheck(this, ReplaceAroundStep);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(ReplaceAroundStep).call(this));

    _this2.from = from;
    _this2.to = to;
    _this2.gapFrom = gapFrom;
    _this2.gapTo = gapTo;
    _this2.slice = slice;
    _this2.insert = insert;
    _this2.structure = !!structure;
    return _this2;
  }

  _createClass(ReplaceAroundStep, [{
    key: "apply",
    value: function apply(doc) {
      if (this.structure && (contentBetween(doc, this.from, this.gapFrom) || contentBetween(doc, this.gapTo, this.to))) return _step.StepResult.fail("Structure gap-replace would overwrite content");

      var gap = doc.slice(this.gapFrom, this.gapTo);
      if (gap.openLeft || gap.openRight) return _step.StepResult.fail("Gap is not a flat range");
      var inserted = this.slice.insertAt(this.insert, gap.content);
      if (!inserted) return _step.StepResult.fail("Content does not fit in gap");
      return _step.StepResult.fromReplace(doc, this.from, this.to, inserted);
    }
  }, {
    key: "posMap",
    value: function posMap() {
      return new _map.PosMap([this.from, this.gapFrom - this.from, this.insert, this.gapTo, this.to - this.gapTo, this.slice.size - this.insert]);
    }
  }, {
    key: "invert",
    value: function invert(doc) {
      var gap = this.gapTo - this.gapFrom;
      return new ReplaceAroundStep(this.from, this.from + this.slice.size + gap, this.from + this.insert, this.from + this.insert + gap, doc.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
    }
  }, {
    key: "map",
    value: function map(mapping) {
      var from = mapping.mapResult(this.from, 1),
          to = mapping.mapResult(this.to, -1);
      var gapFrom = mapping.map(this.gapFrom, -1),
          gapTo = mapping.map(this.gapTo, 1);
      if (from.deleted && to.deleted || gapFrom < from.pos || gapTo > to.pos) return null;
      return new ReplaceAroundStep(from.pos, to.pos, gapFrom, gapTo, this.slice, this.insert, this.structure);
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      return new ReplaceAroundStep(json.from, json.to, json.gapFrom, json.gapTo, _model.Slice.fromJSON(schema, json.slice), json.insert, json.structure);
    }
  }]);

  return ReplaceAroundStep;
}(_step.Step);

_step.Step.register("replaceAround", ReplaceAroundStep);

function contentBetween(doc, from, to) {
  var $from = doc.resolve(from),
      dist = to - from,
      depth = $from.depth;
  while (dist > 0 && depth > 0 && $from.indexAfter(depth) == $from.node(depth).childCount) {
    depth--;
    dist--;
  }
  if (dist > 0) {
    var next = $from.node(depth).maybeChild($from.indexAfter(depth));
    while (dist > 0) {
      if (!next || next.type.isLeaf) return true;
      next = next.firstChild;
      dist--;
    }
  }
  return false;
}
},{"../model":26,"./map":34,"./step":39}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StepResult = exports.Step = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _model = require("../model");

var _map = require("./map");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function mustOverride() {
  throw new Error("Override me");
}

var stepsByID = Object.create(null);

// ;; A step object wraps an atomic operation. It generally applies
// only to the document it was created for, since the positions
// associated with it will only make sense for that document.
//
// New steps are defined by creating classes that extend `Step`,
// overriding the `apply`, `invert`, `map`, `posMap` and `fromJSON`
// methods, and registering your class with a unique
// JSON-serialization identifier using `Step.register`.

var Step = exports.Step = function () {
  function Step() {
    _classCallCheck(this, Step);
  }

  _createClass(Step, [{
    key: "apply",

    // :: (doc: Node) → ?StepResult
    // Applies this step to the given document, returning a result
    // containing the transformed document (the input document is not
    // changed) and a `PosMap`. If the step could not meaningfully be
    // applied to the given document, this returns `null`.
    value: function apply(_doc) {
      return mustOverride();
    }

    // :: () → PosMap
    // Get the position map that represents the changes made by this
    // step.

  }, {
    key: "posMap",
    value: function posMap() {
      return _map.PosMap.empty;
    }

    // :: (doc: Node) → Step
    // Create an inverted version of this step. Needs the document as it
    // was before the step as input.

  }, {
    key: "invert",
    value: function invert(_doc) {
      return mustOverride();
    }

    // :: (mapping: Mappable) → ?Step
    // Map this step through a mappable thing, returning either a
    // version of that step with its positions adjusted, or `null` if
    // the step was entirely deleted by the mapping.

  }, {
    key: "map",
    value: function map(_mapping) {
      return mustOverride();
    }

    // :: () → Object
    // Create a JSON-serializeable representation of this step. By
    // default, it'll create an object with the step's [JSON
    // id](#Step.register), and each of the steps's own properties,
    // automatically calling `toJSON` on the property values that have
    // such a method.

  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = { stepType: this.jsonID };
      for (var prop in this) {
        if (this.hasOwnProperty(prop)) {
          var val = this[prop];
          obj[prop] = val && val.toJSON ? val.toJSON() : val;
        }
      }return obj;
    }

    // :: (Schema, Object) → Step
    // Deserialize a step from its JSON representation. Will call
    // through to the step class' own implementation of this method.

  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      return stepsByID[json.stepType].fromJSON(schema, json);
    }

    // :: (string, constructor<Step>)
    // To be able to serialize steps to JSON, each step needs a string
    // ID to attach to its JSON representation. Use this method to
    // register an ID for your step classes.

  }, {
    key: "register",
    value: function register(id, stepClass) {
      if (id in stepsByID) throw new RangeError("Duplicate use of step JSON ID " + id);
      stepsByID[id] = stepClass;
      stepClass.prototype.jsonID = id;
      return stepClass;
    }
  }]);

  return Step;
}();

// ;; The result of [applying](#Step.apply) a step. Contains either a
// new document or a failure value.


var StepResult = exports.StepResult = function () {
  // :: (?Node, ?string)

  function StepResult(doc, failed) {
    _classCallCheck(this, StepResult);

    // :: ?Node The transformed document.
    this.doc = doc;
    // :: ?string A text providing information about a failed step.
    this.failed = failed;
  }

  // :: (Node) → StepResult
  // Create a successful step result.


  _createClass(StepResult, null, [{
    key: "ok",
    value: function ok(doc) {
      return new StepResult(doc, null);
    }

    // :: (string) → StepResult
    // Create a failed step result.

  }, {
    key: "fail",
    value: function fail(val) {
      return new StepResult(null, val);
    }

    // :: (Node, number, number, Slice) → StepResult
    // Run `Node.replace`, create a successful result if it succeeds,
    // and a failed one if it throws a `ReplaceError`.

  }, {
    key: "fromReplace",
    value: function fromReplace(doc, from, to, slice) {
      try {
        return StepResult.ok(doc.replace(from, to, slice));
      } catch (e) {
        if (e instanceof _model.ReplaceError) return StepResult.fail(e.message);
        throw e;
      }
    }
  }]);

  return StepResult;
}();
},{"../model":26,"./map":34}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.canLift = canLift;
exports.canWrap = canWrap;
exports.canSplit = canSplit;
exports.joinable = joinable;
exports.joinPoint = joinPoint;

var _model = require("../model");

var _transform = require("./transform");

var _replace_step = require("./replace_step");

// :: (Node, number, ?number) → bool
// Tells you whether the range in the given positions' shared
// ancestor, or any of _its_ ancestor nodes, can be lifted out of a
// parent.
function canLift(doc, from, to) {
  return !!findLiftable(doc.resolve(from), doc.resolve(to == null ? from : to));
}

function rangeDepth($from, $to) {
  var shared = $from.sameDepth($to);
  if ($from.node(shared).isTextblock || $from.pos == $to.pos) --shared;
  if (shared < 0 || $from.pos > $to.pos) return null;
  return shared;
}

function canCut(node, start, end) {
  return (start == 0 || node.canReplace(start, node.childCount)) && (end == node.childCount || node.canReplace(0, start));
}

function findLiftable($from, $to) {
  var shared = rangeDepth($from, $to);
  if (!shared) return null;
  var parent = $from.node(shared),
      content = parent.content.cutByIndex($from.index(shared), $to.indexAfter(shared));
  for (var depth = shared;; --depth) {
    var node = $from.node(depth),
        index = $from.index(depth);
    if (depth < shared && node.canReplace(index, index + 1, content)) return { depth: depth, shared: shared, unwrap: false };
    if (depth == 0 || !canCut(node, index, index + 1)) break;
  }

  if (parent.isBlock) {
    var _ret = function () {
      var joined = _model.Fragment.empty;
      content.forEach(function (node) {
        return joined = joined.append(node.content);
      });
      for (var _depth = shared;; --_depth) {
        var _node = $from.node(_depth),
            _index = $from.index(_depth);
        if (_depth < shared && _node.canReplace(_index, _index + 1, joined)) return {
            v: { depth: _depth, shared: shared, unwrap: true }
          };
        if (_depth == 0 || !canCut(_node, _index, _index + 1)) break;
      }
    }();

    if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
  }
}

// :: (number, ?number, ?bool) → Transform
// Lift the nearest liftable ancestor of the [sibling
// range](#Node.siblingRange) of the given positions out of its parent
// (or do nothing if no such node exists). When `silent` is true, this
// won't raise an error when the lift is impossible.
_transform.Transform.prototype.lift = function (from) {
  var to = arguments.length <= 1 || arguments[1] === undefined ? from : arguments[1];
  var silent = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

  var $from = this.doc.resolve(from),
      $to = this.doc.resolve(to);
  var liftable = findLiftable($from, $to);
  if (!liftable) {
    if (!silent) throw new RangeError("No valid lift target");
    return this;
  }

  var depth = liftable.depth;
  var shared = liftable.shared;
  var unwrap = liftable.unwrap;


  if (unwrap) {
    var parent = $from.node(shared),
        pos = $to.after(shared + 1);
    for (var i = $to.indexAfter(shared); pos > from; i--) {
      var size = parent.child(i - 1).nodeSize;
      this.lift(pos - size + 1, pos - 1, silent);
      pos -= size;
    }
    return this;
  }

  var gapStart = $from.before(shared + 1),
      gapEnd = $to.after(shared + 1);
  var start = gapStart,
      end = gapEnd;

  var before = _model.Fragment.empty,
      beforeDepth = 0;
  for (var d = shared, splitting = false; d > depth; d--) {
    if (splitting || $from.index(d) > 0) {
      splitting = true;
      before = _model.Fragment.from($from.node(d).copy(before));
      beforeDepth++;
    } else {
      start--;
    }
  }var after = _model.Fragment.empty,
      afterDepth = 0;
  for (var _d = shared, _splitting = false; _d > depth; _d--) {
    if (_splitting || $to.after(_d + 1) < $to.end(_d)) {
      _splitting = true;
      after = _model.Fragment.from($to.node(_d).copy(after));
      afterDepth++;
    } else {
      end++;
    }
  }return this.step(new _replace_step.ReplaceAroundStep(start, end, gapStart, gapEnd, new _model.Slice(before.append(after), beforeDepth, afterDepth), before.size - beforeDepth, true));
};

// :: (Node, number, ?number, NodeType, ?Object) → bool
// Determines whether the [sibling range](#Node.siblingRange) of the
// given positions can be wrapped in the given node type.
function canWrap(doc, from, to, type, attrs) {
  return !!checkWrap(doc.resolve(from), doc.resolve(to == null ? from : to), type, attrs);
}

function checkWrap($from, $to, type, attrs) {
  var shared = rangeDepth($from, $to);
  if (shared == null) return null;
  var parent = $from.node(shared),
      parentFrom = $from.index(shared),
      parentTo = $to.indexAfter(shared);
  var around = parent.contentMatchAt(parentFrom).findWrapping(type, attrs);
  if (!around) return null;
  if (!parent.canReplaceWith(parentFrom, parentTo, around.length ? around[0].type : type, around.length ? around[0].attrs : attrs)) return null;
  var inner = parent.child(parentFrom);
  var inside = type.contentExpr.start(attrs || type.defaultAttrs).findWrapping(inner.type, inner.attrs);
  if (!inside) return null;
  var lastInside = inside[inside.length - 1];
  var innerMatch = (lastInside ? lastInside.type : type).contentExpr.start(lastInside ? lastInside.attrs : attrs);
  for (var i = parentFrom; i < parentTo; i++) {
    if (!(innerMatch = innerMatch.matchNode(parent.child(i)))) return null;
  }return { shared: shared, around: around, inside: inside };
}

// :: (number, ?number, NodeType, ?Object) → Transform
// Wrap the [sibling range](#Node.siblingRange) of the given positions
// in a node of the given type, with the given attributes (if
// possible).
_transform.Transform.prototype.wrap = function (from) {
  var to = arguments.length <= 1 || arguments[1] === undefined ? from : arguments[1];
  var type = arguments[2];
  var wrapAttrs = arguments[3];

  var $from = this.doc.resolve(from),
      $to = this.doc.resolve(to);
  var check = checkWrap($from, $to, type, wrapAttrs);
  if (!check) throw new RangeError("Wrap not possible");
  var shared = check.shared;
  var around = check.around;
  var inside = check.inside;


  var content = _model.Fragment.empty,
      open = inside.length + 1 + around.length;
  for (var i = inside.length - 1; i >= 0; i--) {
    content = _model.Fragment.from(inside[i].type.create(inside[i].attrs, content));
  }content = _model.Fragment.from(type.create(wrapAttrs, content));
  for (var _i = around.length - 1; _i >= 0; _i--) {
    content = _model.Fragment.from(around[_i].type.create(around[_i].attrs, content));
  }var start = $from.before(shared + 1),
      end = $to.after(shared + 1);
  this.step(new _replace_step.ReplaceAroundStep(start, end, start, end, new _model.Slice(content, 0, 0), open, true));

  if (inside.length) {
    var splitPos = start + open,
        parent = $from.node(shared);
    for (var _i2 = $from.index(shared), e = $to.index(shared) + 1, first = true; _i2 < e; _i2++, first = false) {
      if (!first) this.split(splitPos, inside.length);
      splitPos += parent.child(_i2).nodeSize + (first ? 0 : 2 * inside.length);
    }
  }
  return this;
};

// :: (number, ?number, NodeType, ?Object) → Transform
// Set the type of all textblocks (partly) between `from` and `to` to
// the given node type with the given attributes.
_transform.Transform.prototype.setBlockType = function (from) {
  var to = arguments.length <= 1 || arguments[1] === undefined ? from : arguments[1];

  var _this = this;

  var type = arguments[2];
  var attrs = arguments[3];

  if (!type.isTextblock) throw new RangeError("Type given to setBlockType should be a textblock");
  var mapFrom = this.steps.length;
  this.doc.nodesBetween(from, to, function (node, pos) {
    if (node.isTextblock && !node.hasMarkup(type, attrs)) {
      // Ensure all markup that isn't allowed in the new node type is cleared
      _this.clearMarkupFor(_this.map(pos, 1, mapFrom), type, attrs);
      var startM = _this.map(pos, 1, mapFrom),
          endM = _this.map(pos + node.nodeSize, 1, mapFrom);
      _this.step(new _replace_step.ReplaceAroundStep(startM, endM, startM + 1, endM - 1, new _model.Slice(_model.Fragment.from(type.create(attrs)), 0, 0), 1, true));
      return false;
    }
  });
  return this;
};

// :: (number, ?NodeType, ?Object) → Transform
// Change the type and attributes of the node after `pos`.
_transform.Transform.prototype.setNodeType = function (pos, type, attrs) {
  var node = this.doc.nodeAt(pos);
  if (!node) throw new RangeError("No node at given position");
  if (!type) type = node.type;
  if (node.type.isLeaf) return this.replaceWith(pos, pos + node.nodeSize, type.create(attrs, null, node.marks));

  if (!type.validContent(node.content, attrs)) throw new RangeError("Invalid content for node type " + type.name);

  return this.step(new _replace_step.ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + node.nodeSize - 1, new _model.Slice(_model.Fragment.from(type.create(attrs)), 0, 0), 1, true));
};

// :: (Node, number, ?NodeType, ?Object) → bool
// Check whether splitting at the given position is allowed.
function canSplit(doc, pos) {
  var depth = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];
  var typeAfter = arguments[3];
  var attrsAfter = arguments[4];

  var $pos = doc.resolve(pos),
      base = $pos.depth - depth;
  if (base < 0 || !$pos.parent.canReplace($pos.index(), $pos.parent.childCount) || !$pos.parent.canReplace(0, $pos.indexAfter())) return false;
  for (var d = $pos.depth - 1; d > base; d--) {
    var node = $pos.node(d),
        _index2 = $pos.index(d);
    if (!node.canReplace(0, _index2) || !node.canReplaceWith(_index2, node.childCount, typeAfter || $pos.node(d + 1).type, typeAfter ? attrsAfter : $pos.node(d + 1).attrs)) return false;
    typeAfter = null;
  }
  var index = $pos.indexAfter(base);
  return $pos.node(base).canReplaceWith(index, index, typeAfter || $pos.node(base + 1).type, typeAfter ? attrsAfter : $pos.node(base + 1).attrs);
}

// :: (number, ?number, ?NodeType, ?Object) → Transform
// Split the node at the given position, and optionally, if `depth` is
// greater than one, any number of nodes above that. By default, the part
// split off will inherit the node type of the original node. This can
// be changed by passing `typeAfter` and `attrsAfter`.
_transform.Transform.prototype.split = function (pos) {
  var depth = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
  var typeAfter = arguments[2];
  var attrsAfter = arguments[3];

  var $pos = this.doc.resolve(pos),
      before = _model.Fragment.empty,
      after = _model.Fragment.empty;
  for (var d = $pos.depth, e = $pos.depth - depth; d > e; d--) {
    before = _model.Fragment.from($pos.node(d).copy(before));
    after = _model.Fragment.from(typeAfter ? typeAfter.create(attrsAfter, after) : $pos.node(d).copy(after));
    typeAfter = null;
  }
  return this.step(new _replace_step.ReplaceStep(pos, pos, new _model.Slice(before.append(after), depth, depth, true)));
};

// :: (Node, number) → bool
// Test whether the blocks before and after a given position can be
// joined.
function joinable(doc, pos) {
  var $pos = doc.resolve(pos),
      index = $pos.index();
  return canJoin($pos.nodeBefore, $pos.nodeAfter) && $pos.parent.canReplace(index, index + 1);
}

function canJoin(a, b) {
  return a && b && !a.isText && a.canAppend(b);
}

// :: (Node, number, ?number) → ?number
// Find an ancestor of the given position that can be joined to the
// block before (or after if `dir` is positive). Returns the joinable
// point, if any.
function joinPoint(doc, pos) {
  var dir = arguments.length <= 2 || arguments[2] === undefined ? -1 : arguments[2];

  var $pos = doc.resolve(pos);
  for (var d = $pos.depth;; d--) {
    var before = void 0,
        after = void 0;
    if (d == $pos.depth) {
      before = $pos.nodeBefore;
      after = $pos.nodeAfter;
    } else if (dir > 0) {
      before = $pos.node(d + 1);
      after = $pos.node(d).maybeChild($pos.index(d) + 1);
    } else {
      before = $pos.node(d).maybeChild($pos.index(d) - 1);
      after = $pos.node(d + 1);
    }
    if (before && !before.isTextblock && canJoin(before, after)) return pos;
    if (d == 0) break;
    pos = dir < 0 ? $pos.before(d) : $pos.after(d);
  }
}

// :: (number, ?number, ?bool) → Transform
// Join the blocks around the given position. When `silent` is true,
// the method will return without raising an error if the position
// isn't a valid place to join.
_transform.Transform.prototype.join = function (pos) {
  var depth = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
  var silent = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

  if (silent && (pos < depth || pos + depth > this.doc.content.size)) return this;
  var step = new _replace_step.ReplaceStep(pos - depth, pos + depth, _model.Slice.empty, true);
  if (silent) this.maybeStep(step);else this.step(step);
  return this;
};
},{"../model":26,"./replace_step":38,"./transform":41}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Transform = exports.TransformError = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _error = require("../util/error");

var _map = require("./map");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TransformError = exports.TransformError = function (_ProseMirrorError) {
  _inherits(TransformError, _ProseMirrorError);

  function TransformError() {
    _classCallCheck(this, TransformError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(TransformError).apply(this, arguments));
  }

  return TransformError;
}(_error.ProseMirrorError);

// ;; A change to a document often consists of a series of
// [steps](#Step). This class provides a convenience abstraction to
// build up and track such an array of steps. A `Transform` object
// implements `Mappable`.
//
// The high-level transforming methods return the `Transform` object
// itself, so that they can be chained.


var Transform = function () {
  // :: (Node)
  // Create a transformation that starts with the given document.

  function Transform(doc) {
    _classCallCheck(this, Transform);

    this.doc = doc;
    this.docs = [];
    this.steps = [];
    this.maps = [];
  }

  // :: Node The document at the start of the transformation.


  _createClass(Transform, [{
    key: "step",


    // :: (Step) → Transform
    // Apply a new step in this transformation, saving the result.
    // Throws an error when the step fails.
    value: function step(_step) {
      var result = this.maybeStep(_step);
      if (result.failed) throw new TransformError(result.failed);
      return this;
    }

    // :: (Step) → StepResult
    // Apply a new step in this transformation, returning the step
    // result.

  }, {
    key: "maybeStep",
    value: function maybeStep(step) {
      var result = step.apply(this.doc);
      if (!result.failed) {
        this.docs.push(this.doc);
        this.steps.push(step);
        this.maps.push(step.posMap());
        this.doc = result.doc;
      }
      return result;
    }

    // :: (number, ?number) → MapResult
    // Map a position through the whole transformation (all the position
    // maps in [`maps`](#Transform.maps)), and return the result.

  }, {
    key: "mapResult",
    value: function mapResult(pos, bias, start) {
      return (0, _map.mapThroughResult)(this.maps, pos, bias, start);
    }

    // :: (number, ?number) → number
    // Map a position through the whole transformation, and return the
    // mapped position.

  }, {
    key: "map",
    value: function map(pos, bias, start) {
      return (0, _map.mapThrough)(this.maps, pos, bias, start);
    }
  }, {
    key: "before",
    get: function get() {
      return this.docs.length ? this.docs[0] : this.doc;
    }
  }]);

  return Transform;
}();

exports.Transform = Transform;
},{"../util/error":44,"./map":34}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ParamPrompt = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.openPrompt = openPrompt;

var _dom = require("../dom");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// !! The `ui/prompt` module implements functionality for prompting
// the user for [command parameters](#CommandSpec.params).
//
// The default implementation gets the job done, roughly, but you'll
// probably want to customize it in your own system (or submit patches
// to improve this implementation).

// ;; This class represents a dialog that prompts for [command
// parameters](#CommandSpec.params). It is the default value of the
// `commandParamPrompt` option. You can set this option to a subclass
// (or a complete reimplementation) to customize the way in which
// parameters are read.

var ParamPrompt = exports.ParamPrompt = function () {
  // :: (ProseMirror, Command)
  // Construct a prompt. Note that this does not
  // [open](#ParamPrompt.open) it yet.

  function ParamPrompt(pm, command) {
    var _this = this;

    _classCallCheck(this, ParamPrompt);

    // :: ProseMirror
    this.pm = pm;
    // :: Command
    this.command = command;
    this.doClose = null;
    // :: [DOMNode]
    // An array of fields, as created by `ParamTypeSpec.render`, for
    // the command's parameters.
    this.fields = command.params.map(function (param) {
      if (!(param.type in _this.paramTypes)) throw new RangeError("Unsupported parameter type: " + param.type);
      return _this.paramTypes[param.type].render.call(_this.pm, param, _this.defaultValue(param));
    });
    var promptTitle = (0, _dom.elt)("h5", {}, command.spec && command.spec.label ? pm.translate(command.spec.label) : "");
    var submitButton = (0, _dom.elt)("button", { type: "submit", class: "ProseMirror-prompt-submit" }, "Ok");
    var cancelButton = (0, _dom.elt)("button", { type: "button", class: "ProseMirror-prompt-cancel" }, "Cancel");
    cancelButton.addEventListener("click", function () {
      return _this.close();
    });
    // :: DOMNode
    // An HTML form wrapping the fields.
    this.form = (0, _dom.elt)("form", null, promptTitle, this.fields.map(function (f) {
      return (0, _dom.elt)("div", null, f);
    }), (0, _dom.elt)("div", { class: "ProseMirror-prompt-buttons" }, submitButton, " ", cancelButton));
  }

  // :: ()
  // Close the prompt.


  _createClass(ParamPrompt, [{
    key: "close",
    value: function close() {
      if (this.doClose) {
        this.doClose();
        this.doClose = null;
      }
    }

    // :: ()
    // Open the prompt's dialog.

  }, {
    key: "open",
    value: function open() {
      var _this2 = this;

      this.close();
      var prompt = this.prompt();
      var hadFocus = this.pm.hasFocus();
      this.doClose = function () {
        prompt.close();
        if (hadFocus) setTimeout(function () {
          return _this2.pm.focus();
        }, 50);
      };

      var submit = function submit() {
        var params = _this2.values();
        if (params) {
          _this2.close();
          _this2.command.exec(_this2.pm, params);
        }
      };

      this.form.addEventListener("submit", function (e) {
        e.preventDefault();
        submit();
      });

      this.form.addEventListener("keydown", function (e) {
        if (e.keyCode == 27) {
          e.preventDefault();
          prompt.close();
        } else if (e.keyCode == 13 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
          e.preventDefault();
          submit();
        }
      });

      var input = this.form.elements[0];
      if (input) input.focus();
    }

    // :: () → ?[any]
    // Read the values from the form's field. Validate them, and when
    // one isn't valid (either has a validate function that produced an
    // error message, or has no validate function, no value, and no
    // default value), show the problem to the user and return `null`.

  }, {
    key: "values",
    value: function values() {
      var result = [];
      for (var i = 0; i < this.command.params.length; i++) {
        var param = this.command.params[i],
            dom = this.fields[i];
        var type = this.paramTypes[param.type],
            value = void 0,
            bad = void 0;
        if (type.validate) bad = type.validate(dom);
        if (!bad) {
          value = type.read.call(this.pm, dom);
          if (param.validate) bad = param.validate(value);else if (!value && param.default == null) bad = "No default value available";
        }

        if (bad) {
          if (type.reportInvalid) type.reportInvalid.call(this.pm, dom, bad);else this.reportInvalid(dom, bad);
          return null;
        }
        result.push(value);
      }
      return result;
    }

    // :: (CommandParam) → ?any
    // Get a parameter's default value, if any.

  }, {
    key: "defaultValue",
    value: function defaultValue(param) {
      if (param.prefill) {
        var prefill = param.prefill.call(this.command.self, this.pm);
        if (prefill != null) return prefill;
      }
      return param.default;
    }

    // :: () → {close: ()}
    // Open a prompt with the parameter form in it. The default
    // implementation calls `openPrompt`.

  }, {
    key: "prompt",
    value: function prompt() {
      var _this3 = this;

      return openPrompt(this.pm, this.form, { onClose: function onClose() {
          return _this3.close();
        } });
    }

    // :: (DOMNode, string)
    // Report a field as invalid, showing the given message to the user.

  }, {
    key: "reportInvalid",
    value: function reportInvalid(dom, message) {
      // FIXME this is awful and needs a lot more work
      var parent = dom.parentNode;
      var style = "left: " + (dom.offsetLeft + dom.offsetWidth + 2) + "px; top: " + (dom.offsetTop - 5) + "px";
      var msg = parent.appendChild((0, _dom.elt)("div", { class: "ProseMirror-invalid", style: style }, message));
      setTimeout(function () {
        return parent.removeChild(msg);
      }, 1500);
    }
  }]);

  return ParamPrompt;
}();

// ;; #path=ParamTypeSpec #kind=interface
// By default, the prompting interface only knows how to prompt for
// parameters of type `text` and `select`. You can change the way
// those are prompted for, and define new types, by writing to
// `ParamPrompt.paramTypes`. All methods on these specs will be called
// with `this` bound to the relevant `ProseMirror` instance.

// :: (param: CommandParam, value: ?any) → DOMNode #path=ParamTypeSpec.render
// Create the DOM structure for a parameter field of this type, and
// pre-fill it with `value`, if given.

// :: (field: DOMNode) → any #path=ParamTypeSpec.read
// Read the value from the DOM field created by
// [`render`](#ParamTypeSpec.render).

// :: (field: DOMNode) → ?string #path=ParamTypeSpec.validate
// Optional. Validate the value in the given field, and return a
// string message if it is not a valid input for this type.

// :: (field: DOMNode, message: string) #path=ParamTypeSpec.reportInvalid
// Report the value in the given field as invalid, showing the given
// error message. This property is optional, and the prompt
// implementation will fall back to its own method of showing the
// message when it is not provided.

// :: Object<ParamTypeSpec>
// A collection of default renderers and readers for [parameter
// types](#CommandParam.type), which [parameter
// handlers](#commandParamHandler) can optionally use to prompt for
// parameters. `render` should create a form field for the parameter,
// and `read` should, given that field, return its value.


ParamPrompt.prototype.paramTypes = Object.create(null);

ParamPrompt.prototype.paramTypes.text = {
  render: function render(param, value) {
    return (0, _dom.elt)("input", { type: "text",
      placeholder: this.translate(param.label),
      value: value,
      autocomplete: "off" });
  },
  read: function read(dom) {
    return dom.value;
  }
};

ParamPrompt.prototype.paramTypes.select = {
  render: function render(param, value) {
    var _this4 = this;

    var options = param.options.call ? param.options(this) : param.options;
    return (0, _dom.elt)("select", null, options.map(function (o) {
      return (0, _dom.elt)("option", { value: o.value, selected: o.value == value ? "true" : null }, _this4.translate(o.label));
    }));
  },
  read: function read(dom) {
    return dom.value;
  }
};

// :: (ProseMirror, DOMNode, ?Object) → {close: ()}
// Open a dialog box for the given editor, putting `content` inside of
// it. The `close` method on the return value can be used to
// explicitly close the dialog again. The following options are
// supported:
//
// **`pos`**`: {left: number, top: number}`
//   : Provide an explicit position for the element. By default, it'll
//     be placed in the center of the editor.
//
// **`onClose`**`: fn()`
//   : A function to be called when the dialog is closed.
function openPrompt(pm, content, options) {
  var button = (0, _dom.elt)("button", { class: "ProseMirror-prompt-close" });
  var wrapper = (0, _dom.elt)("div", { class: "ProseMirror-prompt" }, content, button);
  var outerBox = pm.wrapper.getBoundingClientRect();

  pm.wrapper.appendChild(wrapper);
  if (options && options.pos) {
    wrapper.style.left = options.pos.left - outerBox.left + "px";
    wrapper.style.top = options.pos.top - outerBox.top + "px";
  } else {
    var blockBox = wrapper.getBoundingClientRect();
    var cX = Math.max(0, outerBox.left) + Math.min(window.innerWidth, outerBox.right) - blockBox.width;
    var cY = Math.max(0, outerBox.top) + Math.min(window.innerHeight, outerBox.bottom) - blockBox.height;
    wrapper.style.left = cX / 2 - outerBox.left + "px";
    wrapper.style.top = cY / 2 - outerBox.top + "px";
  }

  var close = function close() {
    pm.off("interaction", close);
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
      if (options && options.onClose) options.onClose();
    }
  };
  button.addEventListener("click", close);
  pm.on("interaction", close);
  return { close: close };
}

(0, _dom.insertCSS)("\n.ProseMirror-prompt {\n  background: white;\n  padding: 2px 6px 2px 15px;\n  border: 1px solid silver;\n  position: absolute;\n  border-radius: 3px;\n  z-index: 11;\n}\n\n.ProseMirror-prompt h5 {\n  margin: 0;\n  font-weight: normal;\n  font-size: 100%;\n  color: #444;\n}\n\n.ProseMirror-prompt input[type=\"text\"],\n.ProseMirror-prompt textarea {\n  background: #eee;\n  border: none;\n  outline: none;\n}\n\n.ProseMirror-prompt input[type=\"text\"] {\n  padding: 0 4px;\n}\n\n.ProseMirror-prompt-close {\n  position: absolute;\n  left: 2px; top: 1px;\n  color: #666;\n  border: none; background: transparent; padding: 0;\n}\n\n.ProseMirror-prompt-close:after {\n  content: \"✕\";\n  font-size: 12px;\n}\n\n.ProseMirror-invalid {\n  background: #ffc;\n  border: 1px solid #cc7;\n  border-radius: 4px;\n  padding: 5px 10px;\n  position: absolute;\n  min-width: 10em;\n}\n\n.ProseMirror-prompt-buttons {\n  margin-top: 5px;\n  display: none;\n}\n\n");
},{"../dom":1}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.compareDeep = compareDeep;
function compareDeep(a, b) {
  if (a === b) return true;
  if (!(a && (typeof a === "undefined" ? "undefined" : _typeof(a)) == "object") || !(b && (typeof b === "undefined" ? "undefined" : _typeof(b)) == "object")) return false;
  var array = Array.isArray(a);
  if (Array.isArray(b) != array) return false;
  if (array) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!compareDeep(a[i], b[i])) return false;
    }
  } else {
    for (var p in a) {
      if (!(p in b) || !compareDeep(a[p], b[p])) return false;
    }for (var _p in b) {
      if (!(_p in a)) return false;
    }
  }
  return true;
}
},{}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ProseMirrorError = ProseMirrorError;
// ;; Superclass for ProseMirror-related errors. Does some magic to
// make it safely subclassable even on ES5 runtimes.
function ProseMirrorError(message) {
  Error.call(this, message);
  if (this.message != message) {
    this.message = message;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.name);else this.stack = new Error(message).stack;
  }
}

ProseMirrorError.prototype = Object.create(Error.prototype);

ProseMirrorError.prototype.constructor = ProseMirrorError;

Object.defineProperty(ProseMirrorError.prototype, "name", {
  get: function get() {
    return this.constructor.name || functionName(this.constructor) || "ProseMirrorError";
  }
});

function functionName(f) {
  var match = /^function (\w+)/.exec(f.toString());
  return match && match[1];
}
},{}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eventMixin = eventMixin;
// ;; #path=EventMixin #kind=interface
// A set of methods for objects that emit events. Added by calling
// `eventMixin` on a constructor.

var noHandlers = [];

function getHandlers(obj, type) {
  return obj._handlers && obj._handlers[type] || noHandlers;
}

var methods = {
  // :: (type: string, handler: (...args: [any])) #path=EventMixin.on
  // Register an event handler for the given event type.

  on: function on(type, handler) {
    var map = this._handlers || (this._handlers = Object.create(null));
    map[type] = type in map ? map[type].concat(handler) : [handler];
  },


  // :: (type: string, handler: (...args: [any])) #path=EventMixin.off
  // Unregister an event handler for the given event type.
  off: function off(type, handler) {
    var map = this._handlers,
        arr = map && map[type];
    if (arr) for (var i = 0; i < arr.length; ++i) {
      if (arr[i] == handler) {
        map[type] = arr.slice(0, i).concat(arr.slice(i + 1));
        break;
      }
    }
  },


  // :: (type: string, ...args: [any]) #path=EventMixin.signal
  // Signal an event of the given type, passing any number of
  // arguments. Will call the handlers for the event, passing them the
  // arguments.
  signal: function signal(type) {
    var arr = getHandlers(this, type);

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    for (var i = 0; i < arr.length; ++i) {
      arr[i].apply(arr, args);
    }
  },


  // :: (type: string, ...args: [any]) → any
  // #path=EventMixin.signalHandleable Signal a handleable event of
  // the given type. All handlers for the event will be called with
  // the given arguments, until one of them returns something that is
  // not the value `null` or `undefined`. When that happens, the
  // return value of that handler is returned. If that does not
  // happen, `undefined` is returned.
  signalHandleable: function signalHandleable(type) {
    var arr = getHandlers(this, type);

    for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }

    for (var i = 0; i < arr.length; ++i) {
      var result = arr[i].apply(arr, args);
      if (result != null) return result;
    }
  },


  // :: (type: string, value: any) → any #path=EventMixin.signalPipelined
  // Give all handlers for an event a chance to transform a value. The
  // value returned from a handler will be passed to the next handler.
  // The method returns the value returned by the final handler (or
  // the original value, if there are no handlers).
  signalPipelined: function signalPipelined(type, value) {
    var arr = getHandlers(this, type);
    for (var i = 0; i < arr.length; ++i) {
      value = arr[i](value);
    }return value;
  },


  // :: (DOMEvent, ?string) → bool
  // Fire all handlers for `event.type` (or override the type name
  // with the `type` parameter), until one of them calls
  // `preventDefault` on the event or returns `true` to indicate it
  // handled the event. Return `true` when one of the handlers handled
  // the event.
  signalDOM: function signalDOM(event, type) {
    var arr = getHandlers(this, type || event.type);
    for (var i = 0; i < arr.length; ++i) {
      if (arr[i](event) || event.defaultPrevented) return true;
    }return false;
  },


  // :: (type: string) → bool #path=EventMixin.hasHandler
  // Query whether there are any handlers for this event type.
  hasHandler: function hasHandler(type) {
    return getHandlers(this, type).length > 0;
  }
};

// :: (())
// Add the methods in the `EventMixin` interface to the prototype
// object of the given constructor.
function eventMixin(ctor) {
  var proto = ctor.prototype;
  for (var prop in methods) {
    if (methods.hasOwnProperty(prop)) proto[prop] = methods[prop];
  }
}
},{}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Map = exports.Map = window.Map || function () {
  function _class() {
    _classCallCheck(this, _class);

    this.content = [];
  }

  _createClass(_class, [{
    key: "set",
    value: function set(key, value) {
      var found = this.find(key);
      if (found > -1) this.content[found + 1] = value;else this.content.push(key, value);
    }
  }, {
    key: "get",
    value: function get(key) {
      var found = this.find(key);
      return found == -1 ? undefined : this.content[found + 1];
    }
  }, {
    key: "has",
    value: function has(key) {
      return this.find(key) > -1;
    }
  }, {
    key: "find",
    value: function find(key) {
      for (var i = 0; i < this.content.length; i += 2) {
        if (this.content[i] === key) return i;
      }
    }
  }, {
    key: "clear",
    value: function clear() {
      this.content.length = 0;
    }
  }, {
    key: "size",
    get: function get() {
      return this.content.length / 2;
    }
  }]);

  return _class;
}();
},{}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyObj = copyObj;
function copyObj(obj, base) {
  var copy = base || Object.create(null);
  for (var prop in obj) {
    copy[prop] = obj[prop];
  }return copy;
}
},{}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; Persistent data structure representing an ordered mapping from
// strings to values, with some convenient update methods.

var OrderedMap = exports.OrderedMap = function () {
  function OrderedMap(content) {
    _classCallCheck(this, OrderedMap);

    this.content = content;
  }

  _createClass(OrderedMap, [{
    key: "find",
    value: function find(key) {
      for (var i = 0; i < this.content.length; i += 2) {
        if (this.content[i] == key) return i;
      }return -1;
    }

    // :: (string) → ?any
    // Retrieve the value stored under `key`, or return undefined when
    // no such key exists.

  }, {
    key: "get",
    value: function get(key) {
      var found = this.find(key);
      return found == -1 ? undefined : this.content[found + 1];
    }

    // :: (string, any, ?string) → OrderedMap
    // Create a new map by replacing the value of `key` with a new
    // value, or adding a binding to the end of the map. If `newKey` is
    // given, the key of the binding will be replaced with that key.

  }, {
    key: "update",
    value: function update(key, value, newKey) {
      var self = newKey && newKey != key ? this.remove(newKey) : this;
      var found = self.find(key),
          content = self.content.slice();
      if (found == -1) {
        content.push(newKey || key, value);
      } else {
        content[found + 1] = value;
        if (newKey) content[found] = newKey;
      }
      return new OrderedMap(content);
    }

    // :: (string) → OrderedMap
    // Return a map with the given key removed, if it existed.

  }, {
    key: "remove",
    value: function remove(key) {
      var found = this.find(key);
      if (found == -1) return this;
      var content = this.content.slice();
      content.splice(found, 2);
      return new OrderedMap(content);
    }

    // :: (string, any) → OrderedMap
    // Add a new key to the start of the map.

  }, {
    key: "addToStart",
    value: function addToStart(key, value) {
      return new OrderedMap([key, value].concat(this.remove(key).content));
    }

    // :: (string, any) → OrderedMap
    // Add a new key to the end of the map.

  }, {
    key: "addToEnd",
    value: function addToEnd(key, value) {
      var content = this.remove(key).content.slice();
      content.push(key, value);
      return new OrderedMap(content);
    }

    // :: ((key: string, value: any))
    // Call the given function for each key/value pair in the map, in
    // order.

  }, {
    key: "forEach",
    value: function forEach(f) {
      for (var i = 0; i < this.content.length; i += 2) {
        f(this.content[i], this.content[i + 1]);
      }
    }

    // :: (union<Object, OrderedMap>) → OrderedMap
    // Create a new map by prepending the keys in this map that don't
    // appear in `map` before the keys in `map`.

  }, {
    key: "prepend",
    value: function prepend(map) {
      if (!map.size) return this;
      map = OrderedMap.from(map);
      return new OrderedMap(map.content.concat(this.subtract(map).content));
    }

    // :: (union<Object, OrderedMap>) → OrderedMap
    // Create a new map by appending the keys in this map that don't
    // appear in `map` after the keys in `map`.

  }, {
    key: "append",
    value: function append(map) {
      if (!map.size) return this;
      map = OrderedMap.from(map);
      return new OrderedMap(this.subtract(map).content.concat(map.content));
    }

    // :: (union<Object, OrderedMap>) → OrderedMap
    // Create a map containing all the keys in this map that don't
    // appear in `map`.

  }, {
    key: "subtract",
    value: function subtract(map) {
      var result = this;
      OrderedMap.from(map).forEach(function (key) {
        return result = result.remove(key);
      });
      return result;
    }

    // :: number
    // The amount of keys in this map.

  }, {
    key: "size",
    get: function get() {
      return this.content.length >> 1;
    }

    // :: (?union<Object, OrderedMap>) → OrderedMap
    // Return a map with the given content. If null, create an empty
    // map. If given an ordered map, return that map itself. If given an
    // object, create a map from the object's properties.

  }], [{
    key: "from",
    value: function from(value) {
      if (value instanceof OrderedMap) return value;
      var content = [];
      if (value) for (var prop in value) {
        content.push(prop, value[prop]);
      }return new OrderedMap(content);
    }
  }]);

  return OrderedMap;
}();
},{}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sortedInsert;
function sortedInsert(array, elt, compare) {
  var i = 0;
  for (; i < array.length; i++) {
    if (compare(array[i], elt) > 0) break;
  }array.splice(i, 0, elt);
}
},{}],50:[function(require,module,exports){
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    module.exports = mod()
  else if (typeof define == "function" && define.amd) // AMD
    return define([], mod)
  else // Plain browser env
    (this || window).browserKeymap = mod()
})(function() {
  "use strict"

  var mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform)
          : typeof os != "undefined" ? os.platform() == "darwin" : false

  // :: Object<string>
  // A map from key codes to key names.
  var keyNames = {
    3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
    19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
    36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
    46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
    106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 127: "Delete",
    173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
    221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
    63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
  }

  // Number keys
  for (var i = 0; i < 10; i++) keyNames[i + 48] = keyNames[i + 96] = String(i)
  // Alphabetic keys
  for (var i = 65; i <= 90; i++) keyNames[i] = String.fromCharCode(i)
  // Function keys
  for (var i = 1; i <= 12; i++) keyNames[i + 111] = keyNames[i + 63235] = "F" + i

  // :: (KeyboardEvent) → ?string
  // Find a name for the given keydown event. If the keycode in the
  // event is not known, this will return `null`. Otherwise, it will
  // return a string like `"Shift-Cmd-Ctrl-Alt-Home"`. The parts before
  // the dashes give the modifiers (always in that order, if present),
  // and the last word gives the key name, which one of the names in
  // `keyNames`.
  //
  // The convention for keypress events is to use the pressed character
  // between single quotes. Due to limitations in the browser API,
  // keypress events can not have modifiers.
  function keyName(event) {
    if (event.type == "keypress") return "'" + String.fromCharCode(event.charCode) + "'"

    var base = keyNames[event.keyCode], name = base
    if (name == null || event.altGraphKey) return null

    if (event.altKey && base != "Alt") name = "Alt-" + name
    if (event.ctrlKey && base != "Ctrl") name = "Ctrl-" + name
    if (event.metaKey && base != "Cmd") name = "Cmd-" + name
    if (event.shiftKey && base != "Shift") name = "Shift-" + name
    return name
  }

  // :: (string) → bool
  // Test whether the given key name refers to a modifier key.
  function isModifierKey(name) {
    name = /[^-]*$/.exec(name)[0]
    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod"
  }

  // :: (string) → string
  // Normalize a sloppy key name, which may have modifiers in the wrong
  // order or use shorthands for modifiers, to a properly formed key
  // name. Used to normalize names provided in keymaps.
  //
  // Note that the modifier `mod` is a shorthand for `Cmd` on Mac, and
  // `Ctrl` on other platforms.
  function normalizeKeyName(name) {
    var parts = name.split(/-(?!'?$)/), result = parts[parts.length - 1]
    var alt, ctrl, shift, cmd
    for (var i = 0; i < parts.length - 1; i++) {
      var mod = parts[i]
      if (/^(cmd|meta|m)$/i.test(mod)) cmd = true
      else if (/^a(lt)?$/i.test(mod)) alt = true
      else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true
      else if (/^s(hift)$/i.test(mod)) shift = true
      else if (/^mod$/i.test(mod)) { if (mac) cmd = true; else ctrl = true }
      else throw new Error("Unrecognized modifier name: " + mod)
    }
    if (alt) result = "Alt-" + result
    if (ctrl) result = "Ctrl-" + result
    if (cmd) result = "Cmd-" + result
    if (shift) result = "Shift-" + result
    return result
  }

  // :: (Object, ?Object)
  // A keymap binds a set of [key names](#keyName) to commands names
  // or functions.
  //
  // Construct a keymap using the bindings in `keys`, whose properties
  // should be [key names](#keyName) or space-separated sequences of
  // key names. In the second case, the binding will be for a
  // multi-stroke key combination.
  //
  // When `options` has a property `call`, this will be a programmatic
  // keymap, meaning that instead of looking keys up in its set of
  // bindings, it will pass the key name to `options.call`, and use
  // the return value of that calls as the resolved binding.
  //
  // `options.name` can be used to give the keymap a name, making it
  // easier to [remove](#ProseMirror.removeKeymap) from an editor.
  function Keymap(keys, options) {
    this.options = options || {}
    this.bindings = Object.create(null)
    if (keys) for (var keyname in keys) if (Object.prototype.hasOwnProperty.call(keys, keyname))
      this.addBinding(keyname, keys[keyname])
  }

  Keymap.prototype = {
    normalize: function(name) {
      return this.options.multi !== false ? name.split(/ +(?!\'$)/).map(normalizeKeyName) : [normalizeKeyName(name)]
    },

    // :: (string, any)
    // Add a binding for the given key or key sequence.
    addBinding: function(keyname, value) {
      var keys = this.normalize(keyname)
      for (var i = 0; i < keys.length; i++) {
        var name = keys.slice(0, i + 1).join(" ")
        var val = i == keys.length - 1 ? value : "..."
        var prev = this.bindings[name]
        if (!prev) this.bindings[name] = val
        else if (prev != val) throw new Error("Inconsistent bindings for " + name)
      }
    },

    // :: (string)
    // Remove the binding for the given key or key sequence.
    removeBinding: function(keyname) {
      var keys = this.normalize(keyname)
      for (var i = keys.length - 1; i >= 0; i--) {
        var name = keys.slice(0, i).join(" ")
        var val = this.bindings[name]
        if (val == "..." && !this.unusedMulti(name))
          break
        else if (val)
          delete this.bindings[name]
      }
    },

    unusedMulti: function(name) {
      for (var binding in this.bindings)
        if (binding.length > name && binding.indexOf(name) == 0 && binding.charAt(name.length) == " ")
          return false
      return true
    },

    // :: (string, ?any) → any
    // Looks up the given key or key sequence in this keymap. Returns
    // the value the key is bound to (which may be undefined if it is
    // not bound), or the string `"..."` if the key is a prefix of a
    // multi-key sequence that is bound by this keymap.
    lookup: function(key, context) {
      return this.options.call ? this.options.call(key, context) : this.bindings[key]
    },

    constructor: Keymap
  }

  Keymap.keyName = keyName
  Keymap.isModifierKey = isModifierKey
  Keymap.normalizeKeyName = normalizeKeyName

  return Keymap
})

},{}],51:[function(require,module,exports){
"use strict";

var _edit = require("prosemirror/dist/edit");

var pm = new _edit.ProseMirror({ place: someElement });

},{"prosemirror/dist/edit":11}]},{},[51]);
