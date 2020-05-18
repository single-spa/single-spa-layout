import { constructLayoutEngine } from "../../src/single-spa-layout.js";
import { screen } from "@testing-library/dom";

describe(`constructLayoutEngine browser`, () => {
  /** @type {import('../../src/constructLayoutEngine').LayoutEngine} */
  let layoutEngine;

  afterEach(() => {
    document.body.innerHTML = "";
    if (layoutEngine) {
      layoutEngine.deactivate();
    }
  });

  it(`starts out activated`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = {
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [{ type: "application", name: "@org-name/header" }],
    };

    layoutEngine = constructLayoutEngine({
      routes,
    });

    expect(layoutEngine.isActive()).toBe(true);
  });

  it(`can handle any calls to activate() / deactivate()`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = {
      containerEl: "body",
      base: "/",
      mode: "history",
      routes: [{ type: "application", name: "@org-name/header" }],
    };

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
    const routes = {
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
    };

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
      new CustomEvent("single-spa:app-change", {
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
      new CustomEvent("single-spa:app-change", {
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
    const routes = {
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
    };

    layoutEngine = constructLayoutEngine({
      routes,
    });

    // transition to /cart route
    history.pushState(history.state, document.title, "/cart");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );
    window.dispatchEvent(
      new CustomEvent("single-spa:app-change", {
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
      new CustomEvent("single-spa:app-change", {
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
});
