import { inBrowser } from "../utils/environment-helpers";
import {
  addErrorHandler as singleSpaAddErrorHandler,
  mountRootParcel,
  removeErrorHandler,
  getAppStatus as singleSpaGetAppStatus,
  SKIP_BECAUSE_BROKEN,
  LOAD_ERROR,
} from "single-spa";
import { htmlToParcelConfig } from "../utils/parcel-utils";

/**
 * @typedef {{
 * activate() => void;
 * deactivate() => void;
 * isActive() => boolean;
 * }} LayoutEngine
 *
 * @typedef {{
 * routes: import('../isomorphic/constructRoutes').ResolvedRoutesConfig;
 * applications: Array<import('single-spa').RegisterApplicationConfig & import('./constructApplications').WithLoadFunction>;
 * active?: boolean;
 * }} LayoutEngineOptions
 *
 * @param {LayoutEngineOptions} layoutEngineOptions
 * @returns {LayoutEngine}
 */
export function constructLayoutEngine({
  routes: resolvedRoutes,
  applications,
  active = true,
  // secretly used for tests, but not exposed in typescript or docs
  // was too lazy to mock all of single-spa, including pathToActiveWhen
  addErrorHandler = singleSpaAddErrorHandler,
  getAppStatus = singleSpaGetAppStatus,
}) {
  let isActive = false;
  let pendingRemovals = [];
  let errorParcelByAppName = {};

  const baseWithoutSlash = resolvedRoutes.base.slice(
    0,
    resolvedRoutes.base.length - 1
  );

  const layoutEngine = {
    isActive: () => isActive,
    activate() {
      if (isActive) {
        return;
      } else {
        isActive = true;
      }

      if (inBrowser) {
        window.addEventListener(
          "single-spa:before-routing-event",
          unmountErrorParcels
        );

        window.addEventListener(
          "single-spa:before-mount-routing-event",
          arrangeDomElements
        );

        window.addEventListener("single-spa:routing-event", handleRoutingEvent);

        addErrorHandler(errorHandler);

        arrangeDomElements();
      }
    },
    deactivate() {
      if (!isActive) {
        return;
      } else {
        isActive = false;
      }

      if (inBrowser) {
        window.removeEventListener(
          "single-spa:before-routing-event",
          unmountErrorParcels
        );

        window.removeEventListener(
          "single-spa:before-mount-routing-event",
          arrangeDomElements
        );

        window.removeEventListener(
          "single-spa:routing-event",
          handleRoutingEvent
        );

        removeErrorHandler(errorHandler);
      }
    },
  };

  if (active) {
    layoutEngine.activate();
  }

  return layoutEngine;

  function errorHandler(err) {
    const applicationRoute = findApplicationRoute({
      applicationName: err.appOrParcelName,
      location: window.location,
      routes: resolvedRoutes.routes,
    });
    if (applicationRoute && applicationRoute.error) {
      const applicationDomContainer = document.getElementById(
        applicationElementId(applicationRoute.name)
      );
      const parcelConfig =
        typeof applicationRoute.error === "string"
          ? htmlToParcelConfig(applicationRoute.error)
          : applicationRoute.error;
      errorParcelByAppName[applicationRoute.name] = mountRootParcel(
        parcelConfig,
        {
          domElement: applicationDomContainer,
        }
      );
    }
  }

  function unmountErrorParcels({ detail: { newAppStatuses } }) {
    for (let appName in newAppStatuses) {
      if (
        errorParcelByAppName[appName] &&
        brokenStatus(getAppStatus(appName)) &&
        !brokenStatus(newAppStatuses[appName])
      ) {
        errorParcelByAppName[appName].unmount();
        delete errorParcelByAppName[appName];
      }
    }
  }

  function arrangeDomElements() {
    const path = location[resolvedRoutes.mode === "hash" ? "hash" : "pathname"];

    if (path.indexOf(baseWithoutSlash) !== 0) {
      // Base URL doesn't match, no need to recurse routes
      return;
    }

    const parentContainer =
      typeof resolvedRoutes.containerEl === "string"
        ? document.querySelector(resolvedRoutes.containerEl)
        : resolvedRoutes.containerEl;

    recurseRoutes({
      location: window.location,
      routes: resolvedRoutes.routes,
      parentContainer,
      shouldMount: true,
      pendingRemovals,
    });
  }

  function handleRoutingEvent({ detail: { appsByNewStatus } }) {
    pendingRemovals.forEach((remove) => remove());
    pendingRemovals = [];

    appsByNewStatus.NOT_MOUNTED.concat(appsByNewStatus.NOT_LOADED).forEach(
      (name) => {
        const applicationElement = document.getElementById(
          applicationElementId(name)
        );
        if (applicationElement && applicationElement.isConnected) {
          applicationElement.parentNode.removeChild(applicationElement);
        }
      }
    );
  }
}

