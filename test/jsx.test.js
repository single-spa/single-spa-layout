/** @jsxImportSource ../src */

describe("jsx-runtime", () => {
  it("can compile an empty router", () => {
    expect(<router></router>).toEqual({
      routes: [],
    });
  });

  it("can compile a router with options", () => {
    expect(
      <router mode="hash" base="/" disableWarnings containerEl="body" />
    ).toEqual({
      mode: "hash",
      base: "/",
      disableWarnings: true,
      containerEl: "body",
      routes: [],
    });
  });

  it("can compile a single application", () => {
    expect(
      <router>
        <application name="nav" other="thing" />
      </router>
    ).toEqual({
      routes: [{ type: "application", name: "nav", props: { other: "thing" } }],
    });
  });

  it("can compile a single route", () => {
    expect(
      <router>
        <route path="/" other="thing" />
      </router>
    ).toEqual({
      routes: [
        { type: "route", path: "/", props: { other: "thing" }, routes: [] },
      ],
    });
  });

  it("can compile an application within a route", () => {
    expect(
      <router>
        <route path="/" other="thing">
          <application name="nav" />
        </route>
      </router>
    ).toEqual({
      routes: [
        {
          type: "route",
          path: "/",
          props: { other: "thing" },
          routes: [{ type: "application", name: "nav" }],
        },
      ],
    });
  });

  it("can compile multiple top level routes", () => {
    expect(
      <router>
        <route path="/" other="thing" />
        <route path="/app1" />
        <application name="footer" />
      </router>
    ).toEqual({
      routes: [
        { type: "route", path: "/", props: { other: "thing" }, routes: [] },
        { type: "route", path: "/app1", routes: [] },
        { type: "application", name: "footer" },
      ],
    });
  });

  it("can compile multiple nested routes", () => {
    expect(
      <router>
        <route path="/" other="thing">
          <application name="nav" />
          <route path="/app1">
            <application name="app1" />
          </route>
        </route>
      </router>
    ).toEqual({
      routes: [
        {
          type: "route",
          path: "/",
          props: { other: "thing" },
          routes: [
            { type: "application", name: "nav" },
            {
              type: "route",
              path: "/app1",
              routes: [{ type: "application", name: "app1" }],
            },
          ],
        },
      ],
    });
  });
});
