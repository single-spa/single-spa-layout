import defaultTreeAdapter from "parse5/lib/tree-adapters/default.js";

export const treeAdapter = Object.assign({}, defaultTreeAdapter, {
  isElementNode(node) {
    return (
      defaultTreeAdapter.isElementNode(node) ||
      (node.type && !node.type.startsWith("#"))
    );
  },
  getChildNodes(node) {
    return defaultTreeAdapter.getChildNodes(node) || node.routes;
  },
  getTagName(node) {
    return defaultTreeAdapter.getTagName(node) || node.type;
  },
  isCommentNode(node) {
    return defaultTreeAdapter.isCommentNode(node) || node.type === "#comment";
  },
  isTextNode(node) {
    return defaultTreeAdapter.isTextNode(node) || node.type === "#text";
  },
  getCommentNodeContent(node) {
    return defaultTreeAdapter.getCommentNodeContent(node) || node.value;
  },
});
