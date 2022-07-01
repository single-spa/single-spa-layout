import {
  constructLayoutEngine,
  constructRoutes,
  constructApplications,
} from '../../src/single-spa-layout.js';
import { parseFixture } from '../html-utils.js';
import {
  navigateToUrl,
  getAppNames,
  registerApplication,
  unregisterApplication,
  triggerAppChange,
  start,
  unloadApplication,
} from 'single-spa';

start();

describe(`constructLayoutEngine browser`, () => {
  beforeEach(reset);

  /** @type {import('../../src/constructLayoutEngine').LayoutEngine} */
  let layoutEngine;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    history.pushState(history.state, document.title, '/');
    if (layoutEngine) {
      layoutEngine.deactivate();
    }
  });

  it(`starts out activated by default`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [{ type: 'application', name: '@org-name/header' }],
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });

    expect(layoutEngine.isActive()).toBe(true);
  });

  it(`starts out activated if forced active`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [{ type: 'application', name: '@org-name/header' }],
    });

    layoutEngine = constructLayoutEngine({
      routes,
      active: true,
    });

    expect(layoutEngine.isActive()).toBe(true);
  });

  it(`can start off deactivated if specified in options object`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [{ type: 'application', name: '@org-name/header' }],
    });

    layoutEngine = constructLayoutEngine({
      routes,
      active: false,
    });

    expect(layoutEngine.isActive()).toBe(false);
  });

  it(`can handle any calls to activate() / deactivate()`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [{ type: 'application', name: '@org-name/header' }],
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });

    layoutEngine.activate();
    expect(layoutEngine.isActive()).toBe(true);
    layoutEngine.activate();
    expect(layoutEngine.isActive()).toBe(true);

    layoutEngine.deactivate();
    expect(layoutEngine.isActive()).toBe(false);
    layoutEngine.deactivate();
    expect(layoutEngine.isActive()).toBe(false);

    layoutEngine.activate();
    expect(layoutEngine.isActive()).toBe(true);
  });

  it(`can successfully construct a layout engine and respond to routing events`, async () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [
        { type: 'application', name: '@org-name/header' },
        {
          type: 'route',
          path: 'app1',
          routes: [{ type: 'application', name: '@org-name/app1' }],
        },
        { type: 'application', name: '@org-name/footer' },
      ],
    });

    const applications = constructApplications({
      routes,
      async loadApp({ name }) {
        return noopApp();
      },
    });

    applications.forEach(registerApplication);

    layoutEngine = constructLayoutEngine({
      routes,
      applications,
    });

    // start at / route
    let headerEl = document.getElementById(
      `single-spa-application:@org-name/header`,
    );
    let app1El = document.getElementById(
      `single-spa-application:@org-name/app1`,
    );
    let footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`,
    );

    expect(headerEl).toBeInTheDocument();
    expect(app1El).not.toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(footerEl)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(document.body).toMatchSnapshot();

    // transition to /app1 route
    await transition('/app1');

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`,
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`,
    );

    expect(headerEl).toBeInTheDocument();
    expect(app1El).toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(footerEl)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(headerEl.compareDocumentPosition(app1El)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(footerEl.compareDocumentPosition(app1El)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
    expect(document.body).toMatchSnapshot();

    // transition back to / route
    await transition('/');

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`,
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`,
    );

    expect(headerEl).toBeInTheDocument();
    expect(app1El).not.toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(footerEl)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(document.body).toMatchSnapshot();
  });

  it(`can successfully rearrange dom elements during route transitions`, async () => {
    let headerEl, footerEl, app1El, app2El;

    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [
        { type: 'application', name: '@org-name/header' },
        {
          type: 'route',
          path: 'cart',
          routes: [
            { type: 'application', name: '@org-name/app1' },
            { type: 'application', name: '@org-name/app2' },
          ],
        },
        {
          type: 'route',
          path: 'settings',
          routes: [
            { type: 'application', name: '@org-name/app2' },
            { type: 'application', name: '@org-name/app1' },
          ],
        },
        { type: 'application', name: '@org-name/footer' },
      ],
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });

    // transition to /cart route
    await transition('/cart');

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`,
    );
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`,
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    app2El = document.getElementById(`single-spa-application:@org-name/app2`);

    expect(headerEl).toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();
    expect(app1El).toBeInTheDocument();
    expect(app2El).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(app1El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(app1El.compareDocumentPosition(app2El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(app2El.compareDocumentPosition(footerEl)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    expect(document.body).toMatchSnapshot();

    // transition to /settings route
    await transition('/settings');

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`,
    );
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`,
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    app2El = document.getElementById(`single-spa-application:@org-name/app2`);

    expect(headerEl).toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();
    expect(app1El).toBeInTheDocument();
    expect(app2El).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(app1El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(app1El.compareDocumentPosition(app2El)).toEqual(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
    expect(app2El.compareDocumentPosition(footerEl)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    expect(document.body).toMatchSnapshot();

    // transition back to /cart route
    await transition('/cart');

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`,
    );
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`,
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    app2El = document.getElementById(`single-spa-application:@org-name/app2`);

    expect(headerEl).toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();
    expect(app1El).toBeInTheDocument();
    expect(app2El).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(app1El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(app1El.compareDocumentPosition(app2El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(app2El.compareDocumentPosition(footerEl)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    expect(document.body).toMatchSnapshot();
  });

  it(`can process the layout in the medium.html fixture`, async () => {
    const { routerElement } = parseFixture('medium.html');
    const loadApp = jest.fn();
    const routes = constructRoutes(routerElement);
    const applications = constructApplications({ routes, loadApp });
    layoutEngine = constructLayoutEngine({ routes, applications });
    applications.forEach(registerApplication);

    expect(document.querySelector('body')).toMatchSnapshot();

    // transition to /settings route
    await transition('/settings');
    // At /settings route: navbar, settings, and footer are mounted
    expect(document.querySelector('body')).toMatchSnapshot();

    // transition to / route
    await transition('/');
    expect(document.querySelector('body')).toMatchSnapshot();

    // transition to /app1 route
    await transition('/app1');
    expect(document.querySelector('body')).toMatchSnapshot();

    // transition to / route
    await transition('/');
    expect(document.querySelector('body')).toMatchSnapshot();

    // transition to /app2 route
    await transition('/app2');
    expect(document.querySelector('body')).toMatchSnapshot();

    // transition to /app1 route
    await transition('/app1');
    expect(document.querySelector('body')).toMatchSnapshot();
  });

  it(`can process the dom elements fixture`, async () => {
    const { routerElement } = parseFixture('dom-elements.html');
    const loadApp = jest.fn();
    const routes = constructRoutes(routerElement);
    const applications = constructApplications({ routes, loadApp });
    layoutEngine = constructLayoutEngine({ routes, applications });
    applications.forEach(registerApplication);

    await transition('/');

    expect(document.querySelector('body')).toMatchSnapshot();

    // transition to /app1 route
    await transition('/app1');
    expect(document.querySelector('body')).toMatchSnapshot();

    // transition to / route
    await transition('/');
    expect(document.querySelector('body')).toMatchSnapshot();
  });

  it(`can process the nested-default-route fixture`, async () => {
    history.pushState(history.state, document.title, '/');

    const { routerElement } = parseFixture('nested-default-route.html');
    const loadApp = jest.fn();
    const routes = constructRoutes(routerElement);
    const applications = constructApplications({ routes, loadApp });
    layoutEngine = constructLayoutEngine({ routes, applications });
    applications.forEach(registerApplication);

    await transition('/');
    expect(document.body).toMatchSnapshot();

    // Transition to /settings
    await transition('/settings');
    expect(document.body).toMatchSnapshot();

    // Transition to /settings/app1
    await transition('/settings/app1');
    expect(document.body).toMatchSnapshot();
  });

  it(`can show a loader properly`, async () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [
        {
          type: 'route',
          path: '/app1',
          routes: [
            {
              type: 'application',
              name: 'app1',
              loader: `<img src="loading.gif">`,
            },
          ],
        },
      ],
    });

    const applications = constructApplications({
      routes,
      loadApp: name => {
        return new Promise(resolve => {
          setTimeout(() => resolve(noopApp()), 5);
        });
      },
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });
    applications.forEach(registerApplication);

    await transition('/');

    expect(document.body).toMatchSnapshot();

    const transitionPromise = transition('/app1');
    const loadPromise = applications[0].app();

    await tick();
    expect(document.body).toMatchSnapshot();

    await loadPromise;
    expect(document.body).toMatchSnapshot();

    await transitionPromise;
    expect(document.body).toMatchSnapshot();
  });

  it(`can render dom elements from json`, async () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [
        {
          type: 'route',
          path: '/app1',
          routes: [
            {
              type: 'div',
              attrs: [
                {
                  name: 'class',
                  value: 'before',
                },
              ],
              routes: [
                {
                  type: '#text',
                  value: 'The text before',
                },
                {
                  type: '#comment',
                  value: 'the comment before',
                },
              ],
            },
            {
              type: 'application',
              name: 'app1',
            },
            {
              type: 'div',
              attrs: [
                {
                  name: 'class',
                  value: 'after',
                },
              ],
              routes: [
                {
                  type: '#comment',
                  value: 'the comment after',
                },
              ],
            },
          ],
        },
      ],
    });

    const applications = constructApplications({
      routes,
      loadApp: async name => noopApp(),
    });

    layoutEngine = constructLayoutEngine({
      routes,
      applications,
    });
    applications.forEach(registerApplication);

    await transition('/app1');

    window.dispatchEvent(
      new CustomEvent('single-spa:before-mount-routing-event'),
    );

    expect(document.body).toMatchSnapshot();
  });

  // https://github.com/single-spa/single-spa-layout/issues/103
  it(`unmounts all dom elements for the old route before mounting any new ones`, async () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      routes: [
        {
          type: 'route',
          default: true,
          routes: [
            {
              type: 'div',
              attrs: [
                {
                  name: 'id',
                  value: '404',
                },
              ],
              routes: [
                {
                  type: '#text',
                  value: '404 not found',
                },
              ],
            },
          ],
        },
        {
          type: 'route',
          path: '/app1',
          routes: [
            {
              type: '#text',
              value: 'App1',
            },
          ],
        },
      ],
    });

    const applications = constructApplications({
      routes,
      loadApp: async name => noopApp(),
    });

    layoutEngine = constructLayoutEngine({
      routes,
      applications,
    });
    applications.forEach(registerApplication);

    await transition('/');

    expect(document.getElementById('404')).toBeTruthy();

    window.addEventListener(
      'single-spa:before-mount-routing-event',
      beforeMount,
    );

    await transition('/app1');

    expect(document.getElementById('404')).toBeFalsy();

    function beforeMount() {
      // This event listener will fire after the equivalent listener in constructLayoutEngine,
      // since we added it after calling `constructLayoutEngine`
      expect(document.getElementById('404')).toBeFalsy();
      window.removeEventListener(
        'single-spa:before-mount-routing-event',
        beforeMount,
      );
    }
  });

  // https://github.com/single-spa/single-spa-layout/issues/115
  it(`reuses the same dom element container for applications when the container moves to a different part of the DOM`, async () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [
        {
          type: 'route',
          path: '/settings',
          routes: [
            {
              type: 'div',
              routes: [
                {
                  type: 'application',
                  name: 'auth',
                },
              ],
            },
          ],
        },
        {
          type: 'route',
          path: '/permissions',
          routes: [
            {
              type: 'div',
              routes: [
                {
                  type: 'application',
                  name: 'auth',
                },
              ],
            },
          ],
        },
      ],
    });

    const applications = constructApplications({
      routes,
      loadApp: async name => {
        return {
          async mount() {},
          async unmount() {},
        };
      },
    });

    layoutEngine = constructLayoutEngine({
      routes,
      applications,
    });
    applications.forEach(registerApplication);

    await transition('/settings');

    const originalAppEl = document.getElementById(
      `single-spa-application:auth`,
    );

    expect(originalAppEl).toBeInTheDocument();

    await transition('/permissions');

    expect(
      document.getElementById(`single-spa-application:auth`),
    ).toBeInTheDocument();

    expect(document.getElementById(`single-spa-application:auth`)).toBe(
      originalAppEl,
    );
  });

  describe(`error handling`, () => {
    beforeEach(reset);

    it(`throws an error if constructLayoutEngine is called with incorrect arguments`, async () => {
      expect(() => constructLayoutEngine({})).toThrowError('must be provided');
    });

    it(`shows an error UI when an application goes into SKIP_BECAUSE_BROKEN status`, async () => {
      /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
      const routes = constructRoutes({
        containerEl: 'body',
        base: '/',
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: '/app1',
            routes: [
              {
                type: 'application',
                name: 'app1',
                error: '<div>Oops, app1 is broken</div>',
              },
            ],
          },
        ],
      });

      const applications = constructApplications({
        routes,
        loadApp: async name => {
          throw Error();
        },
      });

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      await transition('/app1');

      expect(document.body).toMatchSnapshot();
    });

    it(`works with a parcel provided for the error UI`, async () => {
      /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
      const routes = constructRoutes({
        containerEl: 'body',
        base: '/',
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: '/app1',
            routes: [
              {
                type: 'application',
                name: 'app1',
                error: {
                  async bootstrap() {},
                  async mount(props) {
                    const div = document.createElement('div');
                    div.textContent = `App 1 is broken (parcel)`;
                    props.domElement.appendChild(div);
                  },
                  async unmount(props) {},
                },
              },
            ],
          },
        ],
      });

      const applications = constructApplications({
        routes,
        loadApp: async name => {
          throw Error();
        },
      });

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      await transition('/app1');

      expect(document.body).toMatchSnapshot();
    });

    it(`works with error handlers defined in HTML`, async () => {
      const { routerElement } = parseFixture('error-handlers.html');

      let numMainContentErrorMounts = 0,
        numMainContentUnmounts = 0;

      const data = {
        errors: {
          mainContentError: {
            async bootstrap() {},
            async mount(props) {
              numMainContentErrorMounts++;
              props.domElement.textContent = 'error parcel mounted';
            },
            async unmount(props) {
              numMainContentUnmounts++;
              props.domElement.textContent = '';
            },
          },
          headerError: `<div>Oops! An error occurred!</div>`,
        },
      };

      const routes = constructRoutes(routerElement, data);
      const applications = constructApplications({
        routes,
        async loadApp({ name }) {
          throw Error();
        },
      });

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      await transition('/app1');

      expect(numMainContentErrorMounts).toBe(1);
      expect(numMainContentUnmounts).toBe(0);
      expect(document.body).toMatchSnapshot();

      // https://github.com/single-spa/single-spa-layout/issues/105
      // Go back to / route and verify the parcel is unmounted
      await transition('/');

      expect(numMainContentErrorMounts).toBe(1);
      expect(numMainContentUnmounts).toBe(1);
      expect(document.body).toMatchSnapshot();
    });

    it(`unmounts the error parcel when the application gets unloaded`, async () => {
      let parcelWasMounted = false,
        parcelWasUnmounted = false;

      /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
      const routes = constructRoutes({
        containerEl: 'body',
        base: '/',
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: '/app1',
            routes: [
              {
                type: 'application',
                name: 'app1',
                error: {
                  async bootstrap() {},
                  async mount(props) {
                    const div = document.createElement('div');
                    div.textContent = `App 1 is broken (parcel)`;
                    props.domElement.appendChild(div);
                    parcelWasMounted = true;
                  },
                  async unmount(props) {
                    parcelWasUnmounted = true;
                  },
                },
              },
            ],
          },
        ],
      });

      const applications = constructApplications({
        routes,
        loadApp: async name => {
          throw Error();
        },
      });

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      await transition('/app1');

      expect(parcelWasMounted).toBe(true);
      expect(parcelWasUnmounted).toBe(false);

      await transition('/');
      unloadApplication('app1');

      expect(parcelWasUnmounted).toBe(true);
    });

    // https://github.com/single-spa/single-spa-layout/issues/137
    it(`waits for error parcel unmounting before mounting new applications during route transition`, async () => {
      let errorParcelUnmountTime, app2MountTime;

      /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
      const routes = constructRoutes({
        containerEl: 'body',
        base: '/',
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: '/app1',
            routes: [
              {
                type: 'application',
                name: 'app1',
                error: {
                  async bootstrap() {},
                  async mount(props) {},
                  async unmount(props) {
                    errorParcelUnmountTime = Date.now();
                  },
                },
              },
            ],
          },
          {
            type: 'route',
            path: '/app2',
            routes: [
              {
                type: 'application',
                name: 'app2',
              },
            ],
          },
        ],
      });

      const applications = constructApplications({
        routes,
        loadApp: async props => {
          if (props.name === 'app1') {
            throw Error();
          } else {
            return Promise.resolve({
              async mount() {
                app2MountTime = Date.now();
              },
              async unmount() {},
            });
          }
        },
      });

      await transition('/app1');

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      await transition('/app1');

      expect(errorParcelUnmountTime).toBeUndefined();
      expect(app2MountTime).toBeUndefined();

      await transition('/app2');

      expect(errorParcelUnmountTime).toBeDefined();
      expect(app2MountTime).toBeDefined();

      expect(errorParcelUnmountTime).toBeLessThan(app2MountTime);
    });
  });

  describe(`redirects`, () => {
    beforeEach(reset);

    it(`successfully redirects`, async () => {
      await transition('/something-random');
      await triggerAppChange();

      const { document, routerElement } = parseFixture('redirects.html');
      const routes = constructRoutes(routerElement);
      const applications = constructApplications({
        routes,
        loadApp: async name => noopApp(),
      });
      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      // trigger redirect to login
      await transition('/');
      await triggerAppChange();

      expect(location.pathname).toBe('/login');

      // trigger redirect to new settings page
      await transition('/old-settings');

      expect(location.pathname).toBe('/settings');
    });

    it(`doesn't call navigateToUrl() for non-redirects`, async () => {
      await transition('/something-random');

      const { document, routerElement } = parseFixture('redirects.html');
      const routes = constructRoutes(routerElement);
      const applications = constructApplications({
        routes,
        loadApp: async name => {
          return {
            async bootstrap() {},
            async mount() {},
            async unmount() {},
          };
        },
      });
      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      // trigger redirect to login
      await transition('/');

      expect(location.pathname).toBe('/login');
    });
  });

  describe(`hydration`, () => {
    it(`handles hydrate-basic fixture starting on / route`, async () => {
      await transition('/');

      const {
        document: doc,
        routerElement,
        serverRenderedBody,
      } = parseFixture('hydrate-basic.html');

      // Simulate server rendering of the content
      document.body.innerHTML = serverRenderedBody;
      window.singleSpaLayoutData = {};

      expect(document.querySelectorAll('.main-content').length).toBe(1);

      const routes = constructRoutes(routerElement);
      const applications = constructApplications({
        routes,
        loadApp: async name => {
          return {
            async bootstrap() {},
            async mount() {},
            async unmount() {},
          };
        },
      });
      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      expect(document.querySelectorAll('.main-content').length).toBe(1);

      expect(document.body.outerHTML).toMatchSnapshot('01 initial hydration /');

      await transition('/app1');

      expect(document.body.outerHTML).toMatchSnapshot(
        '02 client-side navigation to /app1',
      );

      await transition('/');

      expect(document.body.outerHTML).toMatchSnapshot(
        '03 client-side navigation back to /',
      );
    });

    it(`handles hydrate-app1 fixture starting on /app1 route`, async () => {
      await transition('/app1');

      const {
        document: doc,
        routerElement,
        serverRenderedBody,
      } = parseFixture('hydrate-app1.html');

      // Simulate server rendering of the content
      document.body.innerHTML = serverRenderedBody;
      window.singleSpaLayoutData = {};

      expect(document.querySelectorAll('.main-content').length).toBe(1);

      const routes = constructRoutes(routerElement);
      const applications = constructApplications({
        routes,
        loadApp: async name => {
          return {
            async bootstrap() {},
            async mount() {},
            async unmount() {},
          };
        },
      });
      layoutEngine = constructLayoutEngine({
        routes,
        applications,
      });
      applications.forEach(registerApplication);

      expect(document.querySelectorAll('.main-content').length).toBe(1);

      expect(document.body.outerHTML).toMatchSnapshot(
        '01 initial hydration /app1',
      );

      await transition('/');

      expect(document.body.outerHTML).toMatchSnapshot(
        '02 client-side navigation to /',
      );

      await transition('/app1');

      expect(document.body.outerHTML).toMatchSnapshot(
        '03 client-side navigation back to /app1',
      );
    });
  });

  async function reset() {
    if (layoutEngine) {
      layoutEngine.deactivate();
    }
    getAppNames().forEach(unregisterApplication);
    navigateToUrl('/');
    await triggerAppChange();
    await tick();
  }
});

function tick() {
  return new Promise(resolve => {
    setTimeout(resolve);
  });
}

function noopApp() {
  return {
    async mount() {},
    async unmount() {},
  };
}

async function transition(url) {
  navigateToUrl(url);
  await triggerAppChange();
  await tick();
}
