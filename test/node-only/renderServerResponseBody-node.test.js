import { constructServerLayout } from "../../src/single-spa-layout-server.js";
import { renderServerResponseBody } from "../../src/single-spa-layout-server.js";
import { stringStream } from "../../src/server/renderServerResponseBody.js";
import fs from "fs";
import path from "path";
import stream, { Readable } from "stream";

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

  describe(`multiple-fragments.html fixture`, () => {
    it(`preserves correct order of bytes when fragments are synchronous`, (done) => {
      const html = fs
        .readFileSync(
          path.resolve(
            process.cwd(),
            "./test/fixtures/multiple-fragments.html"
          ),
          "utf-8"
        )
        .toString();

      const layout = constructServerLayout({
        html,
      });

      const readable = renderServerResponseBody(layout, {
        urlPath: "/app1",
        renderFragment(name) {
          if (name === "importmap") {
            return stringStream(
              `
              <script type="systemjs-importmap">
                {
                  "imports": {}
                }
              </script>
            `.trim()
            );
          } else if (name === "head-metadata") {
            return stringStream(`<meta charset="utf-8">`);
          } else {
            throw Error(`Unknown fragment ${name}`);
          }
        },
      });

      const chunks = [];
      readable.on("data", (d) => chunks.push(d));
      readable.on("end", () => {
        expect(Buffer.concat(chunks).toString("utf-8")).toMatchSnapshot();
        done();
      });
      readable.read();
    });

    it(`preserves correct order of bytes when import map is slow`, (done) => {
      const html = fs
        .readFileSync(
          path.resolve(
            process.cwd(),
            "./test/fixtures/multiple-fragments.html"
          ),
          "utf-8"
        )
        .toString();

      const layout = constructServerLayout({
        html,
      });

      const readable = renderServerResponseBody(layout, {
        urlPath: "/app1",
        renderFragment(name) {
          if (name === "importmap") {
            const readable = new Readable({ read() {} });
            setTimeout(() => {
              readable.push(
                `
                <script type="systemjs-importmap">
                  {
                    "imports": {}
                  }
                </script>
              `.trim()
              );
              readable.push(null);
            }, 40);
            return readable;
          } else if (name === "head-metadata") {
            return stringStream(`<meta charset="utf-8">`);
          } else {
            throw Error(`Unknown fragment ${name}`);
          }
        },
      });

      const chunks = [];
      readable.on("data", (d) => chunks.push(d));
      readable.on("end", () => {
        expect(Buffer.concat(chunks).toString("utf-8")).toMatchSnapshot();
        done();
      });
      readable.read();
    });

    it(`preserves correct order of bytes when head-metadata is slow`, (done) => {
      const html = fs
        .readFileSync(
          path.resolve(
            process.cwd(),
            "./test/fixtures/multiple-fragments.html"
          ),
          "utf-8"
        )
        .toString();

      const layout = constructServerLayout({
        html,
      });

      const readable = renderServerResponseBody(layout, {
        urlPath: "/app1",
        renderFragment(name) {
          if (name === "importmap") {
            return stringStream(
              `
              <script type="systemjs-importmap">
                {
                  "imports": {}
                }
              </script>
            `.trim()
            );
          } else if (name === "head-metadata") {
            const readable = new Readable({ read() {} });
            setTimeout(() => {
              readable.push(`<meta charset="utf-8">`);
              readable.push(null);
            }, 40);
            return readable;
          } else {
            throw Error(`Unknown fragment ${name}`);
          }
        },
      });

      const chunks = [];
      readable.on("data", (d) => chunks.push(d));
      readable.on("end", () => {
        expect(Buffer.concat(chunks).toString("utf-8")).toMatchSnapshot();
        done();
      });
      readable.read();
    });

    it(`preserves correct order of bytes when both fragments are slow`, (done) => {
      const html = fs
        .readFileSync(
          path.resolve(
            process.cwd(),
            "./test/fixtures/multiple-fragments.html"
          ),
          "utf-8"
        )
        .toString();

      const layout = constructServerLayout({
        html,
      });

      const readable = renderServerResponseBody(layout, {
        urlPath: "/app1",
        renderFragment(name) {
          if (name === "importmap") {
            const readable = new Readable({ read() {} });
            setTimeout(() => {
              readable.push(
                `
                <script type="systemjs-importmap">
                  {
                    "imports": {}
                  }
                </script>
              `.trim()
              );
              readable.push(null);
            }, 70);
            return readable;
          } else if (name === "head-metadata") {
            const readable = new Readable({ read() {} });
            setTimeout(() => {
              readable.push(`<meta charset="utf-8">`);
              readable.push(null);
            }, 40);
            return readable;
          } else {
            throw Error(`Unknown fragment ${name}`);
          }
        },
      });

      const chunks = [];
      readable.on("data", (d) => chunks.push(d));
      readable.on("end", () => {
        expect(Buffer.concat(chunks).toString("utf-8")).toMatchSnapshot();
        done();
      });
      readable.read();
    });

    it(`doesn't wait for the first fragment stream to finish before starting to read the second fragment`, () => {
      const html = fs
        .readFileSync(
          path.resolve(
            process.cwd(),
            "./test/fixtures/multiple-fragments.html"
          ),
          "utf-8"
        )
        .toString();

      const layout = constructServerLayout({
        html,
      });

      let renderedFragments = [];

      renderServerResponseBody(layout, {
        urlPath: "/app1",
        renderFragment(name) {
          renderedFragments.push(name);
          if (name === "importmap") {
            const readable = new Readable({ read() {} });
            readable.push(
              `
              <script type="systemjs-importmap">
                {
                  "imports": {}
                }
              </script>
            `.trim()
            );
            readable.push(null);
            return readable;
          } else if (name === "head-metadata") {
            const readable = new Readable({ read() {} });
            setTimeout(() => {
              // renderFragment should have been called for the import map even though
              // we haven't finished the head-metadata's stream yet.
              expect(renderedFragments).toEqual(["head-metadata", "importmap"]);

              readable.push(`<meta charset="utf-8">`);
              readable.push(null);
            }, 40);
            return readable;
          } else {
            throw Error(`Unknown fragment ${name}`);
          }
        },
      });
    });
  });
});
