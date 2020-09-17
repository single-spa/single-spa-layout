import { treeAdapter } from "./treeAdapter.js";
import doctype from "parse5/lib/common/doctype.js";
import HTML from "parse5/lib/common/html.js";
import { Readable } from "stream";
import { matchRoute } from "../isomorphic/matchRoute.js";
import merge2 from "merge2";

// Serialization algorithm is heavily based on the Serializer class in
// https://github.com/inikulin/parse5/blob/master/packages/parse5/lib/serializer/index.js
// The main difference is that it writes to a stream and has some custom logic
// related to single-spa-router elements

const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;

//Escaping regexes
const AMP_REGEX = /&/g;
const NBSP_REGEX = /\u00a0/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const LT_REGEX = /</g;
const GT_REGEX = />/g;

/**
 * @typedef {{
 * urlPath: string;
 * renderApplication(props: import('single-spa').AppProps) => import('stream').Readable | string;
 * renderFragment?(name: string) => import('stream').Readable | string;
 * }} RenderOptions
 *
 * @typedef {{
 * node: import('parse5').Element;
 * output: import('parse5').output;
 * renderOptions: RenderOptions;
 * serverLayout: import('./constructServerLayout').serverLayout;
 * applicationProps: import('single-spa').AppProps;
 * inRouterElement: boolean;
 * }} SerializeArgs
 *
 * @typedef {{
 * bodyStream: import('stream').Readable;
 * applicationProps: Array<import('single-spa').AppProps>;
 * }} ServerResponseBodyResult
 *
 * @param {import('./constructServerLayout').ServerLayout} serverLayout
 * @param {RenderOptions} renderOptions
 * @returns {import('stream').Readable}
 */
