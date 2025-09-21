import {
  validateArray,
  validateEnum,
  validateKeys,
  validateString,
  validateFullPath,
  validateObject,
  validateContainerEl,
  validateBoolean,
} from "../utils/validation-helpers.js";
import { inBrowser } from "../utils/environment-helpers.js";
import {
  pathToActiveWhen,
  type ActivityFn,
  type ParcelConfig,
  type LifeCycles,
} from "single-spa";
import { resolvePath } from "./matchRoute.js";
import type { DefaultTreeAdapterTypes } from "parse5";

export const MISSING_PROP = Symbol();

type RoutesConfig =
  | InputRoutesConfigObject
  | HTMLElement
  | DefaultTreeAdapterTypes.Document
  | string;

declare global {
  interface Window {
    singleSpaLayoutData?: HTMLLayoutData;
  }
}

interface InputRoutesConfigObject {
  mode?: string;
  base?: string;
  containerEl?: ContainerEl;
  disableWarnings?: boolean;
  routes: InputRouteChild[];
  redirects?: Redirects;
}

type InputRouteChild = InputRoute | InputApplication | InputHTMLElement | Node;

interface InputRoute {
  type: "route";
  path: string;
  routes: InputRouteChild[];
  default?: boolean;
  exact?: boolean;
  props?: Record<string, any>;
}

interface InputApplication {
  type: "application";
  name: string;
  loader?: LifeCycles;
  props: Record<string, any>;
}

interface InputHTMLElement {
  type: string;
  attrs: { name: string; value: string }[];
  routes?: InputRouteChild[];
}

export interface ResolvedRoutesConfig {
  mode: string;
  base: string;
  containerEl: ContainerEl;
  routes: ResolvedRouteChild[];
  redirects: Redirects;
}

type Redirects = Record<string, string>;

export type ResolvedRouteChild =
  | ResolvedUrlRoute
  | Application
  | HTMLElementAsJSON
  | NodeWithRoutes;

interface NodeWithRoutes extends Node {
  routes?: ResolvedRouteChild[];
  props?: Record<string, any>;
}

interface HTMLElementAsJSON {
  type: string;
  value?: string;
  routes?: ResolvedRouteChild[];
  props?: Record<string, any>;
}

type ContainerEl = string | Element | DefaultTreeAdapterTypes.Element;

export interface ResolvedUrlRoute {
  type: "route";
  path: string;
  routes: Array<ResolvedRouteChild>;
  default?: boolean;
  exact?: boolean;
  props?: Record<string, any>;
  activeWhen: ActivityFn;
}

export interface Application {
  type: "application";
  name: string;
  className?: string;
  props?: Record<string, any>;
  loader?: string | ParcelConfig;
  error?: string | ParcelConfig;
}

interface HTMLLayoutData {
  loaders: Record<string, any>;
  props: Record<string, any>;
  errors?: Record<string, string | ParcelConfig>;
}

export function constructRoutes(
  routesConfig: RoutesConfig,
  htmlLayoutData: HTMLLayoutData,
): ResolvedRoutesConfig {
  if (
    (routesConfig && (routesConfig as HTMLElement).nodeName) ||
    typeof routesConfig === "string"
  ) {
    if (inBrowser && !htmlLayoutData && window.singleSpaLayoutData) {
      htmlLayoutData = window.singleSpaLayoutData;
    }

    let domInputElement: HTMLElement;

    if (typeof routesConfig === "string") {
      if (inBrowser) {
        domInputElement = new DOMParser()
          .parseFromString(routesConfig, "text/html")
          .documentElement.querySelector("single-spa-router");
        if (!routesConfig) {
          throw Error(
            `constructRoutes should be called with a string HTML document that contains a <single-spa-router> element.`,
          );
        }
      } else {
        throw Error(
          `calling constructRoutes with a string on the server is not yet supported`,
        );
      }
    } else {
      domInputElement = routesConfig as HTMLElement;
    }

    return validateAndSanitize(
      domToRoutesConfig(domInputElement, htmlLayoutData),
    );
  } else if (htmlLayoutData) {
    throw Error(
      `constructRoutes should be called either with an HTMLElement and layoutData, or a single json object.`,
    );
  } else {
    return validateAndSanitize(routesConfig as InputRoutesConfigObject);
  }
}

