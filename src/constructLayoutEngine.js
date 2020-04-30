import { matchRoute, resolvePath } from "./matchRoute";

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

      arrangeDomElements();
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
    const matchedRoutes = matchRoute(resolvedRoutes, path);

    const initialContainer =
      typeof resolvedRoutes.containerEl === "string"
        ? document.querySelector(resolvedRoutes.containerEl)
        : resolvedRoutes.containerEl;

    recurseRoutes(matchedRoutes.routes, initialContainer);
  }
}

/**
 *
 * @param {Array<import('./constructRoutes').Route>} routes
 * @param {HTMLElement} parentContainer
 * @param {HTMLElement=} previousSibling
 * @returns {HTMLElement}
 */
function recurseRoutes(routes, parentContainer, previousSibling) {
  routes.forEach((route) => {
    if (route.type === "application") {
      const applicationContainer = getContainerEl(parentContainer, route);
      const applicationElement = getApplicationElement(route);

      // console.log('applicationContainer', applicationContainer)
      // console.log('element', applicationElement.id)
      // console.log('sibling', previousSibling && previousSibling.id)

      if (
        previousSibling &&
        previousSibling.parentNode === applicationContainer
      ) {
        // console.log('adjacent')
        // move to be immediately after previousSibling
        previousSibling.insertAdjacentElement("afterend", applicationElement);
      } else if (applicationElement.parentNode !== applicationContainer) {
        // console.log('append')
        // append to end of the container
        applicationContainer.appendChild(applicationElement);
      } else {
        // console.log('nothing')
      }

      // Only use this as the reference sibling node if it's within the parent container
      if (applicationContainer === parentContainer) {
        previousSibling = applicationElement;
      }
    } else {
      previousSibling = recurseRoutes(
        route.routes,
        getContainerEl(parentContainer, route),
        previousSibling
      );
    }

    return previousSibling;
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
