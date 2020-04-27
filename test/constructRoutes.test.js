import { constructRoutes } from "../src/single-spa-layout.js";

jest.spyOn(console, "warn");

describe("constructRoutes", () => {
  let registerApplication = jest.fn();

  beforeEach(() => {
    registerApplication.mockReset();
    console.warn.mockReset();
  });

  describe(`input validation`, () => {
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
            somethingElse: "value",
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        `Invalid routesConfig.routes[0]: received invalid properties 'somethingElse', but valid properties are type, path, routes`
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
        `Invalid routesConfig.routes[0]: received invalid properties 'somethingElse', but valid properties are type, name`
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
        `Invalid routesConfig.routes[0]: received invalid properties 'routes', but valid properties are type, name`
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
        `Invalid routesConfig.routes[0].routes[0]: received invalid properties 'somethingElse', but valid properties are type, name`
      );
    });

    it(`checks all routes when there are multiple`, () => {
      constructRoutes({
        mode: "history",
        routes: [
          {
            type: "route",
            path: "/",
          },
          {
            type: "route",
            path: "/app1",
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
          },
          {
            type: "route",
            path: "/app1",
            irrelevantProperty: "thing",
          },
        ],
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0].message).toEqual(
        "Invalid routesConfig.routes[1]: received invalid properties 'irrelevantProperty', but valid properties are type, path, routes"
      );
    });
  });
});
