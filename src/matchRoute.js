/**
 *
 * @param {import('./constructRoutes').ResolvedRoutesConfig} resolvedRoutesConfig
 * @param {string} path
 * @returns {import('./constructRoutes').ResolvedRoutesConfig}
 */
export function matchRoute(resolvedRoutesConfig, pathMatch) {
  const result = { ...resolvedRoutesConfig };

  const baseWithoutSlash = resolvedRoutesConfig.base.slice(
    0,
    resolvedRoutesConfig.base.length - 1
  );

  if (pathMatch.startsWith(baseWithoutSlash)) {
    result.routes = recurseRoutes(
      pathMatch,
      resolvedRoutesConfig.base,
      resolvedRoutesConfig.routes
    );
  } else {
    result.routes = [];
  }

  return result;
}

/**
 *
 * @param {string} pathMatch
 * @param {string} startPath
 * @param {Array<import('./constructRoutes').Route>} routes
 */
function recurseRoutes(pathMatch, startPath, routes) {
  const result = [];

  routes.forEach((route) => {
    if (route.type === "application") {
      result.push(route);
    } else {
      const resolvedPath = resolvePath(startPath, route.path);

      if (pathMatch.startsWith(resolvedPath)) {
        result.push({
          ...route,
          routes: recurseRoutes(pathMatch, resolvedPath, route.routes),
        });
      }
    }
  });

  return result;
}

export function resolvePath(prefix, path) {
  if (prefix.endsWith("/")) {
    if (path.startsWith("/")) {
      return prefix + path.slice(1);
    } else {
      return prefix + path;
    }
  } else {
    if (path.startsWith("/")) {
      return prefix + path;
    } else {
      return prefix + "/" + path;
    }
  }
}
