import { html } from 'parse5';
import { SslElement, sslResolvedNode } from '../../isomorphic/index.js';
import { renderAttributes } from './renderAttributes.js';
import { renderChildNodes } from './renderChildNodes.js';
import { RenderArgs } from './types.js';

const NS = html.NS;
const TAGS = html.TAG_NAMES;

const SELF_CLOSING_TAGS = [
  TAGS.AREA,
  TAGS.BASE,
  TAGS.BASEFONT,
  TAGS.BGSOUND,
  TAGS.BR,
  TAGS.COL,
  TAGS.EMBED,
  TAGS.FRAME,
  TAGS.HR,
  TAGS.IMG,
  TAGS.INPUT,
  TAGS.KEYGEN,
  TAGS.LINK,
  TAGS.META,
  TAGS.PARAM,
  TAGS.SOURCE,
  TAGS.TRACK,
  TAGS.WBR,
];

export const renderElement = (node: SslElement, args: RenderArgs) => {
  const { bodyStream } = args;
  const tn = node.tagName;
  bodyStream.add(`<${tn}`);
  renderAttributes(node, args);
  bodyStream.add(`>`);

  if (!SELF_CLOSING_TAGS.includes(tn as html.TAG_NAMES)) {
    const parentNode =
      sslResolvedNode.isTemplate(node) && node.namespaceURI === NS.HTML
        ? node.content
        : node;
    renderChildNodes(parentNode, args);
    bodyStream.add(`</${tn}>`);
  }
};
