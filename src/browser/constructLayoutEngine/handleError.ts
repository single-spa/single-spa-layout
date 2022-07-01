import { AppError, mountRootParcel, Parcel } from 'single-spa';
import {
  ResolvedApplication,
  ResolvedChild,
  ResolvedRoutesConfig,
  sslResolvedNode,
} from '../../isomorphic/index.js';
import { applicationElementId, htmlToParcelConfig } from '../../utils/index.js';

const findIfApplication = (applicationName: string, child: ResolvedChild) =>
  sslResolvedNode.isApplication(child) && child.name === applicationName
    ? child
    : undefined;

const findIfRoute = (
  applicationName: string,
  location: Location | URL,
  child: ResolvedChild,
) =>
  sslResolvedNode.isRoute(child) && child.activeWhen(location)
    ? findApplication(applicationName, child.childNodes, location)
    : undefined;

const findApplication = (
  applicationName: string,
  childNodes: ResolvedChild[],
  location: Location | URL,
): Optional<ResolvedApplication> => {
  for (const child of childNodes) {
    const result =
      findIfApplication(applicationName, child) ||
      findIfRoute(applicationName, location, child) ||
      findApplication(
        applicationName,
        sslResolvedNode.getChildNodes(child),
        location,
      );
    if (result) return result;
  }
  return undefined;
};

export const handleError =
  (
    { childNodes }: ResolvedRoutesConfig,
    errorParcelByAppName: Record<string, Parcel>,
  ) =>
  (err: AppError) => {
    const { appOrParcelName } = err;
    const applicationRoute = findApplication(
      appOrParcelName,
      childNodes,
      window.location,
    );
    const errorHandler = applicationRoute?.error;
    if (errorHandler) {
      const applicationContainer = document.getElementById(
        applicationElementId(applicationRoute.name),
      )!;
      const parcelConfig =
        typeof errorHandler === 'string'
          ? htmlToParcelConfig(errorHandler)
          : errorHandler;
      const parcelProps = { domElement: applicationContainer, error: err };
      errorParcelByAppName[applicationRoute.name] = mountRootParcel(
        parcelConfig,
        parcelProps,
      );
    }
    if (process.env.BABEL_ENV !== 'test')
      setTimeout(() => {
        throw err;
      });
  };