/**
 * @typedef {{
 * location: URL,
 * routes: Array<import('../isomorphic/constructRoutes').RouteChild>,
 * parentContainer: HTMLElement,
 * previousSibling?: HTMLElement,
 * shouldMount: boolean;
 * pendingRemovals: Array<Function>;
 * }} DomChangeInput
 *
 * We do all of this in a single recursive pass for performance, even though
 * it makes the code a bit messier
 *
 * @param {DomChangeInput} input
 * @returns {HTMLElement}
 */
function recurseRoutes({
  location,
  routes,
  parentContainer,
  previousSibling,
  shouldMount,
  pendingRemovals,
}) {
  routes.forEach((route, index) => {
    if (route.type === "application") {
      const htmlId = applicationElementId(route.name);
      let applicationElement = document.getElementById(htmlId);

      if (shouldMount) {
        if (!applicationElement) {
          applicationElement = document.createElement("div");
          applicationElement.id = htmlId;
        }
        insertNode(applicationElement, parentContainer, previousSibling);
        previousSibling = applicationElement;
      }
    } else if (route.type === "route") {
      previousSibling = recurseRoutes({
        location,
        routes: route.routes,
        parentContainer,
        previousSibling,
        shouldMount: shouldMount && route.activeWhen(location),
        pendingRemovals,
      });
    } else if (route instanceof Node) {
      if (shouldMount) {
        if (!route.connectedNode) {
          const newNode = route.cloneNode(false);
          route.connectedNode = newNode;
        }

        insertNode(route.connectedNode, parentContainer, previousSibling);

        if (route.routes) {
          recurseRoutes({
            location,
            routes: route.routes,
            parentContainer: route.connectedNode,
            previousSibling: null,
            shouldMount,
            pendingRemovals,
          });
        }

        previousSibling = route.connectedNode;
      } else {
        // we should remove this dom element at the next single-spa:routing-event
        pendingRemovals.push(() => {
          removeNode(route.connectedNode);
          delete route.connectedNode;
        });
      }
    }
  });

  return previousSibling;
}

/**
 * @typedef {{
 * location: URL,
 * routes: Array<import('../isomorphic/constructRoutes').RouteChild>,
 * applicationName: string
 * }} FindApplicationRouteInput
 *
 * @param {FindApplicationRouteInput} input
 * @returns {import('./constructRoutes').Application}
 */
function findApplicationRoute({ applicationName, location, routes }) {
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];

    if (route.type === "application") {
      if (route.name === applicationName) {
        return route;
      }
    } else if (route.type === "route") {
      if (route.activeWhen(location)) {
        const routeResult = findApplicationRoute({
          applicationName,
          location,
          routes: route.routes,
        });
        if (routeResult) {
          return routeResult;
        }
      }
    } else if (route.routes) {
      const routeResult = findApplicationRoute({
        applicationName,
        location,
        routes: route.routes,
      });
      if (routeResult) {
        return routeResult;
      }
    }
  }
}

/**
 *
 * @param {Node} node
 * @param {Node} container
 * @param {Node=} previousSibling
 */
function insertNode(node, container, previousSibling) {
  if (previousSibling && previousSibling.nextSibling) {
    // move to be immediately after previousSibling
    previousSibling.parentNode.insertBefore(node, previousSibling.nextSibling);
  } else {
    // append to end of the container
    container.appendChild(node);
  }
}

/**
 *
 * @param {Node} node
 */
function removeNode(node) {
  if (node) {
    node.remove ? node.remove() : node.parentNode.removeChild(node);
  }
}

export function applicationElementId(name) {
  return `single-spa-application:${name}`;
}

function brokenStatus(status) {
  return status === SKIP_BECAUSE_BROKEN || status === LOAD_ERROR;
}
