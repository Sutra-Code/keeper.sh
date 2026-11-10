import { loadMicrosoftApps } from "@keeper.sh/calendar";
import { withAuth, withWideEvent } from "@/utils/middleware";

/** The Microsoft app registrations a user can connect through, without their secrets. */
const GET = withWideEvent(
  withAuth(() =>
    Response.json(loadMicrosoftApps().map(({ key, label }) => ({ key, label }))),
  ),
);

export { GET };
