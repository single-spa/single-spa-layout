import { html } from 'parse5';
import { SslElement } from '../../isomorphic/index.js';
import { escapeString } from './escapeString.js';
import { RenderArgs } from './types.js';

const NS = html.NS;

export const renderAttributes = (
  { attrs }: SslElement,
  { bodyStream }: RenderArgs,
) =>
  attrs?.forEach(({ name, namespace, prefix, value }) => {
    const attrValue = escapeString(value, true);
    let attrName = name;
    switch (namespace) {
      case NS.XML:
        attrName = `xml:${name}`;
        break;
      case NS.XMLNS:
        attrName = name === 'xmlns' ? name : `xmlns:${name}`;
        break;
      case NS.XLINK:
        attrName = `xlink:${name}`;
        break;
      case undefined:
        break;
      default:
        attrName = `${prefix}:${name}`;
        break;
    }
    bodyStream.add(` ${attrName}="${attrValue}"`);
  });