function domToRoutesConfig(
  domElement: HTMLElement,
  htmlLayoutData: HTMLLayoutData = { loaders: {}, props: {} },
): ResolvedRoutesConfig {
  // Support passing in a template element, which are nice because their content is
  // not rendered by browsers
  if (domElement.nodeName.toLowerCase() === "template") {
    domElement = (domElement as HTMLTemplateElement).content.querySelector(
      "single-spa-router",
    );
  }

  if (domElement.nodeName.toLowerCase() !== "single-spa-router") {
    throw Error(
      `single-spa-layout: The HTMLElement passed to constructRoutes must be <single-spa-router> or a <template> containing the router. Received ${domElement.nodeName}`,
    );
  }

  if (inBrowser && domElement.isConnected) {
    domElement.parentNode.removeChild(domElement);
  }

  const result: ResolvedRoutesConfig = {
    routes: [],
    redirects: {},
    mode: getAttribute(domElement, "mode"),
    base: getAttribute(domElement, "base"),
    containerEl: getAttribute(domElement, "containerEl"),
  };

  for (let i = 0; i < domElement.childNodes.length; i++) {
    result.routes.push(
      ...elementToJson(domElement.childNodes[i], htmlLayoutData, result),
    );
  }

  return result;
}

function getAttribute(
  element: HTMLElement | DefaultTreeAdapterTypes.Element,
  attrName: string,
): string | null {
  if (inBrowser) {
    // browser
    return (element as HTMLElement).getAttribute(attrName);
  } else {
    // NodeJS with parse5
    // watch out, parse5 converts attribute names to lowercase and not as is => https://github.com/inikulin/parse5/issues/116
    const attr = (element as DefaultTreeAdapterTypes.Element).attrs.find(
      (attr) => attr.name === attrName.toLowerCase(),
    );
    return attr ? attr.value : null;
  }
}

function hasAttribute(
  element: HTMLElement | DefaultTreeAdapterTypes.Element,
  attrName: string,
): boolean {
  if (inBrowser) {
    return (element as HTMLElement).hasAttribute(attrName);
  } else {
    return (element as DefaultTreeAdapterTypes.Element).attrs.some(
      (attr) => attr.name === attrName,
    );
  }
}

