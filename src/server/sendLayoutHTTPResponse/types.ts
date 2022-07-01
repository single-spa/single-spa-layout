import { ServerResponse } from 'node:http';
import type { ServerLayout } from '../types.js';
import { MergeStream, StreamInput, StreamValue } from './MergeStream.js';

export interface AppToRender {
  appName: string;
  propsPromise: Promise<Record<string, unknown>>;
}

export interface AppHeaders {
  appHeaders: Record<string, string>;
  appProps: Record<string, unknown>;
}

export interface RenderResult {
  assets?: StreamInput;
  content: StreamInput;
  props?: {} | Promise<{}>;
}

export interface RenderOptions {
  assembleFinalHeaders: (appHeaders: AppHeaders[]) => Record<string, string>;
  renderApplication: (appToRender: AppToRender) => RenderResult;
  renderFragment: (name: string) => StreamValue | Promise<StreamValue>;
  res: ServerResponse;
  retrieveApplicationHeaders: (
    appToRender: AppToRender,
  ) => Promise<Record<string, string>>;
  retrieveProp: (name: string) => unknown | Promise<unknown>;
  serverLayout: ServerLayout;
  urlPath: string;
}

export interface RenderArgs {
  applicationPropPromises: Record<string, Promise<Record<string, unknown>>>;
  assetsStream: MergeStream;
  dataStream: MergeStream;
  bodyStream: MergeStream;
  headerPromises: Record<string, Promise<Record<string, string>>>;
  propPromises: Record<string, Promise<unknown>>;
  renderOptions: RenderOptions;
}
