import { html } from "parse5";
import type { ParcelConfig } from "single-spa";
import type { nodeNames } from "../utils/index.js";
import {
  SslApplication,
  SslCommentNode,
  SslElement,
  SslRoute,
  SslTextNode,
} from "./treeAdapterMap.js";

export type ActiveWhen = (location: Location | URL) => boolean;

// TODO: override more props
export interface ResolvedApplication extends SslApplication {
  _kind: typeof nodeNames.APPLICATION;
  attrs: [];
  // This should be empty
  childNodes: [];
  error?: string | ParcelConfig;
  loader?: string | ParcelConfig;
  name: string;
  namespaceURI: typeof html.NS.HTML;
  parentNode: null;
  props?: Record<string, unknown>;
}

export interface ResolvedComment extends SslCommentNode {
  _connectedNode: Nullable<Node>;
  _kind: typeof nodeNames.COMMENT;
}

export interface ResolvedElement extends SslElement {
  _connectedNode: Nullable<Node>;
  _kind: typeof nodeNames.ELEMENT;
  childNodes: ResolvedChild[];
  namespaceURI: typeof html.NS.HTML;
  parentNode: null;
}

export interface ResolvedNode extends SslElement {
  _connectedNode: Nullable<Node>;
  _kind: typeof nodeNames.NODE;
  // TODO: should be empty or not?
  attrs: [];
  childNodes: ResolvedChild[];
  namespaceURI: typeof html.NS.HTML;
  node: Node;
  nodeName: typeof nodeNames.NODE;
  parentNode: null;
}

export interface ResolvedRoute extends SslRoute {
  _connectedNode?: never;
  _kind: typeof nodeNames.ROUTE;
  activeWhen: ActiveWhen;
  attrs: [];
  childNodes: ResolvedChild[];
  default?: boolean;
  exact?: boolean;
  namespaceURI: typeof html.NS.HTML;
  parentNode: null;
  path?: string;
  props: Record<string, unknown>;
}

export interface ResolvedText extends SslTextNode {
  _connectedNode: Nullable<Node>;
  _kind: typeof nodeNames.TEXT;
  parentNode: null;
}

export type ResolvedChild =
  | ResolvedApplication
  | ResolvedComment
  | ResolvedElement
  | ResolvedNode
  | ResolvedRoute
  | ResolvedText;

export type ResolvedParent = ResolvedElement | ResolvedNode | ResolvedRoute;

export type ResolvedDomChild =
  | ResolvedComment
  | ResolvedElement
  | ResolvedNode
  | ResolvedText;

// TODO: sometimes it's HTMLElement, sometimes it's CustomElement, how do I handle it elegantly?
export type ContainerEl = string | HTMLElement | SslElement;

type Redirects = Record<string, string>;

export type RouteMode = "history" | "hash";

export interface ResolvedRoutesConfig {
  base: string;
  childNodes: ResolvedChild[];
  containerEl: ContainerEl;
  mode?: RouteMode;
  redirects?: Redirects;
}
