import { navigateToUrl, Parcel, SingleSpaCustomEventDetail } from "single-spa";
import { ResolvedRoutesConfig } from "../../isomorphic/index.js";
import { SingleSpaEventListener } from "./types.js";
import { getAppsToUnmount, getPath } from "./utils.js";

export const executeCancelNavigation = (
  cancelNavigation: Optional<VoidFunction>
) => {
  if (!cancelNavigation)
    throw Error(`single-spa-layout: <redirect> requires single-spa@>=5.7.0`);
  cancelNavigation();
};

const isRedirected = (
  { mode, redirects }: ResolvedRoutesConfig,
  { newUrl, cancelNavigation }: SingleSpaCustomEventDetail
) => {
  // TODO: debugging shows that `newUrl` is undefined in some cases, is it OK to early return?
  if (!newUrl) return false;

  const path = getPath(mode, new URL(newUrl));

  for (const from in redirects) {
    const to = redirects[from]!;
    if (from === path) {
      // Calling cancelNavigation sends us back to the old URL
      executeCancelNavigation(cancelNavigation);

      // We must wail until single-spa starts sending us back to the old URL before attempting to navigate to the new one
      setTimeout(() => navigateToUrl(to));
      return true;
    }
  }

  return false;
};

const hasErrors = (
  errorParcelByAppName: Record<string, Parcel>,
  { cancelNavigation, newUrl }: SingleSpaCustomEventDetail
) => {
  const errorParcelUnmountPromises = getAppsToUnmount(newUrl).flatMap(
    (name) => {
      const errorParcel = errorParcelByAppName[name];
      if (errorParcel) {
        delete errorParcelByAppName[name];
        return errorParcel.unmount();
      }
      return [];
    }
  );
  if (errorParcelUnmountPromises.length) {
    executeCancelNavigation(cancelNavigation);
    Promise.all(errorParcelUnmountPromises).then(() => navigateToUrl(newUrl));
    return true;
  }
  return false;
};

export const handleBeforeRouting =
  (
    config: ResolvedRoutesConfig,
    errorParcelByAppName: Record<string, Parcel>
  ): SingleSpaEventListener =>
  ({ detail }) => {
    if (isRedirected(config, detail)) return;
    if (hasErrors(errorParcelByAppName, detail)) return;
  };
