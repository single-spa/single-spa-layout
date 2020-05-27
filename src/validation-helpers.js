import { inBrowser } from "./environment-helpers.js";

export function validateObject(propertyName, obj) {
  if (typeof obj !== "object" || Array.isArray(obj) || obj === null) {
    throw Error(
      `Invalid ${propertyName}: received ${
        Array.isArray(obj) ? "array" : obj
      } but expected a plain object`
    );
  }
}

export function validateBoolean(propertyName, bool) {
  if (typeof bool !== "boolean") {
    throw Error(
      `Invalid ${propertyName}: received ${typeof bool}, but expected a boolean`
    );
  }
}

export function validateKeys(propertyName, obj, validKeys, disableWarnings) {
  if (disableWarnings) {
    return;
  }

  const keys = Object.keys(obj);
  const invalidKeys = [];
  keys.forEach((key) => {
    if (validKeys.indexOf(key) < 0) {
      invalidKeys.push(key);
    }
  });

  if (invalidKeys.length > 0) {
    console.warn(
      Error(
        `Invalid ${propertyName}: received invalid properties '${invalidKeys.join(
          ", "
        )}', but valid properties are ${validKeys.join(", ")}`
      )
    );
  }
}

export function validateEnum(propertyName, actual, allowedValues) {
  if (allowedValues.indexOf(actual) < 0) {
    throw Error(
      `Invalid ${propertyName}: received '${actual}' but expected ${allowedValues.join(
        ", "
      )}`
    );
  }
}

export function validateString(propertyName, val) {
  if (typeof val !== "string" || val.trim() === "") {
    throw Error(
      `Invalid ${propertyName}: received '${val}', but expected a non-blank string`
    );
  }
}

export function validateArray(propertyName, arr, cbk, ...extraArgs) {
  if (
    !Array.isArray(arr) &&
    (typeof typeof arr !== "object" || arr.length !== "number")
  ) {
    throw Error(
      `Invalid ${propertyName}: received '${arr}', but expected an array`
    );
  }

  for (let i = 0; i < arr.length; i++) {
    cbk(arr[i], `${propertyName}[${i}]`, ...extraArgs);
  }
}

export function validateContainerEl(propertyName, containerEl) {
  let err;
  if (typeof containerEl === "string") {
    err = containerEl.trim() === "";
  } else if (inBrowser) {
    err = !(containerEl instanceof HTMLElement);
  } else {
    err = true;
  }

  if (err) {
    throw Error(
      `Invalid ${propertyName}: received ${containerEl} but expected either non-blank string or HTMLElement`
    );
  }
}
