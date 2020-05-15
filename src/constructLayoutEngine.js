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
    let path = location[resolvedRoutes.mode === "hash" ? "hash" : "pathname"];

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
    });
  }

  function handleAppChange({ detail: { appsByNewStatus } }) {
    appsByNewStatus.NOT_MOUNTED.concat(appsByNewStatus.NOT_LOADED).forEach(
      (name) => {
        remove(getApplicationElement(name))();
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
}) {
  routes.forEach((route) => {
    if (route.type === "application") {
      const applicationContainer = getContainerEl(parentContainer, route);
      const applicationElement = getApplicationElement(route.name);

      if (shouldMount) {
        if (
          previousSibling &&
          previousSibling.parentNode === applicationContainer
        ) {
          // move to be immediately after previousSibling
          previousSibling.insertAdjacentElement("afterend", applicationElement);
        } else if (applicationElement.parentNode !== applicationContainer) {
          // append to end of the container
          applicationContainer.appendChild(applicationElement);
        }

        // Only use this as the reference sibling node if it's within the parent container
        if (applicationContainer === parentContainer) {
          previousSibling = applicationElement;
        }
      }
    } else {
      const childPathMatch = resolvePath(pathMatch, route.path);
      previousSibling = recurseRoutes({
        path,
        pathMatch: childPathMatch,
        routes: route.routes,
        parentContainer: getContainerEl(parentContainer, route),
        previousSibling,
        shouldMount: shouldMount && path.startsWith(childPathMatch),
      });
    }
  });

  return previousSibling;
}

/**
 *
 * @param {HTMLElement} parentContainer
 * @param {import('./constructRoutes').Route} route
 * @returns {HTMLElement}
 */
function getContainerEl(parentContainer, route) {
  let container;

  if (route.containerEl) {
    if (typeof route.containerEl === "string") {
      // try scoped/nested within parentContainer
      container = parentContainer.querySelector(route.containerEl);

      if (!container) {
        // otherwise allow for reaching outside of parentContainer
        container = document.querySelector(route.containerEl);
      }
    } else {
      container = route.containerEl;
    }
  }

  if (!container) {
    container = parentContainer;
  }

  return container;
}

/**
 *
 * @param {import('./constructRoutes').Route} route
 * @returns {HTMLElement}
 */
function getApplicationElement(name) {
  const htmlId = `single-spa-application:${name}`;

  let element = document.getElementById(htmlId);

  if (!element) {
    element = document.createElement("div");
    element.id = htmlId;
  }

  return element;
}

function append(element, parent) {
  return () => {
    parent.appendChild(element);
  };
}

function insertAfter(element, sibling) {
  return () => {
    sibling.insertAdjacentElement("afterend", element);
  };
}

function remove(element) {
  return () => {
    if (element.isConnected) {
      // IE11 doesn't support .remove()
      element.parentNode.removeChild(element);
    }
  };
}
