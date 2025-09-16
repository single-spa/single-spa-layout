import { Application } from "single-spa";
import { inBrowser } from "../utils/environment-helpers.js";
import { validateString } from "../utils/validation-helpers.js";
import {
  type ResolvedRoutesConfig,
  type ResolvedRouteChild,
  type ResolvedUrlRoute,
} from "./constructRoutes.js";

export function matchRoute(
  resolvedRoutesConfig: ResolvedRoutesConfig,
  pathMatch: string,
): ResolvedRoutesConfig {
  validateString("path", pathMatch);
  const result = { ...resolvedRoutesConfig };

  const baseWithoutSlash = resolvedRoutesConfig.base.slice(
    0,
    resolvedRoutesConfig.base.length - 1,
  );

  if (pathMatch.indexOf(baseWithoutSlash) === 0) {
    const origin = inBrowser ? window.location.origin : "http://localhost";
    const location = new URL(resolvePath(origin, pathMatch));

    result.routes = recurseRoutes(location, resolvedRoutesConfig.routes);
  } else {
    result.routes = [];
  }

  return result;
}

function recurseRoutes(
  location: URL,
  routes: ResolvedRouteChild[],
): ResolvedRoutesConfig[] {
  const result = [];

  routes.forEach((route) => {
    if (route.type) {
      if ((route as ResolvedUrlRoute | Application).type === "application") {
        result.push(route);
      } else if ((route as ResolvedUrlRoute).type === "route") {
        if ((route as ResolvedUrlRoute).activeWhen(location)) {
          result.push({
            ...route,
            routes: recurseRoutes(location, (route as ResolvedUrlRoute).routes),
          });
        }
        // } else if (Array.isArray(route.routes)) {
        //   result.push({
        //     ...route,
        //     routes: recurseRoutes(location, route.routes),
        //   });
      }
    } else {
      result.push(route);
    }
  });

  return result;
}

export function resolvePath(prefix: string, path: string): string {
  let result;

  if (prefix.substr(-1) === "/") {
    if (path[0] === "/") {
      result = prefix + path.slice(1);
    } else {
      result = prefix + path;
    }
  } else if (path[0] === "/") {
    result = prefix + path;
  } else {
    result = prefix + "/" + path;
  }

  if (result.substr(-1) === "/" && result.length > 1) {
    result = result.slice(0, result.length - 1);
  }

  return result;
}
