import { useState } from "react";
import { ChevronDown, BookOpen, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LOVABLE_PROJECT_DOMAINS_URL } from "./shared";
import { toast } from "sonner";

/**
 * Trin-for-trin guide til admins når en kunde har request'et et custom domæne.
 * Vises som en collapsible på toppen af PlatformDomainsTab så den ikke
 * fylder hver gang, men er én klik væk når du står med en aktivering.
 */
export default function DomainGuide() {
  const [open, setOpen] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  const copyIp = async () => {
    try { await navigator.clipboard.writeText("185.158.133.1"); setCopiedIp(true); setTimeout(() => setCopiedIp(false), 1500); toast.success("IP kopieret"); } catch {}
  };

  return (
    <Card className="overflow-hidden border-dashed">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Guide: Aktivér et kundes custom domæne</p>
          <p className="text-xs text-muted-foreground">Trin-for-trin fra "Kø til aktivering" til "Live". Tryk for at åbne.</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border bg-background/60 px-4 py-4 text-sm">
          <Step n={1} title="Bekræft kunden har oprettet DNS-records hos sin udbyder">
            <p>Kunden skal pege både rod-domænet og <code className="rounded bg-secondary px-1 font-mono text-[12px]">www</code> på Lovables IP. De har fået instruktionerne i deres eget panel, men tjek hurtigt:</p>
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li><strong>A-record</strong> · navn <code className="font-mono">@</code> · værdi <code className="font-mono">185.158.133.1</code></li>
              <li><strong>A-record</strong> · navn <code className="font-mono">www</code> · værdi <code className="font-mono">185.158.133.1</code></li>
              <li><strong>TXT-record</strong> · navn <code className="font-mono">_lovable</code> · værdi (vist i kundens panel)</li>
            </ul>
            <Button size="sm" variant="outline" onClick={copyIp} className="gap-1.5">
              {copiedIp ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Kopiér Lovable-IP
            </Button>
            <p className="text-[12px] text-muted-foreground">Tip: Bruger kunden Cloudflare, skal proxy-mode (oranske sky) være <strong>slået fra</strong>, ellers virker SSL-udstedelse ikke.</p>
          </Step>

          <Step n={2} title="Klik 'Re-tjek DNS' på domænet i listen">
            <p>Når statussen skifter til <Badge>Kø til aktivering</Badge> har vi verificeret at DNS peger korrekt og kunden ejer domænet. Op til 72 timer er normalt — typisk under en time.</p>
          </Step>

          <Step n={3} title="Tilføj domænet til Lovable">
            <p>Klik <strong>"Tilføj til Lovable"</strong> på rækken — det åbner Lovables egen domæne-side i en ny fane og kopierer domænet til udklipsholderen automatisk.</p>
            <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
              <li>I Lovable: klik <strong>Connect Domain</strong> og indsæt domænet.</li>
              <li>Lovable verificerer DNS og udsteder SSL (5–20 min).</li>
              <li>Tilbage her: klik <strong>"SSL"</strong>-knappen for at gen-tjekke om certifikatet er udstedt.</li>
            </ol>
            <Button asChild size="sm" variant="outline">
              <a href={LOVABLE_PROJECT_DOMAINS_URL} target="_blank" rel="noreferrer">Åbn Lovable Domains</a>
            </Button>
          </Step>

          <Step n={4} title="Markér som aktivt">
            <p>Når SSL-badget viser <Badge tone="success">Gyldig</Badge> og du har bekræftet at <code className="font-mono">https://kundens-domæne</code> indlæser virksomhedens side, klik <strong>"Markér som aktivt"</strong>. Kunden notificeres ikke automatisk — send dem en kort besked.</p>
          </Step>

          <Step n={5} title="Fejlsøgning">
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li><strong>DNS-problemer (status):</strong> brug <strong>"Whois"</strong>-knappen — er domænet udløbet eller hos en anden registrant?</li>
              <li><strong>SSL fejler:</strong> tjek CAA-records hos kunden (Let's Encrypt skal være tilladt).</li>
              <li><strong>Cloudflare:</strong> bed kunden slå proxy fra ELLER aktivér "proxy-mode" når domænet tilføjes i Lovable (under "Advanced").</li>
              <li><strong>www peger ikke:</strong> sørg for at både root og www har A-record — Lovable tilføjer ikke www automatisk.</li>
            </ul>
          </Step>
        </div>
      )}
    </Card>
  );
}

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">{n}</span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </div>
    <div className="space-y-2 pl-7 text-[13px] text-foreground">{children}</div>
  </div>
);

const Badge = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "success" }) => (
  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tone === "success" ? "bg-emerald-500/10 text-emerald-700" : "bg-secondary text-foreground"}`}>{children}</span>
);