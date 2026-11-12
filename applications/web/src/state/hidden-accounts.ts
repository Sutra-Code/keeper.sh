import { atomWithStorage } from "jotai/utils";

/** Accounts whose events the viewer has switched off in the calendar legend. */
const hiddenAccountIdsAtom = atomWithStorage<string[]>("keeper.hidden-accounts", []);

export { hiddenAccountIdsAtom };
