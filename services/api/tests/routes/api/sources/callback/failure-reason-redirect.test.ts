import { describe, expect, it, vi } from "vitest";

const BASE_URL = "https://keeper.test.invalid";

let stateIsValid = true;
let stateMicrosoftApp: string | null = null;

// The approval link names the Microsoft app read from the environment.
process.env.MICROSOFT_CLIENT_ID = "microsoft-client";
process.env.MICROSOFT_CLIENT_SECRET = "microsoft-secret";
process.env.MICROSOFT_ORIONTEK_CLIENT_ID = "oriontek-client";
process.env.MICROSOFT_ORIONTEK_CLIENT_SECRET = "oriontek-secret";
process.env.MICROSOFT_ORIONTEK_TENANT_ID = "oriontek-tenant";

vi.mock("@/utils/logging", () => ({
  widelog: {
    errorFields: () => null,
    set: () => null,
  },
}));

vi.mock("@/utils/middleware", () => ({
  withWideEvent: (handler: unknown) => handler,
}));

vi.mock("@/context", () => ({
  baseUrl: BASE_URL,
}));

vi.mock("@/utils/destinations", () => ({
  exchangeCodeForTokens: () => Promise.reject(new Error("token exchange should not run")),
  fetchUserInfo: () => Promise.reject(new Error("user info should not run")),
  validateState: () => {
    if (!stateIsValid) {
      return Promise.resolve(null);
    }
    return Promise.resolve({ microsoftApp: stateMicrosoftApp, userId: "user-1" });
  },
}));

vi.mock("@/utils/oauth-source-credentials", () => ({
  createOAuthSourceCredential: () => Promise.reject(new Error("credential should not be stored")),
}));

vi.mock("@/utils/user-milestones", () => ({
  noteUserMilestone: () => Promise.resolve(),
}));

vi.mock("@/utils/oauth-sources", () => ({
  importOAuthAccountCalendars: () => Promise.reject(new Error("import should not run")),
}));

const { GET: handleCallback } = await import("@/routes/api/sources/callback/[provider]");

const callbackRoute = handleCallback as unknown as (ctx: {
  params: Record<string, string>;
  request: Request;
}) => Promise<Response>;

const readRedirect = async (query: string): Promise<URL> => {
  const response = await callbackRoute({
    params: { provider: "outlook" },
    request: new Request(`${BASE_URL}/api/sources/callback/outlook?${query}`),
  });
  return new URL(response.headers.get("location") ?? "");
};

const readFailureReason = async (query: string): Promise<string | null> => {
  const location = await readRedirect(query);
  expect(location.pathname).toBe("/dashboard/integrations");
  return location.searchParams.get("reason");
};

describe("source callback failure redirects", () => {
  it("names a work account that needs admin approval", async () => {
    const description = encodeURIComponent("AADSTS90094: The grant requires admin permission.");
    expect(await readFailureReason(`error=access_denied&error_description=${description}`))
      .toBe("admin-approval-required");
  });

  it("hands a work account the admin approval link to pass on", async () => {
    const description = encodeURIComponent("AADSTS65001: The user or administrator has not consented.");
    const location = await readRedirect(`error=consent_required&error_description=${description}`);
    const approvalUrl = new URL(location.searchParams.get("approvalUrl") ?? "");

    expect(approvalUrl.pathname).toBe("/organizations/v2.0/adminconsent");
    expect(approvalUrl.searchParams.get("client_id")).toBe("microsoft-client");
  });

  it("sends the approval link to the tenant of the app the account tried", async () => {
    stateMicrosoftApp = "oriontek";
    const description = encodeURIComponent("AADSTS65001: The user or administrator has not consented.");
    const location = await readRedirect(`error=consent_required&error_description=${description}&state=s`);
    stateMicrosoftApp = null;
    const approvalUrl = new URL(location.searchParams.get("approvalUrl") ?? "");

    expect(approvalUrl.pathname).toBe("/oriontek-tenant/v2.0/adminconsent");
    expect(approvalUrl.searchParams.get("client_id")).toBe("oriontek-client");
  });

  it("leaves the approval link off every other failure", async () => {
    const location = await readRedirect("error=access_denied");
    expect(location.searchParams.has("approvalUrl")).toBe(false);
  });

  it("sends an admin who approved back to the Outlook connect screen", async () => {
    const location = await readRedirect("admin_consent=True&tenant=tenant-1");
    expect(location.pathname).toBe("/dashboard/connect/outlook");
  });

  it("names a cancelled consent screen", async () => {
    expect(await readFailureReason("error=access_denied")).toBe("access-declined");
  });

  it("names an expired or reused sign-in", async () => {
    stateIsValid = false;
    expect(await readFailureReason("code=code-1&state=state-1")).toBe("expired");
    stateIsValid = true;
  });
});
