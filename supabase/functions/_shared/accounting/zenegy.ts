// Zenegy adapter
// Docs: https://developers.zenegy.com/
// Auth: OAuth 2.0 (authorization_code + refresh_token).
//
// Zenegy er primært et lønsystem og har ikke samme datamodel som
// e-conomic/Billy/Dinero (kunder/varer/fakturaer). Dette adapter er
// klar med OAuth-håndtering og testConnection — push-metoderne
// returnerer en venlig fejl indtil sync-mapping mellem Serviceydere
// og Zenegy er endeligt aftalt.
import type {
  AccountingAdapter,
  AccountingCredentials,
  AccountingSettings,
  ExternalCustomer,
  ExternalGroups,
  ExternalInvoiceState,
  ExternalProduct,
  UpsertCustomerInput,
  UpsertOrderInput,
  UpsertProductInput,
} from "./types.ts";

const TOKEN_URL = "https://auth.zenegy.com/connect/token";
const API_BASE = "https://api.zenegy.com";

const tokenCache = new Map<string, { token: string; expires: number }>();

function friendlyZenegyError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("invalid_grant")) {
    return "Zenegy afviste login. Forbindelsen kan være udløbet — forbind Zenegy igen.";
  }
  if (status === 404) return "Zenegy kunne ikke finde ressourcen.";
  if (status === 429) return "For mange forespørgsler til Zenegy — prøv igen om et øjeblik.";
  if (status >= 500) return "Zenegys servere svarer ikke lige nu. Prøv igen om et par minutter.";
  try {
    const j = JSON.parse(body);
    if (j?.error_description) return `Zenegy: ${j.error_description}`;
    if (j?.message) return `Zenegy: ${j.message}`;
    if (j?.error) return `Zenegy: ${j.error}`;
  } catch { /* ignore */ }
  return `Zenegy afviste forespørgslen (${status}).`;
}

function getOAuthConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = Deno.env.get("ZENEGY_CLIENT_ID");
  const clientSecret = Deno.env.get("ZENEGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function getAccessToken(
  creds: AccountingCredentials,
  settings: AccountingSettings,
): Promise<string> {
  const oauth = getOAuthConfig();
  if (!oauth) {
    throw new Error("Zenegy OAuth er ikke aktiveret endnu på serveren. Kontakt Serviceydere for at få det aktiveret.");
  }

  const refreshToken = (settings.oauth_refresh_token as string | undefined) ?? null;
  if (!refreshToken) {
    throw new Error("Zenegy-forbindelsen mangler refresh token — forbind Zenegy igen.");
  }

  const cacheKey = `${oauth.clientId}::${refreshToken.slice(0, 32)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(friendlyZenegyError(res.status, await res.text()));
  }
  const data = await res.json();
  const token = data.access_token as string;
  tokenCache.set(cacheKey, {
    token,
    expires: Date.now() + ((data.expires_in ?? 3600) * 1000),
  });
  return token;
}

async function zenegyRequest(
  creds: AccountingCredentials,
  settings: AccountingSettings,
  path: string,
  init: RequestInit = {},
): Promise<any> {
  const token = await getAccessToken(creds, settings);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(friendlyZenegyError(res.status, await res.text()));
  }
  if (res.status === 204) return null;
  return await res.json();
}

const NOT_YET_IMPLEMENTED =
  "Zenegy-synkronisering er ikke aktiveret endnu — afventer endelig mapping mellem Serviceydere og Zenegy. " +
  "Forbindelsen er gemt og klar; push aktiveres så snart mapping er på plads.";

export function makeZenegyAdapter(
  creds: AccountingCredentials,
  settings: AccountingSettings,
): AccountingAdapter {
  return {
    provider: "zenegy",

    async testConnection() {
      try {
        // Hvis OAuth ikke er aktiveret på serveren, så er forbindelsen
        // ikke testbar — sig det pænt frem for at fejle hårdt.
        if (!getOAuthConfig()) {
          return {
            ok: false,
            message: "Zenegy OAuth er ikke aktiveret endnu — Serviceydere venter på godkendelse fra Zenegy.",
          };
        }
        // Verificér tokenet — Zenegy svarer på /v1/companies for en gyldig session.
        await zenegyRequest(creds, settings, "/v1/companies?pageSize=1");
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    },

    async listGroups(): Promise<ExternalGroups> {
      // Zenegy har ikke kunde-/produktgrupper i samme forstand. Returnér tomme
      // lister med pænt navngivne labels så UI'et ikke crasher.
      return {
        customer_groups: [],
        product_groups: [],
        income_accounts: [],
        labels: {
          customer_groups: "Kundegrupper",
          product_groups: "Produktgrupper",
          income_accounts: "Konti",
          customer_groups_help: "Zenegy bruger ikke kundegrupper.",
          product_groups_help: "Zenegy bruger ikke produktgrupper.",
          income_accounts_help: "Zenegy bruger ikke separate indtægtskonti via API'et.",
        },
      };
    },

    async listCustomers(_updatedSince?: Date): Promise<ExternalCustomer[]> {
      return [];
    },
    async upsertCustomer(_input: UpsertCustomerInput): Promise<ExternalCustomer> {
      throw new Error(NOT_YET_IMPLEMENTED);
    },

    async listProducts(_updatedSince?: Date): Promise<ExternalProduct[]> {
      return [];
    },
    async upsertProduct(_input: UpsertProductInput): Promise<ExternalProduct> {
      throw new Error(NOT_YET_IMPLEMENTED);
    },

    async upsertOrder(_input: UpsertOrderInput) {
      throw new Error(NOT_YET_IMPLEMENTED);
    },

    async getInvoiceStates(_externalIds: string[]): Promise<ExternalInvoiceState[]> {
      return [];
    },

    async sendReminder() {
      throw new Error("Zenegy understøtter ikke rykker via API endnu — håndtér manuelt i Zenegy.");
    },
    async creditInvoice() {
      throw new Error("Zenegy understøtter ikke kreditnotaer via API endnu — håndtér manuelt i Zenegy.");
    },
    async voidDraft() {
      throw new Error("Zenegy understøtter ikke annullering via API endnu — håndtér manuelt i Zenegy.");
    },
    async markInvoicePaid() {
      throw new Error("Zenegy understøtter ikke manuel betaling via API endnu — håndtér manuelt i Zenegy.");
    },
  };
}
