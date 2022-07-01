import { ResolvedParent, SslParentNode } from '../../isomorphic/index.js';
import { renderSingleNode } from './renderSingleNode.js';
import type { RenderArgs } from './types.js';

export const renderChildNodes = (
  { childNodes }: SslParentNode | ResolvedParent,
  args: RenderArgs,
): void => childNodes?.forEach(childNode => renderSingleNode(childNode, args));
