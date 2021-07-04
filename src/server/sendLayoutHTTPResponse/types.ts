import { ServerResponse } from "node:http";
import type { ServerLayout } from "../types.js";
import { MergeStream, StreamValue } from "./MergeStream.js";

export interface AppToRender {
  appName: string;
  propsPromise: Promise<Record<string, unknown>>;
}

export interface AppHeaders {
  appHeaders: Record<string, string>;
  appProps: Record<string, unknown>;
}

export type RenderResult =
  | StreamValue
  | { assets: StreamValue; content: StreamValue };

export interface RenderOptions {
  assembleFinalHeaders: (appHeaders: AppHeaders[]) => Record<string, string>;
  renderApplication: (
    appToRender: AppToRender
  ) => RenderResult | Promise<RenderResult>;
  renderFragment: (name: string) => StreamValue | Promise<StreamValue>;
  res: ServerResponse;
  retrieveApplicationHeaders: (
    appToRender: AppToRender
  ) => Promise<Record<string, string>>;
  retrieveProp: (name: string) => unknown | Promise<unknown>;
  serverLayout: ServerLayout;
  urlPath: string;
}

export interface RenderArgs {
  applicationPropPromises: Record<string, Promise<Record<string, unknown>>>;
  assetsStream: MergeStream;
  bodyStream: MergeStream;
  headerPromises: Record<string, Promise<Record<string, string>>>;
  propPromises: Record<string, Promise<unknown>>;
  renderOptions: RenderOptions;
}
