import { constructServerLayout } from '../../src/single-spa-layout-server.js';

describe(`constructServerLayout`, () => {
  it(`can find single-spa-router elements in an HTML document`, () => {
    constructServerLayout({
      filePath: './test/fixtures/dom-elements.html',
    });
    constructServerLayout({
      filePath: './test/fixtures/medium.html',
    });
    constructServerLayout({
      filePath: './test/fixtures/nested-default-route.html',
    });
    constructServerLayout({
      filePath: './test/fixtures/props.html',
    });
  });

  it(`returns a server layout`, () => {
    const layout = constructServerLayout({
      filePath: './test/fixtures/dom-elements.html',
    });
    expect(layout.resolvedRoutes).toBeDefined();
    expect(layout.parsedDocument).toBeDefined();
  });
});
