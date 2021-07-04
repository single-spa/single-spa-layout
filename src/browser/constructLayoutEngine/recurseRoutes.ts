import {
  ResolvedApplication,
  ResolvedChild,
  ResolvedDomChild,
  ResolvedRoute,
  sslResolvedNode,
} from "../../isomorphic/index.js";
import { applicationElementId } from "../../utils/index.js";
import { createNodeFromRouteChild, insertNode } from "./utils.js";

export interface DomChangeInput {
  applicationContainers: Record<string, HTMLElement>;
  childNodes: ResolvedChild[];
  location: Location | URL;
  parentContainer: Node;
  previousSibling?: Node;
  shouldMount: boolean;
}

const createApplicationElement = (htmlId: string) => {
  const applicationElement = document.createElement("div");
  applicationElement.id = htmlId;
  return applicationElement;
};

const processApplication = (
  { name }: ResolvedApplication,
  { applicationContainers, parentContainer, shouldMount }: DomChangeInput,
  previousSibling: Optional<Node>
) => {
  if (!shouldMount) return previousSibling;
  const htmlId = applicationElementId(name);
  const applicationElement =
    applicationContainers[name] ??
    document.getElementById(htmlId) ??
    createApplicationElement(htmlId);
  insertNode(applicationElement, parentContainer, previousSibling);
  return applicationElement;
};

const processRoute = (
  { activeWhen, childNodes }: ResolvedRoute,
  {
    applicationContainers,
    location,
    parentContainer,
    shouldMount,
  }: DomChangeInput,
  previousSibling: Optional<Node>
) =>
  recurseRoutes({
    applicationContainers,
    childNodes,
    location,
    parentContainer,
    previousSibling,
    shouldMount: shouldMount && activeWhen(location),
  });

const processDomChild = (
  domChild: ResolvedDomChild,
  {
    applicationContainers,
    location,
    parentContainer,
    shouldMount,
  }: DomChangeInput,
  previousSibling: Optional<Node>
) => {
  if (!shouldMount) {
    domChild._connectedNode?.parentNode?.removeChild(domChild._connectedNode);
    delete domChild._connectedNode;
    return previousSibling;
  }

  // TODO: Review this: why shallowly clone node but recursively create node?
  domChild._connectedNode ||= sslResolvedNode.isNode(domChild)
    ? domChild.node.cloneNode(false)
    : createNodeFromRouteChild(domChild, true);
  insertNode(domChild._connectedNode, parentContainer, previousSibling);
  if ("childNodes" in domChild)
    recurseRoutes({
      applicationContainers,
      location,
      parentContainer: domChild._connectedNode,
      previousSibling: undefined,
      childNodes: domChild.childNodes,
      shouldMount,
    });
  return domChild._connectedNode;
};

export const recurseRoutes = (input: DomChangeInput) => {
  let previousSibling = input.previousSibling;

  input.childNodes.forEach((child) => {
    if (sslResolvedNode.isApplication(child))
      previousSibling = processApplication(child, input, previousSibling);
    else if (sslResolvedNode.isRoute(child))
      previousSibling = processRoute(child, input, previousSibling);
    else if (
      sslResolvedNode.isNode(child) ||
      typeof child.nodeName === "string"
    )
      previousSibling = processDomChild(child, input, previousSibling);
  });

  return previousSibling;
};
