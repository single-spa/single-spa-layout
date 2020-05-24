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
 * [name]: Array<AppRoute>
 * }} ApplicationMap
 *
 * @typedef {{
 * props: object;
 * activeWhen: import('single-spa').ActivityFn;
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
  const partialApplications = Object.keys(applicationMap).map((name) => {
    /** @type {AppRoute} */
    const appRoutes = applicationMap[name];
    return {
      name,
      customProps: (_name, location) => {
        const appRoute = appRoutes.find((appRoute) =>
          appRoute.activeWhen(location)
        );
        return appRoute ? appRoute.props : {};
      },
      activeWhen: appRoutes.map((appRoute) => appRoute.activeWhen),
    };
  });

  return partialApplications.map((partialApp) => ({
    ...partialApp,
    app: loadApp,
  }));
}

/**
 *
 * @param {ApplicationMap} applicationMap
 * @param {import('single-spa').ActivityFn} activeWhen
 * @param {object} props
 * @param {Array<import('./constructRoutes').Route>} routes
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
