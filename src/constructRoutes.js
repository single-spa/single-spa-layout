import {
  validateArray,
  validateEnum,
  validateKeys,
  validateString,
  validateObject,
  validateContainerEl,
} from "./validation-helpers.js";
import { inBrowser } from "./environment-helpers.js";

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
 * routes: Array<Route>;
 * sourceElement?: HTMLElement | import('parse5').DefaultTreeDocument;
 * }} ResolvedRoutesConfig
 *
 * @typedef {UrlRoute | Application} Route
 *
 * @typedef {string | HTMLElement | import('parse5').Element} ContainerEl
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
    sourceElement: domElement,
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
 * @param {HTMLElement} parentElement
 * @returns {Array<Route>}
 */
function elementToJson(element, parentElement) {
  if (element.nodeName.toLowerCase() === "application") {
    if (element.childNodes.length > 0) {
      throw Error(
        `<application> elements must not have childNodes. You must put in a closing </application> - self closing is not allowed`
      );
    }
    const application = {
      type: "application",
      containerEl: parentElement,
      name: getAttribute(element, "name"),
    };
    setProps(element, application, ["name"]);
    return [application];
  } else if (element.nodeName.toLowerCase() === "route") {
    const route = {
      type: "route",
      path: getAttribute(element, "path"),
      routes: [],
      containerEl: parentElement,
    };
    setProps(element, route, ["path"]);
    for (let i = 0; i < element.childNodes.length; i++) {
      route.routes.push(...elementToJson(element.childNodes[i], parentElement));
    }
    return [route];
  } else if (element.childNodes) {
    const result = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      result.push(...elementToJson(element.childNodes[i], element));
    }
    return result;
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

  validateArray("routesConfig.routes", routesConfig.routes, validateRoute);

  function validateRoute(route, propertyName) {
    validateObject(propertyName, route);
    validateEnum(propertyName, route.type, ["application", "route"]);

    if (route.type === "application") {
      validateKeys(propertyName, route, ["type", "name"], disableWarnings);
      validateString(`${propertyName}.name`, route.name);
    } else {
      validateKeys(
        propertyName,
        route,
        ["type", "path", "routes"],
        disableWarnings
      );
      validateString(`${propertyName}.path`, route.path);
      validateArray(`${propertyName}.routes`, route.routes, validateRoute);
    }
  }

  delete routesConfig.disableWarnings;
}

function sanitizeBase(base) {
  if (!base.startsWith("/")) {
    base = "/" + base;
  }

  if (!base.endsWith("/")) {
    base = base + "/";
  }

  return base;
}
