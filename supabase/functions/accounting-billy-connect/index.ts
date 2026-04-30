// Forbind Billy med ét klik:
//  - Bruger logger ind med sin almindelige Billy email + password (Basic Auth)
//  - Vi henter listen af virksomheder (organizations) brugeren har adgang til
//  - Hvis brugeren har flere virksomheder, returnerer vi dem så frontend kan
//    vise et valg
//  - Når en organisation er valgt, opretter vi automatisk et access token
//    navngivet "Serviceydere" via POST /v2/accessTokens
//  - Vi returnerer kun det nødvendige (token, org id, org navn) — passwordet
//    forlader aldrig denne function og logges aldrig
//
// Klienten gemmer det returnerede token i `creds.api_token` præcis som hvis
// brugeren havde indsat det manuelt, så resten af integrations-flowet er
// uændret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BILLY_BASE = "https://api.billysbilling.com/v2";

function basicAuth(email: string, password: string): string {
  return "Basic " + btoa(`${email}:${password}`);
}

function friendlyBillyAuthError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("invalid")) {
    return "Forkert email eller adgangskode. Hvis du har slået to-faktor-login til på Billy, skal du i stedet bruge en manuel API-nøgle.";
  }
  if (status === 429) return "For mange forsøg lige nu — vent et øjeblik og prøv igen.";
  if (status >= 500) return "Billys servere svarer ikke lige nu. Prøv igen om et par minutter.";
  try {
    const j = JSON.parse(body);
    if (j?.errorMessage) return `Billy: ${j.errorMessage}`;
    if (j?.message) return `Billy: ${j.message}`;
  } catch { /* ignore */ }
  return `Billy afviste login (${status}).`;
}

async function billyAuth(
  email: string,
  password: string,
  path: string,
  init: RequestInit = {},
): Promise<any> {
  const res = await fetch(`${BILLY_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuth(email, password),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(friendlyBillyAuthError(res.status, text));
  }
  if (res.status === 204) return null;
  return await res.json();
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Du skal være logget ind." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Du skal være logget ind." }, 401);

    const body = await req.json().catch(() => ({}));
    const { business_id, email, password, organization_id } = body ?? {};

    if (!business_id || typeof business_id !== "string") {
      return json({ error: "Mangler business_id." }, 400);
    }
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return json({ error: "Indtast både email og adgangskode." }, 400);
    }

    // Tjek at brugeren faktisk ejer den valgte virksomhed
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", business_id)
      .maybeSingle();
    if (!biz || biz.owner_id !== user.id) {
      return json({ error: "Du har ikke adgang til denne virksomhed." }, 403);
    }

    // 1) Hent organisationer brugeren har adgang til i Billy
    const orgRes = await billyAuth(email, password, "/organizations");
    const orgs: Array<{ id: string; name: string }> = (orgRes?.organizations ?? [])
      .map((o: any) => ({ id: String(o.id), name: String(o.name ?? "Billy-virksomhed") }));

    if (orgs.length === 0) {
      return json({
        error: "Vi kunne ikke finde nogen virksomhed på din Billy-konto.",
      }, 400);
    }

    // 2) Vælg organisation:
    //    - hvis frontend allerede har valgt én, brug den
    //    - hvis der kun er én, brug den automatisk
    //    - ellers: returnér listen, så frontend kan vise et valg
    let chosenOrg: { id: string; name: string } | null = null;
    if (organization_id) {
      chosenOrg = orgs.find((o) => o.id === String(organization_id)) ?? null;
      if (!chosenOrg) {
        return json({ error: "Den valgte virksomhed findes ikke i din Billy-konto." }, 400);
      }
    } else if (orgs.length === 1) {
      chosenOrg = orgs[0];
    } else {
      return json({ needs_organization: true, organizations: orgs }, 200);
    }

    // 3) Opret access token under den valgte organisation
    //    Billy understøtter accessTokens-resourcen som tillader oprettelse af
    //    et navngivet permanent token. Vi navngiver det "Serviceydere" så
    //    brugeren let kan finde og slette det igen i Billys indstillinger.
    const tokenRes = await billyAuth(email, password, "/accessTokens", {
      method: "POST",
      body: JSON.stringify({
        accessToken: {
          organizationId: chosenOrg.id,
          name: "Serviceydere",
        },
      }),
    });

    const accessToken: string | null =
      tokenRes?.accessTokens?.[0]?.token
      ?? tokenRes?.accessToken?.token
      ?? tokenRes?.token
      ?? null;

    if (!accessToken) {
      return json({
        error:
          "Vi kunne ikke oprette en sikker forbindelse til Billy automatisk. Prøv igen, eller indsæt en API-nøgle manuelt.",
      }, 502);
    }

    // Vi returnerer KUN tokenet til frontend som derefter gemmer det via det
    // eksisterende handleSave-flow. Vi gemmer ikke noget her, så vi ikke
    // overskriver evt. eksisterende settings.
    return json({
      ok: true,
      api_token: accessToken,
      organization_id: chosenOrg.id,
      organization_name: chosenOrg.name,
    });
  } catch (e) {
    return json({
      error: e instanceof Error ? e.message : "Noget gik galt — prøv igen.",
    }, 400);
  }
});