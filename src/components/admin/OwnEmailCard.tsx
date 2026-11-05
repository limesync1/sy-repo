import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, Mail, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Settings = {
  configured: boolean; enabled?: boolean; host?: string; port?: number; username?: string;
  fromEmail?: string; fromName?: string | null; verifiedAt?: string | null; lastError?: string | null; lastSentAt?: string | null;
};

/** Kendte udbydere – serverfunktioner kan kun bruge port 465 eller 2525. */
const PRESETS = [
  { id: "gmail", label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 465, help: "Kræver en app-adgangskode: Google-konto › Sikkerhed › Totrinsbekræftelse › App-adgangskoder." },
  { id: "one", label: "One.com", host: "send.one.com", port: 465, help: "Brug jeres mailadresse og den adgangskode, I logger ind i webmail med." },
  { id: "zoho", label: "Zoho Mail", host: "smtp.zoho.eu", port: 465, help: "Brug en app-adgangskode, hvis I har totrinsbekræftelse." },
  { id: "other", label: "Andet", host: "", port: 465, help: "Find serveradressen hos jeres mailudbyder (søg fx “SMTP-indstillinger”). Port 465 virker hos de fleste." },
] as const;

async function call(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; settings?: Settings; sentTo?: string }> {
  const { data, error } = await supabase.functions.invoke("business-smtp", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) { try { return await error.context.json(); } catch { /* ignore */ } }
    return { ok: false, error: "Kunne ikke kontakte serveren. Prøv igen." };
  }
  return data;
}

