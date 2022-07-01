import { html, Parser, Token } from 'parse5';
import { nodeNames, SslTreeAdapterMap } from '../../isomorphic/index.js';

export class SslParser extends Parser<SslTreeAdapterMap> {
  override _startTagOutsideForeignContent(token: Token.TagToken): void {
    /**
     * This will allow <assets></assets> and <fragment></fragment> to be put in the <head></head> content,
     * which is not allowed by default.
     */
    if (
      this.insertionMode === /* InsertionMode.IN_HEAD */ 3 &&
      (token.tagName === nodeNames.ASSETS ||
        token.tagName === nodeNames.FRAGMENT)
    ) {
      this._appendElement(token, html.NS.HTML);
      token.ackSelfClosing = true;
    } else {
      super._startTagOutsideForeignContent(token);
    }
  }
}
