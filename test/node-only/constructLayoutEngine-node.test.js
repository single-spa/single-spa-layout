import { constructLayoutEngine } from '../../src/single-spa-layout.js';
import { screen } from '@testing-library/dom';

describe(`constructLayoutEngine node`, () => {
  /** @type {import('../../src/constructLayoutEngine').LayoutEngine} */
  let layoutEngine;

  it(`can construct a layout engine on the server`, () => {
    /** @type {import('../../src/constructRoutes').ResolvedRoutesConfig} */
    const routes = {
      containerEl: 'body',
      base: '/',
      mode: 'history',
      routes: [
        { type: 'application', name: '@org-name/header' },
        {
          type: 'route',
          path: 'app1',
          routes: [{ type: 'application', name: '@org-name/app1' }],
        },
        { type: 'application', name: '@org-name/footer' },
      ],
    };

    layoutEngine = constructLayoutEngine({
      routes,
    });
  });
});
