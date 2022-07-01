import { checkActivityFunctions, getAppNames } from 'single-spa';
import {
  ContainerEl,
  ResolvedChild,
  ResolvedNode,
  RouteMode,
  sslResolvedNode,
} from '../../isomorphic/index.js';

export const getAppsToUnmount = (newUrl: string) => {
  const activeApps = checkActivityFunctions(
    newUrl ? new URL(newUrl) : location,
  );
  return getAppNames().filter(appName => !activeApps.includes(appName));
};

export const getParentContainer = (containerEl: ContainerEl) =>
  typeof containerEl === 'string'
    ? document.querySelector<HTMLElement>(containerEl)!
    : (containerEl as HTMLElement);

export const getPath = (
  mode: Optional<RouteMode>,
  location: Location | URL = window.location,
) => location[mode === 'hash' ? 'hash' : 'pathname'];

export const insertNode = (
  node: Node,
  container: Node,
  previousSibling: Optional<Node>,
) => {
  const nextSibling = previousSibling
    ? previousSibling.nextSibling
    : container.firstChild;

  // Only call insertBefore() if necessary
  // https://github.com/single-spa/single-spa-layout/issues/123
  if (nextSibling !== node) container.insertBefore(node, nextSibling);
};

export const createNodeFromRouteChild = (
  routeChild: Exclude<ResolvedChild, ResolvedNode>,
  recursive = false,
): Node => {
  if (sslResolvedNode.isText(routeChild))
    return document.createTextNode(routeChild.value);
  if (sslResolvedNode.isComment(routeChild))
    return document.createComment(routeChild.data);
  const node = document.createElement(routeChild.nodeName);

  (('attrs' in routeChild && routeChild.attrs) || []).forEach(attr =>
    node.setAttribute(attr.name, attr.value),
  );

  recursive &&
    routeChild.childNodes?.forEach(
      child =>
        !sslResolvedNode.isNode(child) &&
        node.appendChild(createNodeFromRouteChild(child)),
    );
  return node;
};
