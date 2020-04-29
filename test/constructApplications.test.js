import { constructApplications } from "../src/single-spa-layout.js";

describe(`constructApplications`, () => {
  it(`can handle a medium complexity case`, () => {
    const routes = {
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
    };

    const applications = constructApplications({ routes, loadApp });

    const activeWhens = applications.map((app) => ({
      name: app.name,
      activeWhen: app.activeWhen,
    }));

    expect(activeWhens).toEqual([
      {
        name: "nav",
        activeWhen: ["/"],
      },
      {
        name: "app1",
        activeWhen: ["/app1"],
      },
      {
        name: "subroute",
        activeWhen: ["/app1/subroute", "/app2/subroute"],
      },
      {
        name: "app2",
        activeWhen: ["/app2"],
      },
      {
        name: "footer",
        activeWhen: ["/"],
      },
    ]);

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
});

function loadApp(name) {
  return { async bootstrap() {}, async mount() {}, async unmount() {} };
}
