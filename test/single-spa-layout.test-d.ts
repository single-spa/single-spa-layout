import * as singleSpa from "single-spa";
import {
  registerApplication,
  start,
  Application,
  LifeCycles,
  AppProps,
  RegisterApplicationConfig,
} from "single-spa";
import { expectError, expectType } from "tsd";
import {
  constructRoutes,
  matchRoute,
  constructApplications,
  constructLayoutEngine,
  WithLoadFunction,
} from "../src/single-spa-layout-main";
import { parse, Element, DefaultTreeDocument } from "parse5";
import { ResolvedUrlRoute } from "../src/constructRoutes";
import { JSDOM } from "jsdom";

const { window } = new JSDOM(`
<!DOCTYPE html>
<head>
  <template id="single-spa-layout">
    <single-spa-router>
      <main>
        <route default>
          <application name="@single-spa/welcome"></application>
        </route>
      </main>
    </single-spa-router>
  </template>
</head>
`);

// test constructRoutes
expectError(constructRoutes());

expectError(constructRoutes([]));

expectError(constructRoutes({}));

const loaderParcelConfig = {
  async bootstrap() {},
  async mount() {},
  async unmount() {},
  async update() {},
};

constructRoutes(
  window.document.querySelector("#single-spa-layout") as HTMLTemplateElement
);

constructRoutes(
  {
    routes: [],
  },
  {
    loaders: {
      headerLoader: `<img src="loading.gif"`,
      mainContentLoader: loaderParcelConfig,
    },
    props: {
      prop1: "val1",
    },
  }
);

const routes = constructRoutes({
  routes: [
    {
      type: "route",
      path: "/app1",
      routes: [
        { type: "application", name: "app1" },
        { type: "application", name: "app2", loader: `<img src="loader">` },
        { type: "application", name: "app3", loader: loaderParcelConfig },
        { type: "route", default: true },
      ],
    },
  ],
});

(routes.routes[0] as ResolvedUrlRoute).activeWhen(window.location);
expectType<boolean | undefined>((routes.routes[1] as ResolvedUrlRoute).default);

expectType<string | singleSpa.ParcelConfig | undefined>(
  (routes.routes[0] as import("../src/constructRoutes").Application).loader
);

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
expectType<Array<import("../src/constructRoutes").ResolvedRouteChild>>(
  matchedRoutes.routes
);

// test constructApplication
const applications: Array<
  RegisterApplicationConfig & WithLoadFunction
> = constructApplications({
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
expectError(constructLayoutEngine({ routes, applications, active: "NOPE" }));

const layoutEngine = constructLayoutEngine({ routes, applications });

expectType<boolean>(layoutEngine.isActive());

expectType<void>(layoutEngine.activate());

start();

expectType<void>(layoutEngine.deactivate());
