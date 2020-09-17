import {
  constructLayoutEngine,
  constructRoutes,
  constructApplications,
} from "../../src/single-spa-layout.js";
import { screen } from "@testing-library/dom";
import { parseFixture } from "../html-utils.js";
import { triggerAppChange, getAppStatus } from "single-spa";

describe(`constructLayoutEngine browser`, () => {
  /** @type {import('../../src/constructLayoutEngine').LayoutEngine} */
  let layoutEngine;

  afterEach(() => {
    history.pushState(history.state, document.title, "/");
    document.body.innerHTML = "";
    if (layoutEngine) {
      layoutEngine.deactivate();
    }
  });

  it(`starts out activated by default`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [{ type: "application", name: "@org-name/header" }],
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });

    expect(layoutEngine.isActive()).toBe(true);
  });

  it(`starts out activated if forced active`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [{ type: "application", name: "@org-name/header" }],
    });

    layoutEngine = constructLayoutEngine({
      routes,
      active: true,
    });

    expect(layoutEngine.isActive()).toBe(true);
  });

  it(`can start off deactivated if specified in options object`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [{ type: "application", name: "@org-name/header" }],
    });

    layoutEngine = constructLayoutEngine({
      routes,
      active: false,
    });

    expect(layoutEngine.isActive()).toBe(false);
  });

  it(`can handle any calls to activate() / deactivate()`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [{ type: "application", name: "@org-name/header" }],
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });

    layoutEngine.activate();
    expect(layoutEngine.isActive()).toBe(true);
    layoutEngine.activate();
    expect(layoutEngine.isActive()).toBe(true);

    layoutEngine.deactivate();
    expect(layoutEngine.isActive()).toBe(false);
    layoutEngine.deactivate();
    expect(layoutEngine.isActive()).toBe(false);

    layoutEngine.activate();
    expect(layoutEngine.isActive()).toBe(true);
  });

  it(`can successfully construct a layout engine and respond to routing events`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [
        { type: "application", name: "@org-name/header" },
        {
          type: "route",
          path: "app1",
          routes: [{ type: "application", name: "@org-name/app1" }],
        },
        { type: "application", name: "@org-name/footer" },
      ],
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });

    // start at / route
    let headerEl = document.getElementById(
      `single-spa-application:@org-name/header`
    );
    let app1El = document.getElementById(
      `single-spa-application:@org-name/app1`
    );
    let footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`
    );

    expect(headerEl).toBeInTheDocument();
    expect(app1El).not.toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(footerEl)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(document.body).toMatchSnapshot();

    // transition to /app1 route
    history.pushState(history.state, document.title, "/app1");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["@org-name/app1"],
            NOT_MOUNTED: [],
            NOT_LOADED: [],
          },
        },
      })
    );

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`
    );

    expect(headerEl).toBeInTheDocument();
    expect(app1El).toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(footerEl)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(headerEl.compareDocumentPosition(app1El)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(footerEl.compareDocumentPosition(app1El)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING
    );
    expect(document.body).toMatchSnapshot();

    // transition back to / route
    history.pushState(history.state, document.title, "/");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: [],
            NOT_MOUNTED: ["@org-name/app1"],
            NOT_LOADED: [],
          },
        },
      })
    );

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`
    );

    expect(headerEl).toBeInTheDocument();
    expect(app1El).not.toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(footerEl)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(document.body).toMatchSnapshot();
  });

  it(`can successfully rearrange dom elements during route transitions`, () => {
    let headerEl, footerEl, app1El, app2El;

    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [
        { type: "application", name: "@org-name/header" },
        {
          type: "route",
          path: "cart",
          routes: [
            { type: "application", name: "@org-name/app1" },
            { type: "application", name: "@org-name/app2" },
          ],
        },
        {
          type: "route",
          path: "settings",
          routes: [
            { type: "application", name: "@org-name/app2" },
            { type: "application", name: "@org-name/app1" },
          ],
        },
        { type: "application", name: "@org-name/footer" },
      ],
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });

    // transition to /cart route
    history.pushState(history.state, document.title, "/cart");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: [],
            NOT_MOUNTED: [],
            NOT_LOADED: [],
          },
        },
      })
    );

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`
    );
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    app2El = document.getElementById(`single-spa-application:@org-name/app2`);

    expect(headerEl).toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();
    expect(app1El).toBeInTheDocument();
    expect(app2El).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(app1El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(app1El.compareDocumentPosition(app2El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(app2El.compareDocumentPosition(footerEl)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    expect(document.body).toMatchSnapshot();

    // transition to /settings route
    history.pushState(history.state, document.title, "/settings");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: [],
            NOT_MOUNTED: [],
            NOT_LOADED: [],
          },
        },
      })
    );

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`
    );
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    app2El = document.getElementById(`single-spa-application:@org-name/app2`);

    expect(headerEl).toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();
    expect(app1El).toBeInTheDocument();
    expect(app2El).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(app1El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(app1El.compareDocumentPosition(app2El)).toEqual(
      Node.DOCUMENT_POSITION_PRECEDING
    );
    expect(app2El.compareDocumentPosition(footerEl)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    expect(document.body).toMatchSnapshot();

    // transition back to /cart route
    history.pushState(history.state, document.title, "/cart");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );

    headerEl = document.getElementById(
      `single-spa-application:@org-name/header`
    );
    footerEl = document.getElementById(
      `single-spa-application:@org-name/footer`
    );
    app1El = document.getElementById(`single-spa-application:@org-name/app1`);
    app2El = document.getElementById(`single-spa-application:@org-name/app2`);

    expect(headerEl).toBeInTheDocument();
    expect(footerEl).toBeInTheDocument();
    expect(app1El).toBeInTheDocument();
    expect(app2El).toBeInTheDocument();

    expect(headerEl.compareDocumentPosition(app1El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(app1El.compareDocumentPosition(app2El)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(app2El.compareDocumentPosition(footerEl)).toEqual(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    expect(document.body).toMatchSnapshot();
  });

  it(`can process the layout in the medium.html fixture`, () => {
    const { routerElement } = parseFixture("medium.html");
    const loadApp = jest.fn();
    const routes = constructRoutes(routerElement);
    const applications = constructApplications({ routes, loadApp });
    layoutEngine = constructLayoutEngine({ routes, applications });

    expect(document.querySelector("body")).toMatchSnapshot();

    // transition to /settings route
    history.pushState(history.state, document.title, "/settings");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["@org/settings"],
            NOT_MOUNTED: [],
            NOT_LOADED: [],
          },
        },
      })
    );
    // At /settings route: navbar, settings, and footer are mounted
    expect(document.querySelector("body")).toMatchSnapshot();

    // transition to / route
    history.pushState(history.state, document.title, "/");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: [],
            NOT_MOUNTED: ["@org/settings"],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.querySelector("body")).toMatchSnapshot();

    // transition to /app1 route
    history.pushState(history.state, document.title, "/app1");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["@org/main-sidenav", "@org/app1"],
            NOT_MOUNTED: [],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.querySelector("body")).toMatchSnapshot();

    // transition to / route
    history.pushState(history.state, document.title, "/");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: [],
            NOT_MOUNTED: ["@org/main-sidenav", "@org/app1"],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.querySelector("body")).toMatchSnapshot();

    // transition to /app2 route
    history.pushState(history.state, document.title, "/app2");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["@org/main-sidenav", "@org/app2"],
            NOT_MOUNTED: [],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.querySelector("body")).toMatchSnapshot();

    // transition to /app1 route
    history.pushState(history.state, document.title, "/app1");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["@org/app1"],
            NOT_MOUNTED: ["@org/app2"],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.querySelector("body")).toMatchSnapshot();
  });

  it(`can process the dom elements fixture`, () => {
    const { routerElement } = parseFixture("dom-elements.html");
    const loadApp = jest.fn();
    const routes = constructRoutes(routerElement);
    const applications = constructApplications({ routes, loadApp });
    layoutEngine = constructLayoutEngine({ routes, applications });

    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["header"],
            NOT_MOUNTED: [],
            NOT_LOADED: [],
          },
        },
      })
    );

    expect(document.querySelector("body")).toMatchSnapshot();

    // transition to /app1 route
    history.pushState(history.state, document.title, "/app1");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["app1"],
            NOT_MOUNTED: [],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.querySelector("body")).toMatchSnapshot();

    // transition to / route
    history.pushState(history.state, document.title, "/");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: [],
            NOT_MOUNTED: ["app1"],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.querySelector("body")).toMatchSnapshot();
  });

  it(`can process the nested-default-route fixture`, () => {
    history.pushState(history.state, document.title, "/");

    const { routerElement } = parseFixture("nested-default-route.html");
    const loadApp = jest.fn();
    const routes = constructRoutes(routerElement);
    const applications = constructApplications({ routes, loadApp });
    layoutEngine = constructLayoutEngine({ routes, applications });

    expect(document.body).toMatchSnapshot();

    // Transition to /settings
    history.pushState(history.state, document.title, "/settings");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["settings-not-found"],
            NOT_MOUNTED: ["not-found"],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.body).toMatchSnapshot();

    // Transition to /settings/app1
    history.pushState(history.state, document.title, "/settings/app1");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:routing-event", {
        detail: {
          appsByNewStatus: {
            MOUNTED: ["app1"],
            NOT_MOUNTED: ["settings-not-found"],
            NOT_LOADED: [],
          },
        },
      })
    );
    expect(document.body).toMatchSnapshot();
  });

  it(`can show a loader properly`, async () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [
        {
          type: "route",
          path: "/app1",
          routes: [
            {
              type: "application",
              name: "app1",
              loader: `<img src="loading.gif">`,
            },
          ],
        },
      ],
    });

    const applications = constructApplications({
      routes,
      loadApp: (name) => {
        return new Promise((resolve) => {
          setTimeout(resolve, 5);
        });
      },
    });

    layoutEngine = constructLayoutEngine({
      routes,
    });

    expect(document.body).toMatchSnapshot();

    history.pushState(history.state, document.title, "/app1");
    const loadPromise = applications[0].app();

    await tick();
    expect(document.body).toMatchSnapshot();

    await loadPromise;
    expect(document.body).toMatchSnapshot();

    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    expect(document.body).toMatchSnapshot();
  });

  it(`can render dom elements from json`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = constructRoutes({
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [
        {
          type: "route",
          path: "/app1",
          routes: [
            {
              type: "div",
              attrs: [
                {
                  name: "class",
                  value: "before",
                },
              ],
              routes: [
                {
                  type: "#text",
                  value: "The text before",
                },
                {
                  type: "#comment",
                  value: "the comment before",
                },
              ],
            },
            {
              type: "application",
              name: "app1",
            },
            {
              type: "div",
              attrs: [
                {
                  name: "class",
                  value: "after",
                },
              ],
              routes: [
                {
                  type: "#comment",
                  value: "the comment after",
                },
              ],
            },
          ],
        },
      ],
    });

    const applications = constructApplications({
      routes,
      loadApp: async (name) => {
        return {
          async bootstrap() {},
          async mount() {},
          async unmount() {},
        };
      },
    });

    layoutEngine = constructLayoutEngine({
      routes,
      applications,
    });

    history.pushState(history.state, document.title, "/app1");
    const loadPromise = applications[0].app();

    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );

    expect(document.body).toMatchSnapshot();
  });

  describe(`error handling`, () => {
    it(`shows an error UI when an application goes into SKIP_BECAUSE_BROKEN status`, async () => {
      /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
      const routes = constructRoutes({
        containerEl: "body",
        base: "/",
        mode: "history",
        routes: [
          {
            type: "route",
            path: "/app1",
            routes: [
              {
                type: "application",
                name: "app1",
                error: "<div>Oops, app1 is broken</div>",
              },
            ],
          },
        ],
      });

      const applications = constructApplications({
        routes,
        loadApp: async (name) => {
          return {
            async bootstrap() {},
            async mount() {},
            async unmount() {},
          };
        },
      });

      const errorHandlers = [];

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
        addErrorHandler(handler) {
          errorHandlers.push(handler);
        },
      });

      history.pushState(history.state, document.title, "/app1");

      window.dispatchEvent(
        new CustomEvent("single-spa:before-mount-routing-event")
      );

      errorHandlers.forEach((cb) =>
        cb({
          appOrParcelName: "app1",
        })
      );

      await tick();

      expect(document.body).toMatchSnapshot();
    });

    it(`works with a parcel provided for the error UI`, async () => {
      /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
      const routes = constructRoutes({
        containerEl: "body",
        base: "/",
        mode: "history",
        routes: [
          {
            type: "route",
            path: "/app1",
            routes: [
              {
                type: "application",
                name: "app1",
                error: {
                  async bootstrap() {},
                  async mount(props) {
                    const div = document.createElement("div");
                    div.textContent = `App 1 is broken (parcel)`;
                    props.domElement.appendChild(div);
                  },
                  async unmount(props) {},
                },
              },
            ],
          },
        ],
      });

      const applications = constructApplications({
        routes,
        loadApp: async (name) => {
          return {
            async bootstrap() {},
            async mount() {},
            async unmount() {},
          };
        },
      });

      const errorHandlers = [];

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
        addErrorHandler(handler) {
          errorHandlers.push(handler);
        },
      });

      history.pushState(history.state, document.title, "/app1");

      window.dispatchEvent(
        new CustomEvent("single-spa:before-mount-routing-event")
      );

      errorHandlers.forEach((cb) =>
        cb({
          appOrParcelName: "app1",
        })
      );

      await tick();

      expect(document.body).toMatchSnapshot();
    });

    it(`works with error handlers defined in HTML`, async () => {
      const { routerElement } = parseFixture("error-handlers.html");
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
      const applications = constructApplications({
        routes,
        async loadApp({ name }) {
          throw Error();
        },
      });

      const errorHandlers = [];

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
        addErrorHandler(handler) {
          errorHandlers.push(handler);
        },
      });

      history.pushState(history.state, document.title, "/app1");

      window.dispatchEvent(
        new CustomEvent("single-spa:before-mount-routing-event")
      );

      errorHandlers.forEach((cb) =>
        cb({
          appOrParcelName: "app1",
        })
      );

      await tick();

      expect(document.body).toMatchSnapshot();
    });

    it(`unmounts the error parcel when the application gets unloaded`, async () => {
      let parcelWasMounted = false,
        parcelWasUnmounted = false;

      /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
      const routes = constructRoutes({
        containerEl: "body",
        base: "/",
        mode: "history",
        routes: [
          {
            type: "route",
            path: "/app1",
            routes: [
              {
                type: "application",
                name: "app1",
                error: {
                  async bootstrap() {},
                  async mount(props) {
                    const div = document.createElement("div");
                    div.textContent = `App 1 is broken (parcel)`;
                    props.domElement.appendChild(div);
                    parcelWasMounted = true;
                  },
                  async unmount(props) {
                    parcelWasUnmounted = true;
                  },
                },
              },
            ],
          },
        ],
      });

      const applications = constructApplications({
        routes,
        loadApp: async (name) => {
          return {
            async bootstrap() {},
            async mount() {},
            async unmount() {},
          };
        },
      });

      const errorHandlers = [];

      layoutEngine = constructLayoutEngine({
        routes,
        applications,
        addErrorHandler(handler) {
          errorHandlers.push(handler);
        },
        getAppStatus() {
          return "SKIP_BECAUSE_BROKEN";
        },
      });

      history.pushState(history.state, document.title, "/app1");

      window.dispatchEvent(
        new CustomEvent("single-spa:before-mount-routing-event")
      );

      errorHandlers.forEach((cb) =>
        cb({
          appOrParcelName: "app1",
        })
      );

      await tick();

      expect(parcelWasMounted).toBe(true);
      expect(parcelWasUnmounted).toBe(false);

      window.dispatchEvent(
        new CustomEvent("single-spa:before-mount-routing-event")
      );

      // indicate that the application has been unloaded
      window.dispatchEvent(
        new CustomEvent("single-spa:before-routing-event", {
          detail: {
            newAppStatuses: {
              app1: "MOUNTED",
            },
          },
        })
      );

      await tick();

      expect(parcelWasUnmounted).toBe(true);
    });
  });
});

function tick() {
  return new Promise((resolve) => {
    setTimeout(resolve);
  });
}
