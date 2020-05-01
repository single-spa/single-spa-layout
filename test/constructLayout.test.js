import { constructLayoutEngine } from "../src/single-spa-layout.js";
import { screen } from "@testing-library/dom";

describe(`end-to-end`, () => {
  /** @type {import('../src/constructLayoutEngine').LayoutEngine} */
  let layoutEngine;

  afterEach(() => {
    document.body.innerHTML = "";
    if (layoutEngine) {
      layoutEngine.deactivate();
    }
  });

  it(`can successfully register applications and respond to routing events`, () => {
    /** @type {import('../src/constructRoutes').ResolvedRoutesConfig} */
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

    layoutEngine.activate();

    expect(document.body).toMatchSnapshot();

    history.pushState(history.state, document.title, "/app1");
    window.dispatchEvent(
      new CustomEvent("single-spa:before-mount-routing-event")
    );

    expect(document.body).toMatchSnapshot();
  });
});
