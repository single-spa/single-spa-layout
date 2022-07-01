import {
  ActiveWhen,
  ResolvedChild,
  sslResolvedNode,
} from '../../isomorphic/index.js';
import type { ApplicationMap } from './types.js';

export const recurseRoutes = (
  applicationMap: ApplicationMap,
  activeWhen: ActiveWhen,
  props: Record<string, unknown>,
  childNodes: ResolvedChild[],
): void =>
  childNodes.forEach(child => {
    if (sslResolvedNode.isApplication(child))
      return (applicationMap[child.name] ||= []).push({
        activeWhen,
        props: { ...props, ...child.props },
        loader: child.loader,
      });
    if (sslResolvedNode.isRoute(child))
      return recurseRoutes(
        applicationMap,
        child.activeWhen,
        { ...props, ...child.props },
        child.childNodes,
      );
    return recurseRoutes(
      applicationMap,
      activeWhen,
      props,
      sslResolvedNode.getChildNodes(child),
    );
  });
