import { assertString, inBrowser } from "../../utils/index.js";
import type { ResolvedChild, ResolvedRoutesConfig } from "../types/index.js";
import { resolvePath, sslResolvedNode } from "../utils/index.js";

const recurseRoutes = (
  location: Location | URL,
  childNodes: ResolvedChild[]
) => {
  const result: ResolvedChild[] = [];

  childNodes.forEach((child) => {
    if (sslResolvedNode.isApplication(child)) return result.push(child);
    if (sslResolvedNode.isRoute(child))
      return (
        child.activeWhen(location) &&
        result.push({
          ...child,
          childNodes: recurseRoutes(location, child.childNodes),
        })
      );
    if ("childNodes" in child)
      return result.push({
        ...child,
        childNodes: recurseRoutes(location, child.childNodes),
      });
    return result.push(child);
  });

  return result;
};

export const matchRoute = (
  config: ResolvedRoutesConfig,
  path: string
): ResolvedRoutesConfig => {
  assertString("path", path);
  const result: ResolvedRoutesConfig = { ...config };
  const baseWithoutSlash = config.base.slice(0, config.base.length - 1);

  if (path.indexOf(baseWithoutSlash) === 0) {
    const origin = inBrowser ? window.location.origin : "http://localhost";
    const url = new URL(resolvePath(origin, path));
    result.childNodes = recurseRoutes(url, config.childNodes);
  } else result.childNodes = [];

  return result;
};
