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
    z.object({ action: z.literal("sync"), businessId: z.string().uuid() }),
  ]).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Ugyldig forespørgsel" }, 400);

  const { data: business } = await auth.userClient.from("businesses").select("id").eq("id", parsed.data.businessId).eq("owner_id", auth.userId).maybeSingle();
  if (!business) return json({ error: "Kun virksomhedens ejer kan ændre Meta-forbindelsen" }, 403);
  const admin = createClient(url, serviceKey);

  if (parsed.data.action === "disconnect") {
    await admin.from("meta_connections").update({ status: "disconnected", lead_ads_enabled: false, conversions_api_enabled: false, page_id: null, page_name: null, selected_form_ids: [], last_error: null }).eq("business_id", parsed.data.businessId);
    return json({ ok: true });
  }

  if (parsed.data.action === "sync") {
    const { data: c } = await admin.from("meta_connections")
      .select("access_token_ciphertext, access_token_iv, page_id, page_name, selected_form_ids, instagram_account_id, instagram_account_name, lead_ads_enabled")
      .eq("business_id", parsed.data.businessId).maybeSingle();
    if (!c?.page_id || !c.access_token_ciphertext || !c.access_token_iv) return json({ error: "Vælg først en Facebook-side" }, 409);
    try {
      const token = await decryptMetaToken(c.access_token_ciphertext, c.access_token_iv, encryptionSecret);
      let formIds: string[] = Array.isArray(c.selected_form_ids) ? c.selected_form_ids.map(String) : [];
      const formNames = new Map<string, string>();
      const formList = await graph(`${encodeURIComponent(c.page_id)}/leadgen_forms?fields=id,name&limit=100`, token).catch(() => ({ data: [] }));
      for (const f of formList.data || []) formNames.set(String(f.id), String(f.name || "Leadformular"));
      if (formIds.length === 0) formIds = [...formNames.keys()];
      let imported = 0;
      for (const formId of formIds.slice(0, 25)) {
        const leads = await graph(`${encodeURIComponent(formId)}/leads?fields=id,created_time,field_data,form_id,ad_id,campaign_id,platform&limit=50`, token).catch(() => ({ data: [] }));
        for (const lead of leads.data || []) {
          const platform = String(lead.platform || "").toLowerCase();
          const isInstagram = platform.startsWith("ig") || platform === "instagram";
          const fields = new Map<string, string>((lead.field_data || []).map((f: any) => [String(f.name), String(f.values?.[0] || "")]));
          const fullName = fields.get("full_name") || [fields.get("first_name"), fields.get("last_name")].filter(Boolean).join(" ") || "Meta-forespørgsel";
          const { data: request } = await admin.from("quote_requests").upsert({
            customer_name: fullName,
            customer_email: fields.get("email") || null,
            customer_phone: fields.get("phone_number") || null,
            category: fields.get("service") || fields.get("category") || "Anden service",
            description: fields.get("message") || fields.get("job_description") || "Forespørgsel indsendt via Meta-annonce",
            city: fields.get("city") || null,
            zip_code: fields.get("zip_code") || fields.get("post_code") || null,
            share_contact: true,
            terms_accepted_at: lead.created_time || new Date().toISOString(),
            source: isInstagram ? "instagram" : "facebook",
            source_channel: "lead_ads",
            external_lead_id: String(lead.id),
            external_form_id: String(lead.form_id || formId),
            external_campaign_id: lead.campaign_id ? String(lead.campaign_id) : null,
            source_metadata: {
              ad_id: lead.ad_id || null, platform: lead.platform || null,
              form_name: formNames.get(String(lead.form_id || formId)) || null,
              page_id: c.page_id, page_name: c.page_name || null,
              instagram_id: isInstagram ? c.instagram_account_id || null : null,
              instagram_name: isInstagram ? c.instagram_account_name || null : null,
            },
          }, { onConflict: "source,external_lead_id" }).select("id").single();
          if (request?.id) {
            const { error } = await admin.from("quote_request_matches").upsert({
              quote_request_id: request.id, business_id: parsed.data.businessId, match_score: 100,
              reason: "Forespørgsel modtaget fra virksomhedens egen Meta-formular", status: "new",
            }, { onConflict: "quote_request_id,business_id", ignoreDuplicates: true });
            if (!error) imported++;
          }
        }
      }
      await admin.from("meta_connections").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("business_id", parsed.data.businessId);
      return json({ ok: true, imported, forms: formIds.length });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const expired = /190|expired|session/i.test(raw);
      return json({ error: expired ? "Adgangen til Meta er udløbet. Tryk 'Forbind igen'." : "Forespørgsler kunne ikke hentes fra Meta lige nu. Prøv igen om lidt." }, expired ? 401 : 502);
    }
  }

  const { data: connection } = await admin.from("meta_connections").select("access_token_ciphertext, access_token_iv").eq("business_id", parsed.data.businessId).maybeSingle();
  if (!connection?.access_token_ciphertext || !connection?.access_token_iv) return json({ error: "Forbind først din Meta-konto" }, 409);
  const userToken = await decryptMetaToken(connection.access_token_ciphertext, connection.access_token_iv, encryptionSecret);

  try {
    const accounts = await graph("me/accounts?fields=id,name,access_token,picture.type(large){url},instagram_business_account{id,username}", userToken);
    // Once connected, the encrypted token is intentionally replaced by the
    // selected Page token. It cannot list sibling pages, but it can still
    // administer the selected page and its forms without a new OAuth round.
    if (!Array.isArray(accounts.data) || accounts.data.length === 0) {
      const currentPage = await graph("me?fields=id,name,access_token,picture.type(large){url},instagram_business_account{id,username}", userToken);
      accounts.data = [{ ...currentPage, access_token: currentPage.access_token || userToken }];
    }
    const pages = await Promise.all((accounts.data || []).map(async (page: any) => {
      let forms: Array<{ id: string; name: string; status?: string }> = [];
      try {
        const formData = await graph(`${encodeURIComponent(page.id)}/leadgen_forms?fields=id,name,status&limit=100`, String(page.access_token));
        forms = (formData.data || []).map((form: any) => ({ id: String(form.id), name: String(form.name || "Leadformular"), status: form.status }));
      } catch { /* A page can be visible without lead form access. */ }
      return {
        id: String(page.id),
        name: String(page.name),
        pictureUrl: page.picture?.data?.url ? String(page.picture.data.url) : null,
        instagramName: page.instagram_business_account?.username || null,
        forms,
      };
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