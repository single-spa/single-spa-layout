import { ActiveWhen } from "../isomorphic/index.js";

declare module "single-spa" {
  export function checkActivityFunctions(location: Location | URL): string[];
  export function pathToActiveWhen(
    path: string,
    exactMatch?: boolean
  ): ActiveWhen {}
}
