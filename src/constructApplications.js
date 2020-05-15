import { resolvePath } from "./matchRoute";

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
 * @param {ApplicationOptions} applicationOptions
 * @returns {Array<import('single-spa').RegisterApplicationConfig & WithLoadFunction>}
 */
export function constructApplications({ routes, loadApp }) {
  const applicationMap = {};
  recurseRoutes(applicationMap, routes.base, {}, routes.children);

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
      customProps: (_name, location) => {
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
    app: loadApp,
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
 * @param {Array<import('./constructRoutes').RouteChild>} children
 * @returns void
 */
function recurseRoutes(applicationMap, path, props, children) {
  children.forEach((child) => {
    if (child.type === "application") {
      if (!applicationMap[child.name]) {
        applicationMap[child.name] = [];
      }

      applicationMap[child.name].push({
        path,
        props: mergeProps(props, child.props),
      });
    } else {
      const resolvedPath = resolvePath(path, child.path);
      recurseRoutes(
        applicationMap,
        resolvedPath,
        mergeProps(props, child.props),
        child.children
      );
    }
  });
}

function mergeProps(originalProps, newProps = {}) {
  return { ...originalProps, ...newProps };
}
