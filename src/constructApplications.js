import { resolvePath } from "./matchRoute";

/**
 * @typedef {{
 * routes: import('./constructRoutes').ResolvedRoutesConfig;
 * loadApp: LoadApp;
 * }} ApplicationOptions
 *
 * @typedef {(applicationName: string) => Promise<import('single-spa').Application>} LoadApp
 *
 * @param {ApplicationOptions} applicationOptions
 * @returns {Array<import('single-spa').RegisterApplicationConfig>}
 */
export function constructApplications({ routes, loadApp }) {
  const applicationMap = {};
  recurseRoutes(applicationMap, routes.base, {}, routes.routes);

  /**
   * @type {Array<{
   * name: string;
   * customProps: object;
   * activeWhen: import('single-spa').Activity
   * }>}
   */
  const partialApplications = Object.keys(applicationMap).map((name) => {
    const resolvedRoutes = applicationMap[name];
    return {
      name,
      customProps: (n, location) => {
        const route = resolvedRoutes.find((route) =>
          location[routes.mode === "hash" ? "hash" : "pathname"].startsWith(
            route.path
          )
        );
        return route ? route.props : {};
      },
      activeWhen: resolvedRoutes.map((r) => r.path),
    };
  });

  return partialApplications.map((partialApp) => ({
    ...partialApp,
    app: loadApp(partialApp.name),
  }));
}

/**
 * @typedef {{
 * path: string;
 * props: object;
 * }} ResolvedRoute
 *
 * @typedef {{
 * [name]: Array<ResolvedRoute>
 * }} ApplicationMap
 *
 * @param {ApplicationMap} applicationMap
 * @param {string} path
 * @param {object} props
 * @param {Array<import('./constructRoutes').Route>} routes
 * @returns void
 */
function recurseRoutes(applicationMap, path, props, routes) {
  routes.forEach((route) => {
    if (route.type === "application") {
      if (!applicationMap[route.name]) {
        applicationMap[route.name] = [];
      }

      applicationMap[route.name].push({
        path,
        props: mergeProps(props, route.props),
      });
    } else {
      const resolvedPath = resolvePath(path, route.path);
      recurseRoutes(
        applicationMap,
        resolvedPath,
        mergeProps(props, route.props),
        route.routes
      );
    }
  });
}

function mergeProps(originalProps, newProps = {}) {
  return { ...originalProps, ...newProps };
}
