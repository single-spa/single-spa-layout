import { ParcelConfig } from 'single-spa';
import { inBrowser } from '../../utils/index.js';
import type {
  HTMLLayoutData,
  InputApplication,
  InputElement,
  InputNode,
  InputRoute,
  InputRouteChild,
  InputRoutesConfig,
  SslApplication,
  SslChildNode,
  SslElement,
  SslRoute,
} from '../types/index.js';
import {
  getAttribute,
  nodeNames,
  resolvePath,
  RouteChildNode,
  routeChildNode,
  setFromAttribute,
  setIfHasAttribute,
} from '../utils/index.js';

export const MISSING_PROP = typeof Symbol !== 'undefined' ? Symbol() : '@';

const getProps = (
  element: HTMLElement | SslElement,
  layoutData: HTMLLayoutData,
) => {
  const props: Record<string, unknown> = {};
  (getAttribute(element, 'props') || '').split(',').forEach(value => {
    const propName = value.trim();
    if (propName === '') return;
    if (layoutData.props?.hasOwnProperty(propName)) {
      props[propName] = layoutData.props[propName];
    } else if (inBrowser) {
      throw Error(
        `Prop '${propName}' was not defined in the htmlLayoutData. Either remove this attribute from the HTML element or provide the prop's value`,
      );
    } else {
      props[propName] = MISSING_PROP;
    }
  });

  return props;
};

const getApplicationHandler = (
  element: HTMLElement | SslApplication,
  handlers: Optional<Record<string, string | ParcelConfig>>,
  handlerName: keyof InputApplication,
) => {
  const handlerKey = getAttribute(element, handlerName);
  if (!handlerKey) return undefined;
  if (handlers?.hasOwnProperty(handlerKey)) return handlers[handlerKey];
  if (inBrowser)
    throw Error(
      `Application ${handlerName} handler '${handlerKey}' was not defined in the htmlLayoutData`,
    );
  return undefined;
};

const parseApplicationElement = (
  element: HTMLElement | SslApplication,
  layoutData: HTMLLayoutData,
): InputApplication[] => {
  if (element.childNodes.length > 0)
    throw Error(
      `<application> elements must not have childNodes. You must put in a closing </application> - self closing is not allowed`,
    );
  return [
    {
      error: getApplicationHandler(element, layoutData.errors, 'error'),
      loader: getApplicationHandler(element, layoutData.loaders, 'loader'),
      name: getAttribute(element, 'name')!,
      nodeName: nodeNames.APPLICATION,
      props: getProps(element, layoutData),
    },
  ];
};

const parseChildNodes = (
  childNodes: NodeListOf<ChildNode> | SslChildNode[],
  layoutData: HTMLLayoutData,
  config: InputRoutesConfig,
) => {
  const result: InputRouteChild[] = [];
  childNodes.forEach(childNode =>
    result.push(...parseRoutes(childNode, layoutData, config)),
  );
  return result;
};

const parseRouteElement = (
  element: HTMLElement | SslRoute,
  layoutData: HTMLLayoutData,
  config: InputRoutesConfig,
): InputRoute[] => [
  {
    ...setIfHasAttribute('default', element),
    ...setIfHasAttribute('exact', element),
    ...setFromAttribute('path')(element),
    childNodes: parseChildNodes(element.childNodes, layoutData, config),
    nodeName: nodeNames.ROUTE,
    props: getProps(element, layoutData),
  },
];

const parseHtmlChildNode = (
  node: ChildNode,
  layoutData: HTMLLayoutData,
  config: InputRoutesConfig,
): InputNode[] => {
  if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '')
    return [];
  const inputNode: InputNode = {
    node,
    nodeName: nodeNames.NODE,
  };
  const childNodes: InputRouteChild[] = [];
  node.childNodes.forEach(childNode =>
    childNodes.push(...parseRoutes(childNode, layoutData, config)),
  );
  if (childNodes.length > 0) inputNode.childNodes = childNodes;
  return [inputNode];
};

const parseGenericElement = (
  element: SslElement,
  layoutData: HTMLLayoutData,
  config: InputRoutesConfig,
): InputElement[] => [
  {
    attrs: element.attrs,
    childNodes: parseChildNodes(element.childNodes, layoutData, config),
    nodeName: element.nodeName.toLowerCase(),
  },
];

export const parseRoutes = (
  node: RouteChildNode,
  layoutData: HTMLLayoutData,
  config: InputRoutesConfig,
): InputRouteChild[] => {
  if (routeChildNode.isApplication(node))
    return parseApplicationElement(node, layoutData);
  if (routeChildNode.isRoute(node))
    return parseRouteElement(node, layoutData, config);
  if (routeChildNode.isRedirect(node)) {
    config.redirects![resolvePath('/', getAttribute(node, 'from')!)] =
      resolvePath('/', getAttribute(node, 'to')!);
    return [];
  }
  if (routeChildNode.isHtmlChildNode(node))
    return parseHtmlChildNode(node, layoutData, config);
  if (routeChildNode.isElement(node))
    return parseGenericElement(node, layoutData, config);
  if (routeChildNode.isComment(node))
    return [{ nodeName: nodeNames.COMMENT, data: node.data }];
  if (routeChildNode.isText(node))
    return [{ nodeName: nodeNames.TEXT, value: node.value }];
  return [];
};
