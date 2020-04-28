export function jsx(type, props) {
  switch (type) {
    case "router":
      const { children: routerChildren, ...routerProps } = props;
      return {
        ...routerProps,
        routes: routesValue(routerChildren),
      };
    case "application":
      const {
        children: applicationChildren,
        name,
        ...applicationProps
      } = props;
      const applicationResult = {
        type,
        name,
      };
      if (Object.keys(applicationProps).length > 0) {
        applicationResult.props = applicationProps;
      }
      return applicationResult;
    case "route":
      const { children: routeChildren, path, ...routeProps } = props;
      const routeResult = {
        type,
        path,
        routes: routesValue(routeChildren),
      };
      if (Object.keys(routeProps).length > 0) {
        routeResult.props = routeProps;
      }
      return routeResult;
    default:
      return { type, ...props };
  }
}

export function jsxs(type, props, children) {
  return jsx.apply(this, arguments);
}

function routesValue(val) {
  let routes;
  if (val) {
    routes = Array.isArray(val) ? val : [val];
  } else {
    routes = [];
  }

  return routes;
}
