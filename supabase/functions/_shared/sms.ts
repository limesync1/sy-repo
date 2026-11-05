// Fælles SMS-afsendelse for hele Serviceydere.
// Udbyder: GatewayAPI (dansk) hvis forbundet, ellers Twilio.
// Afsender er altid et navn (alfanumerisk), aldrig et telefonnummer.

const GW = "https://connector-gateway.lovable.dev";

/** Gratis SMS pr. måned i Fuldt system; derefter bruges købte kreditter. */
export const SMS_FREE_PER_MONTH = 50;

/** SMS-pakker (pris i kr. uden moms). Skal matche src/lib/sms-packs.ts. */
export const SMS_PACKS = [
  { id: "sms_100", credits: 100, priceDkk: 59 },
  { id: "sms_500", credits: 500, priceDkk: 249 },
  { id: "sms_1000", credits: 1000, priceDkk: 449 },
] as const;

// Kun danske og nordiske numre (mod SMS-misbrug til dyre udlandsnumre).
const ALLOWED_PREFIXES = ["+45", "+46", "+47", "+358", "+354", "+298", "+299"];

export function normalizePhone(phone: string): string | null {
  let p = String(phone ?? "").replace(/[\s\-().]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (/^\d{8}$/.test(p)) p = "+45" + p;
  if (!/^\+\d{7,15}$/.test(p)) return null;
  if (!ALLOWED_PREFIXES.some((x) => p.startsWith(x))) return null;
  if (p.startsWith("+45") && p.length !== 11) return null;
  return p;
}

const DK_MAP: Record<string, string> = { "æ": "ae", "ø": "oe", "å": "aa", "Æ": "Ae", "Ø": "Oe", "Å": "Aa" };

export function senderFromName(name: string | null | undefined): string {
  const s = String(name ?? "")
    .replace(/[æøåÆØÅ]/g, (c) => DK_MAP[c])
    .replace(/\b(ApS|A\/S|IVS|I\/S)\b/gi, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 11);
  return s.length >= 3 ? s : "Serviceyder";
}

export function segmentsFor(message: string): number {
  // GSM-7 vs. Unicode (fx emojis).
  const unicode = /[^\x00-\x7FæøåÆØÅéÉüÜäÄöÖ€£¥§¤]/.test(message);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return message.length <= single ? 1 : Math.ceil(message.length / multi);
}

export type SmsResult = {
  ok: boolean;
  provider: "gatewayapi" | "twilio" | "none";
  providerId?: string;
  status: string;
  error?: string;
};

async function viaGatewayApi(to: string, sender: string, message: string, ref: string, key: string, lovKey: string): Promise<SmsResult> {
  const r = await fetch(`${GW}/gatewayapi/mobile/single`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovKey}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ sender, recipient: Number(to.replace("+", "")), message, reference: ref }),
  });
  const text = await r.text();
  if (!r.ok) return { ok: false, provider: "gatewayapi", status: "failed", error: `GatewayAPI [${r.status}]: ${text.slice(0, 300)}` };
  let id: string | undefined;
  try { const j = JSON.parse(text); id = String(j.msg_id ?? j.id ?? j.ids?.[0] ?? ""); } catch { /* ignore */ }
  return { ok: true, provider: "gatewayapi", providerId: id, status: "sent" };
}

async function viaTwilio(to: string, sender: string, message: string, key: string, lovKey: string): Promise<SmsResult> {
  const r = await fetch(`${GW}/twilio/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovKey}`, "X-Connection-Api-Key": key, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: sender, Body: message }),
  });
  const text = await r.text();
  if (!r.ok) return { ok: false, provider: "twilio", status: "failed", error: `Twilio [${r.status}]: ${text.slice(0, 300)}` };
  let j: any = {};
  try { j = JSON.parse(text); } catch { /* ignore */ }
  if (j.error_code) return { ok: false, provider: "twilio", providerId: j.sid, status: "failed", error: `Twilio-fejlkode ${j.error_code}` };
  return { ok: true, provider: "twilio", providerId: j.sid, status: j.status ?? "queued" };
}

