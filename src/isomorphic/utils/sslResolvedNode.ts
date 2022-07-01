import { html } from 'parse5';
import {
  ResolvedApplication,
  ResolvedChild,
  ResolvedComment,
  ResolvedDomChild,
  ResolvedElement,
  ResolvedNode,
  ResolvedParent,
  ResolvedRoute,
  ResolvedText,
  SslApplication,
  SslAssets,
  SslChildNode,
  SslCommentNode,
  SslData,
  SslDocumentType,
  SslElement,
  SslFragment,
  SslNode,
  SslParentNode,
  SslRoute,
  SslRouterContent,
  SslTemplate,
  SslTextNode,
} from '../types/index.js';
import { nodeNames } from './nodeNames.js';

export type SslResolvedNode = SslNode | ResolvedChild;

function getChildNodes(node: ResolvedChild): ResolvedChild[];
function getChildNodes(node: SslNode): SslChildNode[];
function getChildNodes(node: SslResolvedNode) {
  return 'childNodes' in node && Array.isArray(node.childNodes)
    ? node.childNodes
    : [];
}

function isApplication(node: ResolvedChild): node is ResolvedApplication;
function isApplication(node: SslNode): node is SslApplication;
function isApplication(node: SslResolvedNode) {
  return node.nodeName === nodeNames.APPLICATION;
}

function isAssets(node: SslNode): node is SslAssets {
  return node.nodeName === nodeNames.ASSETS;
}

function isComment(node: ResolvedChild): node is ResolvedComment;
function isComment(node: SslNode): node is SslCommentNode;
function isComment(node: SslResolvedNode) {
  return node.nodeName === nodeNames.COMMENT;
}

function isData(node: SslNode): node is SslData {
  return node.nodeName === nodeNames.DATA;
}

function isDocType(node: SslNode): node is SslDocumentType {
  return node.nodeName === nodeNames.DOCUMENT_TYPE;
}

// TODO: should nodeNames.ROUTER_CONTENT be included?
const SSL_NODE_NAMES: string[] = [
  nodeNames.APPLICATION,
  nodeNames.ASSETS,
  nodeNames.FRAGMENT,
  nodeNames.REDIRECT,
  nodeNames.ROUTE,
];

function isDom(node: ResolvedChild): node is ResolvedDomChild {
  return !SSL_NODE_NAMES.includes(node.nodeName);
}

function isElement(node: ResolvedChild): node is ResolvedElement;
function isElement(node: SslNode): node is SslElement;
function isElement(node: SslResolvedNode) {
  return (
    ('_kind' in node && node._kind === nodeNames.ELEMENT) || 'tagName' in node
  );
}

function isFragment(node: SslNode): node is SslFragment {
  return node.nodeName === nodeNames.FRAGMENT;
}

function isNode(node: SslResolvedNode): node is ResolvedNode {
  return (
    node.nodeName === nodeNames.NODE &&
    'node' in node &&
    typeof Node !== 'undefined' &&
    node.node instanceof Node
  );
}

function isParent(node: ResolvedChild): node is ResolvedParent;
function isParent(node: SslNode): node is SslParentNode;
function isParent(node: SslResolvedNode) {
  return 'childNodes' in node && Array.isArray(node.childNodes);
}

function isResolvedApplication(
  node: SslResolvedNode,
): node is ResolvedApplication {
  return '_kind' in node && node._kind === nodeNames.APPLICATION;
}

function isResolvedRoute(node: SslResolvedNode): node is ResolvedRoute {
  return '_kind' in node && node._kind === nodeNames.ROUTE;
}

function isRoute(node: ResolvedChild): node is ResolvedRoute;
function isRoute(node: SslNode): node is SslRoute;
function isRoute(node: SslResolvedNode) {
  return node.nodeName === nodeNames.ROUTE;
}

function isRouter(node: SslNode): node is SslRouterContent {
  return node.nodeName === nodeNames.ROUTER_CONTENT;
}

function isTemplate(node: SslNode): node is SslTemplate {
  return node.nodeName === html.TAG_NAMES.TEMPLATE;
}

function isText(node: ResolvedChild): node is ResolvedText;
function isText(node: SslNode): node is SslTextNode;
function isText(node: SslResolvedNode) {
  return node.nodeName === nodeNames.TEXT;
}

export const sslResolvedNode = {
  getChildNodes,
  isApplication,
  isAssets,
  isComment,
  isData,
  isDocType,
  isDom,
  isElement,
  isFragment,
  isNode,
  isParent,
  isResolvedApplication,
  isResolvedRoute,
  isRoute,
  isRouter,
  isTemplate,
  isText,
};
