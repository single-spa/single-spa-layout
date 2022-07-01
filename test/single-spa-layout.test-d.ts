import * as singleSpa from 'single-spa';
import {
  registerApplication,
  start,
  Application,
  LifeCycles,
  AppProps,
  RegisterApplicationConfig,
} from 'single-spa';
import { expectError, expectType } from 'tsd';
import {
  constructRoutes,
  constructApplications,
  constructLayoutEngine,
  WithLoadFunction,
} from '../src/single-spa-layout-interface';
import {
  constructServerLayout,
  sendLayoutHTTPResponse,
} from '../src/server/index';
import { parse, Document } from 'parse5';
import { ResolvedUrlRoute } from '../src/isomorphic/constructRoutes';
import { JSDOM } from 'jsdom';
import stream from 'stream';
import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';

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

const loaderParcelConfig = {
  async bootstrap() {},
  async mount() {},
  async unmount() {},
  async update() {},
};

constructRoutes(
  window.document.querySelector('#single-spa-layout') as HTMLTemplateElement,
  {
    loaders: {
      loader1: '<div>loader</div>',
      loader2: {
        async mount() {},
        async unmount() {},
      },
    },
    props: {
      prop1: 'val',
    },
    errors: {
      error1: '<div>Error</div>',
      error2: {
        async bootstrap() {},
        async mount() {},
        async unmount() {},
      },
    },
  },
);

constructRoutes('<single-spa-router></single-spa-router>');

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
      prop1: 'val1',
    },
  },
);

const routes = constructRoutes({
  routes: [
    {
      type: 'route',
      path: '/app1',
      routes: [
        { type: 'application', name: 'app1' },
        { type: 'application', name: 'app2', loader: `<img src="loader">` },
        { type: 'application', name: 'app3', loader: loaderParcelConfig },
        { type: 'route', default: true },
        { type: 'route', path: '/home', exact: true },
      ],
    },
  ],
  redirects: {
    '/': '/login',
  },
});

(routes.routes[0] as ResolvedUrlRoute).activeWhen(window.location);
expectType<boolean | undefined>((routes.routes[1] as ResolvedUrlRoute).default);

expectType<boolean | undefined>((routes.routes[4] as ResolvedUrlRoute).exact);

expectType<string | singleSpa.ParcelConfig | undefined>(
  (routes.routes[0] as import('../src/isomorphic/constructRoutes').Application)
    .loader,
);

expectType<string>(routes.redirects['/']);

const parse5Doc = parse(`<single-spa-router></single-spa-router>`) as Document;

const routes2 = constructRoutes(parse5Doc);

// test constructApplication
const applications: Array<RegisterApplicationConfig & WithLoadFunction> =
  constructApplications({
    routes,
    loadApp: props => {
      expectType<AppProps>(props);
      return System.import<Application<{}>>(props.name);
    },
  });
applications.forEach(registerApplication);
const application = applications[0];
application
  .app({ name: 'nav', singleSpa, mountParcel: singleSpa.mountRootParcel })
  .then(app => {
    expectType<LifeCycles>(app);
  });

// test constructLayoutEngine
expectError(constructLayoutEngine({ routes, applications, active: 'NOPE' }));
expectError(constructLayoutEngine({ routes: undefined, applications }));

const layoutEngine = constructLayoutEngine({ routes, applications });

expectType<boolean>(layoutEngine.isActive());

expectType<void>(layoutEngine.activate());

start();

expectType<void>(layoutEngine.deactivate());

// server types
const serverLayout = constructServerLayout({
  filePath: './some-file.html',
});
constructServerLayout({
  html: '<html></html>',
});
expectError(constructServerLayout());

let res: ServerResponse = new ServerResponse(new IncomingMessage(new Socket()));

expectType<Promise<any>>(
  sendLayoutHTTPResponse({
    res,
    serverLayout,
    urlPath: '/app1',
    assembleFinalHeaders() {
      return {};
    },
    renderApplication(arg) {
      expectType<string>(arg.appName);
      return new stream.Readable();
    },
    retrieveApplicationHeaders(arg) {
      return { hi: 'there' };
    },
    retrieveProp(name) {
      return 'hi';
    },
    renderFragment(name) {
      return 'hi';
    },
  }),
);

expectType<Promise<any>>(
  sendLayoutHTTPResponse({
    res,
    serverLayout,
    urlPath: '/app1',
    assembleFinalHeaders() {
      return {};
    },
    renderApplication(arg) {
      expectType<string>(arg.appName);
      const css = `
      .button {
        background-color: #4CAF50; /* Green */
        border: none;
        color: white;
        padding: 15px 32px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
      }
      `;
      return {
        assets: `${
          arg.appName === 'app1'
            ? `<style id="jss-server-side">${css}</style>`
            : ``
        }`,
        content: `<button>App ${arg.appName}</button>`,
      };
    },
    retrieveApplicationHeaders(arg) {
      return { hi: 'there' };
    },
    retrieveProp(name) {
      return 'hi';
    },
    renderFragment(name) {
      return 'hi';
    },
  }),
);
