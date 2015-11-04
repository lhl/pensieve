import insertCSS from "insert-css"

insertCSS(`

.ProseMirror-icon-lift:after {
  font-family: ProseMirror-icons;
  content: "\ue60c";
}
.ProseMirror-icon-join:after {
  font-family: ProseMirror-icons;
  content: "\uea46";
}
.ProseMirror-icon-insertImage:after {
  font-family: ProseMirror-icons;
  content: "\ue606";
}
.ProseMirror-icon-strong:after {
  font-family: ProseMirror-icons;
  content: "\ue607";
}
.ProseMirror-icon-em:after {
  font-family: ProseMirror-icons;
  content: "\ue60a";
}
.ProseMirror-icon-link:after {
  font-family: ProseMirror-icons;
  content: "\ue608";
}
.ProseMirror-icon-code:after {
  font-family: ProseMirror-icons;
  font-size: 110%;
  content: "\ue601";
}
.ProseMirror-icon-wrapOrderedList:after {
  font-family: ProseMirror-icons;
  font-size: 110%;
  content: "\ue604";
}
.ProseMirror-icon-wrapBulletList:after {
  font-family: ProseMirror-icons;
  font-size: 110%;
  content: "\ue603";
}
.ProseMirror-icon-wrapBlockQuote:after {
  font-family: ProseMirror-icons;
  font-size: 110%;
  content: "\ue602";
}
.ProseMirror-icon-insertHorizontalRule:after {
  font-family: ProseMirror-icons;
  content: "\ue600";
}
.ProseMirror-icon-undo:after {
  font-family: ProseMirror-icons;
  content: "\ue967";
}
.ProseMirror-icon-redo:after {
  font-family: ProseMirror-icons;
  content: "\ue968";
}

@font-face {
  font-family: ProseMirror-icons;
  src: url(data:application/x-font-woff;base64,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) format('woff');
  font-weight: normal;
  font-style: normal;
}

`)
