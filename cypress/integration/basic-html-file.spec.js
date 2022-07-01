describe('basic html example', () => {
  it('can load the basic html and kick off single-spa', async () => {
    const contentWindow = await new Promise(resolve => {
      cy.visit('/cypress/fixtures/basic.html', {
        onLoad: contentWindow => {
          resolve(contentWindow);
        },
      });
    });
    const singleSpa = await contentWindow.System.import('single-spa');
    const singleSpaLayout = await contentWindow.System.import(
      'single-spa-layout',
    );

    const routes = singleSpaLayout.constructRoutes(
      contentWindow.document.querySelector('single-spa-router'),
    );
    const applications = singleSpaLayout.constructApplications({
      routes,
      loadApp: loadApp.bind(null, contentWindow),
    });
    const layoutEngine = singleSpaLayout.constructLayoutEngine({
      routes,
      applications,
    });

    singleSpa.addErrorHandler(err => {
      throw err;
    });
    applications.forEach(singleSpa.registerApplication);
    singleSpa.start();

    expect(contentWindow.document.querySelector('single-spa-router')).to.be
      .null;

    await singleSpa.triggerAppChange();
    expect(
      contentWindow.document.getElementById(applicationElementId('header')),
    ).to.not.be.null;
    expect(contentWindow.document.getElementById(applicationElementId('app1')))
      .to.be.null;
    expect(contentWindow.document.getElementById(applicationElementId('app2')))
      .to.be.null;
    expect(
      contentWindow.document.getElementById(applicationElementId('footer')),
    ).to.not.be.null;

    singleSpa.navigateToUrl('/app1');
    await singleSpa.triggerAppChange();
    expect(
      contentWindow.document.getElementById(applicationElementId('header')),
    ).to.not.be.null;
    expect(contentWindow.document.getElementById(applicationElementId('app1')))
      .to.not.be.null;
    expect(contentWindow.document.getElementById(applicationElementId('app2')))
      .to.be.null;
    expect(
      contentWindow.document.getElementById(applicationElementId('footer')),
    ).to.not.be.null;

    singleSpa.navigateToUrl('/app2');
    await singleSpa.triggerAppChange();
    expect(
      contentWindow.document.getElementById(applicationElementId('header')),
    ).to.not.be.null;
    expect(contentWindow.document.getElementById(applicationElementId('app1')))
      .to.be.null;
    expect(contentWindow.document.getElementById(applicationElementId('app2')))
      .to.not.be.null;
    expect(
      contentWindow.document.getElementById(applicationElementId('footer')),
    ).to.not.be.null;
  });
});

async function loadApp(contentWindow, { name }) {
  return {
    async bootstrap() {},
    async mount() {
      const el = contentWindow.document.getElementById(
        applicationElementId(name),
      );
      el.innerHTML = `${name} is mounted`;
    },
    async unmount() {
      const el = contentWindow.document.getElementById(
        applicationElementId(name),
      );
      el.innerHTML = '';
    },
  };
}

function applicationElementId(name) {
  return `single-spa-application:${name}`;
}
