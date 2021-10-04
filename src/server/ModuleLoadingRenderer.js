export class ModuleLoadingMicrofrontendRenderer {
  constructor({ importMapsPromise, importSuffix }) {
    this.importMapsPromise = importMapsPromise;
    this.importSuffix = importSuffix;
  }
  async serverRender({ appName, propsPromise }) {
    await this.importMapsPromise;
    const [app, props] = await Promise.all([
      import(appName + `/server.mjs${this.importSuffix}`),
      propsPromise,
    ]);
    return app.serverRender(props);
  }
  async getResponseHeaders({ appName, propsPromise }) {
    await this.importMapsPromise;
    const [app, props] = await Promise.all([
      import(appName + `/server.mjs${this.importSuffix}`),
      propsPromise,
    ]);
    return app.getResponseHeaders(props);
  }
}
