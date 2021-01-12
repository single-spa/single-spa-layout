import { inBrowser } from "../utils/environment-helpers";
import {
  addErrorHandler,
  mountRootParcel,
  removeErrorHandler,
  getAppStatus,
  SKIP_BECAUSE_BROKEN,
  LOAD_ERROR,
  navigateToUrl,
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
  let pendingRemovals = [];
  let pendingMakeVisibles = [];
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
        handleRoutingEvent();
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

  function beforeRoute({ detail: { newAppStatuses, cancelNavigation } }) {
    const path = getPath(resolvedRoutes);

    for (let from in resolvedRoutes.redirects) {
      const to = resolvedRoutes.redirects[from];

      if (from === path) {
        if (!cancelNavigation) {
          throw Error(
            `single-spa-layout: <redirect> requires single-spa@>=5.7.0`
          );
        }
        cancelNavigation();
        navigateToUrl(to);
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

  function arrangeDomElements(evt) {
    const path = getPath(resolvedRoutes);

    if (path.indexOf(baseWithoutSlash) !== 0) {
      // Base URL doesn't match, no need to recurse routes
      return;
    }

    const parentContainer =
      typeof resolvedRoutes.containerEl === "string"
        ? document.querySelector(resolvedRoutes.containerEl)
        : resolvedRoutes.containerEl;

    const location = evt ? strToLocation(evt.detail.newUrl) : window.location;

    recurseRoutes({
      location,
      routes: resolvedRoutes.routes,
      parentContainer,
      shouldMount: true,
      pendingRemovals,
      pendingMakeVisibles,
    });
  }

  function handleRoutingEvent(evt) {
    pendingRemovals.forEach((remove) => remove());
    pendingRemovals = [];

    if (evt) {
      const {
        detail: { appsByNewStatus },
      } = evt;

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

    pendingMakeVisibles.forEach((makeVisible) => makeVisible());
    pendingMakeVisibles = [];
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
  pendingMakeVisibles,
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
        pendingInsertNode(
          applicationElement,
          parentContainer,
          previousSibling,
          pendingMakeVisibles
        );
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
        pendingMakeVisibles,
      });
    } else if (route instanceof Node || typeof route.type === "string") {
      if (shouldMount) {
        if (!route.connectedNode) {
          const newNode =
            route instanceof Node ? route.cloneNode(false) : jsonToDom(route);
          route.connectedNode = newNode;
        }

        pendingInsertNode(
          route.connectedNode,
          parentContainer,
          previousSibling,
          pendingMakeVisibles
        );

        if (route.routes) {
          recurseRoutes({
            location,
            routes: route.routes,
            parentContainer: route.connectedNode,
            previousSibling: null,
            shouldMount,
            pendingRemovals,
            pendingMakeVisibles,
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
 * This function is called when application container elements need
 * to be appended to the dom, but no new nodes should be visible.
 *
 * @param {Node} node
 * @param {Node} container
 * @param {Node=} previousSibling
 * @param {Array} pendingMakeVisibles
 */
function pendingInsertNode(
  node,
  container,
  previousSibling,
  pendingMakeVisibles
) {
  switch (node.nodeType) {
    // Element
    case 1:
      // Insert the element, but hidden
      const originalDisplay = node.style.display;
      node.style.display = "none";
      pendingMakeVisibles.push(() => {
        node.style.display = originalDisplay;
        if (node.getAttribute("style") === "") {
          node.removeAttribute("style");
        }
      });
      insertNode(node, container, previousSibling);
      break;

    // Text
    case 3:
      // Since you can't hide text content (css display: none doesn't apply to text nodes),
      // we insert an empty string text node and then replace it with a new node
      // once we're ready to show the text.
      const placeholderNode = document.createTextNode("");
      insertNode(placeholderNode, container, previousSibling);

      pendingMakeVisibles.push(() => {
        container.replaceChild(node, placeholderNode);
      });
      break;

    // Comment nodes and any other nodes
    default:
      insertNode(node, container, previousSibling);
      break;
  }
}

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

function getPath(resolvedRoutes) {
  return location[resolvedRoutes.mode === "hash" ? "hash" : "pathname"];
}

function strToLocation(str) {
  if (typeof URL !== "undefined") {
    return new URL(str);
  } else {
    // IE11 doesn't support new URL
    const a = document.createElement("a");
    a.href = str;
    return a;
  }
}
