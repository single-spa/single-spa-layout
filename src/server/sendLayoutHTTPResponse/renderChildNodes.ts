import { html } from "parse5";
import { serializeDoctypeContent } from "parse5-htmlparser2-tree-adapter";
import {
  matchRoute,
  MISSING_PROP,
  ResolvedApplication,
  ResolvedNode,
  ResolvedParent,
  SslAssets,
  SslCommentNode,
  SslDocumentType,
  SslElement,
  SslFragment,
  SslParentNode,
  SslResolvedNode,
  sslResolvedNode,
  SslRouterContent,
  SslTextNode,
} from "../../isomorphic/index.js";
import { applicationElementId } from "../../utils/index.js";
import { escapeString } from "./escapeString.js";
import { logError } from "./logError.js";
import { MergeStream } from "./MergeStream.js";
import type { AppToRender, RenderArgs } from "./types.js";

const NS = html.NS;
const TAGS = html.TAG_NAMES;

const getPropsPromise = async (
  { name: appName, props: configProps = {} }: ResolvedApplication,
  { propPromises, renderOptions: { retrieveProp } }: RenderArgs
) => {
  const propEntries = await Promise.all(
    Object.keys(configProps).map(async (propName) => {
      const propValue = configProps[propName];
      const value =
        propValue === MISSING_PROP
          ? (propPromises[propName] ||= Promise.resolve(retrieveProp(propName)))
          : propValue;
      const resolvedValue = await Promise.resolve(value);
      return [propName, resolvedValue] as const;
    })
  );
  const props = Object.fromEntries(propEntries);
  props["name"] = appName;
  return props;
};

const getAppStreams = (
  appToRender: AppToRender,
  { renderOptions: { renderApplication } }: RenderArgs
) => {
  const { appName } = appToRender;
  const contentStream = new MergeStream(`[${appName}-contentStream]`);
  const assetStream = new MergeStream(`[${appName}-assetStream]`);
  try {
    const renderResultPromise = Promise.resolve(renderApplication(appToRender));
    const contentPromise = renderResultPromise.then((result) =>
      typeof result === "object" && "content" in result
        ? result.content
        : result
    );
    const assetsPromise = renderResultPromise.then((result) =>
      typeof result === "object" && "assets" in result ? result.assets : ""
    );
    contentStream.add(contentPromise, `[${appName}-content]`);
    assetStream.add(assetsPromise, `[${appName}-assets]`);
  } catch (error) {
    logError(appName, error);
  }

  return { assetStream, contentStream };
};

const renderApplication = (node: ResolvedApplication, args: RenderArgs) => {
  const {
    assetsStream,
    bodyStream,
    applicationPropPromises,
    headerPromises,
    renderOptions: { retrieveApplicationHeaders },
  } = args;
  const { name: appName } = node;
  const propsPromise = getPropsPromise(node, args);
  applicationPropPromises[appName] = propsPromise;
  const appToRender = { appName, propsPromise };
  headerPromises[appName] = retrieveApplicationHeaders(appToRender);
  const { assetStream, contentStream } = getAppStreams(appToRender, args);
  assetsStream.add(assetStream);
  bodyStream.add(`<div id="${applicationElementId(appName)}">`);
  bodyStream.add(contentStream);
  bodyStream.add(`</div>`);
};

// TODO: Add breakpoint to debug this
const renderAssets = (_: SslAssets, { assetsStream, bodyStream }: RenderArgs) =>
  bodyStream.add(assetsStream);