export function renderServerResponseBody(serverLayout, renderOptions) {
  if (!serverLayout || !renderOptions) {
    throw Error(
      `single-spa-layout (server): must provide serverLayout and renderOptions`
    );
  }

  const applicationProps = [];

  const output = merge2({
    pipeError: true,
  });

  serializeChildNodes({
    node: serverLayout.parsedDocument,
    output,
    renderOptions,
    serverLayout,
    applicationProps,
    inRouterElement: false,
  });

  return {
    bodyStream: output,
    applicationProps,
  };
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeChildNodes(args) {
  const { node: parentNode, inRouterElement } = args;

  let childNodes = treeAdapter.getChildNodes(parentNode);

  for (let i = 0; i < childNodes.length; i++) {
    let node = childNodes[i];

    if (node._originalNode) {
      node = node._originalNode;
    }
    let serialize;

    if (!inRouterElement && isApplicationNode(node)) {
      serialize = serializeApplication;
    } else if (isRouteNode(node)) {
      serialize = serializeRoute;
    } else if (isRouterContent(node)) {
      serialize = serializeRouterContent;
    } else if (isFragmentNode(node)) {
      serialize = serializeFragment;
    } else if (treeAdapter.isElementNode(node)) {
      serialize = serializeElement;
    } else if (treeAdapter.isTextNode(node)) {
      serialize = serializeTextNode;
    } else if (treeAdapter.isCommentNode(node)) {
      serialize = serializeCommentNode;
    } else if (treeAdapter.isDocumentTypeNode(node)) {
      serialize = serializeDocumentTypeNode;
    }

    if (serialize) {
      serialize({ ...args, node });
    } else {
      console.error(node);
      throw Error(
        `Unable to serialize node ${
          node.nodeName || node.nodeType || node.type
        }`
      );
    }
  }
}

function isApplicationNode(node) {
  return treeAdapter.getTagName(node) === "application";
}

function isRouteNode(node) {
  return treeAdapter.getTagName(node) === "route";
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeRoute(args) {
  serializeChildNodes({
    ...args,
    node: args.node,
  });
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeApplication({
  node,
  output,
  renderOptions,
  applicationProps,
}) {
  const props = {
    name: node.name,
    ...(node.props || {}),
  };

  applicationProps.push(props);

  let appStream = renderOptions.renderApplication(props);

  if (typeof appStream === "string") {
    appStream = stringStream(appStream);
  }

  output.add(stringStream(`<div id="single-spa-application:${props.name}">`));

  output.add(appStream);

  output.add(stringStream(`</div>`));
}

function isRouterContent(node) {
  return (
    treeAdapter.isElementNode(node) &&
    treeAdapter.getTagName(node) === "ssl-router-content"
  );
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeRouterContent(args) {
  const { serverLayout, renderOptions } = args;
  const matchedRoutes = matchRoute(
    serverLayout.resolvedRoutes,
    renderOptions.urlPath
  );
  serializeChildNodes({
    ...args,
    node: { childNodes: matchedRoutes.routes },
  });
}

function isFragmentNode(node) {
  return (
    treeAdapter.isElementNode(node) &&
    treeAdapter.getTagName(node) === "fragment"
  );
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeFragment({ node, output, renderOptions }) {
  const attr = treeAdapter
    .getAttrList(node)
    .find((attr) => attr.name === "name");
  if (!attr.name) {
    throw Error(`<fragment> has unknown name`);
  }

  let fragmentStream = renderOptions.renderFragment(attr.value);

  if (typeof fragmentStream === "string") {
    fragmentStream = stringStream(fragmentStream);
  }

  output.add(fragmentStream);
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeElement(args) {
  const { node, output } = args;
  const tn = treeAdapter.getTagName(node);
  const ns = treeAdapter.getNamespaceURI(node);

  output.add(stringStream(`<${tn}`));
  serializeAttributes(args);
  output.add(stringStream(`>`));

  if (
    tn !== $.AREA &&
    tn !== $.BASE &&
    tn !== $.BASEFONT &&
    tn !== $.BGSOUND &&
    tn !== $.BR &&
    tn !== $.COL &&
    tn !== $.EMBED &&
    tn !== $.FRAME &&
    tn !== $.HR &&
    tn !== $.IMG &&
    tn !== $.INPUT &&
    tn !== $.KEYGEN &&
    tn !== $.LINK &&
    tn !== $.META &&
    tn !== $.PARAM &&
    tn !== $.SOURCE &&
    tn !== $.TRACK &&
    tn !== $.WBR
  ) {
    const childNodesHolder =
      tn === $.TEMPLATE && ns === NS.HTML
        ? treeAdapter.getTemplateContent(node)
        : node;

    const inRouterElement = args.inRouterElement || tn === "single-spa-router";
    const newArgs = { ...args, node: childNodesHolder, inRouterElement };
    serializeChildNodes(newArgs);
    output.add(stringStream(`</${tn}>`));
  }
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeAttributes({ node, output }) {
  const attrs = treeAdapter.getAttrList(node) || [];

  for (let i = 0, attrsLength = attrs.length; i < attrsLength; i++) {
    const attr = attrs[i];
    const value = escapeString(attr.value, true);

    let attrName;
    if (!attr.namespace) {
      attrName = attr.name;
    } else if (attr.namespace === NS.XML) {
      attrName = "xml:" + attr.name;
    } else if (attr.namespace === NS.XMLNS) {
      if (attr.name !== "xmlns") {
        attrName = "xmlns:";
      }

      attrName = attr.name;
    } else if (attr.namespace === NS.XLINK) {
      attrName = "xlink:" + attr.name;
    } else {
      attrName = attr.prefix + ":" + attr.name;
    }

    output.add(stringStream(` ${attrName}="${value}"`));
  }
}

/**
 *
 * @param {import('parse5').Element} node
 * @param {import('stream').Readable} output
 */
function serializeTextNode({ node, output }) {
  const content = treeAdapter.getTextNodeContent(node);
  const parent = treeAdapter.getParentNode(node);
  let parentTn = null;

  if (parent && treeAdapter.isElementNode(parent)) {
    parentTn = treeAdapter.getTagName(parent);
  }

  if (
    parentTn === $.STYLE ||
    parentTn === $.SCRIPT ||
    parentTn === $.XMP ||
    parentTn === $.IFRAME ||
    parentTn === $.NOEMBED ||
    parentTn === $.NOFRAMES ||
    parentTn === $.PLAINTEXT ||
    parentTn === $.NOSCRIPT
  ) {
    output.add(stringStream(content));
  } else {
    output.add(stringStream(escapeString(content, false)));
  }
}

function escapeString(str, attrMode) {
  str = str.replace(AMP_REGEX, "&amp;").replace(NBSP_REGEX, "&nbsp;");

  if (attrMode) {
    str = str.replace(DOUBLE_QUOTE_REGEX, "&quot;");
  } else {
    str = str.replace(LT_REGEX, "&lt;").replace(GT_REGEX, "&gt;");
  }

  return str;
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeCommentNode({ node, output }) {
  output.add(stringStream(`<!--${treeAdapter.getCommentNodeContent(node)}-->`));
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeDocumentTypeNode({ node, output }) {
  const name = treeAdapter.getDocumentTypeNodeName(node);
  output.add(stringStream(`<${doctype.serializeContent(name, null, null)}>`));
}

export function stringStream(str) {
  const readable = new Readable({ read() {} });
  readable.push(str);
  readable.push(null);
  return readable;
}
