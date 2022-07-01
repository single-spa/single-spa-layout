import { matchRoute, SslRouterContent } from '../../isomorphic/index.js';
import { renderLayoutData } from './renderLayoutData.js';
import { renderSingleNode } from './renderSingleNode.js';
import { RenderArgs } from './types.js';

export const renderRouter = (node: SslRouterContent, args: RenderArgs) => {
  const {
    renderOptions: {
      serverLayout: { resolvedConfig },
      urlPath,
    },
  } = args;
  const { childNodes } = matchRoute(resolvedConfig, urlPath);
  childNodes.forEach(childNode => renderSingleNode(childNode, args));
  renderLayoutData(node, args);
};
