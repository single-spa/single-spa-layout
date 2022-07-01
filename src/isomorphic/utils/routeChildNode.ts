import {
  SslChildNode,
  SslApplication,
  SslCommentNode,
  SslElement,
  SslRedirect,
  SslRoute,
  SslTextNode,
} from '../types/index.js';
import { nodeNames } from './nodeNames.js';

export type RouteChildNode = ChildNode | SslChildNode;

const hasNodeName = (element: RouteChildNode, name: string) =>
  element.nodeName.toLowerCase() === name;

export const routeChildNode = {
  isApplication: (node: RouteChildNode): node is SslApplication | HTMLElement =>
    hasNodeName(node, nodeNames.APPLICATION),
  isComment: (node: RouteChildNode): node is Comment | SslCommentNode =>
    hasNodeName(node, nodeNames.COMMENT),
  isElement: (node: RouteChildNode): node is HTMLElement | SslElement =>
    'childNodes' in node,
  isHtmlChildNode: (node: RouteChildNode): node is ChildNode =>
    typeof Node !== 'undefined' && node instanceof Node,
  isRedirect: (node: RouteChildNode): node is HTMLElement | SslRedirect =>
    hasNodeName(node, nodeNames.REDIRECT),
  isRoute: (node: RouteChildNode): node is HTMLElement | SslRoute =>
    hasNodeName(node, nodeNames.ROUTE),
  isText: (node: RouteChildNode): node is Text | SslTextNode =>
    hasNodeName(node, nodeNames.TEXT),
};
