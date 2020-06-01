import {
  validateArray,
  validateEnum,
  validateKeys,
  validateString,
  validateObject,
  validateContainerEl,
  validateBoolean,
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
 * default?: boolean;
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
 * @typedef {{
 * loaders: {
 *   [key]: any;
 * };
 * props: {
 *  [key]: any;
 * }
 * }} HTMLLayoutData
 *
 * @param {RoutesConfig} routesConfig
 * @param {data=HTMLLayoutData} htmlLayoutData
 * @returns {ResolvedRoutesConfig}
 */
export function constructRoutes(routesConfig, htmlLayoutData) {
  if (routesConfig && routesConfig.nodeName) {
    routesConfig = domToRoutesConfig(routesConfig, htmlLayoutData);
  } else if (htmlLayoutData) {
    throw Error(
      `constructRoutes should be called either with an HTMLElement and layoutData, or a single json object.`
    );
  }

  validateAndSanitize(routesConfig);
  return routesConfig;
}

/**
 * Converts a domElement to a json object routes config
 *
 * @param {HTMLElement} domElement
 * @param {HTMLLayoutData} htmlLayoutData
 * @returns {InputRoutesConfigObject}
 */
function domToRoutesConfig(domElement, htmlLayoutData = {}) {
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
      ...elementToJson(domElement.childNodes[i], htmlLayoutData)
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

function hasAttribute(element, attrName) {
  if (inBrowser) {
    return element.hasAttribute(attrName);
  } else {
    return element.attrs.some((attr) => attr.name === attrName);
  }
}

/**
 * @param {HTMLElement} element
 * @param {HTMLLayoutData} htmlLayoutData
 * @returns {Array<Route>}
 */
function elementToJson(element, htmlLayoutData) {
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
    const loaderKey = getAttribute(element, "loader");
    if (loaderKey) {
      if (
        htmlLayoutData.loaders &&
        htmlLayoutData.loaders.hasOwnProperty(loaderKey)
      ) {
        application.loader = htmlLayoutData.loaders[loaderKey];
      } else {
        throw Error(
          `Application loader '${loaderKey}' was not defined in the htmlLayoutData`
        );
      }
    }
    setProps(element, application, ["name", "loader"], htmlLayoutData);
    return [application];
  } else if (element.nodeName.toLowerCase() === "route") {
    const route = {
      type: "route",
      routes: [],
    };
    const path = getAttribute(element, "path");
    if (path) {
      route.path = path;
    }
    if (hasAttribute(element, "default")) {
      route.default = true;
    }
    setProps(element, route, ["path", "default"], htmlLayoutData);
    for (let i = 0; i < element.childNodes.length; i++) {
      route.routes.push(
        ...elementToJson(element.childNodes[i], htmlLayoutData)
      );
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
          element.routes.push(
            ...elementToJson(element.childNodes[i], htmlLayoutData)
          );
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
      result.routes.push(
        ...elementToJson(element.childNodes[i], htmlLayoutData)
      );
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
 * @param {HTMLLayoutData} htmlLayoutData
 */
function setProps(element, route, ignoredAttributes, htmlLayoutData) {
  const attributes = element.attributes || entries(element.attrs);
  for (let i = 0; i < attributes.length; i++) {
    const { name, value } = attributes[i];
    if (ignoredAttributes.includes(name)) {
      continue;
    } else {
      if (!route.props) {
        route.props = {};
      }
      const propName = value.trim() !== "" ? value : name;
      if (
        htmlLayoutData.props &&
        htmlLayoutData.props.hasOwnProperty(propName)
      ) {
        route.props[name] = htmlLayoutData.props[propName];
      } else {
        throw Error(
          `Prop '${name}' was not defined in the htmlLayoutData. Either remove this attribute from the HTML element or provide the prop's value`
        );
      }
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

  validateArray("routesConfig.routes", routesConfig.routes, validateRoute, {
    parentPath: hashPrefix + routesConfig.base,
    siblingActiveWhens: [],
  });

  function validateRoute(
    route,
    propertyName,
    { parentPath, siblingActiveWhens }
  ) {
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
        ["type", "path", "routes", "props", "default"],
        disableWarnings
      );

      const hasPath = route.hasOwnProperty("path");
      const hasDefault = route.hasOwnProperty("default");
      let fullPath;

      if (hasPath) {
        validateString(`${propertyName}.path`, route.path);
        fullPath = resolvePath(parentPath, route.path);
        route.activeWhen = pathToActiveWhen(fullPath);
        siblingActiveWhens.push(route.activeWhen);
      } else if (hasDefault) {
        validateBoolean(`${propertyName}.default`, route.default);
        fullPath = parentPath;
        route.activeWhen = defaultRoute(siblingActiveWhens);
      } else {
        throw Error(
          `Invalid ${propertyName}: routes must have either a path or default property.`
        );
      }

      if (hasPath && hasDefault && route.default) {
        throw Error(
          `Invalid ${propertyName}: cannot have both path and set default to true.`
        );
      }

      if (route.routes)
        validateArray(`${propertyName}.routes`, route.routes, validateRoute, {
          parentPath: fullPath,
          siblingActiveWhens: [],
        });
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
        validateArray(`${propertyName}.routes`, route.routes, validateRoute, {
          parentPath,
          siblingActiveWhens,
        });
    }
  }

  delete routesConfig.disableWarnings;
}

function defaultRoute(otherActiveWhens) {
  return (location) => {
    return !otherActiveWhens.some((activeWhen) => activeWhen(location));
  };
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
