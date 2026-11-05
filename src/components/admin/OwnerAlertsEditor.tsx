import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, CalendarClock, RefreshCcw, Star, Inbox, Mail, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Settings = Record<string, any>;
interface Props {
  value: Settings;
  onChange: (fn: (prev: Settings) => Settings) => void;
  leadsEnabled: boolean;
  fallbackEmail?: string;
  businessId?: string;
}

const KIND_LABEL: Record<string, string> = {
  new_order: "Ny bestilling", upcoming_service: "Kommende besøg", subscription_change: "Abonnement ændret", new_review: "Ny anmeldelse",
};
const HOURS = [6, 7, 8, 12, 15, 16, 17, 18, 19, 20];

/** Virksomhedens egne e-mail-beskeder: til/fra pr. hændelse + smarte valg. */
export function OwnerAlertsEditor({ value, onChange, leadsEnabled, fallbackEmail, businessId }: Props) {
  const set = (patch: Settings) => onChange((p) => ({ ...p, ...patch }));
  const hour = Number.isFinite(Number(value.upcoming_digest_hour)) ? Number(value.upcoming_digest_hour) : 17;
  const when = value.upcoming_digest_when === "same_day" ? "same_day" : "day_before";
  const recipient = (value.alert_email as string | undefined) ?? "";
  const recipientValid = !recipient || /^\S+@\S+\.\S+$/.test(recipient);

  const { data: recent } = useQuery({
    queryKey: ["owner-alerts-recent", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase.from("business_owner_alerts").select("id, kind, status, last_error, sent_at, created_at")
        .eq("business_id", businessId!).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const rows = [
    {
      key: "new_order", icon: ShoppingCart, label: "Nye bestillinger",
      desc: "E-mail få minutter efter, at en kunde bestiller hos jer. Bestillinger, I selv opretter, giver ingen e-mail.",
    },
    {
      key: "upcoming_service", icon: CalendarClock, label: "Oversigt over kommende besøg",
      desc: "Én samlet e-mail med antal besøg og ruter — kun på dage, hvor der er besøg.",
      extra: (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5" role="radiogroup" aria-label="Hvilken dag">
            {([["day_before", "Dagen før"], ["same_day", "Samme morgen"]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={when === v}
                onClick={() => set({ upcoming_digest_when: v, upcoming_digest_hour: v === "same_day" && hour > 12 ? 7 : v === "day_before" && hour < 12 ? 17 : hour })}
                className={cn("min-h-10 rounded-md px-3 font-medium transition-colors", when === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                {l}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2">
            <span className="text-muted-foreground">kl.</span>
            <select value={hour} onChange={(e) => set({ upcoming_digest_hour: Number(e.target.value) })}
              className="min-h-10 rounded-lg border border-border bg-background px-2 text-sm font-medium text-foreground">
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}.00</option>)}
            </select>
          </label>
        </div>
      ),
    },
    {
      key: "subscription_change", icon: RefreshCcw, label: "Ændringer i abonnementer",
      desc: "Når en kunde selv pauser, opsiger, genoptager eller flytter sit abonnement. Jeres egne ændringer giver ingen e-mail.",
    },
    {
      key: "new_review", icon: Star, label: "Nye anmeldelser",
      desc: "Så snart en kunde anmelder jer.",
      extra: (
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-foreground">
          <Switch checked={value.new_review_only_low === true} onCheckedChange={(v) => set({ new_review_only_low: v })} />
          Kun anmeldelser med 1–3 stjerner
        </label>
      ),
    },
    ...(leadsEnabled ? [{ key: "lead_emails", icon: Inbox, label: "Nye leads", desc: "Når et lead fra «Indhent 3 tilbud» matcher jeres brancher og område." }] : []),
  ] as { key: string; icon: typeof Star; label: string; desc: string; extra?: React.ReactNode }[];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
        {rows.map(({ key, icon: Icon, label, desc, extra }) => {
          const on = !!value[key];
          return (
            <div key={key} className={cn("px-3 py-2 transition-colors sm:px-4", on && "bg-accent/[0.03]")}>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors", on ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight text-foreground">{label}</span>
                    <span className="block text-[13px] leading-snug text-muted-foreground">{desc}</span>
                  </span>
                </span>
                <Switch checked={on} onCheckedChange={(v) => set({ [key]: v })} aria-label={label} className="shrink-0" />
              </label>
              {on && extra && <div className="mt-1.5 pb-1 sm:pl-11">{extra}</div>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <label htmlFor="alert-email" className="flex items-center gap-2 text-sm font-semibold text-foreground"><Mail className="h-4 w-4 text-accent" />Send til</label>
        <p className="mt-0.5 text-sm text-muted-foreground">Lad stå tomt for at bruge {fallbackEmail ? <span className="font-medium text-foreground">{fallbackEmail}</span> : "jeres kontakt-e-mail"}.</p>
        <Input id="alert-email" type="email" inputMode="email" value={recipient} placeholder={fallbackEmail || "fx kontor@firma.dk"}
          onChange={(e) => set({ alert_email: e.target.value.trim() || undefined })}
          aria-invalid={!recipientValid} className={cn("mt-2 h-11 max-w-md", !recipientValid && "border-destructive")} />
        {!recipientValid && <p className="mt-1 text-sm text-destructive">Skriv en gyldig e-mail.</p>}
      </div>

      {businessId && (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm font-semibold text-foreground">Seneste beskeder</p>
          {!recent?.length ? (
            <p className="mt-1 text-sm text-muted-foreground">Ingen endnu. De vises her, så I kan se, at de bliver sendt.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {recent.map((r: any) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  {r.status === "sent" ? <CheckCircle2 className="h-4 w-4 text-success" /> : r.status === "pending" ? <Clock className="h-4 w-4 text-muted-foreground" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium text-foreground">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  <span className="text-muted-foreground">
                    {r.status === "sent" ? "Sendt" : r.status === "pending" ? "Sendes snart" : `Ikke sendt — ${r.last_error ?? "fejl"}`}
                    {" · "}{new Date(r.sent_at ?? r.created_at).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default OwnerAlertsEditor;
