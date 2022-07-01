import { readFileSync } from 'node:fs';
import { defaultTreeAdapter, html } from 'parse5';
import {
  constructRoutes,
  nodeNames,
  ResolvedRoutesConfig,
  SslDocument,
  SslElement,
  SslNode,
  sslResolvedNode,
  SslTreeAdapterMap,
} from '../../isomorphic/index.js';
import { assertString } from '../../utils/index.js';
import { SslParser } from '../SslParser/index.js';
import type { HTMLTemplateOptions, ServerLayout } from '../types.js';

export * from '../types.js';

const errPrefix = `single-spa-layout (server):`;

const getHtmlString = (templateOptions: HTMLTemplateOptions) => {
  let htmlString: string;
  if ('html' in templateOptions) htmlString = templateOptions.html;
  else if ('filePath' in templateOptions)
    htmlString = readFileSync(templateOptions.filePath, 'utf8');
  else
    throw Error(
      `${errPrefix} either templateOptions.html or templateOptions.filePath is required`,
    );
  assertString('htmlString', htmlString);
  return htmlString;
};

const parseDocument = (htmlString: string) => {
  try {
    return SslParser.parse<SslTreeAdapterMap>(htmlString);
  } catch (error) {
    console.error(`${errPrefix} failed to parse HTML template with parse5.`);
    throw error;
  }
};

const findElementRecursive = (
  rootNode: SslNode,
  nodeName: string,
): SslElement | null => {
  if (sslResolvedNode.isElement(rootNode) && rootNode.tagName === nodeName)
    return rootNode;

  const childNodes = sslResolvedNode.getChildNodes(
    sslResolvedNode.isTemplate(rootNode) ? rootNode.content : rootNode,
  );
  for (const childNode of childNodes) {
    const result =
      sslResolvedNode.isElement(childNode) &&
      findElementRecursive(childNode, nodeName);
    if (result) return result;
  }

  return null;
};

const findElement = (rootNode: SslNode, nodeName: string) => {
  const element = findElementRecursive(rootNode, nodeName);
  if (element) return element;
  throw Error(`${errPrefix} could not find ${nodeName} element in HTML`);
};

const insertRouterContent = (
  parsedDocument: SslDocument,
  { containerEl }: ResolvedRoutesConfig,
) => {
  const container =
    typeof containerEl === 'string'
      ? findElement(parsedDocument, containerEl)
      : (containerEl as SslElement);
  const routerFragment = defaultTreeAdapter.createElement(
    nodeNames.ROUTER_CONTENT,
    html.NS.HTML,
    [],
  );
  const firstChild = defaultTreeAdapter.getFirstChild(container);
  firstChild
    ? defaultTreeAdapter.insertBefore(container, routerFragment, firstChild)
    : defaultTreeAdapter.appendChild(container, routerFragment);
};

export const constructServerLayout = (
  templateOptions: HTMLTemplateOptions,
): ServerLayout => {
  if (!templateOptions) throw Error(`${errPrefix} templateOptions is required`);
  const htmlString = getHtmlString(templateOptions);
  const parsedDocument = parseDocument(htmlString);
  const routerElement = findElement(parsedDocument, nodeNames.ROUTER);
  const resolvedConfig = constructRoutes(routerElement, {});
  insertRouterContent(parsedDocument, resolvedConfig);
  return { parsedDocument, resolvedConfig };
};
