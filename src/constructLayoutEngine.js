import { matchRoute } from "./matchRoute";

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

  return {
    isActive: () => active,
    activate() {
      if (active) {
        return;
      } else {
        active = true;
      }
      window.addEventListener(
        "single-spa:before-mount-routing-event",
        arrangeDomElements
      );
    },
    deactivate() {
      if (!active) {
        return;
      } else {
        active = false;
      }
      window.removeEventListener(
        "single-spa:before-mount-routing-event",
        arrangeDomElements
      );
    },
  };

  function arrangeDomElements() {
    const path = location[resolvedRoutes.mode === "hash" ? "hash" : "pathname"];

    // TODO memoize this for perf
    const matchedRoutes = matchRoute(resolvedRoutes.routes, path);

    recurseRoutes(matchedRoutes, resolvedRoutes.containerEl);
  }
}

/**
 *
 * @param {Array<import('./constructRoutes').Route>} routes
 * @param {HTMLElement} parentContainer
 * @param {HTMLElement=} previousSibling
 * @returns {void}
 */
function recurseRoutes(routes, parentContainer, previousSibling) {
  routes.forEach((route) => {
    if (route.type === "application") {
      const applicationContainer = getContainerEl(parentContainer, route);
      const applicationElement = getApplicationElement(route);

      if (
        previousSibling &&
        previousSibling.parentNode === applicationContainer
      ) {
        // move to be immediately after previousSibling
        applicationContainer.insertAdjacentElement(
          "afterend",
          applicationElement
        );
      } else {
        // append to end of the container
        applicationContainer.appendChild(applicationElement);
      }

      // Only use this as the reference sibling node if it's within the parent container
      if (applicationContainer === parentContainer) {
        previousSibling = applicationElement;
      }
    } else {
      recurseRoutes(
        route.routes,
        getContainerEl(parentContainer, route),
        previousSibling
      );
    }
  });
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
function getApplicationElement(route) {
  const htmlId = `single-spa-application:${route.name}`;

  let element = document.getElementById(htmlId);

  if (!element) {
    element = document.createElement("div");
    element.id = htmlId;
  }

  return element;
}
