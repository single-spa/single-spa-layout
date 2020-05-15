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
    result.children = recurseRoutes(
      pathMatch,
      resolvedRoutesConfig.base,
      resolvedRoutesConfig.children
    );
  } else {
    result.children = [];
  }

  return result;
}

/**
 *
 * @param {string} pathMatch
 * @param {string} startPath
 * @param {Array<import('./constructRoutes').Route>} children
 */
function recurseRoutes(pathMatch, startPath, children) {
  const result = [];

  children.forEach((child) => {
    if (child.type === "application") {
      result.push(child);
    } else {
      const resolvedPath = resolvePath(startPath, child.path);

      if (pathMatch.startsWith(resolvedPath)) {
        result.push({
          ...child,
          children: recurseRoutes(pathMatch, resolvedPath, child.children),
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
