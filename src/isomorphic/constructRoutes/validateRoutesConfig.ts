import { html } from "parse5";
import { pathToActiveWhen } from "single-spa";
import {
  assertArrayLike,
  assertBoolean,
  assertContainerEl,
  assertEnum,
  assertFullPath,
  assertObject,
  assertString,
  inBrowser,
  validateKeys,
} from "../../utils/index.js";
import type {
  ActiveWhen,
  InputApplication,
  InputComment,
  InputElement,
  InputRoute,
  InputRouteChild,
  InputRoutesConfig,
  InputText,
  ResolvedApplication,
  ResolvedChild,
  ResolvedComment,
  ResolvedElement,
  ResolvedNode,
  ResolvedRoute,
  ResolvedRoutesConfig,
  ResolvedText,
} from "../types/index.js";
import { nodeNames, resolvePath } from "../utils/index.js";

const defaultRoute =
  (
    siblingActiveWhens: ActiveWhen[],
    parentActiveWhen: ActiveWhen
  ): ActiveWhen =>
  (location: Location | URL) =>
    parentActiveWhen(location) &&
    !siblingActiveWhens.some((activeWhen) => activeWhen(location));

const sanitizeBase = (base: string) => {
  let result = base;
  if (result[0] !== "/") result = "/" + result;
  if (result[result.length - 1] !== "/") result = result + "/";
  return result;
};

function assertChildNodes(
  name: string,
  childNodes: InputRouteChild[] | undefined,
  disableWarnings: boolean,
  {
    parentActiveWhen,
    parentPath,
    siblingActiveWhens,
  }: {
    parentActiveWhen: ActiveWhen;
    parentPath: string;
    siblingActiveWhens: ActiveWhen[];
  }
): asserts childNodes is ResolvedChild[] {
  assertArrayLike(name, childNodes);
  for (let i = 0; i < childNodes.length; ++i) {
    assertChildNode(`${name}[${i}]`, childNodes[i]!, disableWarnings, {
      parentActiveWhen,
      parentPath,
      siblingActiveWhens,
    });
  }
}

function assertApplication(
  name: string,
  node: InputElement | InputApplication,
  disableWarnings: boolean
): asserts node is ResolvedApplication {
  validateKeys(
    name,
    node,
    ["_kind", "error", "loader", "name", "nodeName", "props"],
    disableWarnings
  );
  if (node.props) assertObject(`${name}.props`, node.props);
  assertString(`${name}.name`, node.name);
  const resolvedApplication = node as ResolvedApplication;
  resolvedApplication._kind = nodeNames.APPLICATION;
  resolvedApplication.attrs = [];
  resolvedApplication.childNodes = [];
  resolvedApplication.namespaceURI = html.NS.HTML;
  resolvedApplication.parentNode = null;
  resolvedApplication.tagName = nodeNames.APPLICATION;
}

function assertComment(
  _name: string,
  node: InputElement | InputComment
): asserts node is ResolvedComment {
  const resolvedComment = node as ResolvedComment;
  resolvedComment._kind = nodeNames.COMMENT;
  resolvedComment.parentNode = null;
}

function assertRoute(
  name: string,
  node: InputElement | InputRoute,
  disableWarnings: boolean,
  {
    parentActiveWhen,
    parentPath,
    siblingActiveWhens,
  }: {
    parentActiveWhen: ActiveWhen;
    parentPath: string;
    siblingActiveWhens: ActiveWhen[];
  }
): asserts node is ResolvedRoute {
  validateKeys(
    name,
    node,
    ["_kind", "childNodes", "default", "exact", "nodeName", "path", "props"],
    disableWarnings
  );

  if (node.hasOwnProperty("exact")) assertBoolean(`${name}.exact`, node.exact);

  const hasPath = node.hasOwnProperty("path");
  const hasDefault = node.hasOwnProperty("default");
  let fullPath;
  let activeWhen: ActiveWhen;

  if (hasPath) {
    assertString(`${name}.path`, node.path);
    fullPath = resolvePath(parentPath, node.path);
    activeWhen = pathToActiveWhen(fullPath, !!node.exact);
    siblingActiveWhens.push(activeWhen);
  } else if (hasDefault) {
    assertBoolean(`${name}.default`, node.default);
    fullPath = parentPath;
    activeWhen = defaultRoute(siblingActiveWhens, parentActiveWhen);
  } else
    throw Error(
      `Invalid ${name}: routes must have either a path or default property.`
    );

  if (hasDefault && hasPath && node.default)
    throw Error(
      `Invalid ${name}: cannot have both path and set default to true.`
    );

  if ("childNodes" in node)
    assertChildNodes(`${name}.childNodes`, node.childNodes, disableWarnings, {
      parentActiveWhen: activeWhen,
      parentPath: fullPath,
      siblingActiveWhens: [],
    });

  const resolvedRoute = node as ResolvedRoute;
  resolvedRoute._kind = nodeNames.ROUTE;
  resolvedRoute.activeWhen = activeWhen;
  resolvedRoute.attrs = [];
  resolvedRoute.namespaceURI = html.NS.HTML;
  resolvedRoute.parentNode = null;
}

