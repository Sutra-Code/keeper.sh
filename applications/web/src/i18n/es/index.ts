import { auth } from "./auth";
import { connect } from "./connect";
import { core } from "./core";
import { dashboardFeatures } from "./dashboard-features";
import { dashboardRoutes } from "./dashboard-routes";
import { shared } from "./shared";

/** Spanish translations, keyed by the English source string. */
export const es: Readonly<Record<string, string>> = {
  ...shared,
  ...auth,
  ...connect,
  ...dashboardRoutes,
  ...dashboardFeatures,
  ...core,
};
