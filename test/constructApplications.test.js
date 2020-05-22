import {
  constructApplications,
  constructRoutes,
} from "../src/single-spa-layout.js";
import { parseFixture } from "./html-utils.js";

describe(`constructApplications`, () => {
  it(`can handle a medium complexity case`, () => {
    const routes = constructRoutes({
      mode: "history",
      base: "/",
      containerEl: "body",
      routes: [
        { type: "application", name: "nav" },
        {
          type: "route",
          path: "app1",
          routes: [
            { type: "application", name: "app1", props: { primary: true } },
            {
              type: "route",
              path: "subroute",
              routes: [
                { type: "application", name: "subroute", props: { count: 1 } },
              ],
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
              routes: [
                { type: "application", name: "subroute", props: { count: 2 } },
              ],
            },
          ],
        },
        { type: "application", name: "footer" },
      ],
    });

    const loadApp = jest.fn();

    const applications = constructApplications({ routes, loadApp });

    expect(applications.length).toBe(5);
    expect(applications[0].name).toBe("nav");
    expect(
      applications[0].activeWhen.some((fn) => fn(new URL("http://localhost")))
    ).toBe(true);
    expect(
      applications[0].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app1"))
      )
    ).toBe(true);

    expect(applications[1].name).toBe("app1");
    expect(
      applications[1].activeWhen.some((fn) => fn(new URL("http://localhost")))
    ).toBe(false);
    expect(
      applications[1].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app1"))
      )
    ).toBe(true);

    expect(applications[2].name).toBe("subroute");
    expect(
      applications[2].activeWhen.some((fn) => fn(new URL("http://localhost")))
    ).toBe(false);
    expect(
      applications[2].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app1"))
      )
    ).toBe(false);
    expect(
      applications[2].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app1/subroute"))
      )
    ).toBe(true);
    expect(
      applications[2].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app2/subroute"))
      )
    ).toBe(true);

    expect(applications[3].name).toBe("app2");
    expect(
      applications[3].activeWhen.some((fn) => fn(new URL("http://localhost")))
    ).toBe(false);
    expect(
      applications[3].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app2"))
      )
    ).toBe(true);

    expect(applications[4].name).toBe("footer");
    expect(
      applications[4].activeWhen.some((fn) => fn(new URL("http://localhost")))
    ).toBe(true);
    expect(
      applications[4].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app2"))
      )
    ).toBe(true);

    expect(
      applications
        .find((a) => a.name === "nav")
        .customProps("nav", new URL("https://localhost/"))
    ).toEqual({});

    expect(
      applications
        .find((a) => a.name === "app1")
        .customProps("app1", new URL("https://localhost/app1"))
    ).toEqual({
      primary: true,
    });

    expect(
      applications
        .find((a) => a.name === "subroute")
        .customProps("subroute", new URL("https://localhost/app1/subroute"))
    ).toEqual({
      count: 1,
    });

    expect(
      applications
        .find((a) => a.name === "subroute")
        .customProps("subroute", new URL("https://localhost/app2/subroute"))
    ).toEqual({
      count: 2,
    });
  });

  it(`creates a loading function using the loadApp function`, async () => {
    const routes = {
      mode: "history",
      base: "/",
      containerEl: "body",
      routes: [{ type: "application", name: "nav" }],
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
    const returnValue = await applications[0].app({ name: "nav" });
    expect(loadApp).toHaveBeenCalledWith({ name: "nav" });
    expect(returnValue).toBe(lifecycles);
  });

  it(`can construct applications from dom elements`, () => {
    const { document, routerElement } = parseFixture("dom-elements.html");
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
    expect(applications[0].name).toBe("header");
    expect(
      applications[0].activeWhen.some((fn) => fn(new URL("http://localhost/")))
    ).toBe(true);
    expect(
      applications[0].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app1"))
      )
    ).toBe(true);

    expect(applications[1].name).toBe("app1");
    expect(
      applications[1].activeWhen.some((fn) => fn(new URL("http://localhost/")))
    ).toBe(false);
    expect(
      applications[1].activeWhen.some((fn) =>
        fn(new URL("http://localhost/app1"))
      )
    ).toBe(true);
  });
});
