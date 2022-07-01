import { serializeDoctypeContent } from 'parse5-htmlparser2-tree-adapter';
import { SslDocumentType } from '../../isomorphic/index.js';
import { RenderArgs } from './types.js';

export const renderDocType = (
  { name }: SslDocumentType,
  { bodyStream }: RenderArgs,
) => bodyStream.add(`<${serializeDoctypeContent(name, '', '')}>`);
