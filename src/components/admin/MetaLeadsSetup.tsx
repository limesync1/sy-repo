import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ExternalLink, Facebook, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type MetaPage = { id: string; name: string; instagramName: string | null; forms: Array<{ id: string; name: string; status?: string }> };

type MetaConnection = {
  status: "disconnected" | "pending" | "connected" | "expired" | "error";
  page_name: string | null;
  instagram_account_name: string | null;
  selected_form_ids: string[];
  pixel_id: string | null;
  lead_ads_enabled: boolean;
  conversions_api_enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
};

const statusLabel: Record<MetaConnection["status"], string> = {
  disconnected: "Ikke forbundet",
  pending: "Afventer opsætning",
  connected: "Forbundet",
  expired: "Forbind igen",
  error: "Kræver handling",
};

export const MetaLeadsSetup = ({ businessId }: { businessId: string }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: connection, isFetching, refetch } = useQuery({
    queryKey: ["meta-leads-connection", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_connections")
        .select("status, page_name, instagram_account_name, selected_form_ids, pixel_id, lead_ads_enabled, conversions_api_enabled, last_synced_at, last_error")
        .eq("business_id", businessId)
        .maybeSingle();
      if (error) throw error;
      return data as MetaConnection | null;
    },
  });

  const connected = connection?.status === "connected";
  const [problem, setProblem] = useState<{ title: string; text: string; steps: string[] } | null>(null);
  const [starting, setStarting] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [pageId, setPageId] = useState("");
  const [formIds, setFormIds] = useState<string[]>([]);

  const explain = (status: number | null, message?: string) => {
    if (status === 401) return { title: "Du er logget ud", text: "Din session er udløbet.", steps: ["Log ind igen", "Tryk på Forbind Meta igen"] };
    if (status === 403) return { title: "Ingen adgang", text: "Kun virksomhedens ejer kan forbinde Meta.", steps: ["Bed ejeren af virksomheden om at forbinde Meta"] };
    if (status === 400) return { title: "Virksomheden blev ikke fundet", text: "Vi kunne ikke se hvilken virksomhed, der skal forbindes.", steps: ["Genindlæs siden og prøv igen"] };
    if (status === null) return { title: "Ingen forbindelse", text: "Vi kunne ikke nå serveren.", steps: ["Tjek din internetforbindelse", "Prøv igen om lidt"] };
    return { title: "Meta svarede ikke som forventet", text: message || "Der skete en uventet fejl.", steps: ["Prøv igen om et par minutter", "Kontakt support, hvis det fortsætter"] };
  };

  const metaResultProblem = (result: string) => {
    if (result === "configuration-error") return {
      title: "Meta mangler opsætning",
      text: "Serviceyderes Meta-app mangler en nødvendig indstilling.",
      steps: ["Tilføj serviceydere.dk under Appdomæner i Meta", "Tilføj https://serviceydere.dk/meta/callback som gyldig OAuth-omdirigeringsadresse", "Prøv derefter igen"],
    };
    if (result === "token-error") return {
      title: "Meta afviste forbindelsen",
      text: "Den godkendte returadresse matcher sandsynligvis ikke opsætningen i Meta.",
      steps: ["Kontrollér at https://serviceydere.dk/meta/callback står præcist sådan i Meta", "Kontrollér at appen er aktiv", "Prøv at forbinde igen"],
    };
    if (result === "invalid-state") return { title: "Forbindelsen er udløbet", text: "Sikkerhedstjekket kunne ikke godkendes.", steps: ["Gå tilbage til Leads", "Start Meta-forbindelsen igen"] };
    if (result === "save-error") return { title: "Forbindelsen kunne ikke gemmes", text: "Meta godkendte forbindelsen, men den kunne ikke gemmes.", steps: ["Prøv igen", "Kontakt support, hvis det fortsætter"] };
    return { title: "Meta-forbindelsen fejlede", text: "Din eksisterende leadmodtagelse er ikke påvirket.", steps: ["Prøv at forbinde igen", "Kontrollér at du godkender alle de viste adgange"] };
  };

  const startSetup = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-oauth-start", { body: { businessId } });
      if (data?.configured === false) {
        setProblem({
          title: "Meta er ikke klar endnu",
          text: "Forbindelsen til Facebook og Instagram er ikke aktiveret på Serviceydere endnu. Det er ikke en fejl hos dig.",
          steps: ["Dine leads fra Serviceydere virker som normalt", "Du får besked, når Meta kan forbindes"],
        });
        return;
      }
      if (error || !data?.url) {
        let status: number | null = null;
        let message: string | undefined = data?.error;
        const ctx = (error as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.status === "number") {
          status = ctx.status;
          try { message = (await ctx.clone().json())?.error ?? message; } catch { /* ignore */ }
          if (status === 503) {
            setProblem({ title: "Meta er ikke klar endnu", text: "Forbindelsen til Facebook og Instagram er ikke aktiveret endnu.", steps: ["Prøv igen senere"] });
            return;
          }
        } else if (error) status = null; else status = 500;
        setProblem(explain(status, message));
        return;
      }
      window.location.assign(data.url);
    } catch {
      setProblem(explain(null));
    } finally {
      setStarting(false);
    }
  };

  const loadPages = async () => {
    setLoadingPages(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-connection", { body: { action: "list", businessId } });
      if (error || !data?.pages) {
        let message = data?.error;
        const ctx = (error as { context?: Response } | null)?.context;
        if (ctx) try { message = (await ctx.clone().json())?.error || message; } catch { /* ignore */ }
        setProblem({ title: "Facebook-sider kunne ikke hentes", text: message || "Meta gav ikke adgang til virksomhedens sider.", steps: ["Kontrollér at du er administrator på Facebook-siden", "Forbind Meta igen og godkend alle adgange"] });
        return;
      }
      const available = data.pages as MetaPage[];
      setPages(available);
      const selected = available.find((page) => page.name === connection?.page_name) || available[0];
      setPageId(selected?.id || "");
      setFormIds(connection?.selected_form_ids || []);
      setSetupOpen(true);
    } catch {
      setProblem(explain(null));
    } finally {
      setLoadingPages(false);
    }
  };

  const saveConnection = async () => {
    if (!pageId) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("meta-connection", { body: { action: "connect", businessId, pageId, formIds } });
    setSaving(false);
    if (error || !data?.ok) {
      let message = data?.error;
      const ctx = (error as { context?: Response } | null)?.context;
      if (ctx) try { message = (await ctx.clone().json())?.error || message; } catch { /* ignore */ }
      setProblem({ title: "Meta kunne ikke færdiggøres", text: message || "Facebook-siden kunne ikke tilmeldes nye leads.", steps: ["Kontrollér din administratoradgang", "Forbind Meta igen, hvis adgangen er udløbet"] });
      return;
    }
    setSetupOpen(false);
    await refetch();
    toast.success(`${data.pageName} sender nu nye leads til Serviceydere`);
  };

  useEffect(() => {
    const result = searchParams.get("meta");
    if (!result) return;
    const next = new URLSearchParams(searchParams);
    next.delete("meta");
    setSearchParams(next, { replace: true });
    if (result === "select-page") {
      void refetch().then(() => loadPages());
      return;
    }
    if (result === "cancelled") setProblem({ title: "Forbindelsen blev afbrudt", text: "Der blev ikke ændret noget.", steps: ["Tryk på Forbind Meta, når du er klar"] });
    else setProblem(metaResultProblem(result));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPage = pages.find((page) => page.id === pageId);

  return (
    <SectionCard
      title="Meta Lead Ads og måling"
      icon={<Settings2 />}
      description="Saml leads fra Facebook og Instagram her, og mål indsendte leads og bookinger med samtykke."
      className="overflow-hidden shadow-premium"
      action={<Badge variant={connected ? "default" : "secondary"}>{statusLabel[connection?.status ?? "disconnected"]}</Badge>}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <MetaCapability label="Lead Ads" active={!!connection?.lead_ads_enabled} detail={connection?.page_name || "Vælg Facebook-side og formularer"} />
          <MetaCapability label="Pixel og Conversions API" active={!!connection?.conversions_api_enabled} detail={connection?.pixel_id ? `Pixel ${connection.pixel_id}` : "Mål leads og bookinger med samtykke"} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Opdatér
          </Button>
          <Button type="button" size="sm" onClick={connection?.status === "pending" || connected ? loadPages : startSetup} disabled={starting || loadingPages} className="gap-1.5">
            {starting || loadingPages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : connected ? <Settings2 className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />} {connected ? "Administrér" : connection?.status === "pending" ? "Vælg Facebook-side" : "Forbind Meta"}
          </Button>
        </div>
      </div>
      {!connected && (
        <div className="space-y-2 rounded-md border border-border bg-secondary/20 px-3 py-2.5 text-xs text-muted-foreground">
          <p><span className="font-semibold text-foreground">Sådan virker det:</span> Log ind hos Meta, vælg virksomhedens Facebook-side og aktivér import. Derefter kommer nye formularleads automatisk ind på Leads-siden.</p>
          <p>Hvis Meta viser “domænet er ikke inkluderet”, skal appens administrator tilføje <span className="font-semibold text-foreground">serviceydere.dk</span> under Appdomæner og <span className="font-semibold text-foreground">https://serviceydere.dk/meta/callback</span> som gyldig OAuth-omdirigeringsadresse.</p>
        </div>
      )}
      {connection?.last_error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{connection.last_error}</p>}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Facebook className="h-5 w-5" /> Vælg hvor leads kommer fra</DialogTitle>
            <DialogDescription>Vælg siden én gang. Nye Lead Ads bliver derefter oprettet automatisk som leads i Serviceydere.</DialogDescription>
          </DialogHeader>
          {pages.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Ingen Facebook-sider blev fundet. Du skal være administrator på mindst én side.</div>
          ) : (
            <div className="space-y-4">
              <RadioGroup value={pageId} onValueChange={(value) => { setPageId(value); setFormIds([]); }} className="space-y-2">
                {pages.map((page) => (
                  <Label key={page.id} htmlFor={`meta-page-${page.id}`} className="flex cursor-pointer items-center gap-3 rounded-md border bg-card p-3 hover:bg-secondary/40">
                    <RadioGroupItem id={`meta-page-${page.id}`} value={page.id} />
                    <span className="min-w-0"><span className="block font-semibold">{page.name}</span>{page.instagramName && <span className="block text-xs text-muted-foreground">Instagram: @{page.instagramName}</span>}</span>
                  </Label>
                ))}
              </RadioGroup>
              {selectedPage && (
                <div className="rounded-md border bg-secondary/20 p-3">
                  <p className="text-sm font-semibold">Formularer</p>
                  <p className="mb-3 text-xs text-muted-foreground">Ingen valgte betyder alle nuværende og fremtidige formularer.</p>
                  {selectedPage.forms.length === 0 ? <p className="text-xs text-muted-foreground">Ingen formularer fundet endnu.</p> : selectedPage.forms.map((form) => (
                    <Label key={form.id} className="flex cursor-pointer items-center gap-2 py-2 text-sm">
                      <Checkbox checked={formIds.includes(form.id)} onCheckedChange={(checked) => setFormIds((current) => checked ? [...current, form.id] : current.filter((id) => id !== form.id))} />
                      <span>{form.name}</span>
                    </Label>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSetupOpen(false)}>Annuller</Button>
            <Button onClick={saveConnection} disabled={!pageId || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Aktivér automatisk import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!problem} onOpenChange={(o) => !o && setProblem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" />{problem?.title}</DialogTitle>
            <DialogDescription>{problem?.text}</DialogDescription>
          </DialogHeader>
          {problem && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
              {problem.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          )}
          <DialogFooter><Button onClick={() => setProblem(null)}>Forstået</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
};

const MetaCapability = ({ label, active, detail }: { label: string; active: boolean; detail: string }) => (
  <div className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2.5">
    <CheckCircle2 className={active ? "mt-0.5 h-4 w-4 shrink-0 text-success" : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"} />
    <div className="min-w-0"><p className="font-semibold text-foreground">{label}</p><p className="mt-0.5 truncate text-muted-foreground">{detail}</p></div>
  </div>
);

export default MetaLeadsSetup;