import { applicationElementId } from "./constructLayoutEngine";
import { mountRootParcel } from "single-spa";
import { inBrowser } from "../utils/environment-helpers.js";
import { find } from "../utils/find.js";
import { htmlToParcelConfig } from "../utils/parcel-utils";
import { ResolvedRoutesConfig } from "../isomorphic/constructRoutes.js";
import { ActivityFn } from "single-spa";
import { ParcelConfig } from "single-spa";
import { LifeCycles } from "single-spa";
import { Activity } from "single-spa";
import { ResolvedRouteChild } from "../isomorphic/constructRoutes.js";

interface ConstructApplicationsOptions {
  routes: ResolvedRoutesConfig;
  loadApp({ name: string }): Promise<LifeCycles>;
}

interface AppRoute {
  props: Record<string, any>;
  activeWhen: ActivityFn;
  loader?: string | ParcelConfig;
}

type ApplicationMap = Recorod<string, AppRoute[]>;

interface SingleSpaLayoutApplication {
  name: string;
  customProps(name: string, location: Location | URL): Record<string, any>;
  activeWhen: Activity;
  app(): Promise<LifeCycles>;
}

export function constructApplications({
  routes,
  loadApp,
}: ConstructApplicationsOptions): SingleSpaLayoutApplication[] {
  const applicationMap: ApplicationMap = {};

  recurseRoutes(applicationMap, topLevelActiveWhen, {}, routes.routes);

  return Object.keys(applicationMap).map((name) => {
    const appRoutes: AppRoute = applicationMap[name];
    return {
      name,
      customProps: (_name, location) => {
        const appRoute = find(appRoutes, (appRoute) =>
          appRoute.activeWhen(location),
        );
        return appRoute ? appRoute.props : {};
      },
      activeWhen: appRoutes.map((appRoute) => appRoute.activeWhen),
      app: () => {
        let appRoute;
        if (inBrowser) {
          appRoute = find(appRoutes, (appRoute) =>
            appRoute.activeWhen(window.location),
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

function recurseRoutes(
  applicationMap: ApplicationMap,
  activeWhen: ActivityFn,
  props: object,
  routes: ResolvedRouteChild[],
): void {
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
        route.routes,
      );
    } else if (route.routes) {
      recurseRoutes(applicationMap, activeWhen, props, route.routes);
    }
  });
}

function mergeProps(originalProps: object, newProps: object = {}): object {
  return { ...originalProps, ...newProps };
}

function topLevelActiveWhen(): boolean {
  // All applications not under routes are active
  return true;
}

let applicationEl: HTMLElement;

function placeLoader(
  appName: string,
  appRoute: AppRoute,
  loadingPromise: Promise<void>,
): void {
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
          makeElementVisible,
        );
      };
      window.addEventListener(
        "single-spa:before-mount-routing-event",
        makeElementVisible,
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
      },
    );
  });
}
