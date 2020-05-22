import {
  validateArray,
  validateEnum,
  validateKeys,
  validateString,
  validateObject,
  validateContainerEl,
} from "./validation-helpers.js";
import { inBrowser } from "./environment-helpers.js";
import { pathToActiveWhen } from "single-spa";
import { resolvePath } from "./matchRoute.js";

/**
 * @typedef {InputRoutesConfigObject | HTMLElement | import('parse5').DefaultTreeDocument} RoutesConfig
 *
 * @typedef {{
 * mode?: string;
 * base?: string;
 * containerEl?: ContainerEl;
 * disableWarnings?: boolean;
 * routes: Array<Route>;
 * }} InputRoutesConfigObject
 *
 * @typedef {{
 * mode: string;
 * base: string;
 * containerEl: ContainerEl;
 * routes: Array<ResolvedRouteChild>;
 * }} ResolvedRoutesConfig
 *
 * @typedef {UrlRoute | Application | Node} RouteChild
 *
 * @typedef {ResolvedUrlRoute | Application | Node} ResolvedRouteChild
 *
 * @typedef {string | HTMLElement | import('parse5').Element} ContainerEl
 *
 * @typedef {{
 * type: string;
 * path: string;
 * routes: Array<Route>;
 * activeWhen: import('single-spa').ActivityFn;
 * }} ResolvedUrlRoute
 *
 * @typedef {{
 * type: string;
 * path: string;
 * routes: Array<Route>;
 * }} UrlRoute
 *
 * @typedef {{
 * type: string;
 * name: string;
 * props?: object;
 * }} Application
 *
 * @param {RoutesConfig} routesConfig
 * @returns {ResolvedRoutesConfig}
 */
export function constructRoutes(routesConfig) {
  if (routesConfig && routesConfig.nodeName) {
    routesConfig = domToRoutesConfig(routesConfig);
  }

  validateAndSanitize(routesConfig);
  return routesConfig;
}

/**
 * Converts a domElement to a json object routes config
 *
 * @param {HTMLElement} domElement
 * @returns {InputRoutesConfigObject}
 */
function domToRoutesConfig(domElement) {
  if (domElement.nodeName.toLowerCase() !== "single-spa-router") {
    throw Error(
      `single-spa-layout: The HTMLElement passed to constructRoutes must be <single-spa-router>. Received ${domElement.nodeName}`
    );
  }

  const result = {
    routes: [],
  };

  if (getAttribute(domElement, "mode")) {
    result.mode = getAttribute(domElement, "mode");
  }

  if (getAttribute(domElement, "base")) {
    result.base = getAttribute(domElement, "base");
  }

  for (let i = 0; i < domElement.childNodes.length; i++) {
    result.routes.push(
      ...elementToJson(domElement.childNodes[i], domElement.parentNode)
    );
  }

  return result;
}

function getAttribute(element, attrName) {
  if (inBrowser) {
    // browser
    return element.getAttribute(attrName);
  } else {
    // NodeJS with parse5
    const attr = element.attrs.find((attr) => attr.name === attrName);
    return attr ? attr.value : null;
  }
}

/**
 * @param {HTMLElement} element
 * @returns {Array<Route>}
 */
function elementToJson(element) {
  if (element.nodeName.toLowerCase() === "application") {
    if (element.childNodes.length > 0) {
      throw Error(
        `<application> elements must not have childNodes. You must put in a closing </application> - self closing is not allowed`
      );
    }
    const application = {
      type: "application",
      name: getAttribute(element, "name"),
    };
    setProps(element, application, ["name"]);
    return [application];
  } else if (element.nodeName.toLowerCase() === "route") {
    const route = {
      type: "route",
      path: getAttribute(element, "path"),
      routes: [],
    };
    setProps(element, route, ["path"]);
    for (let i = 0; i < element.childNodes.length; i++) {
      route.routes.push(...elementToJson(element.childNodes[i]));
    }
    return [route];
  } else if (typeof Node !== "undefined" && element instanceof Node) {
    if (
      element.nodeType === Node.TEXT_NODE &&
      element.textContent.trim() === ""
    ) {
      return [];
    } else {
      if (element.childNodes && element.childNodes.length > 0) {
        element.routes = [];
        for (let i = 0; i < element.childNodes.length; i++) {
          element.routes.push(...elementToJson(element.childNodes[i]));
        }
      }
      return [element];
    }
  } else if (element.childNodes) {
    const result = {
      type: element.nodeName.toLowerCase(),
      routes: [],
    };
    for (let i = 0; i < element.childNodes.length; i++) {
      result.routes.push(...elementToJson(element.childNodes[i]));
    }
    return [result];
  } else {
    return [];
  }
}

/**
 * @param {HTMLElement} element
 * @param {Route} route
 * @param {string[]} ignoredAttributes
 */
function setProps(element, route, ignoredAttributes) {
  const attributes = element.attributes || entries(element.attrs);
  for (let i = 0; i < attributes.length; i++) {
    const { name, value } = attributes[i];
    if (ignoredAttributes.includes(name)) {
      continue;
    } else {
      if (!route.props) {
        route.props = {};
      }
      route.props[name] = value;
    }
  }
}

function entries(obj) {
  return Object.keys(obj).map((key) => ({ name: key, value: obj[key] }));
}

function validateAndSanitize(routesConfig) {
  validateObject("routesConfig", routesConfig);

  const disableWarnings = routesConfig.disableWarnings;

  validateKeys(
    "routesConfig",
    routesConfig,
    ["mode", "base", "containerEl", "routes", "disableWarnings"],
    disableWarnings
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

  const pathname = inBrowser ? window.location.pathname : "/";
  const hashPrefix = routesConfig.mode === "hash" ? pathname + "#" : "";

  validateArray(
    "routesConfig.routes",
    routesConfig.routes,
    validateRoute,
    hashPrefix + routesConfig.base
  );

  function validateRoute(route, propertyName, parentPath) {
    validateObject(propertyName, route);

    if (route.type === "application") {
      validateKeys(
        propertyName,
        route,
        ["type", "name", "props"],
        disableWarnings
      );
      if (route.props) {
        validateObject(`${propertyName}.props`, route.props);
      }
      validateString(`${propertyName}.name`, route.name);
    } else if (route.type === "route") {
      validateKeys(
        propertyName,
        route,
        ["type", "path", "routes", "props"],
        disableWarnings
      );
      validateString(`${propertyName}.path`, route.path);
      const fullPath = resolvePath(parentPath, route.path);
      route.activeWhen = pathToActiveWhen(fullPath);
      if (route.routes)
        validateArray(
          `${propertyName}.routes`,
          route.routes,
          validateRoute,
          fullPath
        );
    } else {
      if (typeof Node !== "undefined" && route instanceof Node) {
        // HTMLElements are allowed
      } else {
        for (let key in route) {
          if (key !== "routes") {
            validateString(`${propertyName}['${key}']`, route[key]);
          }
        }
      }
      if (route.routes)
        validateArray(
          `${propertyName}.routes`,
          route.routes,
          validateRoute,
          parentPath
        );
    }
  }

  delete routesConfig.disableWarnings;
}

function sanitizeBase(base) {
  if (base.indexOf("/") !== 0) {
    base = "/" + base;
  }

  if (base[base.length - 1] !== "/") {
    base = base + "/";
  }

  return base;
}
