import * as singleSpa from "single-spa";
import {
  registerApplication,
  start,
  Application,
  LifeCycles,
  AppProps,
} from "single-spa";
import { expectError, expectType } from "tsd";
import {
  constructRoutes,
  matchRoute,
  constructApplications,
  constructLayoutEngine,
} from "../src/single-spa-layout";
import { parse, Element, DefaultTreeDocument } from "parse5";

// test constructRoutes
expectError(constructRoutes());

expectError(constructRoutes([]));

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

const parse5Doc = parse(
  `<single-spa-router></single-spa-router>`
) as DefaultTreeDocument;

const routes2 = constructRoutes(parse5Doc);

// test matchRoute
const matchedRoutes = matchRoute(routes, "/");
expectType<string>(matchedRoutes.base);
expectType<import("../src/constructRoutes").ContainerEl>(
  matchedRoutes.containerEl
);
expectType<string>(matchedRoutes.mode);
expectType<Array<import("../src/constructRoutes").RouteChild>>(
  matchedRoutes.routes
);

// test constructApplication
const applications = constructApplications({
  routes,
  loadApp: (props) => {
    expectType<AppProps>(props);
    return System.import<Application<{}>>(props.name);
  },
});
applications.forEach(registerApplication);
const application = applications[0];
application
  .app({ name: "nav", singleSpa, mountParcel: singleSpa.mountRootParcel })
  .then((app) => {
    expectType<LifeCycles>(app);
  });

// test constructLayoutEngine
const layoutEngine = constructLayoutEngine({ routes, applications });

expectType<boolean>(layoutEngine.isActive());

expectType<void>(layoutEngine.activate());

start();

expectType<void>(layoutEngine.deactivate());
