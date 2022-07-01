import { constructServerLayout } from '../../src/single-spa-layout-server.js';
import { sendLayoutHTTPResponse } from '../../src/single-spa-layout-server.js';
import { stringStream } from '../../src/server/sendLayoutHTTPResponse.js';
import fs from 'fs';
import path, { resolve } from 'path';
import stream, { Readable, Writable } from 'stream';
import _ from 'lodash';

describe(`sendLayoutHTTPResponse`, () => {
  let res, responseBodyPromise;

  beforeEach(() => {
    let responseBodyStr = '',
      bodyResolve;

    responseBodyPromise = new Promise(resolve => (bodyResolve = resolve));

    res = new Writable({
      write(chunk, encoding, cb) {
        responseBodyStr += chunk;
        cb();
      },
    });
    res.on('finish', () => {
      bodyResolve(responseBodyStr);
    });
    res.setHeader = jest.fn();
    res.redirect = jest.fn();
  });

  describe('response body', () => {
    describe(`dom-elements.html fixture`, () => {
      it(`renders the app1 route correctly`, async () => {
        const html = fs
          .readFileSync(
            path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
            'utf-8',
          )
          .toString();

        const serverLayout = constructServerLayout({
          html,
        });

        await sendLayoutHTTPResponse({
          res,
          serverLayout,
          urlPath: '/app1',
          retrieveApplicationHeaders(props) {
            return {};
          },
          assembleFinalHeaders(allHeaders) {
            return _.assign({}, Object.values(allHeaders));
          },
          renderApplication({ appName, propsPromise }) {
            const appStream = new stream.Readable({
              read() {
                appStream.push(`<button>App ${appName}</button>`);
                appStream.push(null);
              },
            });
            return appStream;
          },
        });

        const responseBody = await responseBodyPromise;

        expect(responseBody).toMatchSnapshot();
      });
    });

    describe(`fragments.html fixture`, () => {
      it(`renders fragments correctly`, async () => {
        const html = fs
          .readFileSync(
            path.resolve(process.cwd(), './test/fixtures/fragments.html'),
            'utf-8',
          )
          .toString();

        const serverLayout = constructServerLayout({
          html,
        });

        await sendLayoutHTTPResponse({
          res,
          serverLayout,
          urlPath: '/app1',
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
              `.trim(),
                );
                this.push(null);
              },
            });
            return fragStream;
          },
          assembleFinalHeaders() {
            return {};
          },
        });

        expect(await responseBodyPromise).toMatchSnapshot();
      });
    });

    describe(`multiple-fragments.html fixture`, () => {
      it(`preserves correct order of bytes when fragments are synchronous`, async () => {
        const html = fs
          .readFileSync(
            path.resolve(
              process.cwd(),
              './test/fixtures/multiple-fragments.html',
            ),
            'utf-8',
          )
          .toString();

        const serverLayout = constructServerLayout({
          html,
        });

        await sendLayoutHTTPResponse({
          res,
          serverLayout,
          urlPath: '/app1',
          renderFragment(name) {
            if (name === 'importmap') {
              return stringStream(
                `
              <script type="systemjs-importmap">
                {
                  "imports": {}
                }
              </script>
            `.trim(),
              );
            } else if (name === 'head-metadata') {
              return stringStream(`<meta charset="utf-8">`);
            } else {
              throw Error(`Unknown fragment ${name}`);
            }
          },
          assembleFinalHeaders() {
            return {};
          },
        });

        expect(await responseBodyPromise).toMatchSnapshot();
      });

      it(`preserves correct order of bytes when import map is slow`, async () => {
        const html = fs
          .readFileSync(
            path.resolve(
              process.cwd(),
              './test/fixtures/multiple-fragments.html',
            ),
            'utf-8',
          )
          .toString();

        const serverLayout = constructServerLayout({
          html,
        });

        await sendLayoutHTTPResponse({
          res,
          serverLayout,
          urlPath: '/app1',
          renderFragment(name) {
            if (name === 'importmap') {
              const readable = new Readable({ read() {} });
              setTimeout(() => {
                readable.push(
                  `
                <script type="systemjs-importmap">
                  {
                    "imports": {}
                  }
                </script>
              `.trim(),
                );
                readable.push(null);
              }, 40);
              return readable;
            } else if (name === 'head-metadata') {
              return stringStream(`<meta charset="utf-8">`);
            } else {
              throw Error(`Unknown fragment ${name}`);
            }
          },
          assembleFinalHeaders() {
            return {};
          },
        });

        expect(await responseBodyPromise).toMatchSnapshot();
      });

      it(`preserves correct order of bytes when head-metadata is slow`, async () => {
        const html = fs
          .readFileSync(
            path.resolve(
              process.cwd(),
              './test/fixtures/multiple-fragments.html',
            ),
            'utf-8',
          )
          .toString();

        const serverLayout = constructServerLayout({
          html,
        });

        await sendLayoutHTTPResponse({
          res,
          serverLayout,
          urlPath: '/app1',
          assembleFinalHeaders() {
            return {};
          },
          renderFragment(name) {
            if (name === 'importmap') {
              return stringStream(
                `
              <script type="systemjs-importmap">
                {
                  "imports": {}
                }
              </script>
            `.trim(),
              );
            } else if (name === 'head-metadata') {
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

        expect(await responseBodyPromise).toMatchSnapshot();
      });

      it(`preserves correct order of bytes when both fragments are slow`, async () => {
        const html = fs
          .readFileSync(
            path.resolve(
              process.cwd(),
              './test/fixtures/multiple-fragments.html',
            ),
            'utf-8',
          )
          .toString();

        const serverLayout = constructServerLayout({
          html,
        });

        await sendLayoutHTTPResponse({
          res,
          serverLayout,
          urlPath: '/app1',
          assembleFinalHeaders() {
            return {};
          },
          renderFragment(name) {
            if (name === 'importmap') {
              const readable = new Readable({ read() {} });
              setTimeout(() => {
                readable.push(
                  `
                <script type="systemjs-importmap">
                  {
                    "imports": {}
                  }
                </script>
              `.trim(),
                );
                readable.push(null);
              }, 70);
              return readable;
            } else if (name === 'head-metadata') {
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

        expect(await responseBodyPromise).toMatchSnapshot();
      });

      it(`doesn't wait for the first fragment stream to finish before starting to read the second fragment`, async () => {
        const html = fs
          .readFileSync(
            path.resolve(
              process.cwd(),
              './test/fixtures/multiple-fragments.html',
            ),
            'utf-8',
          )
          .toString();

        const serverLayout = constructServerLayout({
          html,
        });

        let renderedFragments = [];

        await sendLayoutHTTPResponse({
          res,
          serverLayout,
          urlPath: '/app1',
          assembleFinalHeaders() {},
          renderFragment(name) {
            renderedFragments.push(name);
            if (name === 'importmap') {
              const readable = new Readable({ read() {} });
              readable.push(
                `
              <script type="systemjs-importmap">
                {
                  "imports": {}
                }
              </script>
            `.trim(),
              );
              readable.push(null);
              return readable;
            } else if (name === 'head-metadata') {
              const readable = new Readable({ read() {} });
              setTimeout(() => {
                // renderFragment should have been called for the import map even though
                // we haven't finished the head-metadata's stream yet.
                expect(renderedFragments).toEqual([
                  'head-metadata',
                  'importmap',
                ]);

                readable.push(`<meta charset="utf-8">`);
                readable.push(null);
              }, 40);
              return readable;
            } else {
              throw Error(`Unknown fragment ${name}`);
            }
          },
        });

        expect(await responseBodyPromise).toMatchSnapshot();
      });

      it(`allows renderFragment to return a string`, async () => {
        const html = fs
          .readFileSync(
            path.resolve(process.cwd(), './test/fixtures/fragments.html'),
            'utf-8',
          )
          .toString();

        const serverLayout = constructServerLayout({
          html,
        });

        await sendLayoutHTTPResponse({
          res,
          assembleFinalHeaders() {
            return {};
          },
          serverLayout,
          urlPath: '/app1',
          renderFragment(name) {
            return `
            <script type="systemjs-importmap">
              {
                "imports": {}
              }
            </script>
          `.trim();
          },
        });

        expect(await responseBodyPromise).toMatchSnapshot();
      });
    });

    it(`allows for strings to be returned from renderApplication`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        assembleFinalHeaders() {
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          return `<button>App ${appName}</button>`;
        },
        retrieveApplicationHeaders({ appName, propsPromise }) {
          return {};
        },
      });

      expect(await responseBodyPromise).toMatchSnapshot();
    });

    it(`allows for strings to be returned from renderApplication with assets`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(
            process.cwd(),
            './test/fixtures/dom-elements-with-assets.html',
          ),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        assembleFinalHeaders() {
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          const css = `
          .button {
            background-color: #4CAF50; /* Green */
            border: none;
            color: white;
            padding: 15px 32px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
          }
          `;
          return {
            assets: `${
              appName === 'app1'
                ? `<style id="jss-server-side">${css}</style>`
                : ``
            }`,
            content: `<button>App ${appName}</button>`,
          };
        },
        retrieveApplicationHeaders({ appName, propsPromise }) {
          return {};
        },
      });

      expect(await responseBodyPromise).toMatchSnapshot();
    });

    it(`allows for empty content strings to be returned from renderApplication with assets`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(
            process.cwd(),
            './test/fixtures/dom-elements-with-assets.html',
          ),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        assembleFinalHeaders() {
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          const css = `
          .button {
            background-color: #4CAF50; /* Green */
            border: none;
            color: white;
            padding: 15px 32px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
          }
          `;
          return {
            assets: `${
              appName === 'app1'
                ? `<style id="jss-server-side">${css}</style>`
                : ``
            }`,
            content: ``,
          };
        },
        retrieveApplicationHeaders({ appName, propsPromise }) {
          return {};
        },
      });

      expect(await responseBodyPromise).toMatchSnapshot();
    });

    it(`renders assets and content in correct order`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(
            process.cwd(),
            './test/fixtures/dom-elements-with-assets.html',
          ),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        assembleFinalHeaders() {
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          const css = `
          .button {
            background-color: #4CAF50; /* Green */
            border: none;
            color: white;
            padding: 15px 32px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
          }
          `;
          return {
            assets: new Promise(resolve => {
              setTimeout(
                () =>
                  resolve(
                    `${
                      appName === 'app1'
                        ? `<style id="jss-server-side">${css}</style>`
                        : ``
                    }`,
                  ),
                200,
              );
            }),
            content: `<button>App ${appName}</button>`,
          };
        },
        retrieveApplicationHeaders({ appName, propsPromise }) {
          return {};
        },
      });

      expect(await responseBodyPromise).toMatchSnapshot();
    });

    it(`allows for promises to be returned from renderApplication`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        assembleFinalHeaders() {
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          return Promise.resolve(
            `<button>App ${appName} from promise</button>`,
          );
        },
        retrieveApplicationHeaders({ appName }) {
          return {};
        },
      });

      expect(await responseBodyPromise).toMatchSnapshot();
    });

    it(`allows for promises that resolve with streams to be returned from renderApplication`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        assembleFinalHeaders() {
          return {};
        },
        renderApplication({ appName }) {
          return Promise.resolve().then(() => {
            return Readable.from(`<button>App ${appName} from stream</button>`);
          });
        },
        retrieveApplicationHeaders() {
          return {};
        },
      });

      expect(await responseBodyPromise).toMatchSnapshot();
    });

    it(`renders an empty string when returned promise from renderApplication rejects`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        assembleFinalHeaders() {
          return {};
        },
        renderApplication({ appName }) {
          return Promise.reject(Error(`render failed`));
        },
        retrieveApplicationHeaders({ appName }) {
          return {};
        },
      });

      expect(await responseBodyPromise).toMatchSnapshot();
    });

    it(`renders an empty string when renderApplication throws an error`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        assembleFinalHeaders() {
          return {};
        },
        renderApplication({ appName }) {
          throw Error(`render failed`);
        },
        retrieveApplicationHeaders({ appName }) {
          return {};
        },
      });

      expect(await responseBodyPromise).toMatchSnapshot();
    });
  });

  describe('response headers', () => {
    it(`uses the headers from assembleFinalHeaders`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        retrieveApplicationHeaders(props) {
          return { should: 'ignore' };
        },
        assembleFinalHeaders(allHeaders) {
          return { final: 'headers', 'content-type': 'text/html' };
        },
        renderApplication({ appName, propsPromise }) {
          return appName;
        },
      });

      expect(res.setHeader).toHaveBeenCalledTimes(2);
      expect(res.setHeader.mock.calls[0]).toEqual(['final', 'headers']);
      expect(res.setHeader.mock.calls[1]).toEqual([
        'content-type',
        'text/html',
      ]);
    });

    it(`should call retrieveApplicationHeaders with correct arguments`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        retrieveApplicationHeaders({ appName, propsPromise }) {
          expect(typeof appName).toBe('string');
          expect(propsPromise instanceof Promise).toBe(true);
          return { should: 'ignore' };
        },
        assembleFinalHeaders(allHeaders) {
          return { final: 'headers', 'content-type': 'text/html' };
        },
        renderApplication({ appName, propsPromise }) {
          return appName;
        },
      });

      expect(res.setHeader).toHaveBeenCalledTimes(2);
      expect(res.setHeader.mock.calls[0]).toEqual(['final', 'headers']);
      expect(res.setHeader.mock.calls[1]).toEqual([
        'content-type',
        'text/html',
      ]);
    });

    it(`should call assembleFinalHeaders with correct arguments`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/dom-elements.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/app1',
        retrieveApplicationHeaders({ appName, propsPromise }) {
          return { [appName]: true };
        },
        assembleFinalHeaders(allHeaders) {
          expect(allHeaders).toEqual([
            { appHeaders: { header: true }, appProps: { name: 'header' } },
            { appHeaders: { app1: true }, appProps: { name: 'app1' } },
          ]);
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          return appName;
        },
      });
    });
  });

  describe('redirects', () => {
    it(`redirects from / to /login`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/redirects.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/',
        retrieveApplicationHeaders({ appName, propsPromise }) {
          return { [appName]: true };
        },
        assembleFinalHeaders(allHeaders) {
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          return appName;
        },
      });

      expect(res.redirect).toHaveBeenCalledWith('/login');

      res.redirect.mockReset();

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/old-settings',
        retrieveApplicationHeaders({ appName, propsPromise }) {
          return { [appName]: true };
        },
        assembleFinalHeaders(allHeaders) {
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          return appName;
        },
      });

      expect(res.redirect).toHaveBeenCalledWith('/settings');
    });

    it(`correctly serializes a layout definition that includes redirects`, async () => {
      const html = fs
        .readFileSync(
          path.resolve(process.cwd(), './test/fixtures/redirects.html'),
          'utf-8',
        )
        .toString();

      const serverLayout = constructServerLayout({
        html,
      });

      await sendLayoutHTTPResponse({
        res,
        serverLayout,
        urlPath: '/settings',
        retrieveApplicationHeaders({ appName, propsPromise }) {
          return { [appName]: true };
        },
        assembleFinalHeaders(allHeaders) {
          return {};
        },
        renderApplication({ appName, propsPromise }) {
          return appName;
        },
      });

      expect(res.redirect).not.toHaveBeenCalled();

      expect(await responseBodyPromise).toMatchSnapshot();
    });
  });
});
