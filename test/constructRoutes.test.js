import { inBrowser } from "../src/environment-helpers.js";
import { constructRoutes } from "../src/single-spa-layout.js";
import fs from "fs";
import path from "path";
import { screen } from "@testing-library/dom";
import parse5 from "parse5";

jest.spyOn(console, "warn");

describe("constructRoutes", () => {
  beforeEach(() => {
    console.warn.mockReset();
  });

  describe(`HTML parsing`, () => {
    it(`can parse a medium complexity HTML routes definition`, () => {
      const document = parseHTML(
        fs.readFileSync(
          path.resolve(__dirname, "./fixtures/medium.html"),
          "utf-8"
        )
      );
      const routerElement = document.childNodes[1].childNodes[2].childNodes[1];
      const routes = constructRoutes(routerElement);

      expect(routes.mode).toBe("history");
      expect(routes.base).toBe("/");
      expect(routes.routes.length).toBe(5);
      expect(routes.sourceElement).toBe(routerElement);

      expect(routes.routes[0].type).toBe("application");
      expect(routes.routes[0].name).toBe("@org/navbar");
      expect(routes.routes[0].containerEl.nodeName.toLowerCase()).toBe("body");

      expect(routes.routes[1].type).toBe("route");
      expect(routes.routes[1].path).toBe("app1");
      expect(routes.routes[1].routes.length).toBe(2);
      expect(routes.routes[1].routes[0].type).toBe("application");
      expect(routes.routes[1].routes[0].name).toBe("@org/main-sidenav");
      expect(
        routes.routes[1].routes[0].containerEl.nodeName.toLowerCase()
      ).toBe("aside");
      expect(routes.routes[1].routes[1].type).toBe("application");
      expect(routes.routes[1].routes[1].name).toBe("@org/app1");
      expect(
        routes.routes[1].routes[1].containerEl.nodeName.toLowerCase()
      ).toBe("body");

      expect(routes.routes[2].type).toBe("route");
      expect(routes.routes[2].path).toBe("app2");
      expect(routes.routes[2].routes.length).toBe(2);
      expect(routes.routes[2].routes[0].type).toBe("application");
      expect(routes.routes[2].routes[0].name).toBe("@org/main-sidenav");
      expect(
        routes.routes[2].routes[0].containerEl.nodeName.toLowerCase()
      ).toBe("aside");
      expect(routes.routes[2].routes[1].type).toBe("application");
      expect(routes.routes[2].routes[1].name).toBe("@org/app2");
      expect(
        routes.routes[2].routes[1].containerEl.nodeName.toLowerCase()
      ).toBe("body");

      expect(routes.routes[3].type).toBe("route");
      expect(routes.routes[3].path).toBe("settings");
      expect(routes.routes[3].routes.length).toBe(1);
      expect(routes.routes[3].routes[0].type).toBe("application");
      expect(routes.routes[3].routes[0].name).toBe("@org/settings");
      expect(
        routes.routes[3].routes[0].containerEl.nodeName.toLowerCase()
      ).toBe("body");

      expect(routes.routes[4].type).toBe("application");
      expect(routes.routes[4].name).toBe("@org/footer");
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

    it(`checks for presence of route array`, () => {
      expect(() => {
        constructRoutes({
          mode: "history",
          routes: [
            {
              type: "route",
              path: "/",
            },
          ],
        });
      }).toThrowError(
        `Invalid routesConfig.routes[0].routes: received 'undefined', but expected an array`
      );
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
        "Invalid routesConfig.routes[1]: received invalid properties 'irrelevantProperty', but valid properties are type, path, routes"
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
  });
});

function parseHTML(str) {
  if (inBrowser) {
    return new DOMParser().parseFromString(str, "text/html").documentElement;
  } else {
    return parse5.parse(str);
  }
}
