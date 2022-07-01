import { SingleSpaCustomEventDetail } from 'single-spa';
import { ResolvedRoutesConfig } from '../../isomorphic/index.js';

export interface LayoutEngine {
  activate: () => void;
  deactivate: () => void;
  isActive: () => boolean;
}

export interface LayoutEngineOptions {
  active?: boolean;
  config: ResolvedRoutesConfig;
}

export type SingleSpaEventListener = (
  ev: CustomEvent<SingleSpaCustomEventDetail>,
) => void;

export type SingleSpaEvent =
  | 'single-spa:app-change'
  | 'single-spa:before-app-change'
  | 'single-spa:before-first-mount'
  | 'single-spa:before-mount-routing-event'
  | 'single-spa:before-no-app-change'
  | 'single-spa:before-routing-event'
  | 'single-spa:first-mount'
  | 'single-spa:no-app-change'
  | 'single-spa:routing-event';

declare global {
  interface Window {
    addEventListener(
      type: SingleSpaEvent,
      listener: SingleSpaEventListener,
    ): void;
    removeEventListener(
      type: SingleSpaEvent,
      listener: SingleSpaEventListener,
    ): void;
  }
}