export async function sendSms(opts: { to: string; message: string; sender: string; reference: string }): Promise<SmsResult> {
  const lovKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovKey) return { ok: false, provider: "none", status: "failed", error: "LOVABLE_API_KEY mangler" };
  const gwKey = Deno.env.get("GATEWAYAPI_API_KEY");
  const twKey = Deno.env.get("TWILIO_API_KEY");
  if (opts.message.length > 1000) return { ok: false, provider: "none", status: "failed", error: "Beskeden er for lang" };

  if (gwKey) {
    const res = await viaGatewayApi(opts.to, opts.sender, opts.message, opts.reference, gwKey, lovKey);
    if (res.ok || !twKey) return res;
    console.warn("GatewayAPI fejlede, prøver Twilio:", res.error);
  }
  if (twKey) return await viaTwilio(opts.to, opts.sender, opts.message, twKey, lovKey);
  return { ok: false, provider: "none", status: "failed", error: "Ingen SMS-udbyder er forbundet" };
}

// Håndhæver månedsloft + max SMS pr. modtager pr. døgn, og logger afsendelsen.
export async function sendBusinessSms(admin: any, args: {
  businessId: string; businessName: string; to: string; message: string; queueId?: string; kind?: string;
}): Promise<SmsResult & { skipped?: boolean }> {
  const to = normalizePhone(args.to);
  if (!to) return { ok: false, provider: "none", status: "invalid", skipped: true, error: "Ugyldigt eller ikke-nordisk telefonnummer" };

  const { data: cfg } = await admin.from("business_sms_settings")
    .select("sender_name, credits").eq("business_id", args.businessId).maybeSingle();
  const segs = segmentsFor(args.message);
  const isTest = args.kind === "test";
  let paidWithCredits = false;
  if (!isTest) {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const { data: used } = await admin.from("sms_messages").select("segments")
      .eq("business_id", args.businessId).neq("status", "failed").neq("kind", "test")
      .gte("created_at", monthStart.toISOString());
    const usedSegments = (used ?? []).reduce((s: number, r: any) => s + (r.segments ?? 1), 0);
    if (usedSegments + segs > SMS_FREE_PER_MONTH) {
      const { data: ok } = await admin.rpc("consume_sms_credits", { p_business: args.businessId, p_segments: segs });
      if (!ok) return { ok: false, provider: "none", status: "capped", skipped: true, error: "Ingen SMS tilbage – køb flere under Beskeder til kunder" };
      paidWithCredits = true;
    }
  }
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const { count } = await admin.from("sms_messages").select("id", { count: "exact", head: true })
    .eq("business_id", args.businessId).eq("recipient", to).gte("created_at", dayAgo);
  if ((count ?? 0) >= 5) {
    return { ok: false, provider: "none", status: "capped", skipped: true, error: "Maks. 5 SMS pr. modtager pr. døgn" };
  }

  const sender = cfg?.sender_name || senderFromName(args.businessName);
  const res = await sendSms({ to, message: args.message, sender, reference: args.queueId ?? crypto.randomUUID() });
  // Fejlet afsendelse koster ikke kreditter.
  if (!res.ok && paidWithCredits) {
    const { data: row } = await admin.from("business_sms_settings").select("credits").eq("business_id", args.businessId).maybeSingle();
    if (row) await admin.from("business_sms_settings").update({ credits: row.credits + segs }).eq("business_id", args.businessId);
  }
  await admin.from("sms_messages").insert({
    business_id: args.businessId, queue_id: args.queueId ?? null, kind: args.kind ?? "customer",
    recipient: to, provider: res.provider, provider_id: res.providerId ?? null,
    status: res.ok ? res.status : "failed", segments: segs, error: res.error ?? null,
  });
  return res;
}
