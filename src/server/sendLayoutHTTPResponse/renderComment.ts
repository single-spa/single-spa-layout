import { SslCommentNode } from '../../isomorphic/index.js';
import { RenderArgs } from './types.js';

export const renderComment = (
  { data }: SslCommentNode,
  { bodyStream }: RenderArgs,
) => bodyStream.add(`<!--${data}-->`);
