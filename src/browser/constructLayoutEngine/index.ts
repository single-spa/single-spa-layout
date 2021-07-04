import { addErrorHandler, Parcel, removeErrorHandler } from "single-spa";
import { inBrowser } from "../../utils/index.js";
import { SingeSpaEvent } from "../utils.js";
import { createArrangeDomElements } from "./createArrangeDomElements.js";
import { handleBeforeMountRouting } from "./handleBeforeMountRouting.js";
import { handleBeforeRouting } from "./handleBeforeRouting.js";
import { handleError } from "./handleError.js";
import { handleRouting } from "./handleRouting.js";
import { hydrate } from "./hydrate.js";
import type { LayoutEngine, LayoutEngineOptions } from "./types.js";
import { getParentContainer } from "./utils.js";

export * from "./types.js";

export const constructLayoutEngine = ({
  config,
  active,
}: LayoutEngineOptions) => {
  const errorParcelByAppName: Record<string, Parcel> = {};
  const arrangeDomElements = createArrangeDomElements(config);
  const beforeMountRoutingHandler =
    handleBeforeMountRouting(arrangeDomElements);
  const beforeRoutingHandler = handleBeforeRouting(
    config,
    errorParcelByAppName
  );
  const errorHandler = handleError(config, errorParcelByAppName);
  const routingHandler = handleRouting();
  const wasServerRendered = inBrowser && !!window.singleSpaLayoutData;
  let isActive = false;
  const layoutEngine: LayoutEngine = {
    activate: () => {
      if (isActive) return;
      isActive = true;
      if (!inBrowser) return;
      window.addEventListener(
        SingeSpaEvent.BeforeMountRouting,
        beforeMountRoutingHandler
      );
      window.addEventListener(
        SingeSpaEvent.BeforeRouting,
        beforeRoutingHandler
      );
      window.addEventListener(SingeSpaEvent.Routing, routingHandler);
      addErrorHandler(errorHandler);
      wasServerRendered &&
        hydrate(getParentContainer(config.containerEl), config.childNodes);
      arrangeDomElements();
    },
    deactivate: () => {
      if (!isActive) return;
      isActive = false;
      if (!inBrowser) return;
      window.removeEventListener(
        SingeSpaEvent.BeforeMountRouting,
        beforeMountRoutingHandler
      );
      window.removeEventListener(
        SingeSpaEvent.BeforeRouting,
        beforeRoutingHandler
      );
      window.removeEventListener(SingeSpaEvent.Routing, routingHandler);
      removeErrorHandler(errorHandler);
    },
    isActive: () => isActive,
  };
  if (!active) layoutEngine.activate();
  return layoutEngine;
};
