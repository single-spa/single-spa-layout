import { resolvePath } from "./matchRoute";
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
    const path = location[resolvedRoutes.mode === "hash" ? "hash" : "pathname"];

    if (!path.startsWith(baseWithoutSlash)) {
      // Base URL doesn't match, no need to recurse routes
      return;
    }

    const parentContainer =
      typeof resolvedRoutes.containerEl === "string"
        ? document.querySelector(resolvedRoutes.containerEl)
        : resolvedRoutes.containerEl;

    recurseChildren({
      path,
      pathMatch: baseWithoutSlash,
      children: resolvedRoutes.children,
      parentContainer,
      shouldMount: true,
    });
  }

  function handleAppChange({ detail: { appsByNewStatus } }) {
    appsByNewStatus.NOT_MOUNTED.concat(appsByNewStatus.NOT_LOADED).forEach(
      (name) => {
        const applicationElement = getApplicationElement(name);
        if (applicationElement.isConnected) {
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
 * children: Array<import('./constructRoutes').RouteChild>,
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
function recurseChildren({
  path,
  pathMatch,
  children,
  parentContainer,
  previousSibling,
  shouldMount,
}) {
  children.forEach((child) => {
    if (child.type === "application") {
      const applicationContainer = getContainerEl(parentContainer, child);
      const applicationElement = getApplicationElement(child.name);

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
      const childPathMatch = resolvePath(pathMatch, child.path);
      previousSibling = recurseChildren({
        path,
        pathMatch: childPathMatch,
        children: child.children,
        parentContainer: getContainerEl(parentContainer, child),
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
 * @param {import('./constructRoutes').RouteChild} child
 * @returns {HTMLElement}
 */
function getContainerEl(parentContainer, child) {
  let container;

  if (child.containerEl) {
    if (typeof child.containerEl === "string") {
      // try scoped/nested within parentContainer
      container = parentContainer.querySelector(child.containerEl);

      if (!container) {
        // otherwise allow for reaching outside of parentContainer
        container = document.querySelector(child.containerEl);
      }
    } else {
      container = child.containerEl;
    }
  }

  if (!container) {
    container = parentContainer;
  }

  return container;
}

/**
 *
 * @param {import('./constructRoutes').RouteChild} child
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
