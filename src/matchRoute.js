import { inBrowser } from "./environment-helpers";
import { validateString } from "./validation-helpers";

/**
 *
 * @param {import('./constructRoutes').ResolvedRoutesConfig} resolvedRoutesConfig
 * @param {string} path
 * @returns {import('./constructRoutes').ResolvedRoutesConfig}
 */
export function matchRoute(resolvedRoutesConfig, pathMatch) {
  validateString("path", pathMatch);
  const result = { ...resolvedRoutesConfig };

  const baseWithoutSlash = resolvedRoutesConfig.base.slice(
    0,
    resolvedRoutesConfig.base.length - 1
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

/**
 *
 * @param {URL} location
 * @param {Array<import('./constructRoutes').ResolvedRouteChild>} routes
 */
function recurseRoutes(location, routes) {
  const result = [];

  routes.forEach((route) => {
    if (route.type === "application") {
      result.push(route);
    } else if (route.type === "route") {
      if (route.activeWhen(location)) {
        result.push({
          ...route,
          routes: recurseRoutes(location, route.routes),
        });
      }
    } else if (Array.isArray(route.routes)) {
      result.push({
        ...route,
        routes: recurseRoutes(location, route.routes),
      });
    }
  });

  return result;
}

export function resolvePath(prefix, path) {
  if (prefix.substr(-1) === "/") {
    if (path[0] === "/") {
      return prefix + path.slice(1);
    } else {
      return prefix + path;
    }
  } else {
    if (path[0] === "/") {
      return prefix + path;
    } else {
      return prefix + "/" + path;
    }
  }
}
