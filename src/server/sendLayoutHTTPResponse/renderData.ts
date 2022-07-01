import { SslData } from '../../isomorphic/index.js';
import { RenderArgs } from './types.js';

export const renderData = (
  _: SslData,
  { dataStream, bodyStream }: RenderArgs,
) => bodyStream.add(dataStream);