export default function OwnEmailCard({ businessId, businessName, businessEmail }: { businessId: string; businessName: string; businessEmail: string }) {
  const qc = useQueryClient();
  const key = ["business-smtp", businessId];
  const { data: s, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await call({ action: "get", businessId })).settings ?? { configured: false },
  });
  const setS = (next?: Settings) => next && qc.setQueryData(key, next);

  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("gmail");
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(465);
  const [fromEmail, setFromEmail] = useState(businessEmail);
  const [username, setUsername] = useState(businessEmail);
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState(businessName);
  const [busy, setBusy] = useState<null | "save" | "test" | "toggle" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!s?.configured) return;
    setHost(s.host ?? ""); setPort(s.port ?? 465); setUsername(s.username ?? "");
    setFromEmail(s.fromEmail ?? ""); setFromName(s.fromName ?? businessName);
    setPreset((PRESETS.find((p) => p.host === s.host)?.id ?? "other") as any);
  }, [s?.configured, s?.host, s?.port, s?.username, s?.fromEmail, s?.fromName, businessName]);

  const pickPreset = (id: (typeof PRESETS)[number]["id"]) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPreset(id); if (p.host) setHost(p.host); else if (PRESETS.some((x) => x.host === host)) setHost(""); setPort(p.port);
  };

  const connect = async () => {
    setBusy("save"); setError(null);
    const r = await call({ action: "save", businessId, host: host.trim(), port, username: username.trim(), password: password || undefined, fromEmail: fromEmail.trim(), fromName: fromName.trim() || undefined });
    setBusy(null); setS(r.settings);
    if (r.ok) { setPassword(""); setOpen(false); toast.success("Forbundet – kundemails sendes nu fra jeres egen mail"); }
    else setError(r.error ?? "Forbindelsen virkede ikke");
  };
  const test = async () => {
    setBusy("test"); const r = await call({ action: "test", businessId }); setBusy(null); setS(r.settings);
    r.ok ? toast.success(`Testmail sendt til ${r.sentTo}`) : toast.error(r.error ?? "Testmailen kunne ikke sendes");
  };
  const toggle = async (enabled: boolean) => {
    setBusy("toggle"); const r = await call({ action: "toggle", businessId, enabled }); setBusy(null); setS(r.settings);
    if (!r.ok) toast.error(r.error ?? "Kunne ikke ændre");
  };
  const remove = async () => {
    if (!window.confirm("Fjern jeres mailkonto? Kundemails sendes så fra Serviceydere igen.")) return;
    setBusy("delete"); const r = await call({ action: "delete", businessId }); setBusy(null); setS(r.settings); setPassword("");
  };

  const using = !!(s?.configured && s.enabled && s.verifiedAt);
  const p = PRESETS.find((x) => x.id === preset)!;
  const canConnect = host.trim() && fromEmail.includes("@") && username.trim() && (password || s?.configured);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex min-h-12 items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", using ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground")}>
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Afsender af e-mails</p>
            <p className="truncate text-[13px] text-muted-foreground">
              {isLoading ? "Henter…" : using ? <>Sendes fra <span className="font-medium text-foreground">{s?.fromEmail}</span></> : "Sendes fra Serviceydere (noreply@serviceydere.dk)"}
            </p>
          </div>
        </div>
        {s?.configured && s.verifiedAt && (
          <Switch checked={!!s.enabled} disabled={busy === "toggle"} onCheckedChange={toggle} aria-label="Brug egen mail" />
        )}
      </div>

      {s?.configured && s.lastError && (
        <div className="flex items-start gap-2 border-t border-border bg-warning/10 px-3 py-2.5 text-[13px] text-foreground sm:px-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{s.lastError} {using && "Indtil det er rettet, sendes mails fra Serviceydere, så kunderne stadig får dem."}</span>
        </div>
      )}

      {s?.configured && !open && (
        <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2.5 sm:px-4">
          <Button variant="outline" size="sm" className="min-h-11" onClick={test} disabled={!!busy || !s.verifiedAt}>
            {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send testmail til os selv
          </Button>
          <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setOpen(true)}>Ret oplysninger</Button>
          <Button variant="ghost" size="sm" className="min-h-11 text-muted-foreground hover:text-destructive" onClick={remove} disabled={!!busy}>
            <Trash2 className="h-4 w-4" /> Fjern
          </Button>
        </div>
      )}

      {!s?.configured && !open && (
        <button type="button" onClick={() => setOpen(true)}
          className="flex min-h-11 w-full items-center justify-between gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-secondary/40 sm:px-4">
          Send fra jeres egen mail i stedet
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {open && (
        <div className="space-y-4 border-t border-border px-3 py-4 sm:px-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">1. Hvor har I jeres mail?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map((x) => (
                <button key={x.id} type="button" onClick={() => pickPreset(x.id)} aria-pressed={preset === x.id}
                  className={cn("min-h-11 rounded-lg border px-2 text-sm font-medium transition-colors",
                    preset === x.id ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground/40")}>
                  {x.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">{p.help} Outlook og Hotmail understøttes ikke.</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">2. Log ind</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-foreground">E-mail kunderne ser</span>
                <Input type="email" className="h-11" value={fromEmail} placeholder="kontakt@firma.dk"
                  onChange={(e) => { const v = e.target.value; if (username === fromEmail) setUsername(v); setFromEmail(v); }} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-foreground">Adgangskode {preset === "gmail" && "(app-adgangskode)"}</span>
                <Input type="password" className="h-11" value={password} autoComplete="new-password"
                  placeholder={s?.configured ? "Uændret – skriv kun for at skifte" : "••••••••"} onChange={(e) => setPassword(e.target.value)} />
              </label>
            </div>
          </div>

          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /> Flere indstillinger
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-1 block font-medium text-foreground">Afsendernavn</span>
                <Input className="h-11" value={fromName} onChange={(e) => setFromName(e.target.value)} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-foreground">Brugernavn</span>
                <Input className="h-11" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-foreground">Mailserver</span>
                <Input className="h-11" value={host} placeholder="smtp.firma.dk" onChange={(e) => { setHost(e.target.value); setPreset("other"); }} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-foreground">Port</span>
                <select className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={port} onChange={(e) => setPort(Number(e.target.value))}>
                  <option value={465}>465 (SSL – anbefalet)</option>
                  <option value={2525}>2525</option>
                </select></label>
            </div>
          </details>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" onClick={connect} disabled={!canConnect || !!busy}>
              {busy === "save" ? <><Loader2 className="h-4 w-4 animate-spin" /> Tjekker forbindelsen…</> : <><CheckCircle2 className="h-4 w-4" /> Forbind og afprøv</>}
            </Button>
            <Button variant="ghost" className="min-h-11" onClick={() => { setOpen(false); setError(null); }}>Annullér</Button>
          </div>
          <p className="text-[12px] text-muted-foreground">Adgangskoden gemmes krypteret og kan ikke ses af nogen. Virker jeres mail ikke en dag, sender vi fra Serviceydere, så kunderne altid får beskeden.</p>
        </div>
      )}
    </div>
  );
}
