import {
  constructApplications,
  constructRoutes,
} from '../src/single-spa-layout.js';
import { parseFixture } from './html-utils.js';
import { inBrowser } from '../src/utils/environment-helpers.js';

describe(`constructApplications`, () => {
  it(`can handle a medium complexity case`, () => {
    const routes = constructRoutes({
      mode: 'history',
      base: '/',
      containerEl: 'body',
      routes: [
        { type: 'application', name: 'nav' },
        {
          type: 'route',
          path: 'app1',
          routes: [
            { type: 'application', name: 'app1', props: { primary: true } },
            {
              type: 'route',
              path: 'subroute',
              routes: [
                { type: 'application', name: 'subroute', props: { count: 1 } },
              ],
            },
          ],
        },
        {
          type: 'route',
          path: 'app2',
          routes: [
            { type: 'application', name: 'app2' },
            {
              type: 'route',
              path: 'subroute',
              routes: [
                { type: 'application', name: 'subroute', props: { count: 2 } },
              ],
            },
          ],
        },
        { type: 'application', name: 'footer' },
      ],
    });

    const loadApp = jest.fn();

    const applications = constructApplications({ routes, loadApp });

    expect(applications.length).toBe(5);
    expect(applications[0].name).toBe('nav');
    expect(
      applications[0].activeWhen.some(fn => fn(new URL('http://localhost'))),
    ).toBe(true);
    expect(
      applications[0].activeWhen.some(fn =>
        fn(new URL('http://localhost/app1')),
      ),
    ).toBe(true);

    expect(applications[1].name).toBe('app1');
    expect(
      applications[1].activeWhen.some(fn => fn(new URL('http://localhost'))),
    ).toBe(false);
    expect(
      applications[1].activeWhen.some(fn =>
        fn(new URL('http://localhost/app1')),
      ),
    ).toBe(true);

    expect(applications[2].name).toBe('subroute');
    expect(
      applications[2].activeWhen.some(fn => fn(new URL('http://localhost'))),
    ).toBe(false);
    expect(
      applications[2].activeWhen.some(fn =>
        fn(new URL('http://localhost/app1')),
      ),
    ).toBe(false);
    expect(
      applications[2].activeWhen.some(fn =>
        fn(new URL('http://localhost/app1/subroute')),
      ),
    ).toBe(true);
    expect(
      applications[2].activeWhen.some(fn =>
        fn(new URL('http://localhost/app2/subroute')),
      ),
    ).toBe(true);

    expect(applications[3].name).toBe('app2');
    expect(
      applications[3].activeWhen.some(fn => fn(new URL('http://localhost'))),
    ).toBe(false);
    expect(
      applications[3].activeWhen.some(fn =>
        fn(new URL('http://localhost/app2')),
      ),
    ).toBe(true);

    expect(applications[4].name).toBe('footer');
    expect(
      applications[4].activeWhen.some(fn => fn(new URL('http://localhost'))),
    ).toBe(true);
    expect(
      applications[4].activeWhen.some(fn =>
        fn(new URL('http://localhost/app2')),
      ),
    ).toBe(true);

    expect(
      applications
        .find(a => a.name === 'nav')
        .customProps('nav', new URL('https://localhost/')),
    ).toEqual({});

    expect(
      applications
        .find(a => a.name === 'app1')
        .customProps('app1', new URL('https://localhost/app1')),
    ).toEqual({
      primary: true,
    });

    expect(
      applications
        .find(a => a.name === 'subroute')
        .customProps('subroute', new URL('https://localhost/app1/subroute')),
    ).toEqual({
      count: 1,
    });

    expect(
      applications
        .find(a => a.name === 'subroute')
        .customProps('subroute', new URL('https://localhost/app2/subroute')),
    ).toEqual({
      count: 2,
    });
  });

  it(`creates a loading function using the loadApp function`, async () => {
    const routes = {
      mode: 'history',
      base: '/',
      containerEl: 'body',
      routes: [{ type: 'application', name: 'nav' }],
    };

    const loadApp = jest.fn();
    const lifecycles = {
      async bootstrap() {},
      async mount() {},
      async unmount() {},
    };
    loadApp.mockReturnValue(lifecycles);

    const applications = constructApplications({ routes, loadApp });
    expect(applications.length).toBe(1);

    expect(loadApp).not.toHaveBeenCalled();
    const returnValue = await applications[0].app({ name: 'nav' });
    expect(loadApp).toHaveBeenCalledWith({ name: 'nav' });
    expect(returnValue).toBe(lifecycles);
  });

  it(`can construct applications from dom elements`, () => {
    const { document, routerElement } = parseFixture('dom-elements.html');
    const routes = constructRoutes(routerElement);

    const loadApp = jest.fn();
    const lifecycles = {
      async bootstrap() {},
      async mount() {},
      async unmount() {},
    };
    loadApp.mockReturnValue(lifecycles);

    const applications = constructApplications({ routes, loadApp });
    expect(applications.length).toBe(2);
    expect(applications[0].name).toBe('header');
    expect(
      applications[0].activeWhen.some(fn => fn(new URL('http://localhost/'))),
    ).toBe(true);
    expect(
      applications[0].activeWhen.some(fn =>
        fn(new URL('http://localhost/app1')),
      ),
    ).toBe(true);

    expect(applications[1].name).toBe('app1');
    expect(
      applications[1].activeWhen.some(fn => fn(new URL('http://localhost/'))),
    ).toBe(false);
    expect(
      applications[1].activeWhen.some(fn =>
        fn(new URL('http://localhost/app1')),
      ),
    ).toBe(true);
  });

  it(`can merge route props and application props together`, () => {
    const routes = constructRoutes({
      mode: 'history',
      base: '/',
      containerEl: 'body',
      routes: [
        {
          type: 'route',
          path: 'route1',
          props: { foo: 1, bar: 1, baz: 1 },
          routes: [
            {
              type: 'route',
              path: 'subroute',
              props: { foo: 2, bar: 2, other: 2 },
              routes: [
                { type: 'application', name: 'app1', props: { foo: 3 } },
              ],
            },
          ],
        },
        {
          type: 'route',
          path: 'route2',
          props: { foo: -1, bar: -1, baz: -1 },
          routes: [
            {
              type: 'route',
              path: 'subroute',
              props: { foo: -2, bar: -2, other: -2 },
              routes: [
                { type: 'application', name: 'app1', props: { foo: -3 } },
              ],
            },
          ],
        },
      ],
    });

    const loadApp = name => {};

    const applications = constructApplications({ routes, loadApp });

    expect(applications[0].name).toEqual('app1');
    expect(
      applications[0].customProps(
        'app1',
        new URL('https://localhost/route1/subroute'),
      ),
    ).toEqual({
      foo: 3,
      bar: 2,
      baz: 1,
      other: 2,
    });
    expect(
      applications[0].customProps(
        'app1',
        new URL('https://localhost/route2/subroute'),
      ),
    ).toEqual({
      foo: -3,
      bar: -2,
      baz: -1,
      other: -2,
    });
  });

  it(`places a loader in the dom while loading the code`, async () => {
    const routes = constructRoutes({
      routes: [
        {
          type: 'application',
          name: 'app1',
          loader: `<img src="loading.gif">`,
        },
      ],
    });

    const app = {
      async bootstrap() {},
      async mount() {},
      async unmount() {},
    };

    const loadApp = name =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve(app);
        }, 5);
      });

    const applications = constructApplications({ routes, loadApp });
    let appEl;

    if (inBrowser) {
      appEl = document.getElementById(`single-spa-application:app1`);
      expect(appEl).toBeNull();
    }

    // begin loading the app
    const loadPromise = applications[0].app();

    await tick();

    if (inBrowser) {
      appEl = document.getElementById(`single-spa-application:app1`);
      expect(appEl).toMatchInlineSnapshot(`
        <div
          id="single-spa-application:app1"
          style="display: none;"
        >
          <img
            src="loading.gif"
          />
        </div>
      `);
    }

    const loadedApp = await loadPromise;

    expect(loadedApp).toBe(app);

    if (inBrowser) {
      appEl = document.getElementById(`single-spa-application:app1`);
      expect(appEl).toMatchInlineSnapshot(`
        <div
          id="single-spa-application:app1"
        />
      `);
    }
  });

  it(`removes the loader if loading the application fails`, async () => {
    const routes = constructRoutes({
      routes: [
        {
          type: 'application',
          name: 'app2',
          loader: `<img src="loading.gif">`,
        },
      ],
    });

    const loadError = Error('could not download app code');

    const loadApp = name =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(loadError);
        }, 5);
      });

    const applications = constructApplications({ routes, loadApp });
    let appEl;

    if (inBrowser) {
      appEl = document.getElementById(`single-spa-application:app2`);
      expect(appEl).toBeNull();
    }

    // begin loading the app
    const loadPromise = applications[0].app();

    await tick();

    if (inBrowser) {
      appEl = document.getElementById(`single-spa-application:app2`);
      expect(appEl).toMatchInlineSnapshot(`
        <div
          id="single-spa-application:app2"
          style="display: none;"
        >
          <img
            src="loading.gif"
          />
        </div>
      `);
    }

    expect(loadPromise).rejects.toThrow(loadError);
    await Promise.allSettled([loadPromise]);

    if (inBrowser) {
      appEl = document.getElementById(`single-spa-application:app2`);
      expect(appEl).toMatchInlineSnapshot(`
        <div
          id="single-spa-application:app2"
        />
      `);
    }
  });

  // https://github.com/single-spa/single-spa-layout/issues/64
  it(`does not require trailing slashes after base path`, () => {
    const routes = constructRoutes({
      mode: 'history',
      base: '/something',
      routes: [
        {
          type: 'route',
          path: '/',
          routes: [
            {
              type: 'application',
              name: 'app1',
            },
          ],
        },
      ],
    });

    async function loadApp() {}

    const applications = constructApplications({ routes, loadApp });
    expect(applications.length).toBe(1);
    const app1 = applications[0];
    expect(
      app1.activeWhen.some(fn => fn(new URL('http://example.com/something'))),
    ).toBe(true);
  });

  // https://github.com/single-spa/single-spa-layout/issues/132
  it(`activity functions not impacted by query strings`, () => {
    const routes = constructRoutes({
      mode: 'history',
      base: '/something',
      routes: [
        {
          type: 'route',
          path: '/',
          routes: [
            {
              type: 'application',
              name: 'app1',
            },
          ],
        },
      ],
    });

    async function loadApp() {}

    const applications = constructApplications({ routes, loadApp });
    expect(applications.length).toBe(1);
    const app1 = applications[0];
    expect(
      app1.activeWhen.some(fn => fn(new URL('http://example.com/something'))),
    ).toBe(true);

    expect(
      app1.activeWhen.some(fn =>
        fn(new URL('http://example.com/something?page=1')),
      ),
    ).toBe(true);
  });
});

function tick(millis = 0) {
  return new Promise(resolve => {
    setTimeout(resolve);
  });
}
