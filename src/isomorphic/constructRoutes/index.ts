import {
  getDataFromScript,
  inBrowser,
  layoutDataScriptId,
} from '../../utils/index.js';
import type {
  HTMLLayoutData,
  InputRoutesConfig,
  ResolvedRoutesConfig,
  RouteMode,
  SslElement,
} from '../types/index.js';
import { nodeNames, setFromAttribute } from '../utils/index.js';
import { parseRoutes } from './parseRoutes.js';
import { validateRoutesConfig } from './validateRoutesConfig.js';

export { MISSING_PROP } from './parseRoutes.js';

const parseRouterElement = (html: string) => {
  if (!inBrowser)
    throw Error(
      'calling constructRoutes with a string on the server is not yet supported',
    );
  const element = new DOMParser()
    .parseFromString(html, 'text/html')
    .documentElement.querySelector<HTMLElement>(nodeNames.ROUTER);
  if (!element)
    throw Error(
      'constructRoutes should be called with a string HTML document that contains a <single-spa-router> element.',
    );
  return element;
};

const getHtmlLayoutData = (layoutData: Optional<HTMLLayoutData>) => {
  return (
    layoutData ||
    (inBrowser ? getDataFromScript(layoutDataScriptId) : undefined)
  );
};

const isHTMLTemplateElement = (
  element: HTMLElement | SslElement,
): element is HTMLTemplateElement =>
  typeof HTMLTemplateElement !== 'undefined' &&
  element instanceof HTMLTemplateElement;

const isHTMLElement = (
  element: HTMLElement | SslElement,
): element is HTMLElement =>
  inBrowser ||
  (typeof HTMLElement !== 'undefined' && element instanceof HTMLElement);

const elementToRoutesConfig = (
  element: HTMLElement | SslElement,
  htmlLayoutData: HTMLLayoutData = {},
): InputRoutesConfig => {
  const routerElement = isHTMLTemplateElement(element)
    ? // IE11 doesn't support the content property on templates
      (element.content || element).querySelector<HTMLElement>(nodeNames.ROUTER)!
    : element;

  if (routerElement.nodeName.toLowerCase() !== nodeNames.ROUTER)
    throw Error(
      `single-spa-layout: The HTMLElement passed to constructRoutes must be <single-spa-router> or a <template> containing the router. Received ${element.nodeName}`,
    );

  if (
    isHTMLElement(element) &&
    isHTMLElement(routerElement) &&
    element.isConnected
  )
    element.remove();

  const result: InputRoutesConfig = {
    ...setFromAttribute('base')(routerElement),
    ...setFromAttribute('containerEl')(routerElement),
    ...setFromAttribute('mode')<RouteMode>(routerElement),
    childNodes: [],
    redirects: {},
  };
  routerElement.childNodes.forEach(child =>
    result.childNodes.push(...parseRoutes(child, htmlLayoutData, result)),
  );
  return result;
};

const getInputConfig = (
  arg1: string | HTMLElement | SslElement | InputRoutesConfig,
  arg2?: HTMLLayoutData,
): InputRoutesConfig => {
  if (typeof arg1 === 'string' || 'nodeName' in arg1) {
    const element = typeof arg1 === 'string' ? parseRouterElement(arg1) : arg1;
    return elementToRoutesConfig(element, getHtmlLayoutData(arg2));
  }
  if (arg2)
    throw Error(
      `constructRoutes should be called either with an HTMLElement and layoutData, or a single json object.`,
    );
  return arg1;
};

export function constructRoutes(
  htmlOrElement: string | HTMLElement | SslElement,
  layoutData?: HTMLLayoutData,
): ResolvedRoutesConfig;
export function constructRoutes(
  configObject: InputRoutesConfig,
): ResolvedRoutesConfig;
export function constructRoutes(
  arg1: string | HTMLElement | SslElement | InputRoutesConfig,
  arg2?: HTMLLayoutData,
): ResolvedRoutesConfig {
  const config = getInputConfig(arg1, arg2);
  validateRoutesConfig(config);
  return config;
}
