// Beskeder til virksomheden selv. Køres af samme planlagte job som
// kundebeskederne (hvert 5. minut). Virksomhedens valg i
// businesses.notification_settings tjekkes ved afsendelse, så en slået-fra
// besked aldrig sendes — heller ikke hvis den allerede lå i køen.
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
import { formatServicePrice } from "../_shared/transactional-email-templates/_service-price.ts";

const SITE = "https://serviceydere.dk";
const TZ = "Europe/Copenhagen";

const localParts = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
};
const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  try { return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }); } catch { return iso; }
};
const SUB_EVENT: Record<string, string> = { paused: "sat på pause", cancelled: "opsagt", resumed: "genoptaget", rescheduled: "flyttet til en ny dato" };

/** Opretter morgendagens/dagens oversigt, når virksomhedens valgte klokkeslæt er nået. */
async function scheduleDigests(admin: any) {
  const { data: bizs } = await admin.from("businesses").select("id, notification_settings").limit(2000);
  const now = localParts(new Date());
  const rows: any[] = [];
  for (const b of bizs ?? []) {
    const s = (b.notification_settings as any) || {};
    if (s.upcoming_service === false) continue;
    const hour = Number.isFinite(Number(s.upcoming_digest_hour)) ? Number(s.upcoming_digest_hour) : 17;
    const sameDay = s.upcoming_digest_when === "same_day";
    if (now.hour < hour) continue;
    const target = sameDay ? now.date : addDays(now.date, 1);
    rows.push({ business_id: b.id, kind: "upcoming_service", ref: target, payload: { date: target } });
  }
  if (rows.length) await admin.from("business_owner_alerts").upsert(rows, { onConflict: "business_id,kind,ref", ignoreDuplicates: true });
}

