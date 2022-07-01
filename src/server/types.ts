import { ResolvedRoutesConfig, SslDocument } from '../isomorphic/index.js';

export interface ServerLayout {
  parsedDocument: SslDocument;
  resolvedConfig: ResolvedRoutesConfig;
}

export type HTMLTemplateOptions = { filePath: string } | { html: string };