function elementToJson(
  element:
    | HTMLElement
    | NodeWithRoutes
    | DefaultTreeAdapterTypes.Element
    | DefaultTreeAdapterTypes.ChildNode,
  htmlLayoutData: HTMLLayoutData,
  resolvedRoutesConfig: ResolvedRoutesConfig,
): ResolvedRouteChild[] {
  if (element.nodeName.toLowerCase() === "application") {
    const el: HTMLElement = element as HTMLElement;
    if (el.childNodes.length > 0) {
      throw Error(
        `<application> els must not have childNodes. You must put in a closing </application> - self closing is not allowed`,
      );
    }
    const application: Application = {
      type: "application",
      name: getAttribute(el, "name"),
    };
    const loaderKey = getAttribute(el, "loader");
    if (loaderKey) {
      if (
        htmlLayoutData.loaders &&
        htmlLayoutData.loaders.hasOwnProperty(loaderKey)
      ) {
        application.loader = htmlLayoutData.loaders[loaderKey];
      } else if (inBrowser) {
        throw Error(
          `Application loader '${loaderKey}' was not defined in the htmlLayoutData`,
        );
      }
    }

    const errorKey = getAttribute(el, "error");
    if (errorKey) {
      if (
        htmlLayoutData.errors &&
        htmlLayoutData.errors.hasOwnProperty(errorKey)
      ) {
        application.error = htmlLayoutData.errors[errorKey];
      } else if (inBrowser) {
        throw Error(
          `Application error handler '${loaderKey}' was not defined in the htmlLayoutData`,
        );
      }
    }

    const className = getAttribute(el, "class");
    if (className) {
      application.className = className;
    }

    setProps(el, application, htmlLayoutData);
    return [application];
  } else if (element.nodeName.toLowerCase() === "route") {
    const el: HTMLElement = element as HTMLElement;
    const route: ResolvedUrlRoute = {
      type: "route",
      routes: [],
      path: getAttribute(el, "path"),
      default: hasAttribute(el, "default"),
      exact: hasAttribute(el, "exact"),
      activeWhen: pathToActiveWhen(getAttribute(el, "path")),
    };
    setProps(el, route, htmlLayoutData);
    for (let i = 0; i < el.childNodes.length; i++) {
      route.routes.push(
        ...elementToJson(
          el.childNodes[i],
          htmlLayoutData,
          resolvedRoutesConfig,
        ),
      );
    }
    return [route];
  } else if (element.nodeName.toLowerCase() === "redirect") {
    resolvedRoutesConfig.redirects[
      resolvePath("/", getAttribute(element as HTMLElement, "from"))
    ] = resolvePath("/", getAttribute(element as HTMLElement, "to"));
    return [];
  } else if (typeof Node !== "undefined" && element instanceof Node) {
    if (
      element.nodeType === Node.TEXT_NODE &&
      element.textContent.trim() === ""
    ) {
      return [];
    } else {
      if (element.childNodes && element.childNodes.length > 0) {
        (element as NodeWithRoutes).routes = [];
        for (let i = 0; i < element.childNodes.length; i++) {
          (element as NodeWithRoutes).routes.push(
            ...elementToJson(
              element.childNodes[i],
              htmlLayoutData,
              resolvedRoutesConfig,
            ),
          );
        }
      }
      return [element];
    }
  } else if (element.hasOwnProperty("childNodes")) {
    const el: DefaultTreeAdapterTypes.Element =
      element as DefaultTreeAdapterTypes.Element;
    const result = {
      type: el.nodeName.toLowerCase(),
      routes: [],
      attrs: el.attrs,
    };
    for (let i = 0; i < el.childNodes.length; i++) {
      result.routes.push(
        ...elementToJson(
          el.childNodes[i],
          htmlLayoutData,
          resolvedRoutesConfig,
        ),
      );
    }
    return [result];
  } else if (element.nodeName === "#comment") {
    return [
      {
        type: "#comment",
        value: (element as Comment).data,
      },
    ];
  } else if (element.nodeName === "#text") {
    return [
      {
        type: "#text",
        value: (element as Text).textContent,
      },
    ];
  }
}

function setProps(
  element: HTMLElement,
  route: ResolvedRouteChild,
  htmlLayoutData: HTMLLayoutData,
): void {
  const propNames = (getAttribute(element, "props") || "").split(",");

  for (let i = 0; i < propNames.length; i++) {
    const propName = propNames[i].trim();

    if (propName.length === 0) {
      continue;
    }

    if (!route.props) {
      route.props = {};
    }

    if (htmlLayoutData.props && htmlLayoutData.props.hasOwnProperty(propName)) {
      route.props[propName] = htmlLayoutData.props[propName];
    } else if (inBrowser) {
      throw Error(
        `Prop '${propName}' was not defined in the htmlLayoutData. Either remove this attribute from the HTML element or provide the prop's value`,
      );
    } else {
      route.props[propName] = MISSING_PROP;
    }
  }
}

