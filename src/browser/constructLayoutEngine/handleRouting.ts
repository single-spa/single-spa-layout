import { applicationElementId } from "../../utils/index.js";
import { SingleSpaEventListener } from "./types.js";
import { getAppsToUnmount } from "./utils.js";

export const handleRouting =
  (): SingleSpaEventListener =>
  ({ detail: { newUrl } }) => {
    getAppsToUnmount(newUrl).forEach((name) => {
      const appElement = document.getElementById(applicationElementId(name));
      appElement?.isConnected && appElement.remove();
    });
  };
