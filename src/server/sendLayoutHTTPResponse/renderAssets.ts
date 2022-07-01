import { SslAssets } from '../../isomorphic/index.js';
import { RenderArgs } from './types.js';

export const renderAssets = (
  _: SslAssets,
  { assetsStream, bodyStream }: RenderArgs,
) => bodyStream.add(assetsStream);
