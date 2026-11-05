// Test-SMS: en virksomhedsejer kan sende en test til virksomhedens EGET telefonnummer.
// Modtageren vælges aldrig af browseren (mod misbrug).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { sendBusinessSms } from "../_shared/sms.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireAuthenticatedUser(req, SUPABASE_URL, ANON);
    if (auth.status !== 200) return json({ ok: false, error: "Log ind igen" }, 401);
    const { businessId } = await req.json().catch(() => ({}));
    if (typeof businessId !== "string" || !/^[0-9a-f-]{36}$/i.test(businessId)) return json({ ok: false, error: "Ugyldig virksomhed" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: biz } = await admin.from("businesses").select("id, name, phone, owner_id").eq("id", businessId).maybeSingle();
    if (!biz || biz.owner_id !== auth.userId) return json({ ok: false, error: "Ingen adgang" }, 403);
    if (!biz.phone) return json({ ok: false, error: "Tilføj virksomhedens telefonnummer under Virksomhed og kontakt først" }, 400);

    const res = await sendBusinessSms(admin, {
      businessId: biz.id, businessName: biz.name ?? "", to: biz.phone, kind: "test",
      message: `Hej fra Serviceydere! Jeres SMS'er til kunder virker nu. Sådan ser afsendernavnet ud, når ${biz.name ?? "I"} sender påmindelser og kvitteringer. Mvh. Serviceydere.dk`,
    });
    if (!res.ok) return json({ ok: false, error: res.error ?? "SMS kunne ikke sendes" }, 400);
    return json({ ok: true, provider: res.provider });
  } catch (e) {
    console.error("send-sms:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
