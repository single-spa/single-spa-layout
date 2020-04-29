import { expectError, expectType } from "tsd";
import { constructRoutes, matchRoute } from "../src/single-spa-layout";

// test constructRoutes
expectError(constructRoutes());

expectError(constructRoutes({}));

const routes = constructRoutes({
  routes: [
    {
      type: "route",
      path: "/app1",
      routes: [{ type: "application", name: "app1" }],
    },
  ],
});

// test matchRoute
const matchedRoutes = matchRoute(routes, "/");
expectType<string>(matchedRoutes.base);
expectType<import("../src/constructRoutes").ContainerEl>(
  matchedRoutes.containerEl
);
expectType<string>(matchedRoutes.mode);
expectType<Array<import("../src/constructRoutes").Route>>(matchedRoutes.routes);
