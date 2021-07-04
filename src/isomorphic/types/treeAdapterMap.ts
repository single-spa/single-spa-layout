import { DefaultTreeAdapterMap, TreeAdapterTypeMap } from "parse5";
import { nodeNames } from "../utils/index.js";

export type SslChildNode = DefaultTreeAdapterMap["childNode"];

export type SslCommentNode = DefaultTreeAdapterMap["commentNode"];

export type SslDocument = DefaultTreeAdapterMap["document"];

export type SslDocumentFragment = DefaultTreeAdapterMap["documentFragment"];

export type SslDocumentType = DefaultTreeAdapterMap["documentType"];

export type SslElement = DefaultTreeAdapterMap["element"];

export type SslNode = DefaultTreeAdapterMap["node"];

export type SslParentNode = DefaultTreeAdapterMap["parentNode"];

export type SslTemplate = DefaultTreeAdapterMap["template"];

export type SslTextNode = DefaultTreeAdapterMap["textNode"];

export type SslTreeAdapterMap = TreeAdapterTypeMap<
  SslNode,
  SslParentNode,
  SslChildNode,
  SslDocument,
  SslDocumentFragment,
  SslElement,
  SslCommentNode,
  SslTextNode,
  SslTemplate,
  SslDocumentType
>;

export interface SslApplication extends SslElement {
  nodeName: typeof nodeNames.APPLICATION;
  tagName: typeof nodeNames.APPLICATION;
}

export interface SslAssets extends SslElement {
  nodeName: typeof nodeNames.ASSETS;
  tagName: typeof nodeNames.ASSETS;
}

export interface SslFragment extends SslElement {
  nodeName: typeof nodeNames.FRAGMENT;
  tagName: typeof nodeNames.FRAGMENT;
}

export interface SslRedirect extends SslElement {
  nodeName: typeof nodeNames.REDIRECT;
  tagName: typeof nodeNames.REDIRECT;
}

export interface SslRoute extends SslElement {
  nodeName: typeof nodeNames.ROUTE;
  tagName: typeof nodeNames.ROUTE;
}

export interface SslRouterContent extends SslElement {
  nodeName: typeof nodeNames.ROUTER_CONTENT;
  tagName: typeof nodeNames.ROUTER_CONTENT;
}
