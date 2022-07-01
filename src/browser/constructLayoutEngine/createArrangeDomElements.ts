import { getMountedApps } from 'single-spa';
import { ResolvedRoutesConfig } from '../../isomorphic/index.js';
import { applicationElementId } from '../../utils/index.js';
import { recurseRoutes } from './recurseRoutes.js';
import { getParentContainer, getPath } from './utils.js';

export const createArrangeDomElements =
  ({ base, childNodes, containerEl, mode }: ResolvedRoutesConfig) =>
  () => {
    const baseWithoutSlash = base.substring(0, base.length - 1);
    const path = getPath(mode);
    // Base URL doesn't match, no need to recurse routes
    if (!path.startsWith(baseWithoutSlash)) return;

    // We need to move, not destroy + recreate, application container elements
    const applicationContainers = Object.fromEntries(
      getMountedApps().map(name => [
        name,
        document.getElementById(applicationElementId(name))!,
      ]),
    );
    recurseRoutes({
      applicationContainers,
      childNodes,
      location: window.location,
      parentContainer: getParentContainer(containerEl),
      previousSibling: undefined,
      shouldMount: true,
    });
  };
