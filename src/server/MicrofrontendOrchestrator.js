export class MicrofrontendOrchestrator {
  constructor() {
    this.fetchers = {};
    this.renderApplication = this.renderApplication.bind(this);
    this.retrieveApplicationHeaders =
      this.retrieveApplicationHeaders.bind(this);
  }
  setFetcher(appName, fetcher) {
    this.fetchers[appName] = fetcher;
  }
  async renderApplication({ appName, propsPromise }) {
    const fetcher = this.fetchers[appName];
    if (!fetcher) {
      throw new Error(`No fetcher defined for application '${appName}'`);
    }

    return fetcher.serverRender({
      appName,
      propsPromise,
    });
  }
  async retrieveApplicationHeaders({ appName, propsPromise }) {
    const fetcher = this.fetchers[appName];
    if (!fetcher) {
      throw new Error(`No fetcher defined for application ${appName}`);
    }

    return fetcher.getResponseHeaders({
      appName,
      propsPromise,
    });
  }
}
