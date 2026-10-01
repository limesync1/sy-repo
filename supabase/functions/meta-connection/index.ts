import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { decryptMetaToken, encryptMetaToken } from "../_shared/meta-crypto.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const graph = async (path: string, token: string, init?: RequestInit) => {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`https://graph.facebook.com/v23.0/${path}${separator}access_token=${encodeURIComponent(token)}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error) {
    const message = body?.error?.message || "Meta afviste forespørgslen";
    throw new Error(`${response.status}:${message}`);
  }
  return body;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionSecret = Deno.env.get("META_TOKEN_ENCRYPTION_KEY");
  if (!url || !anonKey || !serviceKey || !encryptionSecret) return json({ error: "Meta er ikke konfigureret" }, 503);

  const auth = await requireAuthenticatedUser(req, url, anonKey);
  if (!("userClient" in auth)) return json({ error: auth.error }, auth.status);
  const parsed = z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), businessId: z.string().uuid() }),
    z.object({ action: z.literal("connect"), businessId: z.string().uuid(), pageId: z.string().min(1), formIds: z.array(z.string()).default([]) }),
    z.object({ action: z.literal("disconnect"), businessId: z.string().uuid() }),
  ]).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Ugyldig forespørgsel" }, 400);

  const { data: business } = await auth.userClient.from("businesses").select("id").eq("id", parsed.data.businessId).eq("owner_id", auth.userId).maybeSingle();
  if (!business) return json({ error: "Kun virksomhedens ejer kan ændre Meta-forbindelsen" }, 403);
  const admin = createClient(url, serviceKey);

  if (parsed.data.action === "disconnect") {
    await admin.from("meta_connections").update({ status: "disconnected", lead_ads_enabled: false, conversions_api_enabled: false, page_id: null, page_name: null, selected_form_ids: [], last_error: null }).eq("business_id", parsed.data.businessId);
    return json({ ok: true });
  }

  const { data: connection } = await admin.from("meta_connections").select("access_token_ciphertext, access_token_iv").eq("business_id", parsed.data.businessId).maybeSingle();
  if (!connection?.access_token_ciphertext || !connection?.access_token_iv) return json({ error: "Forbind først din Meta-konto" }, 409);
  const userToken = await decryptMetaToken(connection.access_token_ciphertext, connection.access_token_iv, encryptionSecret);

  try {
    const accounts = await graph("me/accounts?fields=id,name,access_token,instagram_business_account{id,username}", userToken);
    // Once connected, the encrypted token is intentionally replaced by the
    // selected Page token. It cannot list sibling pages, but it can still
    // administer the selected page and its forms without a new OAuth round.
    if (!Array.isArray(accounts.data) || accounts.data.length === 0) {
      const currentPage = await graph("me?fields=id,name,access_token,instagram_business_account{id,username}", userToken);
      accounts.data = [{ ...currentPage, access_token: currentPage.access_token || userToken }];
    }
    const pages = await Promise.all((accounts.data || []).map(async (page: any) => {
      let forms: Array<{ id: string; name: string; status?: string }> = [];
      try {
        const formData = await graph(`${encodeURIComponent(page.id)}/leadgen_forms?fields=id,name,status&limit=100`, String(page.access_token));
        forms = (formData.data || []).map((form: any) => ({ id: String(form.id), name: String(form.name || "Leadformular"), status: form.status }));
      } catch { /* A page can be visible without lead form access. */ }
      return { id: String(page.id), name: String(page.name), instagramName: page.instagram_business_account?.username || null, forms };
    }));

    if (parsed.data.action === "list") return json({ pages });
    const page = (accounts.data || []).find((item: any) => String(item.id) === parsed.data.pageId);
    if (!page?.access_token) return json({ error: "Facebook-siden blev ikke fundet. Forbind Meta igen og giv adgang til siden." }, 404);

    await graph(`${encodeURIComponent(page.id)}/subscribed_apps?subscribed_fields=leadgen`, String(page.access_token), { method: "POST" });
    const encrypted = await encryptMetaToken(String(page.access_token), encryptionSecret);
    const { error: saveError } = await admin.from("meta_connections").update({
      status: "connected",
      page_id: String(page.id),
      page_name: String(page.name),
      instagram_account_id: page.instagram_business_account?.id ? String(page.instagram_business_account.id) : null,
      instagram_account_name: page.instagram_business_account?.username || null,
      selected_form_ids: parsed.data.formIds,
      lead_ads_enabled: true,
      access_token_ciphertext: encrypted.ciphertext,
      access_token_iv: encrypted.iv,
      last_synced_at: new Date().toISOString(),
      last_error: null,
    }).eq("business_id", parsed.data.businessId);
    if (saveError) throw new Error(`500:${saveError.message}`);
    return json({ ok: true, pageName: String(page.name) });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Meta-forbindelsen fejlede";
    const [statusText, ...parts] = raw.split(":");
    const status = Number(statusText);
    const message = parts.join(":") || raw;
    await admin.from("meta_connections").update({ status: "error", last_error: message }).eq("business_id", parsed.data.businessId);
    return json({ error: message }, Number.isFinite(status) && status >= 400 && status < 600 ? status : 502);
  }
});