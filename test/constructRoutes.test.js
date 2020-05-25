import { inBrowser } from "../src/environment-helpers.js";
import { constructRoutes } from "../src/single-spa-layout.js";
import { parseFixture } from "./html-utils";

jest.spyOn(console, "warn");

describe("constructRoutes", () => {
  beforeEach(() => {
    console.warn.mockReset();
  });

  describe(`HTML parsing`, () => {
    it(`can parse a medium complexity HTML routes definition`, () => {
      const { document, routerElement } = parseFixture("medium.html");
      // In browser we can use querySelector, otherwise the more manual lookup
      const routes = constructRoutes(routerElement);
    });

    it(`can parse a layout with arbitrary dom element children`, () => {
      const { document, routerElement } = parseFixture("dom-elements.html");
      const routes = constructRoutes(routerElement);
    });
  });

  describe(`validates top level properties`, () => {
    it("accepts a valid routesConfig", () => {
      constructRoutes({
        mode: "history",
        base: "/",
        containerEl: "#selector",
        routes: [
          { type: "application", name: "@org/navbar" },
          {
            type: "route",
            path: "app1",
            routes: [
              { type: "application", name: "@org/main-sidenav" },
              { type: "application", name: "@org/app1" },
            ],
          },
          {
            type: "route",
            path: "app2",
            routes: [
              { type: "application", name: "@org/main-sidenav" },
              { type: "application", name: "@org/app2" },
            ],
          },
          {
            type: "route",
            path: "settings",
            routes: [{ type: "application", name: "@org/settings" }],
          },
          { type: "application", name: "@org/footer" },
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

      expect(() => {
        constructRoutes("");
      }).toThrowError(/expected a plain object/);

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
        irrelevantProperty: "thing",
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig: received invalid properties 'irrelevantProperty', but valid properties are mode, base, containerEl, routes, disableWarnings`
      );
    });

    it(`validates the mode correctly`, () => {
      expect(() => {
        constructRoutes({
          mode: "wrong",
          routes: [],
        });
      }).toThrowError("mode");

      constructRoutes({
        mode: "hash",
        routes: [],
      });

      constructRoutes({
        mode: "history",
        routes: [],
      });
    });

    it(`validates the base correctly`, () => {
      constructRoutes({
        base: "/",
        mode: "history",
        routes: [],
      });

      expect(() => {
        constructRoutes({
          base: "",
          mode: "history",
          routes: [],
        });
      }).toThrowError("non-blank string");

      expect(() => {
        constructRoutes({
          base: "  ",
          mode: "history",
          routes: [],
        });
      }).toThrowError("non-blank string");

      expect(() => {
        constructRoutes({
          base: null,
          mode: "history",
          routes: [],
        });
      }).toThrowError("non-blank string");
    });
  });

  describe("validates routes", () => {
    it(`checks that routes are an array`, () => {
      expect(() => {
        constructRoutes({
          mode: "history",
          routes: {},
        });
      }).toThrowError("array");

      expect(() => {
        constructRoutes({
          mode: "history",
          routes: "str",
        });
      }).toThrowError("array");
    });

    it(`checks for valid route objects`, () => {
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "route",
            path: "/",
            routes: [],
          },
        ],
      });

      console.warn.mockReset();
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "route",
            path: "/",
            routes: [],
            somethingElse: "value",
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0]: received invalid properties 'somethingElse', but valid properties are type, path, routes, props, default`
      );
    });

    it(`checks for valid application objects`, () => {
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "application",
            name: "@org/project",
          },
        ],
      });

      console.warn.mockReset();
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "application",
            name: "@org/project",
            somethingElse: "value",
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0]: received invalid properties 'somethingElse', but valid properties are type, name, props`
      );

      console.warn.mockReset();
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "application",
            name: "@org/project",
            routes: [],
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0]: received invalid properties 'routes', but valid properties are type, name, props`
      );
    });

    it(`checks subroutes`, () => {
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "route",
            path: "thing",
            routes: [
              {
                type: "application",
                name: "navbar",
              },
            ],
          },
        ],
      });

      expect(console.warn).not.toHaveBeenCalled();
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "route",
            path: "thing",
            routes: [
              {
                type: "application",
                name: "navbar",
                somethingElse: "thing",
              },
            ],
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0].routes[0]: received invalid properties 'somethingElse', but valid properties are type, name, props`
      );
    });

    it(`checks all routes when there are multiple`, () => {
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "route",
            path: "/",
            routes: [],
          },
          {
            type: "route",
            path: "/app1",
            routes: [],
          },
        ],
      });

      expect(console.warn).not.toHaveBeenCalled();
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "route",
            path: "/",
            routes: [],
          },
          {
            type: "route",
            path: "/app1",
            routes: [],
            irrelevantProperty: "thing",
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        "Invalid routesConfig.routes[1]: received invalid properties 'irrelevantProperty', but valid properties are type, path, routes, props, default"
      );
    });

    it(`throws when containerEl is invalid`, () => {
      expect(() => {
        constructRoutes({
          containerEl: null,
          routes: [],
        });
      }).toThrowError(
        "Invalid routesConfig.containerEl: received null but expected either non-blank string or HTMLElement"
      );

      expect(() => {
        constructRoutes({
          containerEl: [],
          routes: [],
        });
      }).toThrowError(
        "Invalid routesConfig.containerEl: received  but expected either non-blank string or HTMLElement"
      );

      expect(() => {
        constructRoutes({
          containerEl: 2342,
          routes: [],
        });
      }).toThrowError(
        "Invalid routesConfig.containerEl: received 2342 but expected either non-blank string or HTMLElement"
      );
    });

    it(`allows a string containerEl`, () => {
      constructRoutes({
        containerEl: "asdf",
        routes: [],
      });
    });

    if (inBrowser) {
      it("allows an HTMLElement containerEl", () => {
        constructRoutes({
          containerEl: document.createElement("div"),
          routes: [],
        });
      });
    }

    it(`allows for "default" routes`, () => {
      constructRoutes({
        routes: [
          { type: "route", path: "app1" },
          { type: "route", default: true },
        ],
      });

      constructRoutes({
        routes: [
          { type: "route", path: "app1", default: false },
          { type: "route", default: true },
        ],
      });
    });

    it(`throws on a default route that has a path`, () => {
      expect(() => {
        constructRoutes({
          routes: [{ type: "route", path: "app1", default: true }],
        });
      }).toThrowError(
        "Invalid routesConfig.routes[0]: cannot have both path and set default to true."
      );
    });

    it(`throws on a route that has no path and is not default`, () => {
      expect(() => {
        constructRoutes({
          routes: [{ type: "route" }],
        });
      }).toThrowError(
        "Invalid routesConfig.routes[0]: routes must have either a path or default property"
      );
    });
  });

  describe(`return value`, () => {
    it(`adds a default base if one is not provided`, () => {
      expect(
        constructRoutes({
          containerEl: "body",
          mode: "history",
          routes: [{ type: "application", name: "nav" }],
        })
      ).toEqual({
        base: "/",
        containerEl: "body",
        mode: "history",
        routes: [{ type: "application", name: "nav" }],
      });
    });

    it(`adds a default mode if one is not provided`, () => {
      expect(
        constructRoutes({
          containerEl: "body",
          base: "/",
          routes: [{ type: "application", name: "nav" }],
        })
      ).toEqual({
        base: "/",
        containerEl: "body",
        mode: "history",
        routes: [{ type: "application", name: "nav" }],
      });
    });

    it(`adds a default containerEl if one is not provided`, () => {
      expect(
        constructRoutes({
          base: "/",
          mode: "history",
          routes: [{ type: "application", name: "nav" }],
        })
      ).toEqual({
        base: "/",
        containerEl: "body",
        mode: "history",
        routes: [{ type: "application", name: "nav" }],
      });
    });

    it(`constructs an activeWhen for all routes`, () => {
      const resolvedRoutes = constructRoutes({
        routes: [
          {
            type: "route",
            path: "/settings",
            routes: [{ type: "route", path: "users", routes: [] }],
          },
          { type: "route", path: "/clients", routes: [] },
        ],
      });

      const settingsActiveWhen = resolvedRoutes.routes[0].activeWhen;
      const usersActiveWhen = resolvedRoutes.routes[0].routes[0].activeWhen;
      const clientsActiveWhen = resolvedRoutes.routes[1].activeWhen;

      expect(settingsActiveWhen).toBeDefined();
      expect(usersActiveWhen).toBeDefined();
      expect(clientsActiveWhen).toBeDefined();

      expect(settingsActiveWhen(new URL("http://localhost/"))).toBe(false);
      expect(settingsActiveWhen(new URL("http://localhost/clients"))).toBe(
        false
      );
      expect(settingsActiveWhen(new URL("http://localhost/other"))).toBe(false);
      expect(settingsActiveWhen(new URL("http://localhost/settings"))).toBe(
        true
      );
      expect(settingsActiveWhen(new URL("http://localhost/settings/"))).toBe(
        true
      );
      expect(
        settingsActiveWhen(new URL("http://localhost/settings/users"))
      ).toBe(true);
      expect(
        settingsActiveWhen(new URL("http://localhost/settings/other"))
      ).toBe(true);

      expect(usersActiveWhen(new URL("http://localhost/"))).toBe(false);
      expect(usersActiveWhen(new URL("http://localhost/clients"))).toBe(false);
      expect(usersActiveWhen(new URL("http://localhost/other"))).toBe(false);
      expect(usersActiveWhen(new URL("http://localhost/settings"))).toBe(false);
      expect(usersActiveWhen(new URL("http://localhost/settings/"))).toBe(
        false
      );
      expect(usersActiveWhen(new URL("http://localhost/settings/users"))).toBe(
        true
      );
      expect(
        usersActiveWhen(new URL("http://localhost/settings/users/1"))
      ).toBe(true);
      expect(usersActiveWhen(new URL("http://localhost/settings/other"))).toBe(
        false
      );

      expect(clientsActiveWhen(new URL("http://localhost/"))).toBe(false);
      expect(clientsActiveWhen(new URL("http://localhost/clients"))).toBe(true);
      expect(clientsActiveWhen(new URL("http://localhost/other"))).toBe(false);
      expect(clientsActiveWhen(new URL("http://localhost/settings"))).toBe(
        false
      );
      expect(clientsActiveWhen(new URL("http://localhost/settings/"))).toBe(
        false
      );
      expect(
        clientsActiveWhen(new URL("http://localhost/settings/users"))
      ).toBe(false);
      expect(
        clientsActiveWhen(new URL("http://localhost/settings/other"))
      ).toBe(false);
    });

    it(`constructs an activeWhen that works with hash routing`, () => {
      const resolvedRoutes = constructRoutes({
        mode: "hash",
        routes: [
          {
            type: "route",
            path: "settings",
            routes: [{ type: "route", path: "users", routes: [] }],
          },
          { type: "route", path: "clients", routes: [] },
        ],
      });

      const settingsActiveWhen = resolvedRoutes.routes[0].activeWhen;
      const usersActiveWhen = resolvedRoutes.routes[0].routes[0].activeWhen;
      const clientsActiveWhen = resolvedRoutes.routes[1].activeWhen;

      expect(settingsActiveWhen).toBeDefined();
      expect(usersActiveWhen).toBeDefined();
      expect(clientsActiveWhen).toBeDefined();

      expect(settingsActiveWhen(new URL("http://localhost#/"))).toBe(false);
      expect(settingsActiveWhen(new URL("http://localhost#/clients"))).toBe(
        false
      );
      expect(settingsActiveWhen(new URL("http://localhost#/other"))).toBe(
        false
      );
      expect(settingsActiveWhen(new URL("http://localhost#/settings"))).toBe(
        true
      );
      expect(settingsActiveWhen(new URL("http://localhost#/settings/"))).toBe(
        true
      );
      expect(
        settingsActiveWhen(new URL("http://localhost#/settings/users"))
      ).toBe(true);
      expect(
        settingsActiveWhen(new URL("http://localhost#/settings/other"))
      ).toBe(true);

      expect(usersActiveWhen(new URL("http://localhost#/"))).toBe(false);
      expect(usersActiveWhen(new URL("http://localhost#/clients"))).toBe(false);
      expect(usersActiveWhen(new URL("http://localhost#/other"))).toBe(false);
      expect(usersActiveWhen(new URL("http://localhost#/settings"))).toBe(
        false
      );
      expect(usersActiveWhen(new URL("http://localhost#/settings/"))).toBe(
        false
      );
      expect(usersActiveWhen(new URL("http://localhost#/settings/users"))).toBe(
        true
      );
      expect(
        usersActiveWhen(new URL("http://localhost#/settings/users/1"))
      ).toBe(true);
      expect(usersActiveWhen(new URL("http://localhost#/settings/other"))).toBe(
        false
      );

      expect(clientsActiveWhen(new URL("http://localhost#/"))).toBe(false);
      expect(clientsActiveWhen(new URL("http://localhost#/clients"))).toBe(
        true
      );
      expect(clientsActiveWhen(new URL("http://localhost#/other"))).toBe(false);
      expect(clientsActiveWhen(new URL("http://localhost#/settings"))).toBe(
        false
      );
      expect(clientsActiveWhen(new URL("http://localhost#/settings/"))).toBe(
        false
      );
      expect(
        clientsActiveWhen(new URL("http://localhost#/settings/users"))
      ).toBe(false);
      expect(
        clientsActiveWhen(new URL("http://localhost#/settings/other"))
      ).toBe(false);
    });

    it(`constructs routes that allow for dynamic paths in the URLs`, () => {
      const resolvedRoutes = constructRoutes({
        routes: [{ type: "route", path: "/users/:id/permissions", routes: [] }],
      });

      const activeWhen = resolvedRoutes.routes[0].activeWhen;
      expect(activeWhen(new URL("http://localhost/"))).toBe(false);
      expect(activeWhen(new URL("http://localhost/users/1/permissions"))).toBe(
        true
      );
      expect(
        activeWhen(new URL("http://localhost/users/asdf/permissions"))
      ).toBe(true);
      expect(activeWhen(new URL("http://localhost/users/new"))).toBe(false);
    });
  });
});