async function build(admin: any, job: any, biz: any, s: any): Promise<{ skip?: string; data?: Record<string, unknown> }> {
  const p = job.payload || {};
  if (job.kind === "new_order") {
    const { data: orders } = await admin.from("orders").select("id, customer_name, customer_email, customer_phone, address, zip_code, city, preferred_date, total_amount, order_items(service_name, quantity, details)")
      .or(`id.eq.${p.order_id},parent_order_id.eq.${p.order_id}`);
    if (!orders?.length) return { skip: "Bestillingen findes ikke længere" };
    const o = orders.find((x: any) => x.id === p.order_id) ?? orders[0];
    const items = orders.flatMap((x: any) => x.order_items || []);
    const total = orders.reduce((n: number, x: any) => n + Number(x.total_amount || 0), 0);
    return { data: {
      subject: `Ny bestilling fra ${o.customer_name || "en kunde"}`,
      title: "Ny bestilling",
      intro: `${o.customer_name || "En kunde"} har lige bestilt hos jer.`,
      rows: [
        { label: "Kunde", value: [o.customer_name, o.customer_email, o.customer_phone].filter(Boolean).join(" · ") },
        { label: "Adresse", value: [o.address, [o.zip_code, o.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Ikke oplyst" },
        { label: "Services", value: items.map((i: any) => `${i.service_name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`).join(", ") || "—" },
        ...(o.preferred_date ? [{ label: "Ønsket dato", value: fmtDate(o.preferred_date)! }] : []),
        { label: "Beløb", value: formatServicePrice(total) },
      ],
      ctaLabel: "Se bestillingen", ctaUrl: `${SITE}/virksomhed?tab=orders`,
    } };
  }
  if (job.kind === "new_review") {
    const { data: r } = await admin.from("reviews").select("reviewer_name, rating, comment").eq("id", p.review_id).maybeSingle();
    if (!r) return { skip: "Anmeldelsen findes ikke længere" };
    if (s.new_review_only_low === true && Number(r.rating) > 3) return { skip: "Kun anmeldelser med 1–3 stjerner" };
    const stars = "★".repeat(Number(r.rating) || 0) + "☆".repeat(Math.max(0, 5 - (Number(r.rating) || 0)));
    return { data: {
      subject: `Ny anmeldelse: ${r.rating} af 5 stjerner`,
      title: "Ny anmeldelse",
      intro: `${r.reviewer_name || "En kunde"} har anmeldt jer.`,
      rows: [{ label: "Bedømmelse", value: `${stars} (${r.rating}/5)` }, ...(r.comment ? [{ label: "Kommentar", value: String(r.comment).slice(0, 600) }] : [])],
      ctaLabel: "Se og svar på anmeldelsen", ctaUrl: `${SITE}/virksomhed?tab=reviews`,
    } };
  }
  if (job.kind === "subscription_change") {
    const { data: sub } = await admin.from("subscriptions").select("service_name, customer_name, customer_email, next_service_date").eq("id", p.subscription_id).maybeSingle();
    if (!sub) return { skip: "Abonnementet findes ikke længere" };
    const ev = SUB_EVENT[p.event] ?? "ændret";
    return { data: {
      subject: `${sub.customer_name || "En kunde"} har ${ev.startsWith("flyttet") ? "flyttet" : ev} sit abonnement`,
      title: "Ændring i abonnement",
      intro: `Abonnementet «${sub.service_name || "service"}» er ${ev}.`,
      rows: [
        { label: "Kunde", value: [sub.customer_name, sub.customer_email].filter(Boolean).join(" · ") || "—" },
        ...(sub.next_service_date && p.event !== "cancelled" && p.event !== "paused" ? [{ label: "Næste besøg", value: fmtDate(sub.next_service_date)! }] : []),
      ],
      ctaLabel: "Se aftalen", ctaUrl: `${SITE}/virksomhed?tab=orders`,
    } };
  }
  if (job.kind === "upcoming_service") {
    const { data: routes } = await admin.from("routes").select("id, name, route_stops(id, status)")
      .eq("business_id", job.business_id).eq("route_date", p.date).is("archived_at", null).is("deleted_at", null);
    const list = (routes ?? []).map((r: any) => ({ name: r.name || "Rute", n: (r.route_stops || []).filter((x: any) => x.status !== "completed" && x.status !== "cancelled").length }))
      .filter((r: any) => r.n > 0);
    const total = list.reduce((n: number, r: any) => n + r.n, 0);
    if (!total) return { skip: "Ingen besøg den dag" };
    const when = s.upcoming_digest_when === "same_day" ? "i dag" : "i morgen";
    return { data: {
      subject: `${when[0].toUpperCase()}${when.slice(1)}: ${total} ${total === 1 ? "besøg" : "besøg"} på ${list.length} ${list.length === 1 ? "rute" : "ruter"}`,
      title: `Jeres besøg ${when}`,
      intro: `${fmtDate(p.date)} har I ${total} besøg fordelt på ${list.length} ${list.length === 1 ? "rute" : "ruter"}.`,
      list: list.map((r: any) => `${r.name} · ${r.n} besøg`),
      ctaLabel: "Åbn ruteplanlæggeren", ctaUrl: `${SITE}/virksomhed/ruter`,
    } };
  }
  return { skip: "Ukendt type" };
}

export async function processOwnerAlerts(admin: any) {
  let sent = 0;
  try { await scheduleDigests(admin); } catch (e) { console.warn("owner digest schedule failed", e); }
  const { data: jobs } = await admin.from("business_owner_alerts").select("*").eq("status", "pending").lte("send_at", new Date().toISOString()).order("send_at").limit(50);
  for (const job of jobs ?? []) {
    const done = (status: string, last_error: string | null) =>
      admin.from("business_owner_alerts").update({ status, last_error, ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}) }).eq("id", job.id);
    try {
      const { data: biz } = await admin.from("businesses").select("id, name, email, owner_id, notification_settings").eq("id", job.business_id).maybeSingle();
      if (!biz) { await done("cancelled", "Virksomheden findes ikke"); continue; }
      const s = (biz.notification_settings as any) || {};
      const defaults: Record<string, boolean> = { new_order: true, upcoming_service: true, subscription_change: true, new_review: false };
      const on = s[job.kind] ?? defaults[job.kind] ?? false;
      if (!on) { await done("cancelled", "Slået fra af virksomheden"); continue; }
      let to: string | null = typeof s.alert_email === "string" && s.alert_email.includes("@") ? s.alert_email.trim() : (biz.email || null);
      if (!to && biz.owner_id) {
        const { data } = await admin.auth.admin.getUserById(biz.owner_id);
        to = data?.user?.email ?? null;
      }
      if (!to) { await done("cancelled", "Ingen e-mail at sende til"); continue; }
      const built = await build(admin, job, biz, s);
      if (built.skip) { await done("cancelled", built.skip); continue; }
      await admin.from("business_owner_alerts").update({ attempts: (job.attempts ?? 0) + 1 }).eq("id", job.id);
      const res = await sendTemplateEmail("business-alert", to, { idempotencyKey: `owner-alert-${job.id}`, templateData: { ...built.data, businessName: biz.name } });
      if (!res.sent) { await done("cancelled", "Modtageren kan ikke kontaktes via e-mail"); continue; }
      await done("sent", null); sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const final = (job.attempts ?? 0) + 1 >= 5;
      await admin.from("business_owner_alerts").update({ status: final ? "failed" : "pending", last_error: msg, attempts: (job.attempts ?? 0) + 1, send_at: new Date(Date.now() + 10 * 60_000).toISOString() }).eq("id", job.id);
    }
  }
  return sent;
}
