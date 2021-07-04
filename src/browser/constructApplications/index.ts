import { RegisterApplicationConfig } from "single-spa";
import { ActiveWhen } from "../../isomorphic/index.js";
import { inBrowser } from "../../utils/index.js";
import { placeLoader } from "./placeLoader.js";
import { recurseRoutes } from "./recurseRoutes.js";
import type { ApplicationMap, ApplicationOptions } from "./types.js";

export * from "./types.js";

const topLevelActiveWhen: ActiveWhen = () => true;

export const constructApplications = ({
  config: { childNodes },
  loadApp,
}: ApplicationOptions): RegisterApplicationConfig[] => {
  const applicationMap: ApplicationMap = {};
  recurseRoutes(applicationMap, topLevelActiveWhen, {}, childNodes);
  return Object.entries(applicationMap).map(([name, appRoutes]) => ({
    activeWhen: appRoutes.map((appRoute) => appRoute.activeWhen),
    app: () => {
      const appRoute = inBrowser
        ? appRoutes.find((appRoute) => appRoute.activeWhen(window.location))
        : undefined;
      const loadPromise = loadApp({ name });
      return appRoute?.loader
        ? placeLoader(name, appRoute.loader, loadPromise)
        : loadPromise;
    },
    customProps: (_, location) => {
      const appRoute = appRoutes.find((appRoute) =>
        appRoute.activeWhen(location)
      );
      return appRoute?.props ?? {};
    },
    name,
  }));
};
