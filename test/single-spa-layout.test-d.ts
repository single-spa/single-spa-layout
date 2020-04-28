import { expectError, expectType } from "tsd";
import { constructRoutes } from "../src/single-spa-layout";

expectType<any>(
  constructRoutes({
    routes: [],
  })
);

expectError(constructRoutes());

expectError(constructRoutes({}));
