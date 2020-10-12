import Parser from "parse5/lib/parser/index.js";
import HTML from "parse5/lib/common/html.js";

export default class CustomParser extends Parser {
  _processToken(token) {
    if (
      this.insertionMode === "IN_HEAD_MODE" &&
      token.type === "START_TAG_TOKEN" &&
      (token.tagName === "fragment" || token.tagName === "assets")
    ) {
      // parse5 doesn't allow for unknown elements inside of <head> - it pushes them to <body>
      // This overrides that behavior to allow for fragments in <head>
      this._appendElement(token, HTML.NAMESPACES.HTML);
      token.ackSelfClosing = true;
    } else {
      return super._processToken(token);
    }
  }
}
