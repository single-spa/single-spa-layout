import { ResolvedChild, sslResolvedNode } from '../../isomorphic/index.js';
import { createNodeFromRouteChild } from './utils.js';

const equalAttributes = (first: Node, second: Node) => {
  if (!(first instanceof Element) || !(second instanceof Element)) return true;
  const firstAttrNames = first.getAttributeNames();
  const secondAttrNames = second.getAttributeNames();
  return (
    firstAttrNames.length === secondAttrNames.length &&
    firstAttrNames.every(
      attrName =>
        second.getAttribute(attrName) === first.getAttribute(attrName),
    )
  );
};

const shallowEqualNode = (first: Node, second: Node) =>
  first.nodeName === second.nodeName &&
  first.nodeType === second.nodeType &&
  equalAttributes(first, second);

const isEqual = (node: Nullable<Node>, child: ResolvedChild) =>
  !node
    ? false
    : shallowEqualNode(
        node,
        sslResolvedNode.isNode(child)
          ? child.node
          : createNodeFromRouteChild(child),
      );

type PreviousNode = Nullable<{ nextSibling: Nullable<ChildNode> }>;

export const hydrate = (
  domNode: Nullable<Node>,
  childNodes: Optional<ResolvedChild[]>,
) => {
  if (!domNode?.childNodes || !childNodes) return;
  let prevNode: PreviousNode = { nextSibling: domNode.childNodes[0] };
  childNodes.forEach(child => {
    if (sslResolvedNode.isRoute(child))
      return hydrate(domNode, child.childNodes);
    let node: Nullable<Node> = prevNode?.nextSibling;
    while (
      node?.nodeType === Node.TEXT_NODE &&
      domNode.textContent?.trim() === ''
    )
      node = node.nextSibling;
    prevNode = node;
    if (sslResolvedNode.isDom(child) && isEqual(node, child))
      child._connectedNode = node;
    hydrate(node, sslResolvedNode.getChildNodes(child));
  });
};
