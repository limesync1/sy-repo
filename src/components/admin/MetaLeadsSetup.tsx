import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Building2, Check, CheckCircle2, ExternalLink, Facebook, FileText, Loader2, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
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
  const selectedForms = selectedPage?.forms.filter((form) => formIds.includes(form.id)) ?? [];
  const primaryLabel = connected ? "Administrér forbindelse" : connection?.status === "pending" ? "Vælg side og formularer" : "Forbind Meta-konto";

  return (
    <SectionCard
      title="Meta Lead Ads"
      icon={<Facebook />}
      description="Få nye henvendelser fra Facebook og Instagram direkte ind i din leadindbakke."
      className="overflow-hidden border-border/80 shadow-premium"
      action={<Badge variant={connected ? "default" : "secondary"} className="gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary-foreground" : "bg-muted-foreground"}`} />{statusLabel[connection?.status ?? "disconnected"]}</Badge>}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-0 sm:grid-cols-3">
          <SetupStep number="1" label="Forbind konto" detail={connection ? "Konto godkendt" : "Log sikkert ind hos Meta"} done={!!connection} active={!connection} />
          <SetupStep number="2" label="Vælg side" detail={connection?.page_name || "Facebook-side og formularer"} done={connected} active={connection?.status === "pending"} />
          <SetupStep number="3" label="Modtag leads" detail={connected ? "Automatisk import er aktiv" : "Leads lander i indbakken"} done={connected} active={false} last />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Opdatér Meta-status" title="Opdatér Meta-status">
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Button type="button" onClick={connection?.status === "pending" || connected ? loadPages : startSetup} disabled={starting || loadingPages} className="min-w-[190px] gap-2">
            {starting || loadingPages ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? <Settings2 className="h-4 w-4" /> : connection?.status === "pending" ? <ArrowRight className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            {primaryLabel}
          </Button>
        </div>
      </div>
      {connected && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Facebook className="h-3.5 w-3.5" />{connection.page_name}</span>
          {connection.instagram_account_name && <span>Instagram: @{connection.instagram_account_name}</span>}
          <span>{connection.selected_form_ids.length ? `${connection.selected_form_ids.length} valgte formularer` : "Alle formularer"}</span>
          {connection.last_synced_at && <span>Senest synkroniseret {new Date(connection.last_synced_at).toLocaleString("da-DK")}</span>}
        </div>
      )}
      {connection?.last_error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{connection.last_error}</p>}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 pb-5 pt-6 sm:px-7">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><Facebook className="h-4 w-4" /></span>
              Meta Lead Ads
            </div>
            <DialogTitle className="text-xl sm:text-2xl">Vælg hvor leads kommer fra</DialogTitle>
            <DialogDescription className="max-w-xl">Vælg den Facebook-side og de formularer, som skal sende nye kundehenvendelser til Serviceydere.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 px-5 py-5 sm:px-7">
            {pages.length === 0 ? (
              <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Ingen Facebook-sider blev fundet. Kontrollér, at du er administrator på mindst én side.</span></div>
            ) : (
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div><p className="text-sm font-semibold text-foreground">1. Vælg Facebook-side</p><p className="text-xs text-muted-foreground">Siden skal tilhøre den virksomhed, der modtager leads.</p></div>
                  <RadioGroup value={pageId} onValueChange={(value) => { setPageId(value); setFormIds([]); }} className="space-y-2">
                {pages.map((page) => (
                  <Label key={page.id} htmlFor={`meta-page-${page.id}`} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3.5 transition-colors ${pageId === page.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40"}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${pageId === page.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}><Building2 className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-foreground">{page.name}</span><span className="block truncate text-xs text-muted-foreground">{page.instagramName ? `Instagram: @${page.instagramName}` : "Facebook-side"}</span></span>
                    <RadioGroupItem id={`meta-page-${page.id}`} value={page.id} />
                  </Label>
                ))}
                  </RadioGroup>
                </div>
                <div className="space-y-3">
                  <div><p className="text-sm font-semibold text-foreground">2. Vælg formularer</p><p className="text-xs text-muted-foreground">Lad alle være fravalgt for automatisk at modtage fra alle formularer.</p></div>
                  {!selectedPage ? (
                    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">Vælg først en Facebook-side</div>
                  ) : selectedPage.forms.length === 0 ? (
                    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">Ingen formularer fundet. Nye formularer bliver automatisk inkluderet.</div>
                  ) : (
                    <div className="divide-y divide-border rounded-md border border-border">
                      {selectedPage.forms.map((form) => (
                        <Label key={form.id} className="flex cursor-pointer items-center gap-3 px-3 py-3 text-sm hover:bg-secondary/30">
                          <Checkbox checked={formIds.includes(form.id)} onCheckedChange={(checked) => setFormIds((current) => checked ? [...current, form.id] : current.filter((id) => id !== form.id))} />
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{form.name}</span>
                          {form.status && <Badge variant="outline" className="text-[10px]">{form.status}</Badge>}
                        </Label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedPage && (
              <div className="flex items-start gap-3 rounded-md bg-secondary/50 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div className="text-xs"><p className="font-semibold text-foreground">Klar til automatisk import</p><p className="mt-0.5 text-muted-foreground">Nye leads fra <span className="font-medium text-foreground">{selectedPage.name}</span> og {selectedForms.length ? `${selectedForms.length} valgte formular${selectedForms.length === 1 ? "" : "er"}` : "alle nuværende og fremtidige formularer"} oprettes i leadindbakken.</p></div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 border-t border-border bg-secondary/30 px-5 py-4 sm:px-7">
            <Button variant="outline" onClick={() => setSetupOpen(false)}>Annuller</Button>
            <Button onClick={saveConnection} disabled={!pageId || saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aktivér automatisk import</Button>
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

const SetupStep = ({ number, label, detail, done, active, last = false }: { number: string; label: string; detail: string; done: boolean; active: boolean; last?: boolean }) => (
  <div className="relative flex gap-3 pb-4 last:pb-0 sm:pb-0 sm:pr-7">
    {!last && <span className="absolute bottom-0 left-4 top-9 w-px bg-border sm:bottom-auto sm:left-9 sm:right-1 sm:top-4 sm:h-px sm:w-auto" />}
    <span className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : number}
    </span>
    <div className="min-w-0 pt-0.5"><p className="text-sm font-semibold text-foreground">{label}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div>
  </div>
);

export default MetaLeadsSetup;