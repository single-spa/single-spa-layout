import { constructServerLayout } from "../../src/single-spa-layout-server.js";
import { renderServerResponseBody } from "../../src/single-spa-layout-server.js";
import fs from "fs";
import path from "path";
import stream from "stream";

describe(`renderServerResponseBody`, () => {
  describe(`dom-elements.html fixture`, () => {
    it(`renders the app1 route correctly`, (done) => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), "./test/fixtures/dom-elements.html"),
          "utf-8"
        )
        .toString();

      const layout = constructServerLayout({
        html,
      });

      const readable = renderServerResponseBody(layout, {
        urlPath: "/app1",
        renderApplication(props) {
          const { name } = props;
          const appStream = new stream.Readable({
            read() {
              appStream.push(`<div id="single-spa-application:${name}"></div>`);
              appStream.push(null);
            },
          });
          return appStream;
        },
      });

      let finalHtml = "";

      readable.on("data", (chunk) => {
        finalHtml += chunk;
      });

      readable.on("end", () => {
        expect(finalHtml).toMatchSnapshot();
        done();
      });

      readable.read();
    });
  });

  it(`renders the app1 route fast`, (done) => {
    const html = fs
      .readFileSync(
        path.resolve(process.cwd(), "./test/fixtures/dom-elements.html"),
        "utf-8"
      )
      .toString();

    const layout = constructServerLayout({
      html,
    });

    const start = Date.now();
    const perfThresholdMs = 20;

    const readable = renderServerResponseBody(layout, {
      urlPath: "/app1",
      renderApplication(props) {
        const { name } = props;
        const appStream = new stream.Readable({
          read() {
            appStream.push(`<div id="single-spa-application:${name}"></div>`);
            appStream.push(null);
          },
        });
        return appStream;
      },
    });

    let finalHtml = "";

    readable.on("data", (chunk) => {
      finalHtml += chunk;
    });

    readable.on("end", () => {
      const latency = Date.now() - start;
      if (latency > perfThresholdMs) {
        fail(`It took ${latency}ms to render the server layout`);
      }
      done();
    });

    readable.read();
  });

  describe(`fragments.html fixture`, () => {
    it(`renders fragments correctly`, (done) => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), "./test/fixtures/fragments.html"),
          "utf-8"
        )
        .toString();

      const layout = constructServerLayout({
        html,
      });

      const readable = renderServerResponseBody(layout, {
        urlPath: "/app1",
        renderFragment(name) {
          const fragStream = new stream.Readable({
            read() {
              this.push(
                `
                <script type="systemjs-importmap">
                  {
                    "imports": {}
                  }
                </script>
              `.trim()
              );
              this.push(null);
            },
          });
          return fragStream;
        },
      });

      let finalHtml = "";

      readable.on("data", (chunk) => {
        finalHtml += chunk;
      });

      readable.on("end", () => {
        expect(finalHtml).toMatchSnapshot();
        done();
      });

      readable.read();
    });
  });
});
