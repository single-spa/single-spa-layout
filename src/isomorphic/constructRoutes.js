import {
  validateArray,
  validateEnum,
  validateKeys,
  validateString,
  validateObject,
  validateContainerEl,
  validateBoolean,
} from "../utils/validation-helpers.js";
import { inBrowser } from "../utils/environment-helpers.js";
import * as singleSpa from "single-spa";
import { resolvePath } from "./matchRoute.js";
import { find } from "../utils/find";

// This can be replaced with a named import once single-spa changes its package.json exports or type
// The weird strings here are to trick rollup into not optimizing the import to avoid the * syntax
const defaultStr = "d" + "efault";
const pathToActiveWhenStr = "pathTo" + "ActiveWhen";
const pathToActiveWhen = singleSpa[defaultStr]
  ? singleSpa[defaultStr][pathToActiveWhenStr]
  : singleSpa[pathToActiveWhenStr];

export const MISSING_PROP = typeof Symbol !== "undefined" ? Symbol() : "@";

/**
 * @typedef {InputRoutesConfigObject | Element | import('parse5').DefaultTreeDocument} RoutesConfig
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
 * @typedef {string | Element | import('parse5').Element} ContainerEl
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
 * default?: boolean;
 * }} UrlRoute
 *
 * @typedef {{
 * type: string;
 * name: string;
 * props?: object;
 * loader?: string | import('single-spa').ParcelConfig;
 * }} Application
 *
 * @typedef {{
 * loaders: {
 *   [key: string]: any;
 * };
 * props: {
 *   [key: string]: any;
 * }
 * }} HTMLLayoutData
 *
 * @param {RoutesConfig} routesConfig
 * @param {HTMLLayoutData=} htmlLayoutData
 * @returns {ResolvedRoutesConfig}
 */
export function constructRoutes(routesConfig, htmlLayoutData) {
  if (routesConfig && routesConfig.nodeName) {
    if (inBrowser && !htmlLayoutData && window.singleSpaLayoutData) {
      htmlLayoutData = window.singleSpaLayoutData;
    }
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
  // Support passing in a template element, which are nice because their content is
  // not rendered by browsers
  if (domElement.nodeName.toLowerCase() === "template") {
    // IE11 doesn't support the content property on templates
    domElement = (domElement.content || domElement).querySelector(
      "single-spa-router"
    );
  }

  if (domElement.nodeName.toLowerCase() !== "single-spa-router") {
    throw Error(
      `single-spa-layout: The HTMLElement passed to constructRoutes must be <single-spa-router> or a <template> containing the router. Received ${domElement.nodeName}`
    );
  }

  if (inBrowser && domElement.isConnected) {
    domElement.parentNode.removeChild(domElement);
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

  if (getAttribute(domElement, "containerEl")) {
    result.containerEl = getAttribute(domElement, "containerEl");
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
    // watch out, parse5 converts attribute names to lowercase and not as is => https://github.com/inikulin/parse5/issues/116
    const attr = find(
      element.attrs,
      (attr) => attr.name === attrName.toLowerCase()
    );
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
      } else if (inBrowser) {
        throw Error(
          `Application loader '${loaderKey}' was not defined in the htmlLayoutData`
        );
      }
    }

    const errorKey = getAttribute(element, "error");
    if (errorKey) {
      if (
        htmlLayoutData.errors &&
        htmlLayoutData.errors.hasOwnProperty(errorKey)
      ) {
        application.error = htmlLayoutData.errors[errorKey];
      } else if (inBrowser) {
        throw Error(
          `Application error handler '${loaderKey}' was not defined in the htmlLayoutData`
        );
      }
    }

    setProps(element, application, htmlLayoutData);
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
    setProps(element, route, htmlLayoutData);
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
      attrs: element.attrs,
    };
    for (let i = 0; i < element.childNodes.length; i++) {
      result.routes.push(
        ...elementToJson(element.childNodes[i], htmlLayoutData)
      );
    }
    return [result];
  } else if (element.nodeName === "#comment") {
    return [
      {
        type: "#comment",
        value: element.data,
      },
    ];
  } else if (element.nodeName === "#text") {
    return [
      {
        type: "#text",
        value: element.value,
      },
    ];
  }
}

/**
 * @param {HTMLElement} element
 * @param {Route} route
 * @param {HTMLLayoutData} htmlLayoutData
 */
function setProps(element, route, htmlLayoutData) {
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
        `Prop '${propName}' was not defined in the htmlLayoutData. Either remove this attribute from the HTML element or provide the prop's value`
      );
    } else {
      route.props[propName] = MISSING_PROP;
    }
  }
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
        ["type", "name", "props", "loader", "error"],
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
          if (key !== "routes" && key !== "attrs") {
            validateString(`${propertyName}['${key}']`, route[key], false);
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
