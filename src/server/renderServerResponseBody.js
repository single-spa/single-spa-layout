import { treeAdapter } from "./treeAdapter.js";
import doctype from "parse5/lib/common/doctype.js";
import HTML from "parse5/lib/common/html.js";
import stream from "stream";
import { matchRoute } from "../isomorphic/matchRoute.js";

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
 * renderApplication(props: import('single-spa').AppProps) => import('stream').Readable;
 * renderFragment?(name: string) => import('stream').Readable;
 * }} RenderOptions
 *
 * @typedef {{
 * node: import('parse5').Element;
 * output: import('parse5').output;
 * renderOptions: RenderOptions;
 * serverLayout: import('./constructServerLayout').serverLayout;
 * }} SerializeArgs
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

  const output = new stream.Readable({
    read() {},
  });

  serializeChildNodes({
    node: serverLayout.parsedDocument,
    output,
    renderOptions,
    serverLayout,
  })
    .then(() => {
      output.push(null);
    })
    .catch((err) => {
      output.destroy(err);
    });

  return output;
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
async function serializeChildNodes(args) {
  const { node: parentNode } = args;

  let childNodes = treeAdapter.getChildNodes(parentNode);

  for (let i = 0; i < childNodes.length; i++) {
    let node = childNodes[i];

    if (node._originalNode) {
      node = node._originalNode;
    }
    let serialize;

    if (isApplicationNode(node)) {
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
      await serialize({ ...args, node });
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
async function serializeRoute(args) {
  await serializeChildNodes({
    ...args,
    node: args.node,
  });
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeApplication({ node, output, renderOptions }) {
  return new Promise((resolve, reject) => {
    const appStream = renderOptions.renderApplication({
      name: node.name,
      ...(node.props || {}),
    });

    appStream.on("data", (chunk) => {
      output.push(chunk);
    });

    appStream.on("error", (err) => {
      reject(err);
    });

    appStream.on("end", () => {
      resolve();
    });
  });
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
async function serializeRouterContent(args) {
  const { serverLayout, renderOptions } = args;
  const matchedRoutes = matchRoute(
    serverLayout.resolvedRoutes,
    renderOptions.urlPath
  );
  await serializeChildNodes({
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
  return new Promise((resolve, reject) => {
    const attr = treeAdapter
      .getAttrList(node)
      .find((attr) => attr.name === "name");
    if (!attr.name) {
      throw Error(`<fragment> has unknown name`);
    }

    const fragmentStream = renderOptions.renderFragment(attr.name);

    fragmentStream.on("data", (chunk) => {
      output.push(chunk);
    });

    fragmentStream.on("error", (err) => {
      reject(err);
    });

    fragmentStream.on("end", () => {
      resolve();
    });
  });
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
async function serializeElement(args) {
  const { node, output } = args;
  const tn = treeAdapter.getTagName(node);
  const ns = treeAdapter.getNamespaceURI(node);

  output.push(`<${tn}`);
  serializeAttributes(args);
  output.push(`>`);

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

    const newArgs = { ...args, node: childNodesHolder };
    await serializeChildNodes(newArgs);
    output.push(`</${tn}>`);
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

    output.push(` ${attrName}="${value}"`);
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
    output.push(content);
  } else {
    output.push(escapeString(content, false));
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
  output.push(`<!--${treeAdapter.getCommentNodeContent(node)}-->`);
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeDocumentTypeNode({ node, output }) {
  const name = treeAdapter.getDocumentTypeNodeName(node);
  output.push(`<${doctype.serializeContent(name, null, null)}>`);
}
