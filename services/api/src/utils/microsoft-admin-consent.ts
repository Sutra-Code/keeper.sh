const DEFAULT_ADMIN_CONSENT_TENANT = "organizations";
const GRAPH_DEFAULT_SCOPE = "https://graph.microsoft.com/.default";

interface AdminConsentUrlInput {
  clientId: string;
  callbackUrl: string;
  /** A single-tenant app has to send its admin to its own tenant. */
  tenantId?: string;
}

const resolveConsentTenant = (tenantId: string | undefined): string => {
  if (!tenantId || tenantId === "common") {
    return DEFAULT_ADMIN_CONSENT_TENANT;
  }
  return tenantId;
};

const buildMicrosoftAdminConsentUrl = ({ clientId, callbackUrl, tenantId }: AdminConsentUrlInput): string => {
  const tenant = encodeURIComponent(resolveConsentTenant(tenantId));
  const url = new URL(`https://login.microsoftonline.com/${tenant}/v2.0/adminconsent`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", GRAPH_DEFAULT_SCOPE);
  url.searchParams.set("redirect_uri", callbackUrl);
  return url.toString();
};

export { buildMicrosoftAdminConsentUrl };
