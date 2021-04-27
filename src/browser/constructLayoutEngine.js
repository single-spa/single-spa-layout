import { inBrowser } from "../utils/environment-helpers";
import {
  addErrorHandler,
  mountRootParcel,
  removeErrorHandler,
  getAppStatus,
  SKIP_BECAUSE_BROKEN,
  LOAD_ERROR,
  navigateToUrl,
  getAppNames,
  checkActivityFunctions,
  getMountedApps,
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
}) {
  let isActive = false;
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
        window.addEventListener("single-spa:before-routing-event", beforeRoute);

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
          beforeRoute
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

    if (process.env.BABEL_ENV !== "test") {
      setTimeout(() => {
        throw err;
      });
    }
  }

  function beforeRoute({
    detail: { newAppStatuses, cancelNavigation, newUrl },
  }) {
    const path = getPath(resolvedRoutes, strToLocation(newUrl));

    for (let from in resolvedRoutes.redirects) {
      const to = resolvedRoutes.redirects[from];

      if (from === path) {
        if (!cancelNavigation) {
          throw Error(
            `single-spa-layout: <redirect> requires single-spa@>=5.7.0`
          );
        }

        // Calling cancelNavigation sends us back to the old URL
        cancelNavigation();

        // We must wait until single-spa starts sending us back to the old URL
        // before attempting to send to the redirect URL
        setTimeout(() => {
          navigateToUrl(to);
        });
        return;
      }
    }

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
    const path = getPath(resolvedRoutes);

    if (path.indexOf(baseWithoutSlash) !== 0) {
      // Base URL doesn't match, no need to recurse routes
      return;
    }

    const parentContainer =
      typeof resolvedRoutes.containerEl === "string"
        ? document.querySelector(resolvedRoutes.containerEl)
        : resolvedRoutes.containerEl;

    // We need to move, not destroy + recreate, application container elements
    const applicationContainers = getMountedApps().reduce(
      (applicationContainers, appName) => {
        applicationContainers[appName] = document.getElementById(
          applicationElementId(appName)
        );
        return applicationContainers;
      },
      {}
    );

    recurseRoutes({
      location: window.location,
      routes: resolvedRoutes.routes,
      parentContainer,
      shouldMount: true,
      applicationContainers,
    });
  }

  function handleRoutingEvent({ detail: { newUrl } }) {
    const appsToUnmount = [];
    const appsThatShouldBeActive = checkActivityFunctions(
      newUrl ? strToLocation(newUrl) : location
    );

    getAppNames().forEach((app) => {
      if (appsThatShouldBeActive.indexOf(app) < 0) {
        appsToUnmount.push(app);
      }
    });

    appsToUnmount.forEach((name) => {
      if (errorParcelByAppName[name]) {
        errorParcelByAppName[name].unmount();
        delete errorParcelByAppName[name];
      }

      const applicationElement = document.getElementById(
        applicationElementId(name)
      );
      if (applicationElement && applicationElement.isConnected) {
        applicationElement.parentNode.removeChild(applicationElement);
      }
    });
  }
}

/**
 * @typedef {{
 * location: URL,
 * routes: Array<import('../isomorphic/constructRoutes').RouteChild>,
 * parentContainer: HTMLElement,
 * previousSibling?: HTMLElement,
 * shouldMount: boolean;
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
  applicationContainers,
}) {
  routes.forEach((route, index) => {
    if (route.type === "application") {
      if (shouldMount) {
        let applicationElement;
        const htmlId = applicationElementId(route.name);

        if (applicationContainers[route.name]) {
          // The application is already active, we just need to
          // place it in the correct part of the DOM. Importantly,
          // we need to reuse the DOM element instead of destroying/recreating
          applicationElement = applicationContainers[route.name];
        } else if (document.getElementById(htmlId)) {
          // The application container exists but is not yet in use.
          applicationElement = document.getElementById(htmlId);
        } else {
          // The application isn't active yet, nor the container, so we need to create it
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
        applicationContainers,
      });
    } else if (route instanceof Node || typeof route.type === "string") {
      if (shouldMount) {
        if (!route.connectedNode) {
          const newNode =
            route instanceof Node ? route.cloneNode(false) : jsonToDom(route);
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
            applicationContainers,
          });
        }

        previousSibling = route.connectedNode;
      } else {
        removeNode(route.connectedNode);
        delete route.connectedNode;
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
 * This function inserts a node right after the previousSibling, if provided.
 * If previousSibling is not provided, this functions inserts the node as the
 * first child node of container.
 *
 * @param {Node} node
 * @param {Node} container
 * @param {Node=} previousSibling
 */
function insertNode(node, container, previousSibling) {
  const nextSibling = previousSibling
    ? previousSibling.nextSibling
    : container.firstChild;

  // Only call insertBefore() if necessary
  // https://github.com/single-spa/single-spa-layout/issues/123
  if (nextSibling !== node) {
    container.insertBefore(node, nextSibling);
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

/*
 * The json object here is expected to be a parse5 representation
 * of the dom element.
 *
 * Example: {type: 'div', attrs: [{"class": "blue"}]}
 */
function jsonToDom(obj) {
  if (obj.type.toLowerCase() === "#text") {
    return document.createTextNode(obj.value);
  } else if (obj.type.toLowerCase() === "#comment") {
    return document.createComment(obj.value);
  }
  {
    const node = document.createElement(obj.type);

    (obj.attrs || []).forEach((attr) => {
      node.setAttribute(attr.name, attr.value);
    });

    if (node.routes) {
      node.routes.forEach((route) => {
        node.appendChild(jsonToDom(route));
      });
    }

    return node;
  }
}

function brokenStatus(status) {
  return status === SKIP_BECAUSE_BROKEN || status === LOAD_ERROR;
}

function getPath(resolvedRoutes, l = location) {
  return l[resolvedRoutes.mode === "hash" ? "hash" : "pathname"];
}

function strToLocation(str) {
  try {
    return new URL(str);
  } catch (err) {
    // IE11
    const a = document.createElement("a");
    a.href = str;
    return a;
  }
}
