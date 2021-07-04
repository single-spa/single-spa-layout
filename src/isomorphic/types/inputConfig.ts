import { Token } from "parse5";
import { ParcelConfig } from "single-spa";
import { nodeNames } from "../utils/index.js";
import { ResolvedRoutesConfig } from "./resolvedConfig.js";

export interface InputApplication {
  error?: string | ParcelConfig;
  loader?: string | ParcelConfig;
  name: string;
  nodeName: typeof nodeNames.APPLICATION;
  props?: Record<string, unknown>;
}

export interface InputComment {
  nodeName: typeof nodeNames.COMMENT;
  data: string;
}

export interface InputElement {
  attrs?: Token.Attribute[];
  childNodes?: InputRouteChild[];
  nodeName: string;
}

export interface InputNode {
  node: Node;
  nodeName: typeof nodeNames.NODE;
  childNodes?: InputRouteChild[];
}

export interface InputRoute {
  childNodes: InputRouteChild[];
  default?: boolean;
  exact?: boolean;
  nodeName: typeof nodeNames.ROUTE;
  path?: string;
  props: Record<string, unknown>;
}

export interface InputText {
  nodeName: typeof nodeNames.TEXT;
  value: string;
}

export type InputRouteChild =
  | InputApplication
  | InputComment
  | InputElement
  | InputNode
  | InputRoute
  | InputText;

export interface InputRoutesConfig
  extends Partial<Omit<ResolvedRoutesConfig, "childNodes">> {
  childNodes: InputRouteChild[];
  disableWarnings?: boolean;
}
