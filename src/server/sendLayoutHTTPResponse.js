import { treeAdapter } from "./treeAdapter.js";
import doctype from "parse5/lib/common/doctype.js";
import HTML from "parse5/lib/common/html.js";
import { Readable } from "stream";
import { matchRoute } from "../isomorphic/matchRoute.js";
import merge2 from "merge2";
import { MISSING_PROP } from "../isomorphic/constructRoutes.js";

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
 *
 * @typedef {import('stream').Readable | string} RenderResult
 *
 * @typedef {{
 *  assets: RenderResult | Promise<RenderResult>;
 *  content: RenderResult | Promise<RenderResult>;
 * }} ApplicationRenderResult
 *
 * @typedef {{
 * res: import('http').ServerResponse;
 * serverLayout: import('./constructServerLayout').ServerLayout;
 * urlPath: string;
 * renderApplication(appToRender: AppToRender) => RenderResult | Promise<RenderResult> | ApplicationRenderResult | Promise<ApplicationRenderResult>;
 * retrieveApplicationHeaders(appToRender AppToRender) => object;
 * renderFragment?(name: string) => RenderResult | Promise<RenderResult>;
 * retrieveProp(name: string) => Promise<any> | any;
 * assembleFinalHeaders(appHeaders: AppHeaders[]) => object;
 * }} RenderOptions
 *
 * @typedef {{
 * appName: string;
 * propsPromise: Promise<import('single-spa').AppProps>;
 * }} AppToRender
 *
 * @typedef {{
 * appProps: import('single-spa').AppProps;
 * appHeaders: object;
 * }} AppHeaders
 *
 * @typedef {{
 * node: import('parse5').Element;
 * assetsStream: import('merge2').Merge2Stream;
 * bodyStream: import('merge2').Merge2Stream;
 * renderOptions: RenderOptions;
 * serverLayout: import('./constructServerLayout').serverLayout;
 * applicationProps: import('single-spa').AppProps;
 * inRouterElement: boolean;
 * }} SerializeArgs
 *
 * @param {RenderOptions} renderOptions
 * @returns {Promise}
 */
export async function sendLayoutHTTPResponse(renderOptions) {
  if (!renderOptions) {
    throw Error(`single-spa-layout (server): must provide renderOptions`);
  }

  const propPromises = {},
    applicationPropPromises = {},
    headerPromises = {};

  const assetsStream = merge2({
    pipeError: true,
  });

  const bodyStream = merge2({
    pipeError: true,
  });

  serializeChildNodes({
    node: renderOptions.serverLayout.parsedDocument,
    assetsStream,
    bodyStream,
    renderOptions,
    propPromises,
    applicationPropPromises,
    headerPromises,
    inRouterElement: false,
  });

  const allAppHeaders = await Promise.all(
    Object.keys(headerPromises).map(async (appName) => {
      const [appHeaders, appProps] = await Promise.all([
        headerPromises[appName],
        applicationPropPromises[appName],
      ]);
      return { appHeaders, appProps };
    })
  );

  const finalHeaders = renderOptions.assembleFinalHeaders(allAppHeaders);
  for (let headerName in finalHeaders) {
    renderOptions.res.setHeader(headerName, finalHeaders[headerName]);
  }

  bodyStream.pipe(renderOptions.res);
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
    } else if (isAssetsNode(node)) {
      serialize = serializeAssets;
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
  assetsStream,
  bodyStream,
  renderOptions,
  applicationPropPromises,
  propPromises,
  headerPromises,
}) {
  const appName = node.name;

  const propsConfig = node.props || {};
  const propsPromise = Promise.all(
    Object.keys(propsConfig).map((propName) => {
      let value;
      if (propsConfig[propName] === MISSING_PROP) {
        value =
          propPromises[propName] ||
          (propPromises[propName] = renderOptions.retrieveProp(propName));
      } else {
        value = propsConfig[propName];
      }

      return Promise.resolve(value).then((rawValue) => [propName, rawValue]);
    })
  ).then((propEntries) => {
    const props = {};

    propEntries.forEach(([propName, value]) => {
      props[propName] = value;
    });

    props.name = appName;

    return props;
  });

  applicationPropPromises[appName] = propsPromise;

  headerPromises[appName] = renderOptions.retrieveApplicationHeaders({
    appName,
    propsPromise,
  });

  let renderResult, contentStream, assetStream;
  try {
    renderResult = renderOptions.renderApplication({ appName, propsPromise });

    if (typeof renderResult.then === "function") {
      contentStream = merge2();
      assetStream = merge2();
      renderResult.then(
        (value) => {
          const streams = valueToAppStreams(appName, value);
          contentStream.add(streams.contentStream);
          assetStream.add(streams.assetStream);
        },
        (err) => {
          contentStream.add(renderError(appName, err));
          assetStream.add(renderError(appName, err));
        }
      );
    } else {
      const streams = valueToAppStreams(appName, renderResult);
      contentStream = streams.contentStream;
      assetStream = streams.assetStream;
    }
  } catch (err) {
    contentStream = renderError(appName, err);
    assetStream = renderError(appName, err);
  }
  assetsStream.add(assetStream);
  bodyStream.add(stringStream(`<div id="single-spa-application:${appName}">`));
  bodyStream.add(contentStream);
  bodyStream.add(stringStream(`</div>`));
}

