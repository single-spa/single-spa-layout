import { matchRoute, constructRoutes } from "../src/single-spa-layout.js";

describe(`matchRoute`, () => {
  let routesConfig;

  beforeEach(() => {
    routesConfig = constructRoutes({
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
        {
          type: "route",
          path: "users/:id",
          routes: [
            { type: "application", name: "user-home" },
            {
              type: "route",
              path: "settings",
              routes: [{ type: "application", name: "user-settings" }],
            },
          ],
        },
        { type: "application", name: "footer" },
      ],
    });
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
    expect(matchRoute(routesConfig, "/app1")).toMatchObject({
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

    expect(matchRoute(routesConfig, "/app2")).toMatchObject({
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
    expect(matchRoute(routesConfig, "/app1/subroute")).toMatchObject({
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

  it(`matches dynamic paths`, () => {
    expect(matchRoute(routesConfig, "users/123")).toMatchObject({
      ...routesConfig,
      routes: [
        { type: "application", name: "nav" },
        {
          type: "route",
          path: "users/:id",
          routes: [{ type: "application", name: "user-home" }],
        },
        { type: "application", name: "footer" },
      ],
    });

    expect(matchRoute(routesConfig, "users/123/settings")).toMatchObject({
      ...routesConfig,
      routes: [
        { type: "application", name: "nav" },
        {
          type: "route",
          path: "users/:id",
          routes: [
            { type: "application", name: "user-home" },
            {
              type: "route",
              path: "settings",
              routes: [{ type: "application", name: "user-settings" }],
            },
          ],
        },
        { type: "application", name: "footer" },
      ],
    });
  });
});
