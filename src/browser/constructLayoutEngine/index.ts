import { addErrorHandler, Parcel, removeErrorHandler } from 'single-spa';
import {
  getDataScript,
  inBrowser,
  layoutDataScriptId,
} from '../../utils/index.js';
import { createArrangeDomElements } from './createArrangeDomElements.js';
import { handleBeforeMountRouting } from './handleBeforeMountRouting.js';
import { handleBeforeRouting } from './handleBeforeRouting.js';
import { handleError } from './handleError.js';
import { handleRouting } from './handleRouting.js';
import { hydrate } from './hydrate.js';
import type { LayoutEngine, LayoutEngineOptions } from './types.js';
import { getParentContainer } from './utils.js';

export * from './types.js';

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
    errorParcelByAppName,
  );
  const errorHandler = handleError(config, errorParcelByAppName);
  const routingHandler = handleRouting();
  const wasServerRendered = inBrowser && !!getDataScript(layoutDataScriptId);
  let isActive = false;
  const layoutEngine: LayoutEngine = {
    activate: () => {
      if (isActive) return;
      isActive = true;
      if (!inBrowser) return;
      window.addEventListener(
        'single-spa:before-mount-routing-event',
        beforeMountRoutingHandler,
      );
      window.addEventListener(
        'single-spa:before-routing-event',
        beforeRoutingHandler,
      );
      window.addEventListener('single-spa:routing-event', routingHandler);
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
        'single-spa:before-mount-routing-event',
        beforeMountRoutingHandler,
      );
      window.removeEventListener(
        'single-spa:before-routing-event',
        beforeRoutingHandler,
      );
      window.removeEventListener('single-spa:routing-event', routingHandler);
      removeErrorHandler(errorHandler);
    },
    isActive: () => isActive,
  };
  if (!active) layoutEngine.activate();
  return layoutEngine;
};