function valueToAppStreams(name, value) {
  let contentStream, assetStream;

  if (value) {
    contentStream = valueToStream(value.content || value, name);
    assetStream = valueToStream(value.assets || "", name);
  } else {
    contentStream = renderError(name, Error(`returned nothing`));
    assetStream = renderError(name, Error(`returned nothing`));
  }

  return { contentStream, assetStream };
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
  const { renderOptions } = args;
  const matchedRoutes = matchRoute(
    renderOptions.serverLayout.resolvedRoutes,
    renderOptions.urlPath
  );
  serializeChildNodes({
    ...args,
    node: { childNodes: matchedRoutes.routes },
  });
  serializeLayoutData(args);
}

function isFragmentNode(node) {
  return (
    treeAdapter.isElementNode(node) &&
    treeAdapter.getTagName(node) === "fragment"
  );
}

function isAssetsNode(node) {
  return (
    treeAdapter.isElementNode(node) && treeAdapter.getTagName(node) === "assets"
  );
}

/**
 *
 * @param {SerializeArgs} args
 */
function serializeLayoutData({ propPromises, bodyStream }) {
  const getLayoutData = async () => {
    const propEntries = await Promise.all(
      Object.entries(propPromises).map(([propName, propValuePromise]) => {
        return propValuePromise.then((value) => {
          return [propName, value];
        });
      })
    );
    const props = propEntries.reduce((acc, [propName, value]) => {
      acc[propName] = value;
      return acc;
    }, {});

    return `<script>window.singleSpaLayoutData = ${JSON.stringify({
      props,
    })}</script>`;
  };

  try {
    bodyStream.add(valueToStream(getLayoutData()));
  } catch (err) {
    bodyStream.add(renderError(`Serialize layout props`, err));
  }
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeFragment({ node, bodyStream, renderOptions }) {
  const attr = treeAdapter
    .getAttrList(node)
    .find((attr) => attr.name === "name");
  if (!attr.name) {
    throw Error(`<fragment> has unknown name`);
  }

  let fragmentStream;
  try {
    fragmentStream = valueToStream(
      renderOptions.renderFragment(attr.value),
      `Fragment ${attr.value}`
    );
  } catch (err) {
    fragmentStream = renderError(`Fragment ${attr.name}`, err);
  }

  bodyStream.add(fragmentStream);
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeAssets({ assetsStream, bodyStream }) {
  bodyStream.add(assetsStream);
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeElement(args) {
  const { node, bodyStream } = args;
  const tn = treeAdapter.getTagName(node);
  const ns = treeAdapter.getNamespaceURI(node);

  bodyStream.add(stringStream(`<${tn}`));
  serializeAttributes(args);
  bodyStream.add(stringStream(`>`));

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
    bodyStream.add(stringStream(`</${tn}>`));
  }
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeAttributes({ node, bodyStream }) {
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

    bodyStream.add(stringStream(` ${attrName}="${value}"`));
  }
}

function serializeTextNode({ node, bodyStream }) {
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
    bodyStream.add(stringStream(content));
  } else {
    bodyStream.add(stringStream(escapeString(content, false)));
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
function serializeCommentNode({ node, bodyStream }) {
  bodyStream.add(
    stringStream(`<!--${treeAdapter.getCommentNodeContent(node)}-->`)
  );
}

/**
 *
 * @param {SerializeArgs} serializeArgs
 */
function serializeDocumentTypeNode({ node, bodyStream }) {
  const name = treeAdapter.getDocumentTypeNodeName(node);
  bodyStream.add(
    stringStream(`<${doctype.serializeContent(name, null, null)}>`)
  );
}

export function stringStream(str) {
  const readable = new Readable({ read() {} });
  readable.push(str);
  readable.push(null);
  return readable;
}

function valueToStream(value, name) {
  let stream;

  if (value && typeof value.then === "function") {
    const promise = value;
    stream = merge2();
    promise.then(
      (result) => {
        stream.add(typeof result === "string" ? stringStream(result) : result);
      },
      (err) => {
        stream.add(renderError(name, err));
      }
    );
  } else if (typeof value === "string") {
    stream = stringStream(value);
  } else {
    stream = value;
  }

  return stream;
}

function renderError(name, err) {
  console.error(`${name} failed to render.`);
  console.error(err);
  return stringStream("");
}
