import { sslResolvedNode, SslResolvedNode } from '../../isomorphic/index.js';
import { renderApplication } from './renderApplication.js';
import { renderAssets } from './renderAssets.js';
import { renderChildNodes } from './renderChildNodes.js';
import { renderComment } from './renderComment.js';
import { renderData } from './renderData.js';
import { renderDocType } from './renderDocType.js';
import { renderElement } from './renderElement.js';
import { renderFragment } from './renderFragment.js';
import { renderNode } from './renderNode.js';
import { renderRouter } from './renderRouter.js';
import { renderText } from './renderText.js';
import { RenderArgs } from './types.js';

export const renderSingleNode = (node: SslResolvedNode, args: RenderArgs) => {
  if (sslResolvedNode.isResolvedApplication(node))
    return renderApplication(node, args);
  if (sslResolvedNode.isResolvedRoute(node))
    return renderChildNodes(node, args);
  if (sslResolvedNode.isRouter(node)) return renderRouter(node, args);
  if (sslResolvedNode.isAssets(node)) return renderAssets(node, args);
  if (sslResolvedNode.isData(node)) return renderData(node, args);
  if (sslResolvedNode.isFragment(node)) return renderFragment(node, args);
  if (sslResolvedNode.isNode(node)) return renderNode(node, args);
  if (sslResolvedNode.isElement(node)) return renderElement(node, args);
  if (sslResolvedNode.isText(node)) return renderText(node, args);
  if (sslResolvedNode.isComment(node)) return renderComment(node, args);
  if (sslResolvedNode.isDocType(node)) return renderDocType(node, args);
  console.error(node);
  throw Error(`Unable to stream node: ${node.nodeName}`);
};