function validateAndSanitize(
  routesConfig: InputRoutesConfigObject | ResolvedRoutesConfig,
): ResolvedRoutesConfig {
  validateObject("routesConfig", routesConfig);

  const disableWarnings = (routesConfig as InputRoutesConfigObject)
    .disableWarnings;

  validateKeys(
    "routesConfig",
    routesConfig,
    ["mode", "base", "containerEl", "routes", "disableWarnings", "redirects"],
    disableWarnings,
  );

  if (routesConfig.hasOwnProperty("containerEl")) {
    validateContainerEl("routesConfig.containerEl", routesConfig.containerEl);
  } else {
    routesConfig.containerEl = "body";
  }

  if (!routesConfig.hasOwnProperty("mode")) {
    routesConfig.mode = "history";
  }
  validateEnum("routesConfig.mode", routesConfig.mode, ["history", "hash"]);

  if (routesConfig.hasOwnProperty("base")) {
    validateString("routesConfig.base", routesConfig.base);
    routesConfig.base = sanitizeBase(routesConfig.base);
  } else {
    routesConfig.base = "/";
  }

  if (routesConfig.hasOwnProperty("redirects")) {
    validateObject(`routesConfig.redirects`, routesConfig.redirects);

    for (let from in routesConfig.redirects) {
      const to = routesConfig.redirects[from];
      validateFullPath(`routesConfig.redirects key`, from);
      validateFullPath(`routesConfig.redirects['${from}']`, to);
    }
  }

  const pathname = inBrowser ? window.location.pathname : "/";
  const hashPrefix = routesConfig.mode === "hash" ? pathname + "#" : "";

  validateArray("routesConfig.routes", routesConfig.routes, validateRoute, {
    parentPath: hashPrefix + routesConfig.base,
    parentActiveWhen: () => true,
    siblingActiveWhens: [],
  });

  function validateRoute(
    route,
    propertyName,
    { parentPath, siblingActiveWhens, parentActiveWhen },
  ) {
    validateObject(propertyName, route);

    if (route.type === "application") {
      validateKeys(
        propertyName,
        route,
        ["type", "name", "props", "loader", "error", "className"],
        disableWarnings,
      );
      if (route.props) {
        validateObject(`${propertyName}.props`, route.props);
      }
      validateString(`${propertyName}.name`, route.name);
    } else if (route.type === "route") {
      validateKeys(
        propertyName,
        route,
        ["type", "path", "routes", "props", "default", "exact"],
        disableWarnings,
      );

      if (route.hasOwnProperty("exact"))
        validateBoolean(`${propertyName}.exact`, route.exact);

      const hasPath = route.hasOwnProperty("path");
      const hasDefault = route.hasOwnProperty("default");
      let fullPath;

      if (hasPath) {
        validateString(`${propertyName}.path`, route.path);
        fullPath = resolvePath(parentPath, route.path);
        route.activeWhen = pathToActiveWhen(fullPath, route.exact);
        siblingActiveWhens.push(route.activeWhen);
      } else if (hasDefault) {
        validateBoolean(`${propertyName}.default`, route.default);
        fullPath = parentPath;
        route.activeWhen = defaultRoute(siblingActiveWhens, parentActiveWhen);
      } else {
        throw Error(
          `Invalid ${propertyName}: routes must have either a path or default property.`,
        );
      }

      if (hasPath && hasDefault && route.default) {
        throw Error(
          `Invalid ${propertyName}: cannot have both path and set default to true.`,
        );
      }

      if (route.routes)
        validateArray(`${propertyName}.routes`, route.routes, validateRoute, {
          parentPath: fullPath,
          siblingActiveWhens: [],
          parentActiveWhen: route.activeWhen,
        });
    } else {
      if (typeof Node !== "undefined" && route instanceof Node) {
        // HTMLElements are allowed
      } else {
        for (let key in route) {
          if (key !== "routes" && key !== "attrs") {
            validateString(`${propertyName}['${key}']`, route[key], false);
          }
        }
      }
      if (route.routes)
        validateArray(`${propertyName}.routes`, route.routes, validateRoute, {
          parentPath,
          siblingActiveWhens,
          parentActiveWhen,
        });
    }
  }

  delete (routesConfig as InputRoutesConfigObject).disableWarnings;

  return routesConfig as ResolvedRoutesConfig;
}

function defaultRoute(
  siblingActiveWhens: ActivityFn[],
  parentActiveWhen: ActivityFn,
): ActivityFn {
  return (location) => {
    return (
      parentActiveWhen(location) &&
      !siblingActiveWhens.some((activeWhen) => activeWhen(location))
    );
  };
}

function sanitizeBase(base: string): string {
  if (base.indexOf("/") !== 0) {
    base = "/" + base;
  }

  if (base[base.length - 1] !== "/") {
    base = base + "/";
  }

  return base;
}
