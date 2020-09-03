import {
  validateObject,
  validateKeys,
  validateArray,
  validateFunction,
} from "../utils/validation-helpers";

/**
 *
 * @typedef {{
 * applicationProps: Array<import('single-spa').AppProps>;
 * res: import('http').ServerResponse;
 * retrieveApplicationHeaders(props: import('single-spa').AppProps) => Promise<import('http').OutgoingHttpHeaders>;
 * mergeHeaders(allHeaders: import('http').OutgoingHttpHeaders) => import('http').OutgoingHttpHeaders;
 * }}
 *
 * @param {ResponseHeaderOptions} options
 * @returns {Promise}
 */
export async function setResponseHeaders(options) {
  validateObject("options", options);

  validateKeys("options", options, [
    "res",
    "applicationProps",
    "retrieveApplicationHeaders",
    "mergeHeaders",
  ]);

  validateArray(
    "applicationProps",
    options.applicationProps,
    (props, propertyName) => validateObject(propertyName, props)
  );

  validateFunction(
    "retrieveApplicationHeaders",
    options.retrieveApplicationHeaders
  );

  validateFunction("mergeHeaders", options.mergeHeaders);

  validateObject("res", options.res);

  const allHeaders = await Promise.all(
    options.applicationProps.map(options.retrieveApplicationHeaders)
  );

  const finalHeaders = options.mergeHeaders(allHeaders);

  options.res.status(200);
  Object.entries(finalHeaders).forEach(([name, value]) => {
    options.res.setHeader(name, value);
  });
}
