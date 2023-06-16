import { applicationElementId } from "./constructLayoutEngine";
import { mountRootParcel } from "single-spa";
import { inBrowser } from "../utils/environment-helpers.js";
import { find } from "../utils/find.js";
import { htmlToParcelConfig } from "../utils/parcel-utils";

/**
 * @typedef {{
 * routes: import('./constructRoutes').ResolvedRoutesConfig;
 * loadApp: LoadApp;
 * }} ApplicationOptions
 *
 * @typedef {(config: import('single-spa').AppProps) => Promise<import('single-spa').Application>} LoadApp
 *
 * @typedef {{
 * app: (config: import('single-spa').AppProps) => Promise<import('single-spa').LifeCycles>
 * }} WithLoadFunction
 *
 * @typedef {{
 * [name: string]: Array<AppRoute>
 * }} ApplicationMap
 *
 * @typedef {{
 * props: object;
 * activeWhen: import('single-spa').ActivityFn;
 * loader?: string | import('single-spa').ParcelConfig;
 * }} AppRoute
 *
 * @param {ApplicationOptions} applicationOptions
 * @returns {Array<import('single-spa').RegisterApplicationConfig & WithLoadFunction>}
 */
export function constructApplications({ routes, loadApp }) {
  /** @type {ApplicationMap} */
  const applicationMap = {};

  recurseRoutes(applicationMap, topLevelActiveWhen, {}, routes.routes);

  /**
   * @type {Array<{
   * name: string;
   * customProps: object;
   * activeWhen: import('single-spa').Activity
   * }>}
   */
  return Object.keys(applicationMap).map((name) => {
    /** @type {AppRoute} */
    const appRoutes = applicationMap[name];
    return {
      name,
      customProps: (_name, location) => {
        const appRoute = find(appRoutes, (appRoute) =>
          appRoute.activeWhen(location)
        );
        return appRoute ? appRoute.props : {};
      },
      activeWhen: appRoutes.map((appRoute) => appRoute.activeWhen),
      app: () => {
        let appRoute;
        if (inBrowser) {
          appRoute = find(appRoutes, (appRoute) =>
            appRoute.activeWhen(window.location)
          );
        }

        const loadPromise = loadApp({ name });
        return appRoute && appRoute.loader
          ? placeLoader(name, appRoute, loadPromise)
          : loadPromise;
      },
    };
  });
}

/**
 *
 * @param {ApplicationMap} applicationMap
 * @param {import('single-spa').ActivityFn} activeWhen
 * @param {object} props
 * @param {Array<import('./constructRoutes').RouteChild>} routes
 * @returns void
 */
function recurseRoutes(applicationMap, activeWhen, props, routes) {
  routes.forEach((route) => {
    if (route.type === "application") {
      if (!applicationMap[route.name]) {
        applicationMap[route.name] = [];
      }

      applicationMap[route.name].push({
        activeWhen,
        props: mergeProps(props, route.props),
        loader: route.loader,
      });
    } else if (route.type === "route") {
      recurseRoutes(
        applicationMap,
        route.activeWhen,
        mergeProps(props, route.props),
        route.routes
      );
    } else if (route.routes) {
      recurseRoutes(applicationMap, activeWhen, props, route.routes);
    }
  });
}

function mergeProps(originalProps, newProps = {}) {
  return { ...originalProps, ...newProps };
}

function topLevelActiveWhen() {
  // All applications not under routes are active
  return true;
}

let applicationEl;

function placeLoader(appName, appRoute, loadingPromise) {
  return Promise.resolve().then(() => {
    // We need the application container element to place the loader into
    const htmlId = applicationElementId(appName);
    let applicationElement = document.getElementById(htmlId);
    let makeElementVisible;

    if (!applicationElement) {
      applicationElement = document.createElement("div");
      applicationElement.id = htmlId;
      // Wait for layout engine to place this dom element in correct location
      // before it's visible
      applicationElement.style.display = "none";

      document.body.appendChild(applicationElement);

      makeElementVisible = () => {
        applicationElement.style.removeProperty("display");
        if (applicationElement.getAttribute("style") === "") {
          applicationElement.removeAttribute("style");
        }

        window.removeEventListener(
          "single-spa:before-mount-routing-event",
          makeElementVisible
        );
      };
      window.addEventListener(
        "single-spa:before-mount-routing-event",
        makeElementVisible
      );
    }

    const parcelConfig =
      typeof appRoute.loader === "string"
        ? htmlToParcelConfig(appRoute.loader)
        : appRoute.loader;
    const parcel = mountRootParcel(parcelConfig, {
      name: `application-loader:${appName}`,
      domElement: applicationElement,
    });

    applicationEl = applicationElement;

    function finishUp() {
      return parcel.unmount().then(() => {
        if (makeElementVisible) {
          makeElementVisible();
        }
      });
    }

    return Promise.all([parcel.mountPromise, loadingPromise]).then(
      ([mountResult, app]) => {
        return finishUp().then(() => app);
      },
      (err) => {
        return finishUp().then(() => {
          // rethrow the error, so that the application's loading function
          // remains in rejected status
          throw err;
        });
      }
    );
  });
}
