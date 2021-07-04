import { SingleSpaCustomEventDetail } from "single-spa";
import { ResolvedRoutesConfig } from "../../isomorphic/index.js";
import { SingeSpaEvent } from "../utils.js";

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
  ev: CustomEvent<SingleSpaCustomEventDetail>
) => void;

declare global {
  interface Window {
    addEventListener(
      type: SingeSpaEvent,
      listener: SingleSpaEventListener
    ): void;
    removeEventListener(
      type: SingeSpaEvent,
      listener: SingleSpaEventListener
    ): void;
  }
}