function assertText(
  _name: string,
  node: InputElement | InputText
): asserts node is ResolvedText {
  const resolvedText = node as ResolvedText;
  resolvedText._kind = nodeNames.TEXT;
  resolvedText.parentNode = null;
}

function assertChildNode(
  name: string,
  node: InputRouteChild,
  disableWarnings: boolean,
  {
    parentActiveWhen,
    parentPath,
    siblingActiveWhens,
  }: {
    parentActiveWhen: ActiveWhen;
    parentPath: string;
    siblingActiveWhens: ActiveWhen[];
  }
): asserts node is ResolvedChild {
  assertObject(name, node);

  if (node.nodeName === nodeNames.APPLICATION)
    return assertApplication(name, node, disableWarnings);

  if (node.nodeName === nodeNames.COMMENT) return assertComment(name, node);

  if (node.nodeName === nodeNames.ROUTE)
    return assertRoute(name, node, disableWarnings, {
      parentActiveWhen,
      parentPath,
      siblingActiveWhens,
    });

  if (node.nodeName === nodeNames.TEXT) return assertText(name, node);

  if (
    typeof Node !== "undefined" &&
    "node" in node &&
    node.node instanceof Node
  ) {
    const resolvedNode = node as ResolvedNode;
    resolvedNode._kind = nodeNames.NODE;
    // TODO: how to process node???
    resolvedNode.attrs = [];
    resolvedNode.namespaceURI = html.NS.HTML;
    resolvedNode.parentNode = null;
    resolvedNode.tagName = node.node.nodeName;
  } else {
    const resolvedElement = node as ResolvedElement;
    resolvedElement._kind = nodeNames.ELEMENT;
    resolvedElement.namespaceURI = html.NS.HTML;
    resolvedElement.parentNode = null;
    resolvedElement.tagName = node.nodeName;
  }

  if ("childNodes" in node) {
    assertChildNodes(`${name}.childNodes`, node.childNodes, disableWarnings, {
      parentActiveWhen,
      parentPath,
      siblingActiveWhens,
    });
  }
}

// TODO: We should return a new object rather than mutating the input
export function validateRoutesConfig(
  routesConfig: InputRoutesConfig
): asserts routesConfig is ResolvedRoutesConfig {
  assertObject("routesConfig", routesConfig);

  const disableWarnings = !!routesConfig.disableWarnings;

  validateKeys(
    "routesConfig",
    routesConfig,
    [
      "base",
      "childNodes",
      "containerEl",
      "disableWarnings",
      "mode",
      "redirects",
    ],
    disableWarnings
  );

  if (routesConfig.hasOwnProperty("containerEl"))
    assertContainerEl("routesConfig.containerEl", routesConfig.containerEl);
  else routesConfig.containerEl = "body";

  if (!routesConfig.hasOwnProperty("mode")) routesConfig.mode = "history";

  assertEnum("routesConfig.mode", routesConfig.mode, [
    "history",
    "hash",
  ] as const);

  if (routesConfig.hasOwnProperty("base")) {
    assertString("routesConfig.base", routesConfig.base);
    routesConfig.base = sanitizeBase(routesConfig.base);
  } else routesConfig.base = "/";

  if (routesConfig.hasOwnProperty("redirects")) {
    assertObject("routesConfig.redirects", routesConfig.redirects);
    Object.entries(routesConfig.redirects).forEach(([from, to]) => {
      assertFullPath(`routesConfig.redirects key`, from);
      assertFullPath(`routesConfig.redirects['${from}']`, to);
    });
  }

  const pathname = inBrowser ? window.location.pathname : "/";
  const hashPrefix = routesConfig.mode === "hash" ? pathname + "#" : "";

  assertChildNodes(
    "routesConfig.childNodes",
    routesConfig.childNodes,
    disableWarnings,
    {
      parentActiveWhen: () => true,
      parentPath: hashPrefix + routesConfig.base,
      siblingActiveWhens: [],
    }
  );

  delete routesConfig.disableWarnings;
}