const renderAttributes = ({ attrs }: SslElement, { bodyStream }: RenderArgs) =>
  attrs?.forEach(({ name, namespace, prefix, value }) => {
    const attrValue = escapeString(value, true);
    let attrName = name;
    switch (namespace) {
      case NS.XML:
        attrName = `xml:${name}`;
        break;
      case NS.XMLNS:
        attrName = name === "xmlns" ? name : `xmlns:${name}`;
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

export const renderChildNodes = (
  { childNodes }: SslParentNode | ResolvedParent,
  args: RenderArgs
): void =>
  childNodes?.forEach((childNode) => renderSingleNode(childNode, args));

const renderComment = ({ data }: SslCommentNode, { bodyStream }: RenderArgs) =>
  bodyStream.add(`<!--${data}-->`);

const renderDocType = ({ name }: SslDocumentType, { bodyStream }: RenderArgs) =>
  bodyStream.add(`<${serializeDoctypeContent(name, "", "")}>`);

const SELF_CLOSING_TAGS = [
  TAGS.AREA,
  TAGS.BASE,
  TAGS.BASEFONT,
  TAGS.BGSOUND,
  TAGS.BR,
  TAGS.COL,
  TAGS.EMBED,
  TAGS.FRAME,
  TAGS.HR,
  TAGS.IMG,
  TAGS.INPUT,
  TAGS.KEYGEN,
  TAGS.LINK,
  TAGS.META,
  TAGS.PARAM,
  TAGS.SOURCE,
  TAGS.TRACK,
  TAGS.WBR,
];

const renderElement = (node: SslElement, args: RenderArgs) => {
  const { bodyStream } = args;
  const tn = node.tagName;
  bodyStream.add(`<${tn}`);
  renderAttributes(node, args);
  bodyStream.add(`>`);

  if (!SELF_CLOSING_TAGS.includes(tn as html.TAG_NAMES)) {
    const parentNode =
      sslResolvedNode.isTemplate(node) && node.namespaceURI === NS.HTML
        ? node.content
        : node;
    renderChildNodes(parentNode, args);
    bodyStream.add(`</${tn}>`);
  }
};

const renderFragment = (
  { attrs }: SslFragment,
  { bodyStream, renderOptions }: RenderArgs
) => {
  const fragmentName = attrs?.find(({ name }) => name === "name")?.value;
  if (!fragmentName) throw Error("<fragment> has unknown name");
  try {
    bodyStream.add(
      renderOptions.renderFragment(fragmentName),
      `Fragment ${fragmentName}`
    );
  } catch (error) {
    logError(`Fragment ${fragmentName}`, error);
  }
};

const getLayoutData = async (
  propPromises: Record<string, Promise<unknown>>
) => {
  // TODO: Add breakpoint to debug this
  const propsEntries = await Promise.all(
    Object.entries(propPromises).map(([propName, propValuePromise]) =>
      propValuePromise.then((propValue) => [propName, propValue] as const)
    )
  );
  const props = Object.fromEntries(propsEntries);
  return `<script>window.singleSpaLayoutData = ${JSON.stringify({
    props,
  })}</script>`;
};

const renderLayoutData = (
  _: SslRouterContent,
  { bodyStream, propPromises }: RenderArgs
) => {
  try {
    bodyStream.add(getLayoutData(propPromises), "Layout data");
  } catch (error) {
    logError("Stream layout data", error);
  }
};

// TODO: Implement this
// @ts-ignore
const renderNode = (node: ResolvedNode, args: RenderArgs) => {};

const renderRouter = (node: SslRouterContent, args: RenderArgs) => {
  const {
    renderOptions: {
      serverLayout: { resolvedConfig },
      urlPath,
    },
  } = args;
  const { childNodes } = matchRoute(resolvedConfig, urlPath);
  childNodes.forEach((childNode) => renderSingleNode(childNode, args));
  renderLayoutData(node, args);
};

/**
 * Stream all SslResolvedNodes except for ResolvedApplications and ResolvedRoute,
 * because they should be handled inside an SslRouterContent
 */
const renderSingleNode = (node: SslResolvedNode, args: RenderArgs) => {
  if (sslResolvedNode.isResolvedApplication(node))
    return renderApplication(node, args);
  if (sslResolvedNode.isResolvedRoute(node))
    return renderChildNodes(node, args);
  if (sslResolvedNode.isRouter(node)) return renderRouter(node, args);
  if (sslResolvedNode.isAssets(node)) return renderAssets(node, args);
  if (sslResolvedNode.isFragment(node)) return renderFragment(node, args);
  if (sslResolvedNode.isNode(node)) return renderNode(node, args);
  if (sslResolvedNode.isElement(node)) return renderElement(node, args);
  if (sslResolvedNode.isText(node)) return renderText(node, args);
  if (sslResolvedNode.isComment(node)) return renderComment(node, args);
  if (sslResolvedNode.isDocType(node)) return renderDocType(node, args);
  console.error(node);
  throw Error(`Unable to stream node: ${node.nodeName}`);
};

const renderText = (
  { parentNode, value }: SslTextNode,
  { bodyStream }: RenderArgs
) => {
  const parentTagName =
    parentNode && sslResolvedNode.isElement(parentNode)
      ? parentNode.tagName
      : null;

  switch (parentTagName) {
    case TAGS.IFRAME:
    case TAGS.NOEMBED:
    case TAGS.NOFRAMES:
    case TAGS.NOSCRIPT:
    case TAGS.PLAINTEXT:
    case TAGS.STYLE:
    case TAGS.SCRIPT:
    case TAGS.XMP:
      bodyStream.add(value);
      break;

    default:
      bodyStream.add(escapeString(value, false));
      break;
  }
};
