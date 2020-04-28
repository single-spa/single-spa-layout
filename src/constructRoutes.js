import {
  validateArray,
  validateEnum,
  validateKeys,
  validateString,
  validateObject,
} from "./validation-helpers.js";

/**
 * @typedef {{
 * mode?: string;
 * base?: string;
 * containerEl?: string | HTMLElement;
 * disableWarnings?: boolean;
 * routes: Array<Route>;
 * }} RoutesConfig
 *
 * @typedef {UrlRoute | Application} Route
 *
 * @typedef {{
 * type: 'route';
 * path: string;
 * routes?: Array<Route>;
 * }} UrlRoute
 *
 * @typedef {{
 * type: 'application';
 * name: string;
 * props: object;
 * }} Application
 *
 * @param {RoutesConfig} routesConfig
 * @returns {any}
 */
export function constructRoutes(routesConfig) {
  validate(routesConfig);

  // TODO - construct a "resolved routes" return value
  return routesConfig;
}

function validate(routesConfig) {
  validateObject("routesConfig", routesConfig);

  const disableWarnings = routesConfig.disableWarnings;

  validateKeys(
    "routesConfig",
    routesConfig,
    ["mode", "base", "containerEl", "routes", "disableWarnings"],
    disableWarnings
  );

  if (!routesConfig.hasOwnProperty("mode")) {
    routesConfig.mode = "history";
  }
  validateEnum("routesConfig.mode", routesConfig.mode, ["history", "hash"]);

  if (!routesConfig.hasOwnProperty("base")) {
    routesConfig.base = getBaseURI();
  }
  validateString("routesConfig.base", routesConfig.base);

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
      if (route.hasOwnProperty("routes")) {
        validateArray(`${propertyName}.routes`, route.routes, validateRoute);
      }
    }
  }
}

function getBaseURI() {
  if (typeof document !== "undefined") {
    if (document.baseURI) {
      return document.baseURI;
    } else {
      // Our old friend, Internet Explorer 11, does not support document.baseURI
      // This code was taken from
      // https://github.com/systemjs/systemjs/blob/109af162d97b54a7857e693f33d47a9058f4f18d/src/common.js#L15-L26

      let baseUrl;
      const baseEl = document.querySelector("base[href]");
      if (baseEl) baseUrl = baseEl.href;

      if (!baseUrl) {
        baseUrl = location.href.split("#")[0].split("?")[0];
        const lastSepIndex = baseUrl.lastIndexOf("/");
        if (lastSepIndex !== -1) {
          baseUrl = baseUrl.slice(0, lastSepIndex + 1);
        }
      }

      return baseUrl;
    }
  } else {
    // NodeJS
    return "/";
  }
}
