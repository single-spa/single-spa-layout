import { matchRoute } from '../src/isomorphic/matchRoute.js';
import { constructRoutes } from '../src/isomorphic/constructRoutes.js';
import { parseFixture } from './html-utils.js';

describe(`matchRoute`, () => {
  let routesConfig;

  afterEach(() => {
    routesConfig = null;
  });

  describe(`json config`, () => {
    beforeEach(() => {
      routesConfig = constructRoutes({
        mode: 'history',
        base: '/',
        containerEl: 'body',
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            path: 'app1',
            routes: [
              { type: 'application', name: 'app1' },
              {
                type: 'route',
                path: 'subroute',
                routes: [{ type: 'application', name: 'subroute' }],
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
                routes: [{ type: 'application', name: 'subroute' }],
              },
            ],
          },
          {
            type: 'route',
            path: 'users/:id',
            routes: [
              { type: 'application', name: 'user-home' },
              {
                type: 'route',
                path: 'settings',
                routes: [{ type: 'application', name: 'user-settings' }],
              },
            ],
          },
          {
            type: 'route',
            default: true,
            routes: [{ type: 'application', name: 'not-found' }],
          },
          { type: 'application', name: 'footer' },
        ],
      });
    });

    it(`returns a filtered routes array`, () => {
      expect(matchRoute(routesConfig, '/')).toMatchObject({
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            default: true,
            routes: [{ type: 'application', name: 'not-found' }],
          },
          { type: 'application', name: 'footer' },
        ],
      });
    });

    it(`matches nested routes`, () => {
      expect(matchRoute(routesConfig, '/app1')).toMatchObject({
        ...routesConfig,
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            path: 'app1',
            routes: [{ type: 'application', name: 'app1' }],
          },
          { type: 'application', name: 'footer' },
        ],
      });

      expect(matchRoute(routesConfig, '/app2')).toMatchObject({
        ...routesConfig,
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            path: 'app2',
            routes: [{ type: 'application', name: 'app2' }],
          },
          { type: 'application', name: 'footer' },
        ],
      });
    });

    it(`matches deeply nested routes`, () => {
      expect(matchRoute(routesConfig, '/app1/subroute')).toMatchObject({
        ...routesConfig,
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            path: 'app1',
            routes: [
              { type: 'application', name: 'app1' },
              {
                type: 'route',
                path: 'subroute',
                routes: [{ type: 'application', name: 'subroute' }],
              },
            ],
          },
          { type: 'application', name: 'footer' },
        ],
      });
    });

    it(`matches using base name`, () => {
      routesConfig.base = '/base/';

      expect(matchRoute(routesConfig, '/')).toMatchObject({
        routes: [],
      });

      expect(matchRoute(routesConfig, '/base/')).toMatchObject({
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            default: true,
            routes: [{ type: 'application', name: 'not-found' }],
          },
          { type: 'application', name: 'footer' },
        ],
      });

      expect(matchRoute(routesConfig, '/base')).toMatchObject({
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            default: true,
            routes: [{ type: 'application', name: 'not-found' }],
          },
          { type: 'application', name: 'footer' },
        ],
      });
    });

    it(`matches dynamic paths`, () => {
      expect(matchRoute(routesConfig, 'users/123')).toMatchObject({
        ...routesConfig,
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            path: 'users/:id',
            routes: [{ type: 'application', name: 'user-home' }],
          },
          { type: 'application', name: 'footer' },
        ],
      });

      expect(matchRoute(routesConfig, 'users/123/settings')).toMatchObject({
        ...routesConfig,
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            path: 'users/:id',
            routes: [
              { type: 'application', name: 'user-home' },
              {
                type: 'route',
                path: 'settings',
                routes: [{ type: 'application', name: 'user-settings' }],
              },
            ],
          },
          { type: 'application', name: 'footer' },
        ],
      });
    });

    it(`properly matches default routes`, () => {
      expect(matchRoute(routesConfig, '/')).toMatchObject({
        routes: [
          { type: 'application', name: 'nav' },
          {
            type: 'route',
            default: true,
            routes: [{ type: 'application', name: 'not-found' }],
          },
          { type: 'application', name: 'footer' },
        ],
      });
    });
  });

  describe(`nested-default-routes`, () => {
    beforeEach(() => {
      const { document, routerElement } = parseFixture(
        'nested-default-route.html',
      );
      routesConfig = constructRoutes(routerElement);
    });

    it(`matches /settings/app1 route`, () => {
      const match = matchRoute(routesConfig, '/settings/app1');
      expectApplicationMatched(match, 'header');
      expectApplicationMatched(match, 'app1');
    });

    it(`matches /settings route to not-found route`, () => {
      const match = matchRoute(routesConfig, '/settings');
      expectApplicationMatched(match, 'header');
      expectApplicationMatched(match, 'settings-not-found');
    });

    it(`matches / route to not-found app`, () => {
      const match = matchRoute(routesConfig, '/');
      expectApplicationMatched(match, 'header');
      expectApplicationMatched(match, 'not-found');
    });
  });

  describe(`issue-119`, () => {
    beforeEach(() => {
      const { document, routerElement } = parseFixture('issue-119.html');
      routesConfig = constructRoutes(routerElement);
    });

    it(`matches /nested to the planets app`, () => {
      const match = matchRoute(routesConfig, '/nested');
      expectApplicationMatched(match, 'planets');
      expectApplicationNotMatched(match, 'people');
    });

    it(`matches / to the people app (not planets)`, () => {
      const match = matchRoute(routesConfig, '/');
      expectApplicationNotMatched(match, 'planets');
      expectApplicationMatched(match, 'people');
    });
  });

  describe(`multiple default routes`, () => {
    beforeEach(() => {
      routesConfig = constructRoutes({
        routes: [
          {
            type: 'route',
            path: 'settings',
            routes: [
              {
                type: 'route',
                path: 'users',
                routes: [{ type: 'application', name: 'user-settings' }],
              },
              {
                type: 'route',
                default: true,
                routes: [{ type: 'application', name: 'settings-not-found' }],
              },
              {
                type: 'route',
                default: true,
                routes: [{ type: 'application', name: 'settings-not-found-2' }],
              },
            ],
          },
        ],
      });
    });

    it(`can match /settings/users`, () => {
      const match = matchRoute(routesConfig, '/settings/users');

      expect(match).toMatchObject({
        routes: [
          {
            type: 'route',
            path: 'settings',
            routes: [
              {
                type: 'route',
                path: 'users',
                routes: [{ type: 'application', name: 'user-settings' }],
              },
            ],
          },
        ],
      });

      expect(match.routes[0].routes.length).toBe(1);
    });

    it(`can match /settings`, () => {
      expect(matchRoute(routesConfig, '/settings')).toMatchObject({
        routes: [
          {
            type: 'route',
            path: 'settings',
            routes: [
              {
                type: 'route',
                default: true,
                routes: [{ type: 'application', name: 'settings-not-found' }],
              },
              {
                type: 'route',
                default: true,
                routes: [{ type: 'application', name: 'settings-not-found-2' }],
              },
            ],
          },
        ],
      });
    });
  });

  describe('exact route matches', () => {
    it('properly matches exact route matches in JSON', () => {
      const routes = constructRoutes({
        routes: [
          {
            type: 'route',
            path: 'user/:id/settings',
            exact: true,
            routes: [{ type: 'application', name: 'user-settings' }],
          },
        ],
      });

      expect(matchRoute(routes, '/user/1/settings')).toMatchObject({
        routes: [
          {
            type: 'route',
            path: 'user/:id/settings',
            exact: true,
            routes: [{ type: 'application', name: 'user-settings' }],
          },
        ],
      });

      expect(matchRoute(routes, '/user/1/settings/more')).toMatchObject({
        routes: [],
      });
    });

    it('properly matches exact route matches in HTML', () => {
      const { document, routerElement } = parseFixture('exact-matches.html');
      const routes = constructRoutes(routerElement);
      routes.routes = routes.routes.filter(r => r.type !== '#text');
      routes.routes[0].routes = routes.routes[0].routes.filter(
        r => r.type !== '#text',
      );

      expect(matchRoute(routes, '/user/1/settings')).toMatchObject({
        routes: [
          {
            type: 'route',
            path: 'user/:id/settings',
            exact: true,
            routes: [{ type: 'application', name: 'user-settings' }],
          },
        ],
      });

      expect(matchRoute(routes, '/user/1/settings/more')).toMatchObject({
        routes: [],
      });
    });
  });
});

function expectApplicationNotMatched(match, name) {
  const application = findApplication(match.routes, name);
  if (application) {
    fail(
      `Expected application '${name}' to not be returned by matchRoute, but it was`,
    );
  }
}

function expectApplicationMatched(match, name) {
  const application = findApplication(match.routes, name);
  if (!application) {
    fail(
      `Expected application '${name}' to be returned by matchRoute, but it was not`,
    );
  }
}

function findApplication(routes, name) {
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];

    if (route.type === 'application' && route.name === name) {
      return route;
    } else if (route.routes) {
      return findApplication(route.routes, name);
    }
  }
}
