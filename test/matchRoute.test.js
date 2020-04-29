import { matchRoute } from "../src/single-spa-layout.js";

describe(`matchRoute`, () => {
  let routesConfig;

  beforeEach(() => {
    routesConfig = {
      mode: "history",
      base: "/",
      containerEl: "body",
      routes: [
        { type: "application", name: "nav" },
        {
          type: "route",
          path: "app1",
          routes: [
            { type: "application", name: "app1" },
            {
              type: "route",
              path: "subroute",
              routes: [{ type: "application", name: "subroute" }],
            },
          ],
        },
        {
          type: "route",
          path: "app2",
          routes: [
            { type: "application", name: "app2" },
            {
              type: "route",
              path: "subroute",
              routes: [{ type: "application", name: "subroute" }],
            },
          ],
        },
        { type: "application", name: "footer" },
      ],
    };
  });

  it(`returns a filtered routes array`, () => {
    expect(matchRoute(routesConfig, "/")).toEqual({
      ...routesConfig,
      routes: [
        { type: "application", name: "nav" },
        { type: "application", name: "footer" },
      ],
    });
  });

  it(`matches nested routes`, () => {
    expect(matchRoute(routesConfig, "/app1")).toEqual({
      ...routesConfig,
      routes: [
        { type: "application", name: "nav" },
        {
          type: "route",
          path: "app1",
          routes: [{ type: "application", name: "app1" }],
        },
        { type: "application", name: "footer" },
      ],
    });

    expect(matchRoute(routesConfig, "/app2")).toEqual({
      ...routesConfig,
      routes: [
        { type: "application", name: "nav" },
        {
          type: "route",
          path: "app2",
          routes: [{ type: "application", name: "app2" }],
        },
        { type: "application", name: "footer" },
      ],
    });
  });

  it(`matches deeply nested routes`, () => {
    expect(matchRoute(routesConfig, "/app1/subroute")).toEqual({
      ...routesConfig,
      routes: [
        { type: "application", name: "nav" },
        {
          type: "route",
          path: "app1",
          routes: [
            { type: "application", name: "app1" },
            {
              type: "route",
              path: "subroute",
              routes: [{ type: "application", name: "subroute" }],
            },
          ],
        },
        { type: "application", name: "footer" },
      ],
    });
  });

  it(`matches using base name`, () => {
    routesConfig.base = "/base/";

    expect(matchRoute(routesConfig, "/")).toEqual({
      ...routesConfig,
      routes: [],
    });

    expect(matchRoute(routesConfig, "/base/")).toEqual({
      ...routesConfig,
      routes: [
        { type: "application", name: "nav" },
        { type: "application", name: "footer" },
      ],
    });

    expect(matchRoute(routesConfig, "/base")).toEqual({
      ...routesConfig,
      routes: [
        { type: "application", name: "nav" },
        { type: "application", name: "footer" },
      ],
    });
  });
});
