import * as singleSpa from "single-spa";
import {
  registerApplication,
  start,
  Application,
  LifeCycles,
} from "single-spa";
import { expectError, expectType } from "tsd";
import {
  constructRoutes,
  matchRoute,
  constructApplications,
  constructLayoutEngine,
} from "../src/single-spa-layout";

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

// test constructApplication
const applications = constructApplications({
  routes,
  loadApp: (name) => System.import<Application<{}>>(name),
});
applications.forEach(registerApplication);

const application = applications[0];
application
  .app({ name: "nav", singleSpa, mountParcel: singleSpa.mountRootParcel })
  .then((app) => {
    expectType<LifeCycles>(app);
  });

// test constructLayoutEngine
const layoutEngine = constructLayoutEngine(routes, applications);

expectType<boolean>(layoutEngine.isActive());

expectType<void>(layoutEngine.activate());

start();

expectType<void>(layoutEngine.deactivate());
