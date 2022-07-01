import { html } from 'parse5';
import { sslResolvedNode, SslTextNode } from '../../isomorphic/index.js';
import { escapeString } from './escapeString.js';
import { RenderArgs } from './types.js';

const TAGS = html.TAG_NAMES;

export const renderText = (
  { parentNode, value }: SslTextNode,
  { bodyStream }: RenderArgs,
) => {
  const parentTagName =
    parentNode && sslResolvedNode.isElement(parentNode)
      ? parentNode.tagName
      : null;

  switch (parentTagName) {
    case TAGS.IFRAME:
    case TAGS.NOEMBED:
    case TAGS.NOFRAMES:
    case TAGS.NOSCRIPT:
    case TAGS.PLAINTEXT:
    case TAGS.STYLE:
    case TAGS.SCRIPT:
    case TAGS.XMP:
      bodyStream.add(value);
      break;

    default:
      bodyStream.add(escapeString(value, false));
      break;
  }
};
