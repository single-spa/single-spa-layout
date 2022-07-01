import { ResolvedRoutesConfig } from '../isomorphic/index.js';

export const layoutConfigScriptId = '_ssl-config_';

export const layoutDataScriptId = '_ssl-data_';

// TODO: this ID pattern is fixed somewhere in single-spa libs
export const applicationElementId = (appName: string) =>
  `single-spa-application:${appName}`;

export const appPropsScriptId = (appName: string) => `_ssl-props:${appName}_`;

export const dataScript = (data: unknown, id: string) =>
  `<script id="${id}" type="application/json">${JSON.stringify(data)}</script>`;

export const getDataScript = (id: string) =>
  document.querySelector<HTMLScriptElement>(`script[id="${id}"]`);

export const getDataFromScript = <TData>(id: string) => {
  const script = getDataScript(id);
  return script ? (JSON.parse(script.text) as TData) : undefined;
};

export const getAppProps = <TProps>(appName: string) =>
  getDataFromScript<TProps>(appPropsScriptId(appName));

export const getLayoutConfig = () =>
  getDataFromScript<ResolvedRoutesConfig>(layoutConfigScriptId);
