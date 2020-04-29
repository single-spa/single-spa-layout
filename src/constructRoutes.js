import {
  validateArray,
  validateEnum,
  validateKeys,
  validateString,
  validateObject,
  validateContainerEl,
} from "./validation-helpers.js";

/**
 * @typedef {{
 * mode?: string;
 * base?: string;
 * containerEl?: ContainerEl;
 * disableWarnings?: boolean;
 * routes: Array<Route>;
 * }} RoutesConfig
 *
 * @typedef {{
 * mode: string;
 * base: string;
 * containerEl: ContainerEl;
 * routes: Array<Route>;
 * }} ResolvedRoutesConfig
 *
 * @typedef {UrlRoute | Application} Route
 *
 * @typedef {string | HTMLElement} ContainerEl
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
  validateAndSanitize(routesConfig);
  return routesConfig;
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
