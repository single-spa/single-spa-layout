import { matchRoute, resolvePath } from "./matchRoute";
import { inBrowser } from "./environment-helpers";

/**
 * @typedef {{
 * activate() => void;
 * deactivate() => void;
 * isActive() => boolean;
 * }} LayoutEngine
 *
 * @typedef {{
 * routes: import('./constructRoutes').ResolvedRoutesConfig;
 * applications: Array<import('single-spa').RegisterApplicationConfig & import('./constructApplications').WithLoadFunction>;
 * }} LayoutEngineOptions
 *
 * @param {LayoutEngineOptions} layoutEngineOptions
 * @returns {LayoutEngine}
 */
export function constructLayoutEngine({
  routes: resolvedRoutes,
  applications,
}) {
  let active = false;
  let pendingRemovals = [];

  const baseWithoutSlash = resolvedRoutes.base.slice(
    0,
    resolvedRoutes.base.length - 1
  );

  const layoutEngine = {
    isActive: () => active,
    activate() {
      if (active) {
        return;
      } else {
        active = true;
      }

      if (inBrowser) {
        window.addEventListener(
          "single-spa:before-mount-routing-event",
          arrangeDomElements
        );

        window.addEventListener("single-spa:app-change", handleAppChange);

        arrangeDomElements();
      }
    },
    deactivate() {
      if (!active) {
        return;
      } else {
        active = false;
      }

      if (inBrowser) {
        window.removeEventListener(
          "single-spa:before-mount-routing-event",
          arrangeDomElements
        );

        window.removeEventListener("single-spa:app-change", handleAppChange);
      }
    },
  };

  layoutEngine.activate();

  return layoutEngine;

  function arrangeDomElements() {
    const path = location[resolvedRoutes.mode === "hash" ? "hash" : "pathname"];

    if (!path.startsWith(baseWithoutSlash)) {
      // Base URL doesn't match, no need to recurse routes
      return;
    }

    const parentContainer =
      typeof resolvedRoutes.containerEl === "string"
        ? document.querySelector(resolvedRoutes.containerEl)
        : resolvedRoutes.containerEl;

    recurseRoutes({
      path,
      pathMatch: baseWithoutSlash,
      routes: resolvedRoutes.routes,
      parentContainer,
      shouldMount: true,
      pendingRemovals,
    });
  }

  function handleAppChange({ detail: { appsByNewStatus } }) {
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
 * path: string,
 * pathMatch: string,
 * routes: Array<import('./constructRoutes').Route>,
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
  path,
  pathMatch,
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
      const childPathMatch = resolvePath(pathMatch, route.path);
      previousSibling = recurseRoutes({
        path,
        pathMatch: childPathMatch,
        routes: route.routes,
        parentContainer,
        previousSibling,
        shouldMount: shouldMount && path.startsWith(childPathMatch),
        pendingRemovals,
      });
    } else if (route instanceof Node) {
      if (shouldMount) {
        if (!route.connectedNode) {
          const newNode = route.cloneNode(false);
          insertNode(newNode, parentContainer, previousSibling);
          route.connectedNode = newNode;
        }

        recurseRoutes({
          path,
          pathMatch,
          routes: route.routes,
          parentContainer: route.connectedNode,
          previousSibling: null,
          shouldMount,
          pendingRemovals,
        });

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
 *
 * @param {Node} node
 * @param {Node} container
 * @param {Node=} previousSibling
 */
function insertNode(node, container, previousSibling) {
  if (previousSibling) {
    // move to be immediately after previousSibling
    previousSibling.insertAdjacentElement("afterend", node);
  } else if (node.parentNode !== container) {
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

function applicationElementId(name) {
  return `single-spa-application:${name}`;
}
