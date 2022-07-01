import { inBrowser } from '../src/utils/environment-helpers.js';
import { constructRoutes } from '../src/single-spa-layout.js';
import { parseFixture } from './html-utils';
import fs from 'fs/promises';

jest.spyOn(console, 'warn');

describe('constructRoutes', () => {
  beforeEach(() => {
    console.warn.mockReset();
  });

  describe(`HTML parsing`, () => {
    it(`can parse a medium complexity HTML routes definition`, () => {
      const { document, routerElement } = parseFixture('medium.html');
      // In browser we can use querySelector, otherwise the more manual lookup
      const routes = constructRoutes(routerElement);
    });

    it(`can parse a layout with arbitrary dom element children`, () => {
      const { document, routerElement } = parseFixture('dom-elements.html');
      const routes = constructRoutes(routerElement);
    });

    if (inBrowser) {
      it(`can parse an html layout from string`, async () => {
        const htmlString = await fs.readFile(
          './test/fixtures/medium.html',
          'utf-8',
        );
        const routes = constructRoutes(htmlString);
      });
    }
  });

  describe(`validates top level properties`, () => {
    it('accepts a valid routesConfig', () => {
      constructRoutes({
        mode: 'history',
        base: '/',
        containerEl: '#selector',
        routes: [
          { type: 'application', name: '@org/navbar' },
          {
            type: 'route',
            path: 'app1',
            routes: [
              { type: 'application', name: '@org/main-sidenav' },
              { type: 'application', name: '@org/app1' },
            ],
          },
          {
            type: 'route',
            path: 'app2',
            routes: [
              { type: 'application', name: '@org/main-sidenav' },
              { type: 'application', name: '@org/app2' },
            ],
          },
          {
            type: 'route',
            path: 'settings',
            routes: [{ type: 'application', name: '@org/settings' }],
          },
          { type: 'application', name: '@org/footer' },
        ],
      });
    });

    it(`throws an error if the first argument is not an object`, () => {
      expect(() => {
        constructRoutes();
      }).toThrowError(/expected a plain object/);

      expect(() => {
        constructRoutes(null);
      }).toThrowError(/expected a plain object/);

      if (inBrowser) {
        expect(() => {
          constructRoutes('');
        }).toThrowError(/single-spa-router/);

        expect(() => {
          constructRoutes('<div></div>');
        }).toThrowError(/single-spa-router/);
      } else {
        expect(() => {
          constructRoutes('');
        }).toThrowError(/string on the server/);

        expect(() => {
          constructRoutes('<div></div>');
        }).toThrowError(/string on the server/);
      }

      expect(() => {
        constructRoutes(undefined);
      }).toThrowError(/expected a plain object/);

      expect(() => {
        constructRoutes([]);
      }).toThrowError(/expected a plain object/);
    });

    it(`console.warns if extra properties are provided`, () => {
      constructRoutes({
        routes: [],
        irrelevantProperty: 'thing',
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig: received invalid properties 'irrelevantProperty', but valid properties are mode, base, containerEl, routes, disableWarnings, redirects`,
      );
    });

    it(`validates the mode correctly`, () => {
      expect(() => {
        constructRoutes({
          mode: 'wrong',
          routes: [],
        });
      }).toThrowError('mode');

      constructRoutes({
        mode: 'hash',
        routes: [],
      });

      constructRoutes({
        mode: 'history',
        routes: [],
      });
    });

    it(`validates the base correctly`, () => {
      constructRoutes({
        base: '/',
        mode: 'history',
        routes: [],
      });

      expect(() => {
        constructRoutes({
          base: '',
          mode: 'history',
          routes: [],
        });
      }).toThrowError('non-blank string');

      expect(() => {
        constructRoutes({
          base: '  ',
          mode: 'history',
          routes: [],
        });
      }).toThrowError('non-blank string');

      expect(() => {
        constructRoutes({
          base: null,
          mode: 'history',
          routes: [],
        });
      }).toThrowError('non-blank string');
    });

    it(`throws an error with invalid redirects`, () => {
      expect(() => {
        constructRoutes({
          routes: [],
          redirects: 123,
        });
      }).toThrowError('plain object');

      expect(() => {
        constructRoutes({
          routes: [],
          redirects: {
            1: '/login',
          },
        });
      }).toThrowError('absolute path');

      expect(() => {
        constructRoutes({
          routes: [],
          redirects: {
            '/': 1,
          },
        });
      }).toThrowError('non-blank string');

      expect(() => {
        constructRoutes({
          routes: [],
          redirects: {
            home: '/login',
          },
        });
      }).toThrowError('absolute path');

      expect(() => {
        constructRoutes({
          routes: [],
          redirects: {
            '/home': 'login',
          },
        });
      }).toThrowError('absolute path');
    });
  });

  describe('validates routes', () => {
    it(`checks that routes are an array`, () => {
      expect(() => {
        constructRoutes({
          mode: 'history',
          routes: {},
        });
      }).toThrowError('array');

      expect(() => {
        constructRoutes({
          mode: 'history',
          routes: 'str',
        });
      }).toThrowError('array');
    });

    it(`checks for valid route objects`, () => {
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: '/',
            routes: [],
          },
        ],
      });

      console.warn.mockReset();
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: '/',
            routes: [],
            somethingElse: 'value',
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0]: received invalid properties 'somethingElse', but valid properties are type, path, routes, props, default, exact`,
      );
    });

    it(`checks for valid application objects`, () => {
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'application',
            name: '@org/project',
          },
        ],
      });

      console.warn.mockReset();
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'application',
            name: '@org/project',
            somethingElse: 'value',
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0]: received invalid properties 'somethingElse', but valid properties are type, name, props, loader, error`,
      );

      console.warn.mockReset();
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'application',
            name: '@org/project',
            routes: [],
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0]: received invalid properties 'routes', but valid properties are type, name, props, loader, error`,
      );
    });

    it(`checks subroutes`, () => {
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: 'thing',
            routes: [
              {
                type: 'application',
                name: 'navbar',
              },
            ],
          },
        ],
      });

      expect(console.warn).not.toHaveBeenCalled();
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: 'thing',
            routes: [
              {
                type: 'application',
                name: 'navbar',
                somethingElse: 'thing',
              },
            ],
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0].routes[0]: received invalid properties 'somethingElse', but valid properties are type, name, props, loader, error`,
      );
    });

    it(`checks all routes when there are multiple`, () => {
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: '/',
            routes: [],
          },
          {
            type: 'route',
            path: '/app1',
            routes: [],
          },
        ],
      });

      expect(console.warn).not.toHaveBeenCalled();
      constructRoutes({
        mode: 'history',
        routes: [
          {
            type: 'route',
            path: '/',
            routes: [],
          },
          {
            type: 'route',
            path: '/app1',
            routes: [],
            irrelevantProperty: 'thing',
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        "Invalid routesConfig.routes[1]: received invalid properties 'irrelevantProperty', but valid properties are type, path, routes, props, default, exact",
      );
    });

    it(`correctly validates the route.exact property`, () => {
      expect(() => {
        constructRoutes({
          routes: [{ type: 'route', path: '/', exact: 'strings are invalid' }],
        });
      }).toThrowError(
        `Invalid routesConfig.routes[0].exact: received string, but expected a boolean`,
      );

      constructRoutes({
        routes: [{ type: 'route', path: '/', exact: true }],
      });
    });

    it(`throws when containerEl is invalid`, () => {
      expect(() => {
        constructRoutes({
          containerEl: null,
          routes: [],
        });
      }).toThrowError(
        'Invalid routesConfig.containerEl: received null but expected either non-blank string or HTMLElement',
      );

      expect(() => {
        constructRoutes({
          containerEl: [],
          routes: [],
        });
      }).toThrowError(
        'Invalid routesConfig.containerEl: received  but expected either non-blank string or HTMLElement',
      );

      expect(() => {
        constructRoutes({
          containerEl: 2342,
          routes: [],
        });
      }).toThrowError(
        'Invalid routesConfig.containerEl: received 2342 but expected either non-blank string or HTMLElement',
      );
    });

    it(`allows a string containerEl`, () => {
      constructRoutes({
        containerEl: 'asdf',
        routes: [],
      });
    });

    if (inBrowser) {
      it('allows an HTMLElement containerEl', () => {
        constructRoutes({
          containerEl: document.createElement('div'),
          routes: [],
        });
      });
    }

    it(`allows for "default" routes`, () => {
      constructRoutes({
        routes: [
          { type: 'route', path: 'app1' },
          { type: 'route', default: true },
        ],
      });

      constructRoutes({
        routes: [
          { type: 'route', path: 'app1', default: false },
          { type: 'route', default: true },
        ],
      });
    });

    it(`throws on a default route that has a path`, () => {
      expect(() => {
        constructRoutes({
          routes: [{ type: 'route', path: 'app1', default: true }],
        });
      }).toThrowError(
        'Invalid routesConfig.routes[0]: cannot have both path and set default to true.',
      );
    });

    it(`throws on a route that has no path and is not default`, () => {
      expect(() => {
        constructRoutes({
          routes: [{ type: 'route' }],
        });
      }).toThrowError(
        'Invalid routesConfig.routes[0]: routes must have either a path or default property',
      );
    });
  });

  describe(`return value`, () => {
    it(`adds a default base if one is not provided`, () => {
      expect(
        constructRoutes({
          containerEl: 'body',
          mode: 'history',
          routes: [{ type: 'application', name: 'nav' }],
        }),
      ).toEqual({
        base: '/',
        containerEl: 'body',
        mode: 'history',
        routes: [{ type: 'application', name: 'nav' }],
      });
    });

    it(`adds a default mode if one is not provided`, () => {
      expect(
        constructRoutes({
          containerEl: 'body',
          base: '/',
          routes: [{ type: 'application', name: 'nav' }],
        }),
      ).toEqual({
        base: '/',
        containerEl: 'body',
        mode: 'history',
        routes: [{ type: 'application', name: 'nav' }],
      });
    });

    it(`adds a default containerEl if one is not provided`, () => {
      expect(
        constructRoutes({
          base: '/',
          mode: 'history',
          routes: [{ type: 'application', name: 'nav' }],
        }),
      ).toEqual({
        base: '/',
        containerEl: 'body',
        mode: 'history',
        routes: [{ type: 'application', name: 'nav' }],
      });
    });

    it(`constructs an activeWhen for all routes`, () => {
      const resolvedRoutes = constructRoutes({
        routes: [
          {
            type: 'route',
            path: '/settings',
            routes: [{ type: 'route', path: 'users', routes: [] }],
          },
          { type: 'route', path: '/clients', routes: [] },
        ],
      });

      const settingsActiveWhen = resolvedRoutes.routes[0].activeWhen;
      const usersActiveWhen = resolvedRoutes.routes[0].routes[0].activeWhen;
      const clientsActiveWhen = resolvedRoutes.routes[1].activeWhen;

      expect(settingsActiveWhen).toBeDefined();
      expect(usersActiveWhen).toBeDefined();
      expect(clientsActiveWhen).toBeDefined();

      expect(settingsActiveWhen(new URL('http://localhost/'))).toBe(false);
      expect(settingsActiveWhen(new URL('http://localhost/clients'))).toBe(
        false,
      );
      expect(settingsActiveWhen(new URL('http://localhost/other'))).toBe(false);
      expect(settingsActiveWhen(new URL('http://localhost/settings'))).toBe(
        true,
      );
      expect(settingsActiveWhen(new URL('http://localhost/settings/'))).toBe(
        true,
      );
      expect(
        settingsActiveWhen(new URL('http://localhost/settings/users')),
      ).toBe(true);
      expect(
        settingsActiveWhen(new URL('http://localhost/settings/other')),
      ).toBe(true);

      expect(usersActiveWhen(new URL('http://localhost/'))).toBe(false);
      expect(usersActiveWhen(new URL('http://localhost/clients'))).toBe(false);
      expect(usersActiveWhen(new URL('http://localhost/other'))).toBe(false);
      expect(usersActiveWhen(new URL('http://localhost/settings'))).toBe(false);
      expect(usersActiveWhen(new URL('http://localhost/settings/'))).toBe(
        false,
      );
      expect(usersActiveWhen(new URL('http://localhost/settings/users'))).toBe(
        true,
      );
      expect(
        usersActiveWhen(new URL('http://localhost/settings/users/1')),
      ).toBe(true);
      expect(usersActiveWhen(new URL('http://localhost/settings/other'))).toBe(
        false,
      );

      expect(clientsActiveWhen(new URL('http://localhost/'))).toBe(false);
      expect(clientsActiveWhen(new URL('http://localhost/clients'))).toBe(true);
      expect(clientsActiveWhen(new URL('http://localhost/other'))).toBe(false);
      expect(clientsActiveWhen(new URL('http://localhost/settings'))).toBe(
        false,
      );
      expect(clientsActiveWhen(new URL('http://localhost/settings/'))).toBe(
        false,
      );
      expect(
        clientsActiveWhen(new URL('http://localhost/settings/users')),
      ).toBe(false);
      expect(
        clientsActiveWhen(new URL('http://localhost/settings/other')),
      ).toBe(false);
    });

    it(`constructs an activeWhen that works with hash routing`, () => {
      const resolvedRoutes = constructRoutes({
        mode: 'hash',
        routes: [
          {
            type: 'route',
            path: 'settings',
            routes: [{ type: 'route', path: 'users', routes: [] }],
          },
          { type: 'route', path: 'clients', routes: [] },
        ],
      });

      const settingsActiveWhen = resolvedRoutes.routes[0].activeWhen;
      const usersActiveWhen = resolvedRoutes.routes[0].routes[0].activeWhen;
      const clientsActiveWhen = resolvedRoutes.routes[1].activeWhen;

      expect(settingsActiveWhen).toBeDefined();
      expect(usersActiveWhen).toBeDefined();
      expect(clientsActiveWhen).toBeDefined();

      expect(settingsActiveWhen(new URL('http://localhost#/'))).toBe(false);
      expect(settingsActiveWhen(new URL('http://localhost#/clients'))).toBe(
        false,
      );
      expect(settingsActiveWhen(new URL('http://localhost#/other'))).toBe(
        false,
      );
      expect(settingsActiveWhen(new URL('http://localhost#/settings'))).toBe(
        true,
      );
      expect(settingsActiveWhen(new URL('http://localhost#/settings/'))).toBe(
        true,
      );
      expect(
        settingsActiveWhen(new URL('http://localhost#/settings/users')),
      ).toBe(true);
      expect(
        settingsActiveWhen(new URL('http://localhost#/settings/other')),
      ).toBe(true);

      expect(usersActiveWhen(new URL('http://localhost#/'))).toBe(false);
      expect(usersActiveWhen(new URL('http://localhost#/clients'))).toBe(false);
      expect(usersActiveWhen(new URL('http://localhost#/other'))).toBe(false);
      expect(usersActiveWhen(new URL('http://localhost#/settings'))).toBe(
        false,
      );
      expect(usersActiveWhen(new URL('http://localhost#/settings/'))).toBe(
        false,
      );
      expect(usersActiveWhen(new URL('http://localhost#/settings/users'))).toBe(
        true,
      );
      expect(
        usersActiveWhen(new URL('http://localhost#/settings/users/1')),
      ).toBe(true);
      expect(usersActiveWhen(new URL('http://localhost#/settings/other'))).toBe(
        false,
      );

      expect(clientsActiveWhen(new URL('http://localhost#/'))).toBe(false);
      expect(clientsActiveWhen(new URL('http://localhost#/clients'))).toBe(
        true,
      );
      expect(clientsActiveWhen(new URL('http://localhost#/other'))).toBe(false);
      expect(clientsActiveWhen(new URL('http://localhost#/settings'))).toBe(
        false,
      );
      expect(clientsActiveWhen(new URL('http://localhost#/settings/'))).toBe(
        false,
      );
      expect(
        clientsActiveWhen(new URL('http://localhost#/settings/users')),
      ).toBe(false);
      expect(
        clientsActiveWhen(new URL('http://localhost#/settings/other')),
      ).toBe(false);
    });

    it(`constructs routes that allow for dynamic paths in the URLs`, () => {
      const resolvedRoutes = constructRoutes({
        routes: [{ type: 'route', path: '/users/:id/permissions', routes: [] }],
      });

      const activeWhen = resolvedRoutes.routes[0].activeWhen;
      expect(activeWhen(new URL('http://localhost/'))).toBe(false);
      expect(activeWhen(new URL('http://localhost/users/1/permissions'))).toBe(
        true,
      );
      expect(
        activeWhen(new URL('http://localhost/users/asdf/permissions')),
      ).toBe(true);
      expect(activeWhen(new URL('http://localhost/users/new'))).toBe(false);
    });

    it(`handles 'loader' property on applications`, () => {
      expect(
        constructRoutes({
          routes: [
            {
              type: 'application',
              name: 'app1',
              loader: `<img src="loading.gif">`,
            },
          ],
        }),
      ).toMatchObject({
        routes: [
          {
            type: 'application',
            name: 'app1',
            loader: `<img src="loading.gif">`,
          },
        ],
      });
    });

    it(`handles the 'error' property on applications`, () => {
      expect(
        constructRoutes({
          routes: [
            {
              type: 'application',
              name: 'app1',
              error: `<div>Oops, looks like app1 is broken</div>`,
            },
          ],
        }),
      ).toMatchObject({
        routes: [
          {
            type: 'application',
            name: 'app1',
            error: `<div>Oops, looks like app1 is broken</div>`,
          },
        ],
      });
    });
  });

  describe('Loaders defined in HTML', () => {
    it(`can parse and apply loaders from HTML files`, () => {
      const { document, routerElement } = parseFixture('loaders.html');
      const data = {
        loaders: {
          headerLoader: {
            async bootstrap() {},
            async mount() {},
            async unmount() {},
          },
          mainContentLoader: `<img src="loading.gif">`,
        },
      };
      const routes = constructRoutes(routerElement, data);

      const headerApp = findApplication(routes.routes, 'header');
      expect(headerApp).toBeDefined();
      expect(headerApp.loader).toBe(data.loaders.headerLoader);
      expect(headerApp.props).not.toBeDefined();

      const app1App = findApplication(routes.routes, 'app1');

      expect(app1App.loader).toBe(data.loaders.mainContentLoader);
      expect(app1App.props).not.toBeDefined();
    });
  });

  if (inBrowser)
    describe('props defined in HTML', () => {
      it(`can assign valid props`, () => {
        const { document, routerElement } = parseFixture('props.html');
        const data = {
          props: {
            mode: 'client',
            portalMode: 'client',
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            caseSensitiveProp: 'value4',
          },
        };
        const routes = constructRoutes(routerElement, data);
        expect(routes.routes[0].props).toEqual({
          portalMode: data.props.portalMode,
          prop1: data.props.prop1,
          caseSensitiveProp: 'value4',
        });
        expect(routes.routes[1].routes[0].routes[0].props).toEqual({
          mode: data.props.portalMode,
          prop2: data.props.prop2,
        });
        expect(routes.routes[1].routes[0].props).toEqual({
          prop3: 'value3',
        });
      });

      it(`throws with invalid props`, () => {
        const { document, routerElement } = parseFixture('props.html');
        expect(() => {
          constructRoutes(routerElement);
        }).toThrowError(/Prop '.+' was not defined/);
      });

      it(`throws when defining props for non-HTML routes`, () => {
        const data = {
          props: {
            portalMode: 'client',
            prop1: 'value1',
            prop2: 'value2',
          },
        };
        expect(() => {
          constructRoutes({ routes: [] }, data);
        }).toThrowError(
          /constructRoutes should be called either with an HTMLElement and layoutData, or a single json object./,
        );
      });
    });

  describe(`error handlers defined in HTML`, () => {
    it(`can parse and apply error handlers from HTML files`, () => {
      const { document, routerElement } = parseFixture('error-handlers.html');
      const data = {
        errors: {
          headerError: {
            async bootstrap() {},
            async mount() {},
            async unmount() {},
          },
          mainContentError: `<div>Oops! An error occurred!</div>`,
        },
      };
      const routes = constructRoutes(routerElement, data);

      const headerApp = findApplication(routes.routes, 'header');
      expect(headerApp).toBeDefined();
      expect(headerApp.error).toBe(data.errors.headerError);
      expect(headerApp.props).not.toBeDefined();
    });
  });

  describe('router config defined in HTML', () => {
    const { document, routerElement } = parseFixture('router-config.html');
    const routes = constructRoutes(routerElement);

    it(`assigns 'mode' when a valid value is passed as attribute`, () => {
      expect(routes.mode).toBe('hash');
    });

    it(`assigns 'base' when a valid value is passed as attribute`, () => {
      expect(routes.base).toBe('/custom/');
    });

    it(`assigns 'containerEl' when a valid value is passed as attribute`, () => {
      expect(routes.containerEl).toBe('#spa-container');
    });
  });

  describe(`redirects`, () => {
    it(`can parse redirects`, () => {
      const { document, routerElement } = parseFixture('redirects.html');
      const routes = constructRoutes(routerElement);
      expect(routes.redirects).toEqual({
        '/': '/login',
        '/old-settings': '/settings',
      });
    });
  });
});

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
