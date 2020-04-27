import {
  validateArray,
  validateEnum,
  validateKeys,
  validateString,
  validateObject,
} from "./validation-helpers.js";

export function constructRoutes(routesConfig) {
  validate(routesConfig);

  // TODO - construct a "resolved routes" return value
}

function validate(routesConfig) {
  validateObject("routesConfig", routesConfig);

  validateKeys("routesConfig", routesConfig, [
    "mode",
    "base",
    "containerEl",
    "routes",
  ]);

  validateEnum("routesConfig.mode", routesConfig.mode, ["history", "hash"]);

  if (routesConfig.hasOwnProperty("base")) {
    validateString("routesConfig.base", routesConfig.base);
  }

  validateArray("routesConfig.routes", routesConfig.routes, validateRoute);
}

function validateRoute(route, propertyName) {
  validateObject(propertyName, route);
  validateEnum(propertyName, route.type, ["application", "route"]);

  if (route.type === "application") {
    validateKeys(propertyName, route, ["type", "name"]);
    validateString(`${propertyName}.name`, route.name);
  } else {
    validateKeys(propertyName, route, ["type", "path", "routes"]);
    validateString(`${propertyName}.path`, route.path);
    if (route.hasOwnProperty("routes")) {
      validateArray(`${propertyName}.routes`, route.routes, validateRoute);
    }
  }
}
