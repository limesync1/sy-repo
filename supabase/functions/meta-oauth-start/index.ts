import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { createMetaState } from "../_shared/meta-crypto.ts";

const META_REDIRECT_URI = "https://serviceydere.dk/meta/callback";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const appId = Deno.env.get("META_APP_ID");
  const stateSecret = Deno.env.get("META_OAUTH_STATE_SECRET");
  if (!url || !anonKey || !appId || !stateSecret) {
    return json({ configured: false, error: "Meta-forbindelsen er ikke sat op endnu. Meta App-oplysningerne mangler." });
  }

  const auth = await requireAuthenticatedUser(req, url, anonKey);
  if (!("userClient" in auth)) return json({ error: auth.error }, auth.status);
  const parsed = z.object({ businessId: z.string().uuid() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Ugyldig virksomhed" }, 400);

  const { data: business } = await auth.userClient
    .from("businesses")
    .select("id")
    .eq("id", parsed.data.businessId)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (!business) return json({ error: "Ingen adgang" }, 403);

  const state = await createMetaState(parsed.data.businessId, auth.userId, stateSecret);
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: META_REDIRECT_URI,
    state,
    response_type: "code",
    scope: "pages_show_list,pages_read_engagement,leads_retrieval,ads_management,business_management",
  });
  return json({ url: `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}` });
});