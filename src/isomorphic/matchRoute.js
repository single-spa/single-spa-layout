import { inBrowser } from "../utils/environment-helpers";
import { validateString } from "../utils/validation-helpers";

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
function recurseRoutes(location, routes, parentRoute) {
  const result = [];

  let matched = false;
  routes.forEach((route) => {
    if (route.type === "application") {
      result.push(route);
    } else if (route.type === "route") {
      if (matched && parentRoute && parentRoute.matchAll === false) {
        return;
      }
      if (route.activeWhen(location)) {
        matched = true;
        result.push({
          ...route,
          routes: recurseRoutes(location, route.routes, route),
        });
      }
    } else if (Array.isArray(route.routes)) {
      result.push({
        ...route,
        routes: recurseRoutes(location, route.routes, route),
      });
    } else {
      result.push(route);
    }
  });

  return result;
}

export function resolvePath(prefix, path) {
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
